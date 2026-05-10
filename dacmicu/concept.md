---
title: DACMICU — concept
type: concept
sources:
  - ~/.pi/agent/sessions/--Users-michael.voigt-devel-AI-aiAgentResearch-agents-pi-mono--/2026-04-17T13-29-34-211Z_019d9ba1-ef03-7425-ab23-be00d42dde15.jsonl
  - https://github.com/anomalyco/opencode/pull/20074
  - https://github.com/micuintus/opencode/tree/feat/DACMICU_20018
tags: [dacmicu, agent-loop, todo, subagent, loop-variants]
updated: 2026-05-10
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
  - "archive/research-2026-05-10-comprehensive-verification-audit.md"
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

### Variant A in five primitives

The lightweight in-session loop is implemented entirely from existing Pi extension hooks. No subagent host, no subprocess, no second model registry. ~150 LOC fits in `@pi-dacmicu/base`. Full mechanics: [pi-port](pi-port.md).

1. **`agent_end` listener** — fires after every assistant turn; the natural decision point for "loop or stop". Note: `event.messages` contains only the **current cycle's** messages, not the full loop history. For cross-iteration state, use `ctx.sessionManager.getBranch()` or `pi.appendEntry()`.
2. **Termination predicate** — any of: `signal_loop_success` called, task predicate false, turn aborted, **`ctx.hasPendingMessages()` true** (yield to user mid-turn). **Iteration cap** can be added as a mechanical guardrail (default: 50) but is NOT present in the canonical reference (`mitsuhiko/agent-stuff/loop.ts`). Without an added cap, **zero** termination conditions are fully mechanical — all require LLM cooperation or user action.
3. **`pi.sendMessage({customType, content, display:true}, {triggerTurn:true, deliverAs:"followUp"})`** — when the agent is idle (normal at `agent_end`), this starts a new turn via `agent.prompt()`. When the agent is streaming (rare at `agent_end` but possible with concurrent events), it queues via `agent.followUp()`. The `deliverAs` parameter is ignored in the idle path; `followUp` is used only during streaming. See [steering-vs-followup](../architecture/steering-vs-followup.md) for the full path matrix.
4. **`signal_loop_success` tool** — LLM-callable break statement.
5. **`session_before_compact` preservation** — no "marking" mechanism exists. Extensions return a full `CompactionResult` (summary text + `firstKeptEntryId` + `details`) to override default compaction behavior. Mitsuhiko's loop appends instructions to influence the LLM-generated summary text — it does NOT preserve specific messages. DACMICU's base package provides a `CompactionResult` with `details: {dacmicuState}` and a file-backed fallback. See [TODO-state fix](#todo-state-fix) below.

Not a subagent. Not a subprocess. Not autonomous — the LLM still drives every turn; the driver only schedules *when* the next turn fires.

## Deterministic TODO loop — the core DACMICU pattern

The TODO system is not just a list tool. It is the **state machine** that the deterministic loop drives:

```
User asks for a complex task
    ↓
LLM creates TODO list via manage_todo_list tool
    ↓
agent_end fires → DACMICU loop driver:
    CHECK → Read current TODO state from file
      ↓ unchecked > 0
    WORK → Inject top item as followUp
      ↓
LLM works that item, marks done via manage_todo_list
      ↓
agent_end fires → CHECK → Read updated state
      ↓ unchecked > 0
    REASSESS → Inject "reassess list validity" prompt
      ↓
LLM reviews list, updates via manage_todo_list (or leaves as-is)
      ↓
agent_end fires → CHECK → Read updated state
      ↓ unchecked > 0
    WORK → Inject new top item
      ↓
    ... (cycle: WORK → REASSESS → WORK → REASSESS ...)
      ↓
All items done → loop terminates
```

**Key design decisions:**

- **Loop driver runs on `agent_end`**, not as a tool the LLM calls. The LLM works items; the loop decides when to continue.
- **Reassessment is load-bearing.** Before working the next item, the loop injects a reassess turn: "Given what we just learned, is the TODO list still valid? Reorder? Merge? Add items?" The LLM updates the list via `manage_todo_list`. The driver then works the new top item. This adds one LLM turn per item (doubles token cost vs. no-reassess) but prevents blindly working stale TODOs.
- **Reassessment termination is implicit.** The reassess turn is a normal assistant iteration. At its `agent_end`, the driver reads the updated TODO state (from the file) and proceeds to the work turn. No special `confirm_reassessment` tool needed. The LLM signals completion by simply not calling `manage_todo_list` (implied: "list is fine, proceed").
- **Phase state machine:**
  ```
  Initial: user creates list → phase = WORK
  WORK turn completes → agent_end → CHECK → phase = REASSESS → inject reassess prompt
  REASSESS turn completes → agent_end → CHECK → phase = WORK → inject work prompt for top item
  unchecked == 0 at any CHECK → stop
  ```
- **TODO state is stored in a session-scoped file** (`~/.pi/dacmicu/state/<session-id>.json`). The file is the durable source of truth. Session entries (tool-result `details`) are secondary — they provide LLM-visible history but are **lost on compaction**. On `session_start`, the driver reads the file first, falls back to session-entry reconstruction for forks/new sessions.
- **File-backed storage branches with `/fork` via session IDs.** Each session (including forks) gets a unique ID; the state file is keyed by ID. This gives per-branch isolation without the fragility of session-entry scanning.
- **Session-entry persistence** (tool-result `details`) provides LLM-visible history but is **lost on compaction**. File-backed storage is the durable source of truth. Both are used: file for the driver, entries for the LLM.
- **No DAG, no auto-reminders, no active-task heuristics** — those fight loop-driver ownership.

See [TODO base decision](#todo-base-tintinwebpi-manage-todo-list) below for why `tintinweb/pi-manage-todo-list` is the right primitive.

## Umbrella framing (six modular packages)

DACMICU is the **umbrella primitive** unifying four downstream concerns, plus two infrastructural ones. Implementation is a six-package monorepo (see [modular-architecture](modular-architecture.md)) sharing one runtime library:

1. **Ralph Loop** (`@pi-dacmicu/ralph`) — dispatches Variant A (in-session) or Variant B (subagent-per-iteration) per task / user request. Variant B consumes a third-party subagent provider via `pi.events` RPC.
2. **FABRIC-style composition** (`@pi-dacmicu/fabric`) — agent as a stage in a Unix pipeline; bash-callback infrastructure. Independent of the loop primitive (see Correction below).
3. **TODO system base** (`@pi-dacmicu/todo`) — deterministic outer loop on `manage_todo_list` state. Variant A consumer. Hard-depends on `@pi-dacmicu/base`. See [deterministic TODO loop](#deterministic-todo-loop--the-core-dacmicu-pattern) above.
4. **`pi evolve` foundation** (`@pi-dacmicu/evolve`) — MATS-style code-evolution loop. **Target: Variant B consumer** (each candidate evaluated in isolation via subagent). The existing 510-LOC draft (`examples/extensions/pi-evolve.ts`) is **Variant A** (in-session git operations, no subagent code). Variant B requires significant rewrite: subagent spawn coordination, result extraction from `subagents:completed` events, per-candidate timeout handling. **Realistic LOC estimate: 1,000-1,500**, not 600.
5. **Loop primitive** (`@pi-dacmicu/base`) — `agent_end`-driven scheduler with compaction preservation, abort detection, and breakout tool. Substrate-agnostic (Variant A or B). Exports the runtime as a library for the four consumers above.
6. ~~**Subagents** (`@pi-dacmicu/subagent`)~~ — **dropped 2026-05-08.** Standing on the existing Pi subagent ecosystem. **v1 simplification: depend only on `tintinweb/pi-subagents`** (which exposes Claude Code-idiomatic `Agent`/`get_subagent_result`/`steer_subagent` tools — `Agent` is the canonical name; `Task` is a doc alias. LLM training-known shapes, free prompt tokens). No multi-mode `delegate()` API; the LLM uses tintinweb's `Agent` tool directly. Variant A (inline) is default; Variant B (subagent) opt-in via tintinweb's tools. `HazAT/pi-interactive-subagents` integration deferred to v1.x.

> **Action item from evening-3 verification**: pi was rebranded `@mariozechner/*` → `@earendil-works/*` (commits `551385e4`, `3e5ad67e`). tintinweb still pins legacy scope. `@pi-dacmicu/*` peer-deps must use **`@earendil-works/pi-coding-agent`**. Both scopes work today (legacy alias still publishes); plan for tintinweb release that updates peer-deps.

The four downstream concerns are specializations of the loop primitive in `base` with different termination predicates and execution substrates — not separate features. Splitting into packages reflects user-facing concerns (each is independently useful), not a fragmentation of the underlying primitive.

## Subagent build-vs-reuse decision (2026-05-08)

**Decision: drop `@pi-dacmicu/subagent`. Variant B consumers depend on `Hopsken/pi-subagents` (or its superset `tintinweb/pi-subagents`) via `pi.events` RPC.**

### Why reuse, not build

The deep ecosystem cascade ([ecosystem/subagents](../ecosystem/subagents.md)) found that Hopsken/tintinweb already ship a production-grade subagent extension covering everything Variant B needs:

| Capability we need | Hopsken/tintinweb | Cost to rebuild |
|---|---|---|
| In-process subagent via `createAgentSession` | `src/agent-runner.ts` (439 LOC) | ~400 LOC |
| Subprocess subagent via `pi --mode json` (optional) | not implemented; only in-process | n/a (we'd add) |
| ConversationViewer modal (live `session.subscribe` updates — read-only, 500-char-truncated, single-agent, modal-blocks-parent; **NOT a Tab-switch equivalent**) | `src/ui/conversation-viewer.ts` (243 LOC) | ~250 LOC |
| Always-visible agent-tree widget (Braille spinners, live tool activity, token counts) | `src/ui/agent-widget.ts` (488 LOC) | ~500 LOC |
| Cross-extension RPC (`pi.events.on/emit` with scoped reply channels, `PROTOCOL_VERSION`, success/error envelope) | `src/cross-extension-rpc.ts` (95 LOC) | ~100 LOC |
| Custom agent loading from `.pi/agents/*.md` (project + global) | `src/custom-agents.ts` (137 LOC) | ~150 LOC |
| Themed completion notifications via `registerMessageRenderer` | `src/index.ts:199-330` | ~200 LOC |
| Background concurrency, queueing, group-join, abort | `src/agent-manager.ts` (409 LOC) | ~400 LOC |
| Steering, resume, inherit_context | `src/agent-runner.ts:steerAgent`, `src/context.ts` | ~150 LOC |
| Worktree isolation | already covered by tintinweb | ~300 LOC |

**Total avoided: ~2400 LOC of production-validated, actively-maintained, well-tested code.** Including the ones we'd inevitably rebuild incompletely.

### Coupling shape

`@pi-dacmicu/ralph` and `@pi-dacmicu/evolve` (Variant B consumers) emit on the `pi.events` bus. **The RPC is two-step**: spawn returns an ID synchronously; completion arrives via a separate event.

```ts
// Step 1: Spawn
const requestId = randomUUID();
pi.events.emit("subagents:rpc:spawn", {
  requestId, type: "general-purpose", prompt, options: { ... },
});
const { id } = await new Promise(resolve => {
  pi.events.on(`subagents:rpc:spawn:reply:${requestId}`, resolve);
});

// Step 2: Wait for completion
const result = await new Promise((resolve, reject) => {
  const offC = pi.events.on("subagents:completed", (data) => {
    if (data.id === id) { offC(); offF(); resolve(data); }
  });
  const offF = pi.events.on("subagents:failed", (data) => {
    if (data.id === id) { offC(); offF(); reject(data); }
  });
  // Add your own timeout race
});
```

The reply contains `{id: string}`, not the subagent's result. Result extraction is from `result.result` (the subagent's final output text) — brittle for structured data like benchmark scores. Evolve must parse numbers from prose.

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

## TODO base: `tintinweb/pi-manage-todo-list`

**Decision:** `@pi-dacmicu/todo` peer-depends on `tintinweb/pi-manage-todo-list`. The loop driver reads its state via session-entry scanning; the LLM mutates state via the idiomatic `manage_todo_list` tool.

### Why not `edxeth/pi-tasks` (the strongest full task system in Pi)

`edxeth/pi-tasks` has better visualization (stats, 3-view widget, active-task tracking) but is a **poor foundation for a deterministic loop**:

| Concern | `tintinweb/pi-manage-todo-list` | `edxeth/pi-tasks` |
|---|---|---|
| **Storage** | Session-entry `details` (branches with `/fork` for free) | File-backed (`~/.pi/tasks/` — branches silently overwrite shared files) |
| **Tool surface** | 1 tool (`manage_todo_list`) | 5 tools (`task_create/list/get/update/batch`) — more for LLM to misuse |
| **Dependency DAG** | **None** — flat list, loop owns ordering | Built-in `blocks`/`blockedBy` — LLM can bypass loop's ordering |
| **Opinionated behavior** | None — pure state primitive | Stats, reminders, active-task heuristics, system-policy injection — fights loop driver |
| **Read from loop driver** | Scan `ctx.sessionManager.getBranch()` for tool results | Must read JSON files, understand format, handle locks |

The dealbreaker is the **dependency DAG**: if the LLM can express "task B blocks task A," it will use that to drive ordering instead of the loop's reassessment step. The DAG and the loop driver compete for control of "what's next."

**Use `edxeth/pi-tasks`** when you want a full Claude Code-style task experience in Pi. **Use `tintinweb/pi-manage-todo-list`** when you want a passive state primitive for a deterministic loop.

## Correction: FABRIC is not a DACMICU prerequisite

Earlier framing implied DACMICU needed the `pi` CLI / Unix-socket infrastructure to reach opencode parity. That conflated two distinct mechanisms:

- opencode's bash-callback DACMICU is a *workaround* for opencode lacking native `agent_end` / `triggerTurn` events, not a feature DACMICU requires.
- Pi's in-agent driver covers Ralph loops natively, more cleanly than opencode's bash form, while preserving the single-context-window guarantee.

FABRIC composition (M20 in [deterministic-agent-control-mechanisms](../concepts/deterministic-agent-control-mechanisms.md)) remains a real Pi gap, but it is an **independent capability** — useful for shell pipelines, not for the loop-until-done pattern DACMICU implements. See [spirit-vs-opencode](spirit-vs-opencode.md) for the full mapping.

## Single-driver invariant enforcement

Pi's extension runner fires **all** `agent_end` handlers from **all** extensions sequentially (`runner.ts:emit()`, ~lines 470-510). There is no enforcement that only one calls `sendMessage(triggerTurn:true)`. If two loop extensions are active simultaneously, both fire `triggerTurn`, producing alternating prompts with undefined ordering.

**DACMICU's enforcement pattern** (in `@pi-dacmicu/base`):

```typescript
const DRIVER_SENTINEL = "dacmicu:driver";

export function attachLoopDriver(pi: ExtensionAPI, driver: LoopDriver): () => void {
  // Check if another driver is already active
  const branch = pi.sessionManager?.getBranch?.() || [];
  const hasDriver = branch.some(e => e.type === "app" && e.customType === DRIVER_SENTINEL);
  if (hasDriver) {
    throw new Error(`Another DACMICU loop driver is already active. Detach it first.`);
  }
  
  // Register sentinel
  pi.appendEntry({ type: "app", customType: DRIVER_SENTINEL, data: { driverId: driver.driverId } });
  
  // Attach actual listener
  const off = pi.on("agent_end", async (event, ctx) => { ... });
  
  return () => {
    off();
    // Sentinel stays in branch (harmless); new sessions won't see it
  };
}
```

This is a **convention + check**, not core enforcement. Documented limitation: if two non-DACMICU loop extensions are active (e.g. mitsuhiko's loop + latent-variable's auto-continue), DACMICU cannot prevent their collision. The user must not run multiple loop extensions simultaneously.

## `before_agent_start` systemPrompt chaining

`before_agent_start` handlers receive `event.systemPrompt` (the current prompt) and can return `{systemPrompt: string}` to replace it. **Each handler sees the previous handler's result.** If extension B returns just its own fragment, extension A's contribution is lost.

**DACMICU's `appendSystemPrompt` helper** (in `@pi-dacmicu/base`):

```typescript
export function appendSystemPrompt(current: string, addition: string): string {
  return addition ? `${current}\n\n${addition}` : current;
}

// Usage in a handler:
pi.on("before_agent_start", async (event, ctx) => {
  const todoContext = getTodoContext(ctx);
  return { systemPrompt: appendSystemPrompt(event.systemPrompt, todoContext) };
});
```

All DACMICU packages use this helper. Documented contract: "Read `event.systemPrompt`, append your fragment, return the result. Never return just your fragment."

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
- [ecosystem/todo-visualizations](../ecosystem/todo-visualizations.md) — TODO ecosystem survey, including edxeth/pi-tasks assessment
- [ecosystem/claude-code-loop](../ecosystem/claude-code-loop.md) — Claude Code's `/loop` (cron, different problem)
- [architecture/loop-internals](../architecture/loop-internals.md) — the loop that runs the subagent
- [comparisons/loop-architectures](../comparisons/loop-architectures.md) — why Pi is friendlier than opencode2 for this

### MetaHarness wiki (research)
- [MATS](../../../../MetaHarness/llm-wiki/proposals/mats.md) — Minimal Agentic Tree Search: the research proposal DACMICU implements
- [Meta-Harness](../../../../MetaHarness/llm-wiki/systems/meta-harness.md) — filesystem-as-history precedent (10 MTok/iter)
- [History Mechanisms](../../../../MetaHarness/llm-wiki/concepts/history-mechanisms.md) — full-history vs compressed summaries
- [Selection Policies](../../../../MetaHarness/llm-wiki/concepts/selection-policies.md) — "no policy" design choice
- [Objective Hacking](../../../../MetaHarness/llm-wiki/concepts/objective-hacking.md) — why correctness gating is load-bearing

---

## History & audit trail

This page is a **living document**. For the full research history (decision process, verification passes, corrections, scale-down explorations):

- [archive/research-2026-05-10-critical-plan-review.md](archive/research-2026-05-10-critical-plan-review.md) — Critical review of the entire plan. 11 assumptions challenged. **User overrode the review's scope reduction**: evolve and fabric stay in v1.
- [archive/research-2026-05-10-comprehensive-verification-audit.md](archive/research-2026-05-10-comprehensive-verification-audit.md) — Latest audit: 70 claims checked, 17 false, 10 need update. Includes pi-evolve provenance correction.
- [archive/](archive/) — All research sessions (evening 2–6) and prior audits.

**Significant revisions**:
- 2026-05-10: User confirmed v1 scope: base + todo + ralph + evolve + fabric. Evolve is a key feature (build from scratch). Fabric confirmed from opencode experience. Ralph is thin wrapper around base.
- 2026-05-10: Added deterministic TODO loop section (check → update → work). Added TODO base decision (tintinweb/pi-manage-todo-list vs edxeth/pi-tasks).
- 2026-05-10: Corrected pi-evolve provenance (local draft, not upstream reference). Removed inline research references.
- 2026-05-08: Dropped `@pi-dacmicu/subagent` (reuse tintinweb instead). Added npm rebrand note.
- 2026-05-08: Refined Variant A vs Variant B framing (both first-class, not just Variant A).
- 2026-05-08: FABRIC-not-prereq correction.
