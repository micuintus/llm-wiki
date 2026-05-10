---
title: DACMICU implementation plan for Pi
type: decision
updated: 2026-05-08
sources:
  - "concept.md"
  - "modular-architecture.md"
  - "pi-port.md"
  - "../ecosystem/loop-extensions.md"
  - "../ecosystem/todo-visualizations.md"
  - "../../examples/extensions/pi-evolve.ts"
  - "../../packages/coding-agent/examples/extensions/todo.ts"
  - "../../packages/coding-agent/examples/extensions/subagent/index.ts"
tags: [dacmicu, decision, implementation, extension]
see_also:
  - "concept.md"
  - "modular-architecture.md"
  - "pi-port.md"
  - "spirit-vs-opencode.md"
  - "../implementations/pi-callback-extension.md"
  - "../implementations/pi-evolve-extension.md"
  - "../architecture/subprocess-rpc-rendering.md"
  - "../architecture/steering-vs-followup.md"
---

# DACMICU implementation plan for Pi

> **WARNING: This plan has been critically reviewed.** See [archive/research-2026-05-10-critical-plan-review.md](archive/research-2026-05-10-critical-plan-review.md) for a deliberately hostile reading that challenges every load-bearing assumption. Key findings: "deterministic" is overstated; reassessment step is unvalidated; evolve should be removed from v1; the "2-3 days" estimate is 3-5× too low. This page preserves the original plan for reference; consider the critique before building.

> The single-extension design previously committed here has been replaced by the modular six-package monorepo described in [modular-architecture](modular-architecture.md). This page now serves as the build sequencing plan against that architecture.

## Build sequence

**Updated 2026-05-08**: `@pi-dacmicu/subagent` is dropped (reuse tintinweb instead). Now five packages plus a meta-package, build in dependency order.

| Step | Package | Depends on | Done when |
|---|---|---|---|
| 1 | `@pi-dacmicu/base` | (Pi core only) | `pi -e ./packages/base` registers `signal_loop_success`; an `agent_end` listener attached via the exported `attachLoopDriver()` helper drives a manual test loop. |
| 2 | `@pi-dacmicu/todo` | base | TODO tool reconstructs from `getBranch()`; `/todo-loop` command activates driven mode; loop terminates on `unchecked == 0`; survives `/compact` via `session_before_compact`. |
| 3 | ~~`@pi-dacmicu/subagent`~~ | — | **DROPPED** (evening 2). Use `tintinweb/pi-subagents` via `pi.events`-RPC instead. LLM uses tintinweb's `Agent` tool (Claude Code-idiomatic name) directly; no DACMICU subagent tool. |
| 4 | `@pi-dacmicu/fabric` | (none) | `pi-callback` CLI installed on PATH; bash `tool_call` interceptor prepends `PI_CALLBACK_SOCKET=...` to commands; round-trip from a bash heredoc through socket back to `pi.sendMessage` works. |
| 5 | `@pi-dacmicu/ralph` | base; **soft-dep on `tintinweb/pi-subagents`** | `/ralph "<goal>"` command; per-iteration check optionally spawns a tintinweb subagent for fresh context via `subagents:rpc:spawn`; degrades to inline (Variant A) if tintinweb absent; LLM-emitted `ralph_done` tool ends the loop. |
| 6 | `@pi-dacmicu/evolve` | base; **soft-dep on `tintinweb/pi-subagents`** | New build (no validated upstream prototype). A 510-LOC draft exists locally but is untracked and unverified — see [verification audit](../research-2026-05-10-comprehensive-verification-audit.md) § Category 2. Tools (`init_experiment`, `run_experiment`, `log_experiment`, `signal_evolve_success`), git branch management, and `selection.md` ledger are designed from scratch. `agent_end` driver consumes base's `attachLoopDriver()`. JSONL transcript writer added for candidate inspection (works around Hopsken viewer's 500-char truncation). `HazAT/pi-interactive-subagents` integration deferred to v1.x. |

## What `@pi-dacmicu/base` exports

Two surfaces:

1. **Extension surface** (default-exported factory): registers `signal_loop_success` tool, wires up `session_before_compact` preservation, manages a session-scoped registry of attached loop drivers.
2. **Library surface** (named exports for consumers): runtime helpers consumers import to attach their own drivers.

```typescript
// packages/base/runtime.ts (sketch)

export interface LoopDriver {
  /** Predicate: should loop continue? Run on each agent_end. */
  shouldContinue(ctx: ExtensionContext): boolean | Promise<boolean>;
  /** Build the message that drives the next iteration. */
  buildIterationPrompt(ctx: ExtensionContext): { content: ContentPart[]; customType: string };
  /** Optional: extra system-prompt context to inject during loop. */
  systemPromptAddition?(ctx: ExtensionContext): string | undefined;
  /** Optional: custom compaction summary for session_before_compact. */
  compactionSummary?(ctx: ExtensionContext): string | undefined;
  /** Identifier used in appendEntry for state coordination. */
  driverId: string;
}

export function attachLoopDriver(pi: ExtensionAPI, driver: LoopDriver): () => void;
```

`attachLoopDriver` returns a detach function. Consumers (todo, ralph, evolve) call it once during their factory, register their own tools, and base handles `agent_end` orchestration centrally — guarding `ctx.hasPendingMessages()`, checking abort, calling `sendMessage({triggerTurn:true, deliverAs:"followUp"})`.

This consolidates the loop-driver pattern that is currently re-implemented per-extension in `pi-evolve.ts`, `kostyay/agent-stuff/loop.ts`, `tmustier/pi-ralph-wiggum`, and others.

## Hooks each package uses

| Hook | base | todo | fabric | ralph | evolve |
|---|:-:|:-:|:-:|:-:|:-:|
| `agent_end` | ✓ (orchestrator) | (via base) | | (via base) | (via base) |
| `before_agent_start` | ✓ (chains additions) | ✓ | | ✓ | ✓ |
| `session_before_compact` | ✓ (calls compactionSummary) | (via base) | | (via base) | (via base) |
| `session_start` / `session_tree` | | ✓ | ✓ (socket bind) | | ✓ |
| `session_shutdown` | ✓ (cleanup) | | ✓ (socket close) | | |
| `tool_call` (bash) | | | ✓ (env+timeout) | | |
| `pi.sendMessage(triggerTurn:true)` | ✓ (sole caller) | | | | |
| `pi.exec` | | | | | ✓ (git) |
| `pi.events.emit("subagents:rpc:spawn")` | | | | ✓ (RPC client) | ✓ (RPC client) |
| `pi.registerTool` | ✓ (`signal_loop_success`) | ✓ | | ✓ (`ralph_done`) | ✓ |
| `pi.registerCommand` | | ✓ (`/todo-loop`, `/todos`) | | ✓ (`/ralph`) | ✓ (`/evolve`) |

This matrix is normative: only `base` writes to `pi.sendMessage(triggerTurn:true)`, ensuring single-driver invariant.

## Reference implementations to lift from

| Source | What to take |
|---|---|
| `examples/extensions/pi-evolve.ts` | **WARNING: this is a DACMICU draft prototype (untracked, unverified), NOT an upstream reference.** The file does contain correct patterns for `agent_end` driver, `session_before_compact`, `before_agent_start`, `session_start`/`session_tree` rehydration, and `signal_evolve_success` breakout — but these were written BY the planning process, not discovered in upstream code. Use `mitsuhiko/agent-stuff/extensions/loop.ts` as the canonical production reference for the driver pattern instead. See [verification audit](../research-2026-05-10-comprehensive-verification-audit.md) § Category 2.
| `packages/coding-agent/examples/extensions/todo.ts` | TODO tool with state in tool-result `details`, branching-safe via `getBranch()` reconstruction, `/todos` UI component. |
| `packages/coding-agent/examples/extensions/subagent/index.ts` | Subprocess invocation (`pi --mode json -p --no-session`), event parsing (`message_end`, `tool_result_end`), inline rendering with Pi's exported components, single/parallel/chain modes, abort handling. |
| `packages/coding-agent/examples/extensions/plan-mode/index.ts` | The `agent_end` → `sendMessage({triggerTurn:false})` interactive variant; useful for ralph's interactive confirm-before-continue. |
| `mitsuhiko/agent-stuff/extensions/loop.ts` (ecosystem) | `wasLastAssistantAborted` helper pattern (line 201-205), single-active-loop guard with confirm dialog (line 359). **Path corrected evening 4**: was `kostyay/agent-stuff/pi-extensions/loop.ts` — wrong both in author and path. |
| ~~`tmustier/pi-extensions/pi-ralph-wiggum`~~ | **REMOVED evening 4**. Wiki claimed pause/resume + max-iteration cap; verification showed neither exists in the repo. Keep only as a generic ralph-loop reference, not for these patterns. |
| `latent-variable/pi-auto-continue` (ecosystem) | `setTimeout(...)` defer trick (verified line 52-55) to let agent settle into idle before injecting next message. Subscribes `agent_end`, calls `pi.sendUserMessage(text)`. Hard cap of 100 iterations. Disables on `ctx.signal?.aborted` (Escape). |

## Open issues to resolve during build

| Issue | Resolution path |
|---|---|
| In-process subagent (`ctx.modelRegistry.stream()`) — unverified pattern | Build a 30-line proof in step 3 before committing to the variant. If unworkable, drop and offer subprocess only. |
| Per-turn `systemPrompt` injection cost | Measure on long evolve runs. If material, switch to `customType` message that compacts naturally. |
| Compaction-preservation prompt wording | Borrow from `pi-evolve.ts:486-505`; iterate on observed compaction outputs. |
| Cycle detection (LLM stuck without making progress) | Track per-iteration deltas in `appendEntry`; stop on N consecutive iterations without state change. Threshold N=3 to start. |
| Unix socket survival across `/reload` | Test against pi `session_start` reason `"reload"`; bind once per process, not per session start. |
| Ordering of multiple `tool_call` bash interceptors | Document chain order; fabric's interceptor should be idempotent (skip if `PI_CALLBACK_SOCKET` already set). |

## Estimated effort

> **CRITICAL REVIEW FINDING**: The original "2-3 days" estimate is 3-5× too low. See [archive/research-2026-05-10-critical-plan-review.md](archive/research-2026-05-10-critical-plan-review.md) § 10 for the full critique. The revised honest estimate is below.

**Original plan**: ~1,500 LOC across five packages. Claimed 2-3 days.

**Revised honest estimate**: ~400-600 LOC for a minimal v1 (base + todo + ralph, no evolve/fabric). **1-2 weeks** for a proficient Pi extension developer, including integration testing, edge cases, and documentation.

| Package | Original LOC | Revised LOC | Revised Notes |
|---|---|---|---|
| base | ~200 | ~100 | Internal module (not standalone package). `attachLoopDriver` + `signal_loop_success` + compaction preservation. |
| todo | ~250 | ~200 | Loop driver + widget + `/todo-loop`. **Reassessment optional (default: off)** — reduces complexity and token cost. |
| ~~subagent~~ | — | — | Dropped. |
| fabric | ~250 | — | **Deferred** — independent capability, not v1 requirement. |
| ralph | ~200 | ~100 | Thin wrapper/configurator. Consider depending on existing ecosystem extensions instead of rebuilding. |
| evolve | ~600 | — | **Removed from v1** — unvalidated requirement, no upstream prototype, highest risk. |
| **Total v1** | **~1,500** | **~400** | Plus ~10 LOC meta-package. |
| Reused via soft-deps | ~6,600 | ~6,600 | tintinweb/pi-subagents + tintinweb/pi-manage-todo-list. |

**Why the original estimate was wrong**: It assumed "lift existing code" would be fast. But the existing code is either unverified drafts (pi-evolve.ts), demo-quality examples (todo.ts has no widget/loop driver), or ecosystem extensions with different semantics (mitsuhiko's loop has no reassessment). Integration testing, `/fork`/`/compact`/`/reload` edge cases, and real TUI testing consume most of the time — not the initial code writing.

**Build priority**: `base` → `todo` → integration tests → `ralph` (if time). Skip `evolve` and `fabric` for v1.

> **Note on `examples/extensions/subagent/index.ts`**: actual LOC is **987**, not the ~700 cited in earlier wiki.

## Cross-references

- [modular-architecture](modular-architecture.md) — package layout, dep DAG, delivery strategies, module-isolation constraint
- [concept](concept.md) — umbrella framing, four downstream concerns
- [pi-port](pi-port.md) — port architecture (in-session driver is THE port)
- [spirit-vs-opencode](spirit-vs-opencode.md) — divergence from opencode bash form
- [../implementations/pi-evolve-extension](../implementations/pi-evolve-extension.md) — canonical reference implementation
- [../implementations/pi-callback-extension](../implementations/pi-callback-extension.md) — fabric package design
- [../architecture/subprocess-rpc-rendering](../architecture/subprocess-rpc-rendering.md) — visibility-preserving subagent substrate
- [../architecture/steering-vs-followup](../architecture/steering-vs-followup.md) — `triggerTurn:true` + `deliverAs:"followUp"` semantics
- [../ecosystem/loop-extensions](../ecosystem/loop-extensions.md) — Ralph/until-done extensions to lift from
- [../ecosystem/todo-visualizations](../ecosystem/todo-visualizations.md) — TODO extension survey

---

## History & audit trail

For the full research history (decisions, verification passes, corrections, scale-down explorations):

- [archive/research-2026-05-10-comprehensive-verification-audit.md](archive/research-2026-05-10-comprehensive-verification-audit.md) — Latest audit: 70 claims checked.
- [archive/](archive/) — All research sessions.
