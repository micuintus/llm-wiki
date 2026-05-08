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

Six packages, build in dependency order. Each step ends with a working `pi -e ./packages/<name>` invocation.

| Step | Package | Depends on | Done when |
|---|---|---|---|
| 1 | `@pi-dacmicu/base` | (Pi core only) | `pi -e ./packages/base` registers `signal_loop_success`; an `agent_end` listener attached via the exported `attachLoopDriver()` helper drives a manual test loop. |
| 2 | `@pi-dacmicu/todo` | base | TODO tool reconstructs from `getBranch()`; `/todo-loop` command activates driven mode; loop terminates on `unchecked == 0`; survives `/compact` via `session_before_compact`. |
| 3 | `@pi-dacmicu/subagent` | (none) | `spawn_agent` lifts the existing `examples/extensions/subagent/index.ts` patterns with parallel + chain modes; `ask_specialist` uses `ctx.modelRegistry.stream()` (verify pattern works first). |
| 4 | `@pi-dacmicu/fabric` | (none) | `pi-callback` CLI installed on PATH; bash `tool_call` interceptor prepends `PI_CALLBACK_SOCKET=...` to commands; round-trip from a bash heredoc through socket back to `pi.sendMessage` works. |
| 5 | `@pi-dacmicu/ralph` | base, subagent | `/ralph "<goal>"` command; per-iteration check optionally routes through subprocess subagent for fresh context; LLM-emitted `ralph_done` tool ends the loop. |
| 6 | `@pi-dacmicu/evolve` | base, subagent | Repackages `examples/extensions/pi-evolve.ts` to consume base's `attachLoopDriver()` instead of registering its own `agent_end` listener; `init/run/log_experiment` + `signal_evolve_success` tools unchanged; ledger and git logic unchanged. |

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

| Hook | base | todo | subagent | fabric | ralph | evolve |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `agent_end` | ✓ (orchestrator) | (via base) | | | (via base) | (via base) |
| `before_agent_start` | ✓ (chains additions) | ✓ | | | ✓ | ✓ |
| `session_before_compact` | ✓ (calls compactionSummary) | (via base) | | | (via base) | (via base) |
| `session_start` / `session_tree` | | ✓ | | ✓ (socket bind) | | ✓ |
| `session_shutdown` | ✓ (cleanup) | | | ✓ (socket close) | | |
| `tool_call` (bash) | | | | ✓ (env+timeout) | | |
| `pi.sendMessage(triggerTurn:true)` | ✓ (sole caller) | | | | | |
| `pi.exec` | | | ✓ (subprocess) | | | ✓ (git) |
| `pi.registerTool` | ✓ (`signal_loop_success`) | ✓ | ✓ | | ✓ (`ralph_done`) | ✓ |
| `pi.registerCommand` | | ✓ (`/todo-loop`, `/todos`) | | | ✓ (`/ralph`) | ✓ (`/evolve`) |

This matrix is normative: only `base` writes to `pi.sendMessage(triggerTurn:true)`, ensuring single-driver invariant.

## Reference implementations to lift from

| Source | What to take |
|---|---|
| `examples/extensions/pi-evolve.ts` | The whole `agent_end` driver pattern, `session_before_compact` summary shape, `before_agent_start` system-prompt injection, `session_start`/`session_tree` rehydration, `signal_evolve_success` breakout. Refactor to consume base's `attachLoopDriver()`. |
| `packages/coding-agent/examples/extensions/todo.ts` | TODO tool with state in tool-result `details`, branching-safe via `getBranch()` reconstruction, `/todos` UI component. |
| `packages/coding-agent/examples/extensions/subagent/index.ts` | Subprocess invocation (`pi --mode json -p --no-session`), event parsing (`message_end`, `tool_result_end`), inline rendering with Pi's exported components, single/parallel/chain modes, abort handling. |
| `packages/coding-agent/examples/extensions/plan-mode/index.ts` | The `agent_end` → `sendMessage({triggerTurn:false})` interactive variant; useful for ralph's interactive confirm-before-continue. |
| `kostyay/agent-stuff/pi-extensions/loop.ts` (ecosystem) | `wasLastAssistantAborted` helper pattern, condition-summarization for status widget, single-active-loop guard. |
| `tmustier/pi-extensions/pi-ralph-wiggum` (ecosystem) | Pause/resume via session state, max-iteration cap pattern. |
| `latent-variable/pi-auto-continue` (ecosystem) | `setTimeout(..., 0)` defer trick to let agent settle into idle before injecting next message. |

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

Total: ~1700 LOC across six packages. Roughly 2-3 days for a proficient Pi extension developer working from `pi-evolve.ts` as the reference.

| Package | LOC | Notes |
|---|---|---|
| base | ~150 | Mostly the `attachLoopDriver` orchestrator + `signal_loop_success` tool |
| todo | ~250 | Lifts most logic from `examples/extensions/todo.ts` (~290 LOC) and adds the loop driver |
| subagent | ~400 | Lifts most logic from `examples/extensions/subagent/index.ts` (~700 LOC) but drops scope discovery (use single-agent default), keeps modes |
| fabric | ~250 | Socket server + bash interceptor + system-prompt fragment + 50-LOC CLI |
| ralph | ~150 | Thin: `/ralph` command, breakout tool, optional subagent dispatch |
| evolve | ~500 | Lift `pi-evolve.ts` (510 LOC) almost as-is; refactor agent_end to base's helper |

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
