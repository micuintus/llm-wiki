---
title: TODO list extensions in the Pi ecosystem
type: concept
updated: 2026-05-10
sources:
  - https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/examples/extensions/todo.ts
  - https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/examples/extensions/message-renderer.ts
  - https://github.com/davebcn87/pi-autoresearch/blob/main/extensions/pi-autoresearch/index.ts
  - https://github.com/mitsuhiko/agent-stuff/blob/main/extensions/loop.ts
  - https://github.com/tmustier/pi-extensions/blob/main/pi-ralph-wiggum/index.ts
  - https://github.com/forjd/pi-todo-md
  - https://github.com/patriceckhart/pi-todo
  - https://github.com/jayshah5696/pi-agent-extensions
  - https://github.com/tintinweb/pi-manage-todo-list
  - https://github.com/tintinweb/pi-tasks
  - https://github.com/Soleone/pi-tasks
  - https://github.com/mitsuhiko/agent-stuff/blob/main/extensions/todos.ts
  - https://github.com/edxeth/pi-tasks
tags: [extension, todo, dacmicu, widget, ui, idiomatic-tools]
see_also:
  - "loop-extensions.md"
  - "claude-code-loop.md"
  - "../dacmicu/concept.md"
  - "../dacmicu/modular-architecture.md"
  - "../dacmicu/pi-port.md"
  - "../architecture/loop-internals.md"
---

# TODO list extensions in the Pi ecosystem

Survey of Pi extensions that manage TODO lists — both as LLM-callable tools and as user-visible widgets. Companion to [ecosystem/loop-extensions](loop-extensions.md): a TODO list is the natural state object for a DACMICU-style loop, where each iteration picks the top item, works it, and updates the list.

## Discriminator: tool-only vs rendered widget

The key distinction across implementations:

- **Tool-only**: LLM has a `todo` tool but the list is invisible unless the user runs a slash command.
- **Tool + rendered widget**: list updates appear in the TUI as a live, persistent widget.
- **Tool + external file**: list lives in `TODO.md` or another sync target (Apple Reminders, Linear, etc.); LLM and human can both edit.

Pi has implementations of all three. None match Claude Code's `TodoWrite` widget polish, but several solve the underlying "shared state" problem cleanly.

## Surveyed extensions

| Extension | LOC | Pattern | Tool shape | Trained-on origin | State | UI | Notes |
|-----------|-----|---------|------------|-------------------|-------|----|-------|
| `pi-mono/examples/extensions/todo.ts` | 297 | Tool-only (reference) | Custom (`add`/`update`/`remove`/`set-state`) | None — bespoke | session `details` | `/todos` slash | Branch-safe pattern; canonical starting point |
| **`tintinweb/pi-manage-todo-list`** | **506** | **Tool + widget + slash** | **`manage_todo_list` `{operation: read\|write, todoList}`** | **GitHub Copilot Chat — verbatim** | session `details` (branch-safe) | `setWidget` factory + theme + strikethrough + `/todos` | **Recommended DACMICU TODO base.** Minimal surface, session-entry persistence, no DAG. |
| `edxeth/pi-tasks` | ~1,100 | 5 tools + widget + file-backed | `task_create`/`task_list`/`task_get`/`task_update`/`task_batch` | Claude Code — verbatim | file-backed (`~/.pi/tasks/`), fork-copy, branch-aware restore | `setWidget` factory, 3-view cycle, stats inline | **Strongest full task system in Pi.** See [assessment below](#edxethpi-tasks-assessment-for-dacmicu). |
| `tintinweb/pi-tasks` | 2,061 | 7 tools + DAG + file-backed | `TaskCreate`/`TaskList`/`TaskGet`/`TaskUpdate`/`TaskOutput`/`TaskStop`/`TaskExecute` | Claude Code — verbatim | file-backed (cross-session) | Animated star spinner, deps shown | Author markets as successor; rejected for DACMICU (DAG fights deterministic outer loop) |
| `Soleone/pi-tasks` | 3,566 | Pluggable backends | Variable per backend | Variable | beads / `todo.md` / … | Yes | Heavyweight |
| `mitsuhiko/agent-stuff/todos.ts` | 2,082 | Tool + file-per-todo | Custom (markdown files) | None | `.pi/todos/*.md` | Status indicator | File-on-disk, less branch-safe |
| `forjd/pi-todo-md` | — | Tool + repo `TODO.md` | `todo_md` | None | `TODO.md` in git root | File visible in editor | Human + LLM shared edits |
| `patriceckhart/pi-todo` | — | Tool + Apple Reminders sync | Custom + EventKit helper | None | macOS Reminders | Interactive TUI | macOS-only |
| `jayshah5696/pi-agent-extensions` | — | Bundle | Variable | None | Variable | Variable | Pick-and-mix |

## Reference implementation: `pi-mono/examples/extensions/todo.ts`

This is the canonical "state stored in tool result details, branches with session tree" pattern. Worth understanding because **every loop extension that wants branching-safe state should use it**:

```typescript
pi.registerTool({
  name: "todo",
  parameters: TodoParams,
  async execute(_id, params, _signal, _onUpdate, _ctx) {
    // ... mutate todos in-memory ...
    return {
      content: [{ type: "text", text: humanReadableStatus }],
      details: { action, todos: [...todos], nextId } as TodoDetails,  // ← the magic
    };
  },
});

// Reconstruct in-memory state from session entries
const reconstructState = (ctx: ExtensionContext) => {
  todos = []; nextId = 1;
  for (const entry of ctx.sessionManager.getBranch()) {
    if (entry.type !== "message") continue;
    const msg = entry.message;
    if (msg.role !== "toolResult" || msg.toolName !== "todo") continue;
    const details = msg.details as TodoDetails | undefined;
    if (details) { todos = details.todos; nextId = details.nextId; }
  }
};

pi.on("session_start", async (_e, ctx) => reconstructState(ctx));
pi.on("session_tree", async (_e, ctx) => reconstructState(ctx));  // /tree, /fork
```

**Why this matters**: when the user forks the session at any point, the TODO state automatically reconstructs to its value at that point — because `details` is part of the tool result message that's part of the branch. No separate file to keep in sync.

## Connection to DACMICU

A DACMICU-style loop driver and a TODO tool combine cleanly:

```typescript
// In a hypothetical pi-todo-loop extension:

pi.on("agent_end", async (_event, ctx) => {
  if (!loopState.driveLoop) return;
  const incomplete = todos.filter(t => !t.done);
  if (incomplete.length === 0) {
    pi.sendMessage(
      { customType: "todo-complete", content: "All tasks done.", display: true },
      { triggerTurn: false }
    );
    loopState.driveLoop = false;
    return;
  }
  pi.sendMessage(
    { customType: "todo-continue", content: `Next: ${incomplete[0].text}`, display: true },
    { triggerTurn: true }   // ← drives next agent run
  );
});

pi.on("before_agent_start", async () => {
  // Inject "tasks remaining" context every iteration
  if (!loopState.driveLoop) return;
  const incomplete = todos.filter(t => !t.done);
  return {
    message: {
      customType: "todo-context",
      content: `[TODO LOOP] ${incomplete.length} tasks remaining. Next: ${incomplete[0]?.text ?? "—"}`,
      display: false,
    },
  };
});
```

This is the design sketched in [dacmicu/pi-port](../dacmicu/pi-port.md) — and validated by `kostyay/agent-stuff/pi-extensions/loop.ts` (a similar pattern minus the TODO list). The TODO + loop combo is not packaged together yet; assembling them is straightforward.

## Idiomaticity matters: matching trained-on tool shapes

LLMs are heavily trained on two TODO-tool shapes:

| Shape | Trained-on origin | Pi extension that mirrors it |
|---|---|---|
| `manage_todo_list` (single tool, `read`/`write`, complete-replacement semantics) | GitHub Copilot Chat | **`tintinweb/pi-manage-todo-list`** — verbatim |
| `TodoWrite` / `TaskCreate` family (many tools, granular ops, status enum, optional DAG) | Claude Code | `tintinweb/pi-tasks` — verbatim |

If an extension matches one of these shapes, the LLM uses it correctly with **zero system-prompt fine-tuning**. Inventing a custom tool shape (the in-tree reference, mitsuhiko, forjd, patriceckhart) burns prompt tokens teaching the LLM your schema and accepts a quality gap until the model has seen enough of your examples in-session.

**For DACMICU we want the smaller idiomatic shape (`manage_todo_list`) plus our deterministic outer loop layered on top, not the larger one (`pi-tasks`) whose built-in DAG and file-backed sharing fight the loop driver.** See [research 2026-05-08 § Q2](../dacmicu/archive/research-2026-05-08-subagent-and-todo.md#q2--should-dacmicus-todo-base-wrap-an-existing-idiomatic-todo-extension) for the full reasoning.

## Existing deterministic outer-loop precedent: popododo's workflow-extension (proof-of-pattern, not a dependency)

Re-research 2026-05-08 evening 2 surfaced one Pi extension that already implements a deterministic state-machine outer loop on top of TODOs: `popododo0720/pi-stuff/workflow-extension` (~7,000 LOC, 15 stars, single contributor, last push 2026-03-03 — stale 2 months).

It enforces a 6-stage workflow (`Plan → Verify Plan → Implement → Verify Impl → Compound → Done`) with:

- `set_todos` tool to declare the list at planning time
- `transition.ts` enforcing stage-to-stage progression — write/edit tools are blocked outside the implementation stage
- Per-TODO Implement → Verify → Compound cycles
- `WORKFLOW_ACTIVE` header injected into every prompt turn for state detection
- Automatic `before_agent_start` deferred compaction between TODO cycles (avoids tool-execution race)
- Mandatory git/worktree gate as TODO #1 if dirty tree at start

**This is the closest existing thing to DACMICU's deterministic outer loop in the Pi ecosystem**, and proves the pattern works. But:

1. **It's a complete, opinionated workflow**, not a primitive. The 6-stage philosophy is hardcoded.
2. **Single-dev, stale, niche.** Not a dependency target.
3. **Coupling to the workflow stages** would force DACMICU to inherit the philosophy.

**Conclusion: proof-of-pattern only, not a dependency.** DACMICU's deterministic outer loop (~150 LOC overlay in `@pi-dacmicu/todo`) is more general — outer loop reads any TODO list, validates each unchecked item, syncs state, works it. No mandatory plan/verify/compound stages.

The lessons absorbed from popododo (without taking the code):

- State-machine + transition-guards is a workable Pi pattern
- `before_agent_start` is the right hook for deferred compaction (avoids tool-execution race)
- Header-injected state flag is more reliable than session-entry parsing for state detection
- TODO snapshot at planning time + sequential per-item cycles avoids re-planning churn

## Idiomatic LLM-known TODO API shapes (2026-05-08, verified evening 3)

LLMs are trained on Claude Code's `TodoWrite` and VSCode Copilot's `manage_todo_list`. **Both shapes are training-known but they are NOT equivalent**.

| Field | Claude Code `TodoWrite` | VSCode Copilot `manage_todo_list` | tintinweb/pi-manage-todo-list |
|---|---|---|---|
| Tool name | `TodoWrite` | `manage_todo_list` | `manage_todo_list` |
| Wrapper key | `todos` | `todoList` | `todoList` |
| Item label | `content` | `title` | `title` |
| Active form | `activeForm` (required) | (none) | (none) |
| Status values | `pending` / `in_progress` / `completed` | (Copilot-specific) | `not-started` / `in-progress` / `completed` |
| Operation flag | (none — single tool) | `operation: read\|write` | `operation: read\|write` |
| Item id | (implicit by index) | — | `id: number` |

**tintinweb mirrors Copilot's shape verbatim.** It is NOT the Claude Code `TodoWrite` shape. Both are LLM-training-known idioms, but the model may have stronger priors for one or the other depending on which provider/model is in use:

- Anthropic models (trained on Claude Code data) → stronger prior for `TodoWrite`
- OpenAI/Copilot-tuned models → stronger prior for `manage_todo_list`

**Practical implication for DACMICU**: prompt-token cost of using tintinweb's tool is **near-zero for any frontier model** that has seen Copilot training data, but **may not be the lowest-cost shape for a Claude Code-tuned model**. We accept this minor cost to avoid maintaining our own TODO state primitive. If profiling shows it's measurably worse for our Anthropic-model use case, the v1.x option is a thin shim that exposes Copilot's `manage_todo_list` to the model while internally translating to Claude Code's `TodoWrite` semantics.

> **Earlier wiki claim correction (evening 3)**: previous text said tintinweb "mirrors Copilot ≈ Claude Code TodoWrite". The two are **different shapes**, not approximately equal. Wiki has been corrected.

## `edxeth/pi-tasks` — assessment for DACMICU

[edxeth/pi-tasks](https://github.com/edxeth/pi-tasks) (v1.1.2, MIT, ~1,100 LOC) is a **production-grade session-scoped task system** forked from `tintinweb/pi-tasks` and reworked toward Claude Code parity. It is the most feature-complete TODO/task extension in the Pi ecosystem.

### What it does

- **5 model-callable tools**: `task_create`, `task_list`, `task_get`, `task_update`, `task_batch` (atomic, all-or-nothing)
- **Dependency DAG**: bidirectional `blocks` / `blockedBy` with cycle detection and dangling-reference warnings
- **Stats tracking**: per-task runtime, tool-use count, last tool, output tokens (including subagent results)
- **Widget**: `setWidget` factory form, 3-view cycle (`open` / `all` / `hidden`) via `Ctrl+Alt+T`, theme-aware, inline stats
- **Reminders**: hidden read-only system reminder injected after 10 turns without task-tool use
- **Session scoping**: file-backed (`~/.pi/tasks/<sessionKey>/`), with fork-copy and branch-aware restore via `.tree/<leafId>/` snapshots
- **System prompt injection**: `TASK_SYSTEM_POLICY` appended via `before_agent_start` to guide LLM task-tool usage

### Why it is NOT the DACMICU TODO base

| Concern | `edxeth/pi-tasks` | DACMICU needs |
|---|---|---|
| **Storage model** | File-backed (survives `/compact`, fork-copy on `/fork`) | Session-entry `details` (branches with JSONL automatically, no file sync) |
| **Tool surface** | 5 granular tools | 1 tool (`manage_todo_list`) — less for LLM to misuse |
| **Dependency DAG** | Built-in `blocks`/`blockedBy` | **None** — the deterministic outer loop IS the ordering mechanism |
| **Opinionated behavior** | Stats, reminders, active-task heuristics, system-policy injection | Minimal — loop driver owns behavior |
| **Size** | ~1,100 LOC | ~150–250 LOC overlay on top of base |

The dependency DAG is the dealbreaker. If the LLM can express "task B blocks task A" natively, it will use that to drive ordering — bypassing DACMICU's deterministic reassessment step. The outer loop and the DAG fight for control.

File-backed storage is also a different model from session-entry-based: it survives `/compact` (good) but does NOT branch with the session JSONL (the file state is separate from the conversation tree). A `/fork` followed by divergent task edits in each branch creates a single shared file — the branches silently overwrite each other.

### When to pick `edxeth/pi-tasks`

Use it when you want a **full Claude Code-style task experience** in Pi: dependency tracking, stats, reminders, rich widget. Do NOT use it as the foundation for a deterministic-loop extension — its opinions are too strong and its DAG conflicts with loop-driver ownership.

### When to pick `tintinweb/pi-manage-todo-list`

Use it when you want a **minimal primitive** to build a deterministic loop on top of: one tool, flat list, session-entry persistence, no DAG, no stats, no reminders. The LLM uses `manage_todo_list` to mutate state; the outer loop reads that state and decides what to do next. Separation of concerns is clean.

## Why no Pi extension matches Claude Code's `TodoWrite` polish

Claude Code's `TodoWrite` is a **first-class built-in tool** with TUI rendering on every state change. The polish gap in the Pi ecosystem is **structural in the extensions, not in Pi itself** — Pi exposes everything needed; nobody has wired it up yet.

## The four-layer widget stack — Pi exposes all of it

Researched 2026-05-08 across the in-tree examples and the production ecosystem. Pi has six visibility primitives; a polished TODO experience uses four of them in stacked layers:

| # | Layer | Primitive | Used by | Status |
|---|---|---|---|---|
| 1 | Action confirmation (per-call) | `renderResult(result, {expanded}, theme, ctx)` returning a TUI Component | `examples/extensions/todo.ts:228` ("✓ #3 buy milk"); all TODO impls | **In-tree reference uses this.** |
| 2 | Persistent status (always visible) | `ctx.ui.setWidget(key, factory, opts)` — component factory `(tui,theme) => { render(width):string[]; invalidate():void }` | `davebcn87/pi-autoresearch/extensions/pi-autoresearch/index.ts:1294-1380`: collapsed/expanded states, configurable shortcuts. **`edxeth/pi-tasks`** also uses factory form with 3-view cycle and inline stats. | **pi-autoresearch and edxeth/pi-tasks use the factory form.** Other extensions use static `string[]` form (mitsuhiko, kostyay) or `setStatus` only (tmustier). |
| 3 | Stream-pinned snapshot (Claude Code-style) | `pi.registerMessageRenderer(customType, renderer)` + extension emits `pi.sendMessage({customType, details:{todos}, display:true})` after meaningful changes | `examples/extensions/message-renderer.ts` (in-tree demo only) | **No production extension uses this.** Free polish win. |
| 4 | Modal deep-dive (on-demand) | `/todos` command + `ctx.ui.custom<T>(factory)` | `examples/extensions/todo.ts` (`/todos`), pi-autoresearch dashboard, mitsuhiko loop preset selector | **In-tree reference uses this.** |

### Why pi-autoresearch's pattern is the gold standard for layer 2

```typescript
// Reactive width-aware widget that recomputes on every paint
ctx.ui.setWidget("autoresearch", (tui, theme) => ({
  render(width: number): string[] {
    const safeWidth = Math.max(1, width || getTuiSize(tui).width);
    if (state.dashboardExpanded) {
      return renderDashboardLines(state, safeWidth, theme, /* rows */ 6, hints);
    }
    return [renderCompactOneLiner(state, safeWidth, theme)];
  },
  invalidate(): void {},
}));
```

Properties:
- `render(width)` invoked on every TUI repaint — any state mutation reflects immediately, no manual `pi.repaint()` plumbing.
- Width-aware: collapses to a one-liner on narrow terminals, expands on wide ones.
- Theme-aware: uses `theme.fg("accent", ...)` etc., respects user theme switches without code changes.
- Two display modes (collapsed/expanded) toggled by user shortcut, persisted in extension state.
- User-configurable shortcut keys via per-extension JSON config.

Also used by `edxeth/pi-tasks` (3-view cycle: open / all / hidden). Most other extensions use the simpler `setWidget(key, ["line 1", "line 2"])` form which doesn't auto-react to terminal resize. **For `@pi-dacmicu/todo` the factory form is the recommended baseline**, not optional polish.

### Why layer 3 closes the polish gap

`registerMessageRenderer` lets an extension paint **inline messages that pin in the chat scroll** — the same UX slot Claude Code uses for `TodoWrite` widgets that follow the message stream. The renderer signature:

```typescript
pi.registerMessageRenderer("todo-snapshot", (message, { expanded }, theme) => {
  const { todos } = message.details as { todos: TodoItem[] };
  // ... build a Box with the full TODO list pinned inline ...
  return box;
});

// Extension emits a snapshot whenever the list changes meaningfully:
pi.sendMessage({
  customType: "todo-snapshot",
  content: `${doneCount}/${total} done`,
  display: true,
  details: { todos: [...todos] },
});
```

The message lives in the session JSONL with the rest of the chat — it branches with `/fork`/`/clone`, it compacts naturally, it's preserved across `/reload`. **No production Pi extension does this for TODO state.** This is the largest unrealized polish opportunity in the ecosystem.

### Composability

The four layers cover orthogonal needs and stack cleanly:

- L1 confirms each LLM action: "✓ marked #3 done" — narrow, ephemeral, scrolls away
- L2 keeps a fresh, summary always visible — "3/7 done — next: buy milk" — always pinned to editor
- L3 pins occasional snapshots in the message stream — the agent and the user can scroll back through full-list checkpoints
- L4 the full interactive viewer on demand

Nothing in the existing ecosystem combines all four; the in-tree `todo.ts` reference covers L1 + L4 only. Adding L2 (factory form) and L3 (registerMessageRenderer) is the differentiator for `@pi-dacmicu/todo`.

## Cross-references

### pi-mono wiki
- [ecosystem/loop-extensions](loop-extensions.md) — Ralph + until-done loop drivers (consume TODO state)
- [ecosystem/claude-code-loop](claude-code-loop.md) — Claude Code's `/loop` (different mechanism)
- [dacmicu/concept](../dacmicu/concept.md) — TODO list as DACMICU loop state
- [dacmicu/pi-port](../dacmicu/pi-port.md) — TODO + agent_end loop driver sketch
- [architecture/loop-internals](../architecture/loop-internals.md) — why `details`-based state branches correctly
