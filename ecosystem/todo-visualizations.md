---
title: TODO list extensions in the Pi ecosystem
type: concept
updated: 2026-05-08
sources:
  - https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/examples/extensions/todo.ts
  - https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/examples/extensions/message-renderer.ts
  - https://github.com/davebcn87/pi-autoresearch/blob/main/extensions/pi-autoresearch/index.ts
  - https://github.com/mitsuhiko/agent-stuff/blob/main/extensions/loop.ts
  - https://github.com/tmustier/pi-extensions/blob/main/pi-ralph-wiggum/index.ts
  - https://github.com/forjd/pi-todo-md
  - https://github.com/patriceckhart/pi-todo
  - https://github.com/jayshah5696/pi-agent-extensions
tags: [extension, todo, dacmicu, widget, ui]
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

| Extension | Pattern | State location | UI |
|-----------|---------|----------------|----|
| **`pi-mono/examples/extensions/todo.ts`** | Tool-only (reference impl) | Session JSONL via `tool_result.details` | `/todos` slash command opens read-only viewer |
| **`forjd/pi-todo-md`** | Tool + repo-local `TODO.md` | `TODO.md` in nearest git root | File visible in editor; LLM uses `todo_md` tool |
| **`patriceckhart/pi-todo`** | Tool + Apple Reminders sync | macOS Reminders ("pi" list) via Swift+EventKit helper | Interactive TUI for browse/edit |
| **`jayshah5696/pi-agent-extensions`** | Bundle including TODO-related items | varies | varies |

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

## Why no Pi extension matches Claude Code's `TodoWrite` polish

Claude Code's `TodoWrite` is a **first-class built-in tool** with TUI rendering on every state change. The polish gap in the Pi ecosystem is **structural in the extensions, not in Pi itself** — Pi exposes everything needed; nobody has wired it up yet.

## The four-layer widget stack — Pi exposes all of it

Researched 2026-05-08 across the in-tree examples and the production ecosystem. Pi has six visibility primitives; a polished TODO experience uses four of them in stacked layers:

| # | Layer | Primitive | Used by | Status |
|---|---|---|---|---|
| 1 | Action confirmation (per-call) | `renderResult(result, {expanded}, theme, ctx)` returning a TUI Component | `examples/extensions/todo.ts:228` ("✓ #3 buy milk"); all TODO impls | **In-tree reference uses this.** |
| 2 | Persistent status (always visible) | `ctx.ui.setWidget(key, factory, opts)` — component factory `(tui,theme) => { render(width):string[]; invalidate():void }` | **`davebcn87/pi-autoresearch/extensions/pi-autoresearch/index.ts:1294-1380`**: collapsed (one-liner) and expanded (full table) states, switchable via configurable shortcut keys (`Ctrl+Shift+T` / `Ctrl+Shift+F`) read from `/extensions/pi-autoresearch.json` | **Only pi-autoresearch uses the factory form.** Other extensions use static `string[]` form (mitsuhiko, kostyay) or `setStatus` only (tmustier). |
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

**No other surveyed Pi extension uses this pattern.** Most use the simpler `setWidget(key, ["line 1", "line 2"])` form which doesn't auto-react to terminal resize and doesn't separate computation from rendering. **For `@pi-dacmicu/todo` this is the recommended baseline**, not optional polish.

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
