---
title: pi-port
type: concept
updated: 2026-05-08
sources:
  - "concept.md"
  - "modular-architecture.md"
  - "../architecture/loop-internals.md"
  - "../architecture/subprocess-rpc-rendering.md"
  - "../../examples/extensions/pi-evolve.ts"
  - "../../packages/coding-agent/examples/extensions/todo.ts"
  - "../../packages/coding-agent/examples/extensions/subagent/index.ts"
  - "../../packages/coding-agent/examples/extensions/plan-mode/index.ts"
  - "https://github.com/sst/opencode/pull/20074"
  - "https://github.com/mitsuhiko/agent-stuff/blob/main/extensions/loop.ts"
  - "https://github.com/kostyay/agent-stuff/blob/main/pi-extensions/loop.ts"
  - "https://github.com/tmustier/pi-extensions/tree/main/pi-ralph-wiggum"
  - "https://github.com/lnilluv/pi-ralph-loop"
  - "https://github.com/latent-variable/pi-auto-continue"
see_also:
  - "concept.md"
  - "modular-architecture.md"
  - "implementation-plan.md"
  - "spirit-vs-opencode.md"
  - "../implementations/pi-callback-extension.md"
  - "../architecture/loop-internals.md"
  - "../architecture/subprocess-rpc-rendering.md"
  - "../comparisons/loop-architectures.md"
---

# Porting DACMICU to Pi

Pi has one canonical port of DACMICU: the **in-session driver** pattern, where an extension listens on `agent_end` and calls `pi.sendMessage({ triggerTurn: true, deliverAs: "followUp" })` to drive the next iteration in the same session. This preserves the single-context-window guarantee from [concept](concept.md) and renders every nested tool call inline natively.

The full architecture for the modular implementation lives in [modular-architecture](modular-architecture.md). This page focuses on **why this is the right port** and what alternatives exist.

## The two paths Pi supports

| Path | Mechanism | Use it for |
|---|---|---|
| **In-session driver** (DACMICU spirit) | Extension drives `agent_end` → `sendMessage({triggerTurn:true})` in same session. All hooks in pi-mono today. | Ralph, deterministic TODO loops, evolve. Anything where context continuity matters. |
| **Subprocess + RPC + custom rendering** (true subagent) | Spawn `pi --mode rpc` or `pi --mode json -p`; parse JSON event stream; re-render inline using Pi's exported components. See [subprocess-rpc-rendering](../architecture/subprocess-rpc-rendering.md). | Independent variants (evolve trials), heavy context that would blow the parent window, different model per iteration, parallelism. |

Both are real. The modular package design uses them in different consumers: `base` provides the in-session path; `subagent` provides the subprocess path; `ralph` and `evolve` compose both.

## Anti-pattern: bash + `pi --print`

The most literal port of opencode DACMICU — the LLM writes `while oc check "..."; do oc run "..."; done` translated to Pi as `while ...; do pi --print "..."; done` inside the bash tool — **does not work for DACMICU's UX in Pi**.

`pi --print` from inside the bash tool collapses every nested Pi call into a single bash output blob. The user sees text, not tool calls. Every inner `read`, `edit`, `bash`, subagent invocation is invisible. This kills the central DACMICU UX property: *"you see tools called by the script, you see the subagents."* See [subprocess-rpc-rendering — visibility check](../architecture/subprocess-rpc-rendering.md) for the four-option matrix.

The pattern works mechanically (deterministic loop, re-uses session state on disk, zero extension code) but trades away visibility, which is what makes DACMICU different from "just pipe pi to itself." Use it only for batch jobs where visibility doesn't matter, never as the primary DACMICU experience.

## Why in-session is THE port

Five reasons, each grounded in the verified pi-mono primitives:

1. **Single context window guaranteed by construction.** Iterations run in the same `Agent.prompt()` flow against the same session JSONL, same compaction state. Opencode's bash form sometimes spawns child sessions and loses this.
2. **Native rendering of every inner call.** No JSON re-parse, no UI translation. Each iteration's tool calls and assistant messages flow through pi's normal TUI path.
3. **State branches with the session tree.** Tool result `details` and `pi.appendEntry` entries are part of the session JSONL, so `/fork`, `/clone`, `/tree` all work correctly without any extra coordination.
4. **Compaction stays honest.** `session_before_compact` lets the extension provide a custom summary that preserves the loop's breakout condition (verified: `pi-evolve.ts:486`).
5. **The whole hook surface exists today.** Verified line-by-line against pi-mono source — see [modular-architecture — Verified Pi primitives](modular-architecture.md#verified-pi-primitives--what-each-package-uses).

## Reference implementations

The canonical **production** reference for the in-session driver pattern is `mitsuhiko/agent-stuff/extensions/loop.ts` (~250 LOC, 2,275 ⭐ repo). It implements the same hooks with `session_before_compact` preservation (the only extension in the ecosystem that does this correctly).

A 510-LOC draft was written during DACMICU planning at `examples/extensions/pi-evolve.ts` (untracked at repo root, unverified). It implements the same hook patterns correctly but is **not an upstream reference** — see [verification audit](../research-2026-05-10-comprehensive-verification-audit.md) § Category 2 for the full provenance correction. The draft's line numbers are accurate but confer no external validation.

- `agent_end` listener with `ctx.hasPendingMessages()` guard, then `pi.sendMessage({customType, content, display:false}, {triggerTurn:true, deliverAs:"followUp"})`
- `before_agent_start` returning `{ systemPrompt: event.systemPrompt + extra }` for per-turn loop context injection
- `session_before_compact` returning `{ compaction: { summary, firstKeptEntryId, tokensBefore } }` for state preservation
- `session_start` and `session_tree` listeners that reconstruct extension state from `ctx.sessionManager.getBranch()` over tool result `details`
- A `signal_evolve_success` tool the LLM can call to break out of the loop

The modular `@pi-dacmicu/base` package extracts this pattern into a reusable `attachLoopDriver()` helper so todo, ralph, and evolve don't reimplement it three times.

## Hook surface required (all available)

| Hook | Purpose | Verified at |
|---|---|---|
| `pi.on("agent_end", ...)` | Observe loop completion | `plan-mode/index.ts:220` |
| `pi.sendMessage({...}, {triggerTurn:true, deliverAs:"followUp"})` | Start next iteration | `core/agent-session.ts:1268-1295` |
| `pi.on("before_agent_start", ...)` returning `{systemPrompt}` or `{message}` | Inject per-turn loop context | `extensions.md:471-475` |
| `pi.on("session_before_compact", ...)` returning custom compaction | Preserve state across compaction | `extensions.md:413` |
| `pi.on("session_start" / "session_tree", ...)` | Rehydrate state | `examples/extensions/todo.ts` |
| `ctx.hasPendingMessages()` | Guard against double-firing | types `core/extensions/types.ts:318` |
| `pi.registerTool` for the breakout tool | LLM-initiated stop | `extensions.md:77` |
| `pi.appendEntry(customType, data)` | Persist non-branching driver state | `extensions.md`, `runner.ts:277` |

## Validation by ecosystem

The in-session driver pattern is independently implemented in the wild by at least four published Pi extensions:

- `mitsuhiko/agent-stuff/extensions/loop.ts` — Armin Ronacher; canonical DACMICU pattern in Pi
- `kostyay/agent-stuff/pi-extensions/loop.ts` — `signal_loop_success` tool, `session_before_compact` preservation, `wasLastAssistantAborted` userland helper
- `tmustier/pi-extensions/pi-ralph-wiggum` — pause/resume via session state, max-iteration cap, `before_agent_start` system-prompt injection
- `latent-variable/pi-auto-continue` — `setTimeout(..., 0)` defer trick to let agent settle into idle before injecting next message

The 510-LOC draft at `examples/extensions/pi-evolve.ts` implements the same patterns but is untracked and unverified — not a reference, just a planning artifact.

The subprocess + RPC alternative is implemented by:

- `examples/extensions/subagent/index.ts` (in-tree, the cleanest reference for visibility-preserving subagents)
- `ralph-loop-pi` and `lnilluv/pi-ralph-loop` (ecosystem)

Full ecosystem survey: [loop-extensions](../ecosystem/loop-extensions.md).

## Cross-references

### pi-mono wiki
- [concept](concept.md) — what DACMICU is, four-aspect umbrella framing
- [modular-architecture](modular-architecture.md) — six-package monorepo, dep DAG, module-isolation constraint, delivery strategies
- [implementation-plan](implementation-plan.md) — build sequence against the modular architecture
- [spirit-vs-opencode](spirit-vs-opencode.md) — what we keep, what we drop, what we replace
- [../implementations/pi-callback-extension](../implementations/pi-callback-extension.md) — the FABRIC package design (closes the recursive self-reach gap)
- [../implementations/pi-evolve-extension](../implementations/pi-evolve-extension.md) — canonical in-tree reference; will be repackaged as `@pi-dacmicu/evolve`
- [../architecture/loop-internals](../architecture/loop-internals.md) — line-precise walk-through of pi's inner loop
- [../architecture/subprocess-rpc-rendering](../architecture/subprocess-rpc-rendering.md) — the visibility-preserving subagent pattern
- [../architecture/steering-vs-followup](../architecture/steering-vs-followup.md) — why `triggerTurn:true` + `deliverAs:"followUp"` is the correct loop-driver primitive
- [../comparisons/loop-architectures](../comparisons/loop-architectures.md) — pi-mono vs opencode2 vs Claude Code
- [../ecosystem/loop-extensions](../ecosystem/loop-extensions.md) — Ralph and until-done extension survey

### MetaHarness wiki (research)
- [MATS](../../../../MetaHarness/llm-wiki/proposals/mats.md) — research proposal this implementation serves
- [Deterministic Agent Loops](../../../../MetaHarness/llm-wiki/concepts/deterministic-agent-loops.md) — Pi hooks in the broader landscape
