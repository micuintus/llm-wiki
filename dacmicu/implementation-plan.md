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

> **Superseded.** The single-extension design previously committed here has been replaced by the modular six-package monorepo described in [modular-architecture](modular-architecture.md). This page now serves as the build sequencing plan against that architecture.

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

**Updated evening 5**: total ~1,400 LOC across five packages (subagent dropped). Roughly 2-3 days for a proficient Pi extension developer. **Note**: earlier drafts cited `pi-evolve.ts` as a reference — this is a local draft, not upstream code. Use `mitsuhiko/agent-stuff/extensions/loop.ts` as the canonical production reference for the driver pattern.

| Package | LOC | Notes |
|---|---|---|
| base | ~200 | `attachLoopDriver` orchestrator + `signal_loop_success` tool + `session_before_compact` preservation. Up from ~150 to account for proper testing scaffolding. |
| todo | ~250 | Lifts most logic from `examples/extensions/todo.ts` (297 LOC verified) and adds the loop driver + reassessment step + snapshot renderer. |
| ~~subagent~~ | — | **Dropped evening 2.** `tintinweb/pi-subagents` (soft-dep) handles this. |
| fabric | ~250 | Socket server + bash interceptor + system-prompt fragment + 50-LOC CLI |
| ralph | ~200 | `/ralph` command, breakout tool, optional tintinweb subagent dispatch via `subagents:rpc:spawn` RPC, fallback to inline. |
| evolve | ~600 | New build — no validated upstream prototype. A 510-LOC draft exists locally (untracked, unverified) with the correct hook patterns but is not tested or production-ready. Design tools, ledger, and git logic from scratch; consume base's `attachLoopDriver()`; add ~50 LOC JSONL transcript writer for candidate inspection (works around Hopsken viewer's 500-char truncation). |
| **Total owned** | **~1,500** | Plus ~10 LOC `@pi-dacmicu/all` meta-package |
| Reused via soft-deps | ~6,600 | tintinweb/pi-subagents + tintinweb/pi-manage-todo-list. ~4.4× leverage. |

> **Note on `examples/extensions/subagent/index.ts`**: actual LOC is **987**, not the ~700 cited in earlier wiki. Order-of-magnitude unchanged but reference for own subagent build (if ever needed) was understated.

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
