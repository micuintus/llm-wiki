---
title: DACMICU — concept
type: concept
updated: 2026-05-08
sources:
  - ~/.pi/agent/sessions/--Users-michael.voigt-devel-AI-aiAgentResearch-agents-pi-mono--/2026-04-17T13-29-34-211Z_019d9ba1-ef03-7425-ab23-be00d42dde15.jsonl
  - https://github.com/anomalyco/opencode/pull/20074
  - https://github.com/micuintus/opencode/tree/feat/DACMICU_20018
tags: [dacmicu, agent-loop, todo, subagent, loop-variants]
updated: 2026-05-08
see_also:
  - "../../MetaHarness/llm-wiki/proposals/mats.md"
  - "../../MetaHarness/llm-wiki/systems/meta-harness.md"
  - "../../MetaHarness/llm-wiki/concepts/history-mechanisms.md"
  - "../../MetaHarness/llm-wiki/concepts/deterministic-agent-loops.md"
  - "pi-port.md"
  - "modular-architecture.md"
  - "implementation-plan.md"
  - "spirit-vs-opencode.md"
  - "../implementations/pi-callback-extension.md"
  - "../implementations/pi-evolve-extension.md"
  - "../architecture/pi-print-rpc-vs-oc-check.md"
  - "../ecosystem/loop-extensions.md"
  - "../ecosystem/claude-code-loop.md"
  - "../architecture/loop-internals.md"
  - "../comparisons/loop-architectures.md"
---

# DACMICU — concept

DACMICU lets the LLM construct its own deterministic agent loop — emitting a script that drives further LLM iterations under explicit control rather than relying on the model to decide when to recurse. Originated as opencode PR #20074; under port to Pi as Voigt's main use case #4.

## Two loop variants — the load-bearing distinction

DACMICU has **two architectural variants**, picked by whether each iteration needs context continuity or context isolation. They are different products built on the same `agent_end`-driven scheduler:

| Variant | Context across iterations | Substrate per iteration | Use case |
|---|---|---|---|
| **A — In-session loop** | **Shared.** Each iteration appends to the same `state.messages` array. | Another turn in the parent `AgentSession` via `pi.sendMessage({triggerTurn:true, deliverAs:"followUp"})`. | TODO-style decomposition where each item builds on the last; agent needs to remember earlier work. |
| **B — Subagent-per-iteration loop** | **Isolated.** Each iteration starts with an empty `state.messages`. | Fresh `AgentSession` per turn (in-process via `createAgentSession`, or subprocess via `pi --mode json`). | Independent tasks, parallel fan-out, context-budget protection, MATS-style code-evolution where each candidate must be evaluated cleanly. |

Both variants share the same outer loop driver (`@pi-dacmicu/base`'s `attachLoopDriver()`) — what differs is what runs *inside* each iteration. Variant A runs `pi.sendMessage` against the parent session; Variant B spawns a subagent and waits for its result.

**Subagents are by definition context-isolated.** There is no such thing as an "in-session subagent" — if you're sharing the parent's `state.messages`, you're just another turn (Variant A), not a subagent. The orthogonal axis "subprocess vs in-process" describes *where the subagent runs*, not whether it has its own context. See [ecosystem/subagents](../ecosystem/subagents.md) for the full taxonomy.

## Umbrella framing (six modular packages)

DACMICU is the **umbrella primitive** unifying four downstream concerns, plus two infrastructural ones. Implementation is a six-package monorepo (see [modular-architecture](modular-architecture.md)) sharing one runtime library:

1. **Ralph Loop** (`@pi-dacmicu/ralph`) — dispatches Variant A (in-session) or Variant B (subagent-per-iteration) per task / user request. Variant B consumes a third-party subagent provider via `pi.events` RPC.
2. **FABRIC-style composition** (`@pi-dacmicu/fabric`) — agent as a stage in a Unix pipeline; bash-callback infrastructure. Independent of the loop primitive (see Correction below).
3. **TODO system base** (`@pi-dacmicu/todo`) — structured TODO list as the loop's natural state machine. Variant A consumer. Hard-depends on `@pi-dacmicu/base`.
4. **`pi evolve` foundation** (`@pi-dacmicu/evolve`) — MATS-style code-evolution loop. Variant B consumer (each candidate evaluated in isolation). Prototyped as `examples/extensions/pi-evolve.ts` (510 LOC, in-tree); will be repackaged consuming `@pi-dacmicu/base` + a third-party subagent provider. See [pi-evolve-extension](../implementations/pi-evolve-extension.md).
5. **Loop primitive** (`@pi-dacmicu/base`) — `agent_end`-driven scheduler with compaction preservation, abort detection, and breakout tool. Substrate-agnostic (Variant A or B). Exports the runtime as a library for the four consumers above.
6. ~~**Subagents** (`@pi-dacmicu/subagent`)~~ — **dropped 2026-05-08.** Standing on Hopsken/tintinweb's shoulders: Variant B consumers integrate via `pi.events`-based RPC against an installed `Hopsken/pi-subagents` (or `tintinweb/pi-subagents`). Rationale: their `createAgentSession` + ConversationViewer + agent-tree widget + cross-extension RPC is ~10K LOC of production-validated code we'd otherwise reinvent. See [Subagent build-vs-reuse decision](#subagent-build-vs-reuse-decision-2026-05-08) below.

The four downstream concerns are specializations of the loop primitive in `base` with different termination predicates and execution substrates — not separate features. Splitting into packages reflects user-facing concerns (each is independently useful), not a fragmentation of the underlying primitive.

## Subagent build-vs-reuse decision (2026-05-08)

**Decision: drop `@pi-dacmicu/subagent`. Variant B consumers depend on `Hopsken/pi-subagents` (or its superset `tintinweb/pi-subagents`) via `pi.events` RPC.**

### Why reuse, not build

The deep ecosystem cascade ([ecosystem/subagents](../ecosystem/subagents.md)) found that Hopsken/tintinweb already ship a production-grade subagent extension covering everything Variant B needs:

| Capability we need | Hopsken/tintinweb | Cost to rebuild |
|---|---|---|
| In-process subagent via `createAgentSession` | `src/agent-runner.ts` (439 LOC) | ~400 LOC |
| Subprocess subagent via `pi --mode json` (optional) | not implemented; only in-process | n/a (we'd add) |
| ConversationViewer modal (live `session.subscribe` updates, opencode-Tab-equivalent) | `src/ui/conversation-viewer.ts` (243 LOC) | ~250 LOC |
| Always-visible agent-tree widget (Braille spinners, live tool activity, token counts) | `src/ui/agent-widget.ts` (488 LOC) | ~500 LOC |
| Cross-extension RPC (`pi.events.on/emit` with scoped reply channels, `PROTOCOL_VERSION`, success/error envelope) | `src/cross-extension-rpc.ts` (95 LOC) | ~100 LOC |
| Custom agent loading from `.pi/agents/*.md` (project + global) | `src/custom-agents.ts` (137 LOC) | ~150 LOC |
| Themed completion notifications via `registerMessageRenderer` | `src/index.ts:199-330` | ~200 LOC |
| Background concurrency, queueing, group-join, abort | `src/agent-manager.ts` (409 LOC) | ~400 LOC |
| Steering, resume, inherit_context | `src/agent-runner.ts:steerAgent`, `src/context.ts` | ~150 LOC |
| Worktree isolation | already covered by tintinweb | ~300 LOC |

**Total avoided: ~2400 LOC of production-validated, actively-maintained, well-tested code.** Including the ones we'd inevitably rebuild incompletely.

### Coupling shape

`@pi-dacmicu/ralph` and `@pi-dacmicu/evolve` (Variant B consumers) emit on the `pi.events` bus:

```ts
const requestId = randomUUID();
pi.events.emit("subagents:rpc:spawn", {
  requestId, type: "general-purpose", prompt, options: { ... },
});
const result = await new Promise(resolve => {
  pi.events.on(`subagents:rpc:spawn:reply:${requestId}`, resolve);
});
```

That's it. No bundled subagent code. `Hopsken/pi-subagents` (installed separately) handles the rest. If it's not installed, the Variant B consumer degrades gracefully to a "subagent provider missing" notification or falls back to running Variant A.

### What we **do** still own

- The **outer loop driver** in `@pi-dacmicu/base` — that's a different primitive (`agent_end` listener + `triggerTurn`), not a subagent.
- The **deterministic TODO system** in `@pi-dacmicu/todo` — Variant A consumer, no subagent dependency.
- **FABRIC** in `@pi-dacmicu/fabric` — orthogonal capability (Unix pipeline composition).
- **Variant B orchestration logic** in `@pi-dacmicu/ralph` and `@pi-dacmicu/evolve` — what to spawn, when to spawn, how to combine results. Hopsken provides the *vehicle*, not the *driver*.

### Open verification (must check before relying on this)

1. Hopsken's `subagents:rpc:spawn` contract is stable across releases; their `PROTOCOL_VERSION` mechanism suggests yes, but confirm semver guarantees.
2. License compatibility (Hopsken/tintinweb both MIT — checked in their `LICENSE` files).
3. Whether `createAgentSession` from `@earendil-works/pi-coding-agent` exposes everything we'd need that Hopsken doesn't already wrap.

### Fallback

If integration friction proves too high (e.g. Hopsken's RPC contract is too opinionated for our use case), the fallback is a thin `@pi-dacmicu/subagent` that wraps `createAgentSession` directly — ~400 LOC, no UI layer, no cross-extension RPC. Visibility & navigability would be lost in that path. Avoid unless forced.

## Correction: FABRIC is not a DACMICU prerequisite

Earlier framing implied DACMICU needed the `pi` CLI / Unix-socket infrastructure to reach opencode parity. That conflated two distinct mechanisms:

- opencode's bash-callback DACMICU is a *workaround* for opencode lacking native `agent_end` / `triggerTurn` events, not a feature DACMICU requires.
- Pi's in-agent driver covers Ralph loops natively, more cleanly than opencode's bash form, while preserving the single-context-window guarantee.

FABRIC composition (M20 in [deterministic-agent-control-mechanisms](../concepts/deterministic-agent-control-mechanisms.md)) remains a real Pi gap, but it is an **independent capability** — useful for shell pipelines, not for the loop-until-done pattern DACMICU implements. See [spirit-vs-opencode](spirit-vs-opencode.md) for the full mapping.

## Key claims

- Core primitive: the LLM, on realizing a task decomposes, can write a deterministic loop (e.g. `while (TASKS in TODO) { 1. update TODO, 2. pick top, 3. invoke LLM on it }`) and the runtime executes it. The LLM influences its own future iterations by *writing the script*, not by being asked again.
- ~~Distinction from subagents: subagents spawn child contexts with condensed result-API handover (lossy). DACMICU keeps everything in one context and uses the LLM-as-pseudo-user pattern — each loop step is an LLM query phrased as if the user had asked.~~ **Refined 2026-05-08**: DACMICU has *both* an in-context variant (Variant A, original description) AND a subagent-per-iteration variant (Variant B). The original framing privileged Variant A; both are first-class. The choice is determined by the problem, not by DACMICU's identity.
- For **simple cases** the entire iteration should happen in the same context (no loop emitted). DACMICU is gated by complexity, not always-on.
- Connects to TODO-rendering (visible widget) and to subagent science (minimal-primitives synthesis): DACMICU may *be* the minimal subagent primitive evidence pointed toward.
- Origin: [opencode PR #20074](https://github.com/anomalyco/opencode/pull/20074); Voigt's tracking branch: [feat/DACMICU_20018](https://github.com/micuintus/opencode/tree/feat/DACMICU_20018).

## Open questions

- Exact opencode primitive shape — is it a tool-call type, a special script block, or a meta-prompt directive?
- Termination semantics — what stops a runaway DACMICU loop?
- Cost model — naive deterministic-loop calling the LLM once per task can be more expensive than a single agent loop with good prompting; DACMICU's value is in tasks where context-window or determinism matters more than tokens.

## See also

### pi-mono wiki
- [modular-architecture](modular-architecture.md) — six-package monorepo, dep DAG, module-isolation constraint, delivery strategies
- [pi-port](pi-port.md) — porting DACMICU to Pi: `triggerTurn`, `agent_end`, extension hooks; in-session driver as THE port
- [implementation-plan](implementation-plan.md) — build sequence against the modular architecture
- [spirit-vs-opencode](spirit-vs-opencode.md) — synthesis: separating DACMICU's load-bearing ideas from the bash-callback substrate; spirit gaps and wins
- [../implementations/pi-callback-extension](../implementations/pi-callback-extension.md) — closes the mid-step recursive judgment gap
- [../implementations/pi-evolve-extension](../implementations/pi-evolve-extension.md) — current MATS-style consumer of the umbrella
- [ecosystem/loop-extensions](../ecosystem/loop-extensions.md) — Ralph/until-done extensions that validate the port architecture
- [ecosystem/claude-code-loop](../ecosystem/claude-code-loop.md) — Claude Code's `/loop` (cron, different problem)
- [architecture/loop-internals](../architecture/loop-internals.md) — the loop that runs the subagent
- [comparisons/loop-architectures](../comparisons/loop-architectures.md) — why Pi is friendlier than opencode2 for this

### MetaHarness wiki (research)
- [MATS](../../../../MetaHarness/llm-wiki/proposals/mats.md) — Minimal Agentic Tree Search: the research proposal DACMICU implements
- [Meta-Harness](../../../../MetaHarness/llm-wiki/systems/meta-harness.md) — filesystem-as-history precedent (10 MTok/iter)
- [History Mechanisms](../../../../MetaHarness/llm-wiki/concepts/history-mechanisms.md) — full-history vs compressed summaries
- [Selection Policies](../../../../MetaHarness/llm-wiki/concepts/selection-policies.md) — "no policy" design choice
- [Objective Hacking](../../../../MetaHarness/llm-wiki/concepts/objective-hacking.md) — why correctness gating is load-bearing
