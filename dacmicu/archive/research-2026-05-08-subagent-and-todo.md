---
title: Research & decisions — subagent reuse, TODO base, Variant A mechanics (2026-05-08)
type: decision
updated: 2026-05-08
sources:
  - https://github.com/Hopsken/pi-subagents
  - https://github.com/tintinweb/pi-subagents
  - https://github.com/aleclarson/pi-subagent
  - https://github.com/nicobailon/pi-subagents
  - https://github.com/tintinweb/pi-manage-todo-list
  - https://github.com/tintinweb/pi-tasks
  - https://github.com/Soleone/pi-tasks
  - https://github.com/mitsuhiko/agent-stuff/blob/main/extensions/loop.ts
  - https://github.com/mitsuhiko/agent-stuff/blob/main/extensions/todos.ts
  - https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/examples/extensions/todo.ts
tags: [dacmicu, decision, subagent, todo, variant-a]
see_also:
  - "concept.md"
  - "modular-architecture.md"
  - "implementation-plan.md"
  - "../ecosystem/subagents.md"
  - "../ecosystem/todo-visualizations.md"
  - "../ecosystem/loop-extensions.md"
---

# Research & decisions — 2026-05-08

Three questions answered after a deep ecosystem cascade. Outcome: **two reuses, one custom layer.** No reinvention of the subagent stack. No reinvention of an idiomatic TODO tool. Custom build is just the deterministic outer loop driver.

---

## Q1 — Should DACMICU's subagent variant (Variant B) reuse an existing extension?

### Candidates re-evaluated under "minimal, no swarm bloat" lens

| Repo | LOC | Hosting | Visibility/navigability | Verdict |
|---|---|---|---|---|
| `aleclarson/pi-subagent` | 1,786 | Subprocess + JSON | `renderResult` only — no widget, no viewer | **Minimal but loses ConversationViewer** — the killer opencode-Tab analog. Insufficient. |
| `Hopsken/pi-subagents` | 4,836 | In-process via `createAgentSession` | Live agent-tree widget + ConversationViewer modal (live but read-only, 500-char truncation, single-agent, no Tab-switch) + themed completion notifications + cross-extension RPC | **Recommended for casual oversight.** The 1,671-line `index.ts` is a code smell *for them* — invisible across the RPC seam. **Insufficient alone for evolve-grade candidate inspection** — see [Q4 below](#q4--is-conversationviewer-an-opencode-tab-switch-equivalent-no). |
| `tintinweb/pi-subagents` | 6,082 | Hopsken fork + scheduling | Same UI as Hopsken + cron/interval/one-shot | **Acceptable superset.** Pick this if a user already has it; otherwise default to Hopsken. |
| `nicobailon/pi-subagents` | 38,360 | Subprocess + worktree + JSONL artifacts + true async | Heavy: `/run-status`, result-watcher polling, `agent://<id>` resource scheme | **Reject.** Kitchen-sink. Worktree isolation and JSONL transcripts are nice but not worth the weight. |
| `lnilluv/pi-ralph-loop` | ~1,300 | Subprocess + `--mode rpc` | Pause-resume via SIGSTOP/SIGCONT; transcript on disk | **Different problem** (steerable single-loop), not a subagent provider. |

### Why Hopsken's bloat doesn't disqualify it

The user concern was bloat / swarm features. Hopsken's `index.ts` is 1,671 lines and registers three tools (`Agent`, `get_subagent_result`, `steer_subagent`) plus a hardcoded `DEFAULT_AGENTS` registry, memory subsystem, group-join, prompt modes. **All of that is invisible across the RPC seam.** From `@pi-dacmicu/ralph`'s perspective, the entire dependency surface is:

```ts
const requestId = randomUUID();
pi.events.emit("subagents:rpc:spawn", {
  requestId,
  type: "general-purpose",   // or any registered agent name
  prompt,
  options: { /* model, tools, cwd, … */ },
});
const result = await new Promise(resolve => {
  pi.events.on(`subagents:rpc:spawn:reply:${requestId}`, resolve);
});
```

Two event names, one envelope. We never import a Hopsken module, never bundle their code, never inherit their `index.ts` mass.

### What we'd lose by building our own minimal (~600–800 LOC)

A minimal hand-rolled subagent extension covering only what DACMICU needs would still need:

- `createAgentSession` setup with `SessionManager.inMemory` + `SettingsManager` plumbing
- `session.subscribe()` event → renderer plumbing for live updates
- A widget for "currently running" visibility (else silent black-box runs)
- A modal viewer for post-mortem inspection (else navigability lost — defeats the point)
- A cross-extension RPC contract for `@pi-dacmicu/evolve` to also use it

That's ≥1,000 LOC of UI glue that already exists, debugged, in Hopsken. The architectural payoff is zero — no DACMICU-specific behaviour rides in any of those layers.

### Decision

**Reuse `Hopsken/pi-subagents` (or `tintinweb/pi-subagents` superset) via `pi.events` RPC.**

- `@pi-dacmicu/ralph` and `@pi-dacmicu/evolve` declare it as a **soft runtime dependency**.
- If absent: `ralph` degrades to Variant A (in-session) with a one-time notification; `evolve` errors with "subagent provider required, install Hopsken/pi-subagents".
- An internal helper module `subagent-client/` (~80 LOC) wraps the RPC call with timeouts and error envelopes. Lives inside the consumer packages, not exported.
- License compatibility verified: both Hopsken and tintinweb are MIT.

### Verification still required before lock-in

1. RPC contract stability: confirm `PROTOCOL_VERSION=2` carries semver guarantees (Hopsken's mechanism implies yes; verify in CHANGELOG).
2. `createAgentSession` SDK exposure: every option Hopsken passes through is documented in `@earendil-works/pi-coding-agent/dist/index.d.ts:15`.
3. `pi.appendEntry("subagents:record", ...)` survival across `/compact` — Hopsken doesn't appear to call `session_before_compact`. If long-running background subagents matter, this needs testing or a PR upstream.

### Fallback (avoid unless forced)

~400 LOC wrapper over `createAgentSession` directly. No widget, no viewer, no cross-extension RPC. Visibility & navigability lost. Last-resort only.

See [ecosystem/subagents](../ecosystem/subagents.md) for the full architecture taxonomy and [concept § Subagent build-vs-reuse decision](concept.md#subagent-build-vs-reuse-decision-2026-05-08) for the prior framing.

---

## Q2 — Should DACMICU's TODO base wrap an existing idiomatic TODO extension?

### The idiomaticity hypothesis

LLMs are heavily trained on two TODO-tool shapes:

| Shape | Trained-on origin |
|---|---|
| `manage_todo_list` (single tool, `read`/`write` operations, complete replacement) | GitHub Copilot Chat |
| `TodoWrite` / `TaskCreate` family (many tools, granular ops, status enum, dependency DAG) | Claude Code |

If DACMICU's TODO tool matches one of these shapes verbatim, the LLM uses it correctly with zero fine-tuning of the system prompt. If we invent our own shape, we burn prompt tokens teaching the LLM our schema and accept a quality gap until it's seen enough examples.

### Candidates

| Extension | LOC | Tool shape | Trained-on origin | Widget | Persistence | Determinism hooks |
|---|---|---|---|---|---|---|
| `pi-mono/.../examples/extensions/todo.ts` | 297 | Custom (`add`/`update`/`remove`/`set-state`) | None — bespoke | None (slash command only) | session `details` | None |
| **`tintinweb/pi-manage-todo-list`** | **506** | **`manage_todo_list` `{operation: read\|write, todoList}`** | **GitHub Copilot Chat — verbatim** | **Yes — `setWidget` factory, themed icons, strikethrough** | **session `details` (branch-safe)** | **Hookable via `turn_end`** |
| `tintinweb/pi-tasks` | 2,061 | `TaskCreate`/`TaskList`/`TaskGet`/`TaskUpdate`/`TaskOutput`/`TaskStop`/`TaskExecute` | Claude Code — verbatim | Yes — animated star spinner, deps shown | file-backed (shared across sessions) | DAG resolution; `auto-cascade` mode |
| `Soleone/pi-tasks` | 3,566 | Pluggable backends (beads, todo.md, …) | Variable | Yes | Backend-dependent | None |
| `mitsuhiko/agent-stuff/extensions/todos.ts` | 2,082 | Custom (file per todo in `.pi/todos/*.md`) | None — bespoke | Status indicator | Files on disk | None |

### Why `tintinweb/pi-manage-todo-list` is the right base

1. **Idiomatic shape, zero prompt cost.** The tool name, parameter schema, and description are *literally lifted* from GitHub Copilot's `manage_todo_list`. Models call it correctly out of the box.
2. **Tiny surface area.** 506 LOC across 5 files. No DAG, no file locks, no subagent integration, no scheduling — exactly the things DACMICU should *add* on top, not inherit baked-in.
3. **Branch-safe persistence.** State is reconstructed from `tool_result.details` on `session_start` and `session_tree` events — survives `/fork`, `/clone`, `/tree` correctly. Same pattern as the in-tree reference (`packages/coding-agent/examples/extensions/todo.ts`).
4. **Widget already polished.** Uses `ctx.ui.setWidget` factory form with theme-aware rendering, status icons (`✓` / `◉` / `○`), strikethrough for completed, header with progress count.
5. **Clean hook seam for the outer loop.** `turn_end` already fires; `state.read()` is public; we add an `agent_end` listener that reads the same state. No fork needed.

### Why not `tintinweb/pi-tasks` (the "successor")

Its README explicitly markets itself as the successor to `pi-manage-todo-list`. For DACMICU we want the *opposite* of its added features:

- DAG with `blocks`/`blockedBy` → DACMICU's deterministic outer loop *is* the dependency resolver. Two ordering schemes fighting each other.
- File-backed sharing across sessions → conflicts with branch-safe `details` persistence; we'd lose `/fork` semantics.
- `TaskExecute` / subagent integration / auto-cascade → overlaps with what `@pi-dacmicu/ralph` does. Two systems trying to drive the loop.
- 7 tools instead of 1 → more surface for the LLM to misuse without prompt tuning.

`pi-tasks` is the right answer for someone who wants Claude Code's task system in Pi. DACMICU is a different shape that prefers the simpler primitive.

### Decision

**`@pi-dacmicu/todo` peer-depends on `tintinweb/pi-manage-todo-list`.**

What `@pi-dacmicu/todo` adds (~150–250 LOC):

1. **Deterministic outer loop driver.** `pi.on("agent_end", …)` reads the host extension's todo state, picks the next not-started item, calls `pi.sendMessage({customType:"dacmicu-next-todo", content:…, deliverAs:"followUp", triggerTurn:true})`. Stops when no incomplete items or `signal_loop_success` was called.
2. **Re-validation step.** Before driving to the next item, re-prompt the LLM (in a single bounded turn) to confirm the next item is still relevant given any state changes from the previous turn. This is the **"deterministic reassessment"** that distinguishes DACMICU from Ralph: not "do top, repeat" but "verify top is still right, then do".
3. **`session_before_compact` preservation.** Mark DACMICU loop-state messages as preserved so the loop survives `/compact` mid-flight. (Only mitsuhiko's `loop.ts` does this in the existing ecosystem; an absence in `pi-manage-todo-list` is fine because the *tool result* is what carries state, not loop messages.)
4. **`signal_loop_success` tool.** LLM-callable break-out.
5. **Layer 3 polish (optional, free win).** Emit `pi.sendMessage({customType:"todo-snapshot", details:{todos}, display:true})` after each iteration; register a `MessageRenderer` to pin the snapshot in the chat scroll like Claude Code's `TodoWrite`. None of the existing TODO extensions do this — see [todo-visualizations § Why layer 3 closes the polish gap](../ecosystem/todo-visualizations.md#why-layer-3-closes-the-polish-gap).

### Coupling shape

```ts
// In @pi-dacmicu/todo:
import type { TodoItem } from "pi-manage-todo-list/types";   // type-only

pi.on("turn_end", async (event, ctx) => {
  // Read pi-manage-todo-list's state via session entries (branch-safe, no import)
  const todos = readTodosFromSession(ctx);   // scans tool_result.details for manage_todo_list
  // ... DACMICU outer-loop logic ...
});
```

**Zero runtime import** of `pi-manage-todo-list`. We read its state through the same session-entry scan it uses internally. Decoupled enough that if the user prefers a different idiomatic TODO tool later (`pi-tasks`?), we add an adapter, not a rewrite.

### Verification

- Tool-name compatibility: `pi-manage-todo-list` registers tool `"manage_todo_list"`. We hardcode this name in the session scan. Document the dependency clearly.
- Schema stability: tool result `details: { operation, todos, error? }` shape — confirmed in `src/state-manager.ts:loadFromSession`.
- License: MIT.

---

## Q3 — How does the in-session lightweight DACMICU variant (Variant A) work?

### Mental model

Variant A is **not a subagent**. It is *another turn* in the parent `AgentSession`, scheduled by an extension hook rather than by the user typing. The LLM has access to its full prior context, all tools, and continues where it left off — except the "user message" was synthesized by an extension based on a deterministic predicate.

The full mechanics fit in five primitives, all already exposed by Pi's extension API.

### Primitive 1 — `agent_end` listener (the schedule hook)

```ts
pi.on("agent_end", async (event, ctx) => {
  // Fires after every assistant turn completes (text + all tool results delivered).
  // This is where we decide "do we run another turn?"
});
```

`agent_end` fires once per assistant turn end, *not* per tool call. It is the natural decision point for "loop or stop".

### Primitive 2 — Termination predicate

Three independent stop conditions, any of which terminates:

```ts
if (loopState.signaledSuccess) return;          // LLM called signal_loop_success
if (loopState.iterations >= MAX_ITERATIONS) return;  // hard cap (default 50)
if (allTodosCompleted(ctx)) return;             // task-specific predicate
if (event.aborted) return;                      // user pressed Esc / Ctrl+C
if (ctx.hasPendingMessages()) return;           // user typed during the turn — yield to them
```

The `hasPendingMessages()` guard is essential: without it, the loop will stomp on a user message that arrived mid-turn, racing the user.

### Primitive 3 — Re-trigger via `pi.sendMessage` with `triggerTurn: true`

```ts
pi.sendMessage(
  {
    customType: "dacmicu-loop-step",
    content: nextStepPrompt,           // LLM-as-pseudo-user message
    display: true,                     // visible in chat scroll
  },
  {
    triggerTurn: true,                 // schedule a new agent turn
    deliverAs: "followUp",             // append to current session, not a new top-level prompt
  },
);
```

`deliverAs: "followUp"` is the load-bearing flag: it appends to the current `state.messages` and routes through `agent.followUp()` rather than `agent.prompt()`. The LLM sees the new message as a continuation of the same conversation. Full prior context preserved.

The decision tree inside `AgentSession.sendCustomMessage` (`packages/coding-agent/src/core/agent-session.ts:1276-1308`) handles four cases automatically: idle → `agent.prompt`; streaming + followUp → `agent.followUp`; streaming + steer → `agent.steer`; nextTurn → queued. Variant A relies on the first or fourth path.

### Primitive 4 — `signal_loop_success` tool (the LLM's break statement)

```ts
pi.registerTool({
  name: "signal_loop_success",
  description: "Call this tool when the loop's goal is achieved and no further iterations are needed.",
  parameters: Type.Object({
    summary: Type.String({ description: "One-line summary of what was accomplished." }),
  }),
  async execute(_id, params, _signal, _onUpdate, _ctx) {
    loopState.signaledSuccess = true;
    loopState.summary = params.summary;
    return {
      content: [{ type: "text", text: `Loop terminated: ${params.summary}` }],
      details: { signaledSuccess: true, summary: params.summary },
    };
  },
});
```

This gives the LLM explicit, unambiguous control to exit early. Pairs with the iteration cap (which is the *involuntary* break).

### Primitive 5 — Compaction preservation

```ts
pi.on("session_before_compact", async (event, ctx) => {
  // Mark loop-state messages so /compact doesn't eat them mid-flight
  return {
    preserveMessages: event.messages
      .filter(m => m.customType?.startsWith("dacmicu-"))
      .map(m => m.id),
  };
});
```

Without this, a long-running loop that triggers `/compact` will lose its "I'm in iteration N, here's why" context and may diverge. Only `mitsuhiko/agent-stuff/extensions/loop.ts` does this in the existing ecosystem — it is the rarest and most important detail to copy.

### Full skeleton (≈150 LOC, drop-in `@pi-dacmicu/base`)

```ts
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type } from "@mariozechner/pi-ai";

interface LoopState {
  active: boolean;
  iterations: number;
  signaledSuccess: boolean;
  summary?: string;
  prompt: string;          // the "user-message-shaped" continuation prompt
  predicate?: (ctx: ExtensionContext) => boolean;   // optional task-specific predicate
}

const MAX_ITERATIONS = 50;

export function attachLoopDriver(pi: ExtensionAPI): {
  start: (opts: { prompt: string; predicate?: LoopState["predicate"]; max?: number }) => void;
  stop: () => void;
  isActive: () => boolean;
} {
  let state: LoopState = {
    active: false,
    iterations: 0,
    signaledSuccess: false,
    prompt: "",
  };

  // --- The break-out tool ---
  pi.registerTool({
    name: "signal_loop_success",
    description: "Call when the loop's goal is achieved.",
    parameters: Type.Object({ summary: Type.String() }),
    async execute(_id, params) {
      state.signaledSuccess = true;
      state.summary = params.summary;
      return {
        content: [{ type: "text", text: `Loop ended: ${params.summary}` }],
        details: { signaledSuccess: true, summary: params.summary },
      };
    },
  });

  // --- The schedule hook ---
  pi.on("agent_end", async (event, ctx) => {
    if (!state.active) return;
    if (state.signaledSuccess) { state.active = false; return; }
    if (event.aborted) { state.active = false; return; }
    if (ctx.hasPendingMessages()) return;             // user is typing — yield
    if (state.iterations >= (state.iterations || MAX_ITERATIONS)) { state.active = false; return; }
    if (state.predicate?.(ctx) === false) { state.active = false; return; }

    state.iterations++;
    pi.sendMessage(
      {
        customType: "dacmicu-loop-step",
        content: state.prompt,
        display: true,
      },
      { triggerTurn: true, deliverAs: "followUp" },
    );
  });

  // --- Compaction preservation ---
  pi.on("session_before_compact", async (event) => ({
    preserveMessages: event.messages
      .filter(m => m.customType?.startsWith("dacmicu-"))
      .map(m => m.id),
  }));

  return {
    start: (opts) => {
      state = {
        active: true,
        iterations: 0,
        signaledSuccess: false,
        prompt: opts.prompt,
        predicate: opts.predicate,
      };
    },
    stop: () => { state.active = false; },
    isActive: () => state.active,
  };
}
```

### How consumers use it

`@pi-dacmicu/todo`:
```ts
const driver = attachLoopDriver(pi);
// when the LLM writes a todo list:
driver.start({
  prompt: "Pick the top not-started TODO and complete it. Then mark it completed via manage_todo_list. If all done, call signal_loop_success.",
  predicate: (ctx) => readTodosFromSession(ctx).some(t => t.status !== "completed"),
});
```

`@pi-dacmicu/ralph` (Variant A path):
```ts
driver.start({
  prompt: "Continue refining the implementation. Call signal_loop_success when the spec is fully met.",
});
```

### What Variant A *isn't*

- **Not a subagent.** Same `state.messages`, same context window, same tools, same model.
- **Not a subprocess.** Single Node process, single `AgentSession`.
- **Not autonomous.** The LLM still drives every turn; the driver only schedules *when* the next turn fires.
- **Not bypassable.** The user can hit Esc to abort, type to interrupt (and the `hasPendingMessages` guard yields), or `/cancel` to abort the loop entirely.

### When to pick Variant A over Variant B

| If you need… | Pick |
|---|---|
| Continuity across iterations (later iters reference earlier work) | **A** |
| Lowest possible overhead (no subprocess, no event bus, no second model call) | **A** |
| Context-budget protection (each iter ≤ N tokens) | **B** |
| Parallel fan-out (3 iters concurrently) | **B** |
| Crash isolation (one iter dying doesn't kill the parent) | **B** (subprocess flavour) |
| MATS-style independent-candidate evaluation | **B** |

### Cross-references

- [concept § Two loop variants](../concept.md#two-loop-variants--the-load-bearing-distinction) — the original framing.
- [implementation-plan](../implementation-plan.md) — build sequence.
- [ecosystem/loop-extensions](../ecosystem/loop-extensions.md) — `mitsuhiko/agent-stuff/loop.ts` (450 LOC) is the closest production reference for this exact skeleton; `kostyay/agent-stuff/pi-extensions/loop.ts` validates the same primitives.
- [pi-port](../pi-port.md) — why this architecture was chosen for the Pi port.

---

## Summary of decisions

| Question | Decision | Custom code we own |
|---|---|---|
| Subagent for Variant B? | **Reuse `Hopsken/pi-subagents` via `pi.events` RPC** | ~80 LOC RPC client wrapper |
| TODO base? | **Peer-depend on `tintinweb/pi-manage-todo-list`** | ~150–250 LOC outer-loop driver + reassessment + snapshot renderer |
| Variant A mechanics? | **`agent_end` + `triggerTurn:true` + `signal_loop_success` + `session_before_compact`** | ~150 LOC `attachLoopDriver()` in `@pi-dacmicu/base` |

Total custom DACMICU code: **~400 LOC across 3 packages** (base + todo + subagent-client). Plus FABRIC, ralph dispatcher, evolve repackaging — separately scoped.

Stand on shoulders. Build only the deterministic outer loop. That's the thesis.

---

## Q4 — Is ConversationViewer an opencode Cmd+↓ / Tab-switch equivalent? **Closer than first claimed; gap narrower than thought.**

### Re-evaluation 2026-05-08 evening

A prior version of this section claimed ConversationViewer was wildly inferior to opencode's UX. After **reading opencode's actual session navigation model** (post-PR [#14814](https://github.com/anomalyco/opencode/pull/14814), merged 2026-02-27) the comparison is much closer than I framed it.

### Opencode's actual subagent UX

| Action | Opencode keybind |
|---|---|
| Enter first child from parent | `<leader>+down` (`session_child_first`) |
| Cycle to next sibling child | bare `right` (only when in child) |
| Cycle to previous sibling child | bare `left` (only when in child) |
| Return to parent | bare `up` (`session_parent`, only when in child) |
| Session list modal | `<leader>+l` |

**Opencode has NO tabs.** The tab bar is an [open feature request](https://github.com/anomalyco/opencode/issues/5826) ([second one too](https://github.com/anomalyco/opencode/issues/17838)). Opencode shows **one full-screen view at a time** (parent OR child). Sessions are first-class navigable entities, not modal overlays.

### Hopsken vs opencode — the actual deltas

| Aspect | Opencode | Hopsken | Gap severity |
|---|---|---|---|
| Switch to subagent | `<leader>+down` | `/agents` slash + menu | **UX nicety** — a few extra keystrokes |
| Cycle siblings | bare `left`/`right` | Esc → `/agents` → reselect | **UX nicety** |
| One agent at a time | yes (full-screen) | yes (modal) | **parity** |
| Side-by-side / tabs | no (open FR) | no | **parity** |
| Tool result truncation | none | **500 chars** (line 175 of `conversation-viewer.ts`) | **real defect** |
| Bash output truncation | none | **500 chars** (line 191) | **real defect** |
| Live updates | yes | yes (`session.subscribe`) | parity |
| Interact with subagent | yes (it's the foregrounded session) | no (read-only modal) | **real gap for some uses** |

Bottom line: the only **real** gaps vs opencode are (1) the 500-char truncation and (2) read-only mode. Everything else is UX polish or parity. The earlier framing that ConversationViewer is "insufficient for evolve" remains correct, but for a different reason than "no Tab-switch" — it's the truncation.

### Pi has a closer opencode-equivalent than Hopsken: HazAT

**Major finding from this re-survey (deferred until now)**: `HazAT/pi-interactive-subagents` (8,227 LOC including tests) puts **each subagent in its own terminal multiplexer pane** (cmux/tmux/zellij/WezTerm). User switches between panes via the multiplexer's native keybinds (cmux `Ctrl+\`, tmux `Ctrl+B+arrows`, zellij `Alt+arrows`, etc.). Each pane is a real `pi` session — fully interactive, full transcript, no truncation.

For parallel inspection (which DACMICU evolve needs), HazAT is **better than opencode**: opencode forces you to cycle through full-screen views; HazAT lets you split the multiplexer for true side-by-side. The trade-off: requires the user to launch pi inside a multiplexer.

See [ecosystem/subagents § Pattern 4](../ecosystem/subagents.md#pattern-4--terminal-multiplexer-pane-per-subagent) for the full architecture.

## Q5 — Which subagent provider should `@pi-dacmicu/evolve` actually use?

### Updated recommendation (revises Q1)

Q1's original answer was "Hopsken for everything". After surveying HazAT and cmf, the correct answer is **different providers for different consumers**:

| DACMICU consumer | Primary provider | Fallback | Rationale |
|---|---|---|---|
| `@pi-dacmicu/ralph` (Variant B) | **Hopsken** (or tintinweb) via `subagents:rpc:spawn` | none needed | Loop iterations don't need parallel inspection; Hopsken's modal viewer is fine for occasional checks |
| `@pi-dacmicu/evolve` candidate inspection | **HazAT** via its tool surface | Hopsken + JSONL transcript writer | Each candidate in its own mux pane = true parallel inspection, no truncation, fully interactive |
| Future: programmatic subagent embedding | **cmf/pi-subagent** library import | none | Designed to be embedded; recursive step composition |

### Why three options instead of one

Ralph and evolve have different inspection needs:

- **Ralph** is mostly background — user wants to know the loop is making progress, occasionally inspect a stuck iteration. Hopsken's modal is fine.
- **Evolve** is foreground analytical — user actively compares N candidates side-by-side, looks for *why* one outperformed another. HazAT's mux panes are essential.

If evolve depends on Hopsken alone, evolve users hit the truncation wall the moment they want to inspect why candidate B's tool sequence diverged from candidate A's. That's exactly the inspection task evolve is built around.

### Soft-dep matrix

```
@pi-dacmicu/ralph        → soft-dep on Hopsken/pi-subagents (or tintinweb superset)
                            ↓ fallback if absent: degrade to Variant A

@pi-dacmicu/evolve       → soft-dep on HazAT/pi-interactive-subagents
                            ↓ fallback if absent: Hopsken + JSONL writer
                            ↓ fallback if HazAT also absent: refuse with clear error
```

### Coupling shape — HazAT integration

Unlike Hopsken, HazAT does not (as of survey date) expose a documented `pi.events`-based RPC contract. Its primary surfaces are:

- LLM-callable tools: `subagent`, `subagent_interrupt`, `subagent_resume`, `subagents_list`
- Slash commands: `/plan`, `/iterate`, `/subagent <agent> <task>`
- Status snapshots written to disk (`SubagentActivityState`)

For `@pi-dacmicu/evolve` to drive HazAT programmatically (rather than via LLM tool calls in the parent agent), one of:

1. **Use HazAT's tool surface from within the parent agent's turns** — emit a `pi.sendMessage` instructing the parent to call `subagent({ name, agent, task, ... })`. Indirect; relies on the LLM following the instruction.
2. **Read HazAT activity snapshots directly from disk** — watch the snapshot directory; parse the JSON state files; correlate to evolve's candidate IDs. Possible but coupled to HazAT's on-disk format.
3. **PR HazAT to add a `pi.events` RPC contract** matching Hopsken's shape. Best long-term but requires upstream cooperation.

For the initial DACMICU build, option 1 (LLM-mediated) is the right starting point — zero coupling, works today. Iterate from there based on real usage friction.

### What this changes about the build-vs-reuse decision

The top-line decision (don't build `@pi-dacmicu/subagent`) **stands**. The expansion is:

- We now know which provider to recommend per consumer (different per consumer).
- The HazAT discovery means the previously-mooted "fifth deliverable `@pi-dacmicu/workspaces`" (cmux/tmux orchestration) **already exists and is production-grade**. Don't build it; depend on HazAT.
- The cmf library option opens a third path if either Hopsken or HazAT becomes incompatible — we can vendor `invokeAgent` directly without standing up a full extension.

### Custom code budget update

Previous: ~400 LOC (base + todo + subagent-client RPC wrapper).

Revised: ~500 LOC (base + todo + Hopsken RPC client + HazAT integration shim).

Still an order of magnitude smaller than building any of these from scratch.
