---
title: DACMICU implementation plan for Pi
type: decision
updated: 2026-05-10
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

> **HISTORICAL. This plan describes the pre-2026-05-12 design.** The `LoopDriver` interface shown below (with `shouldContinue`, `buildIterationPrompt`, `systemPromptAddition`, `compactionSummary` and `appendSystemPrompt`) has been **superseded**. The current design is one method: `iterate(ctx) → Prompt | null`. See:
> - [research-2026-05-12-session-as-sot](archive/research-2026-05-12-session-as-sot.md) — the audit that drove the simplification
> - [runtime-walkthrough](runtime-walkthrough.md) — current API and turn-by-turn flow
> - [modular-architecture](modular-architecture.md) — current package layout
> - [concept § Log](concept.md#log) — chronological list of design changes
>
> The build sequence and effort estimates below remain useful context. The API snippets do not reflect current code; do not implement against them.

> **STOP. Two critical bugs found in deep review.** See [archive/research-2026-05-10-deep-implementation-review.md](archive/research-2026-05-10-deep-implementation-review.md): (1) pi-callback `wait:true` deadlocks by design — corrected by spawning subagent; (2) TODO state is lost on compaction — **NOW KNOWN TO BE WRONG**: the 2026-05-12 audit established that compaction does not prune the session file, and `getBranch()` survives compaction natively. The other 6 HIGH-severity findings remain valid. This plan reflects the older corrected designs.

> Prior critical review: [archive/research-2026-05-10-critical-plan-review.md](archive/research-2026-05-10-critical-plan-review.md).

## Build sequence

**Updated 2026-05-08**: `@pi-dacmicu/subagent` is dropped (reuse tintinweb instead). Now five packages plus a meta-package, build in dependency order.

| Step | Package | Depends on | Done when |
|---|---|---|---|
| 1 | `@pi-dacmicu/base` | (Pi core only) | `pi -e ./packages/base` registers `signal_loop_success`; an `agent_end` listener attached via the exported `attachLoopDriver()` helper drives a manual test loop. |
| 2 | `@pi-dacmicu/todo` | base | TODO tool reconstructs from session-scoped file (`~/.pi/dacmicu/state/<session-id>.json`); `/todo-loop` command activates driven mode; loop terminates on `unchecked == 0`; file survives `/compact`. Session entries are secondary (LLM-visible history). |
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

/** Append to systemPrompt without overwriting sibling extensions. */
export function appendSystemPrompt(current: string, addition: string): string;

/** Read/write session-scoped durable state (survives compaction). */
export function readState<T>(ctx: ExtensionContext, key: string): T | undefined;
export function writeState<T>(ctx: ExtensionContext, key: string, value: T): void;
```

`attachLoopDriver` returns a detach function. Consumers (todo, ralph, evolve) call it once during their factory, register their own tools, and base handles `agent_end` orchestration centrally — guarding `ctx.hasPendingMessages()`, checking abort, calling `sendMessage({triggerTurn:true, deliverAs:"followUp"})`.

**Single-driver sentinel**: `attachLoopDriver` checks `getBranch()` for an existing `dacmicu:driver` sentinel and throws if one is found. This prevents two DACMICU loop drivers from competing for the same session.

## Hooks each package uses

| Hook | base | todo | fabric | ralph | evolve |
|---|:-:|:-:|:-:|:-:|:-:|
| `agent_end` | ✓ (orchestrator) | (via base) | | (via base) | (via base) |
| `before_agent_start` | ✓ (chains via `appendSystemPrompt`) | ✓ | | ✓ | ✓ |
| `session_before_compact` | ✓ (writes state file, builds CompactionResult) | (via base) | | (via base) | (via base) |
| `session_start` / `session_tree` | ✓ (rehydrates from file) | ✓ | ✓ (socket bind) | | ✓ |
| `session_shutdown` | ✓ (cleanup) | | ✓ (socket close) | | |
| `tool_call` (bash) | | | ✓ (env injection) | | |
| `pi.sendMessage(triggerTurn:true)` | ✓ (sole caller, guarded by sentinel) | | | | |
| `pi.exec` | | | | | ✓ (git) |
| `pi.events.emit("subagents:rpc:spawn")` | | | | ✓ (two-step RPC) | ✓ (two-step RPC) |
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
| **In-process subagent for fabric `wait:true`** | Use `createAgentSession` if available; fallback to `pi --mode json -p --no-session` subprocess. Test both paths. |
| **Per-turn `systemPrompt` injection cost** | `before_agent_start` returning `{systemPrompt}` is per-turn, not cached. For long evolve sessions injecting selection.md every turn, measure whether this materially affects cost. Alternative: inject as `customType` message that compacts naturally. |
| **Compaction-preservation prompt wording** | Build `CompactionResult` with `details: {dacmicuState}` and file-backed fallback. Test: start loop → trigger compaction → verify state survives. |
| **Cycle detection (LLM stuck without making progress)** | Track per-iteration deltas in state file; stop on N consecutive iterations without state change. Threshold N=3 to start. |
| **Unix socket survival across `/reload`** | Test against pi `session_start` reason `"reload"`; bind once per process, not per session start. |
| **Ordering of multiple `tool_call` bash interceptors** | Document chain order; fabric's interceptor should be idempotent (skip if `PI_CALLBACK_SOCKET` already set). |
| **Reassessment phase state machine** | Implement `Phase = "work" | "reassess"` in base runtime. Test: verify loop alternates WORK → REASSESS → WORK. |
| **Single-driver sentinel collision** | Test: attach todo driver, then try attaching ralph driver → expect clear error. |
| **Subagent result extraction (evolve)** | Design parser for benchmark scores from `subagents:completed` `result` text. Handle timeouts, failures, malformed output. |

## Estimated effort

> **CRITICAL REVIEW FINDING**: The original "2-3 days" estimate is 3-5× too low. See [archive/research-2026-05-10-critical-plan-review.md](archive/research-2026-05-10-critical-plan-review.md) § 10 for the full critique. The revised honest estimate is below.

**Original plan**: ~1,500 LOC across five packages. Claimed 2-3 days.

**Revised honest estimate**: ~1,400-1,600 LOC for v1 (base + todo + ralph + evolve + fabric). **2-4 weeks** for a proficient Pi extension developer, including integration testing, edge cases, and documentation. See User Response below for priority decisions.

| Package | Original LOC | Revised LOC | Revised Notes |
|---|---|---|---|
| base | ~200 | **~250** | Internal module. `attachLoopDriver` + `signal_loop_success` + **file-backed state** (`readState`/`writeState`) + **compaction preservation** (CompactionResult with details) + **`appendSystemPrompt`** + **single-driver sentinel**. |
| todo | ~250 | **~250** | Loop driver + widget + `/todo-loop`. **Reassessment is load-bearing** (phase state machine: WORK → REASSESS → WORK). |
| ~~subagent~~ | — | — | Dropped. |
| fabric | ~250 | **~250** | Socket server + **subagent spawn for `wait:true`** + bash env injection. No `pi.wrapTool` (doesn't exist). |
| ralph | ~200 | **~150** | Thin wrapper around DACMICU base. Variant A default; Variant B via two-step subagent RPC. |
| evolve | ~600 | **~1,200** | **Significant rewrite required.** Draft is Variant A (in-session); target is Variant B (subagent-per-candidate). Includes: subagent spawn coordination, result extraction from `subagents:completed`, timeout handling, selection ledger. |
| **Total v1** | **~1,500** | **~2,100** | Plus ~10 LOC meta-package. |
| Reused via soft-deps | ~6,600 | **~5,723** | tintinweb/pi-subagents (~5,217) + tintinweb/pi-manage-todo-list (~506). |

**Why the original "2-3 days" estimate was wrong**: It assumed "lift existing code" would be fast. But the existing code is either unverified drafts (pi-evolve.ts), demo-quality examples (todo.ts has no widget/loop driver), or ecosystem extensions with different semantics. Integration testing, `/fork`/`/compact`/`/reload` edge cases, and real TUI testing consume most of the time — not the initial code writing.

**Build priority**: `base` → `todo` → `fabric` → `ralph` → `evolve` → integration tests.

## User Response to Critical Review (2026-05-10)

The user reviewed the critical plan review and made three priority decisions:

1. **Ralph**: Keep as thin wrapper around DACMICU base. Must be flexible to run in-session (Variant A) or on top of configured subagent infrastructure (Variant B). Not a standalone reimplementation — leverage the shared loop driver.

2. **Evolve**: Keep. This is a key feature the user wants to build. The lack of an upstream prototype is acknowledged; it will be built from scratch consuming base's `attachLoopDriver()`.

3. **Fabric**: Keep. User has already tried FABRIC-style composition in opencode and confirmed it works well. Wants it in Pi.

These decisions override the critical review's recommendations to remove evolve and defer fabric. The risk warnings from the critique remain valid (subagent RPC stability, evolve LOC estimate, reassessment unvalidated) but the scope is what the user wants.

**Revised v1 scope**: base + todo + ralph + evolve + fabric. **~2,100 LOC.** 2-4 weeks.

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
