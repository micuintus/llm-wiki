---
title: "Session log as single source of truth — deep audit"
date: 2026-05-12
type: research
status: settled
sources:
  - "/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md"
  - "/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/docs/compaction.md"
  - "/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/session-manager.d.ts"
  - "/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/session-manager.js"
  - "/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/event-bus.d.ts"
  - "https://github.com/badlogic/pi-mono/issues/2420"
  - "https://github.com/badlogic/pi-mono/issues/326"
  - "https://github.com/badlogic/pi-mono/issues/1370"
  - "https://github.com/badlogic/pi-mono/discussions/1546"
  - "/tmp/pi-github-repos/tintinweb/pi-manage-todo-list@main/src/index.ts"
  - "/tmp/pi-github-repos/tintinweb/pi-manage-todo-list@main/src/state-manager.ts"
tags: [dacmicu, architecture, audit, session, compaction, cross-extension]
see_also:
  - "../runtime-walkthrough.md"
  - "../modular-architecture.md"
  - "../concept.md"
  - "../../architecture/pi-session-architecture.md"
---

# Session log as single source of truth — deep audit (2026-05-12)

User pushed back on the design's reliance on scanning the session log to discover TODO state, calling it "brittle, unidiomatic and effortful." This page documents the investigation, which concluded the opposite: **session-log scanning is the canonical Pi pattern, not a workaround.** The audit also surfaced and corrected a mistaken belief about how compaction affects extensions.

## What was challenged

1. Is `loadTodosFromSession` brittle? Is there a cleaner cross-extension API?
2. How does compaction affect what extensions see?
3. Does our `compactionSummary` actually do what we thought?
4. Is tintinweb's source-of-truth model defensible?

## Findings

### 1. There is no programmatic access to another extension's state

| API | Returns | Useful for invoking tools? |
|---|---|---|
| `pi.getAllTools()` | `ToolInfo[]` — name, schema, source metadata | **No** — execute is stripped. Issue [#2420](https://github.com/badlogic/pi-mono/issues/2420) requests `getToolExecutor()`; not implemented. |
| `pi.getActiveTools()` | Names only | No |
| `pi.getCommands()` | `SlashCommandInfo[]` — TUI commands | No — would route through TUI input parser, not a function call |
| `pi.events.on/emit` | Pub/sub event bus (`{emit(channel, data), on(channel, handler): () => void}`) | Only if **both extensions** agree on a channel name and event shape |

tintinweb's `TodoStateManager` is a private closure inside their extension's factory function. Pi loads each extension as a separate module root ([packages docs](https://docs.pi.dev)). There is no shared scope, no global registry, no way to reach across.

### 2. The session log is append-only, and `getBranch()` returns full history

From `dist/core/session-manager.d.ts`:

> "The session is **append-only**: use appendXXX() to add entries... Entries **cannot be modified or deleted**."
> 
> `getBranch(fromId?)` — "Walk from entry to root, returning **all entries** in path order. Includes all entry types (messages, compaction, model changes, etc.)."

There are two distinct walking primitives:

| Method | Returns | Consumer |
|---|---|---|
| `getBranch()` | Full path from leaf to root, all entries including pre-compaction toolResults | **Extensions** read this |
| `buildSessionContext()` | LLM's filtered view (replaces pre-compaction entries with the compaction summary) | Internal — what gets sent to the model |

The compaction logic in `dist/core/session-manager.js:112-205` confirms: compaction filtering happens **only when building the LLM's view**. The underlying JSONL file is never rewritten; entries are never deleted.

### 3. This invalidates an earlier claim about `compactionSummary`

Earlier in the design I argued our `compactionSummary` was buggy because "after compaction, `loadTodosFromSession` returns `[]` because the toolResult entries were pruned." **This was wrong.** Compaction doesn't prune entries from the file. `getBranch()` still sees them after compaction. The latest `manage_todo_list` toolResult remains findable.

### 4. How tintinweb actually handles compaction

`tintinweb/pi-manage-todo-list@main/src/index.ts` has **no** `session_before_compact` handler. It rebuilds its in-memory state from session entries on `session_start` and `session_tree`:

```typescript
pi.on("session_start", async (_event, ctx) => reconstructState(ctx));
pi.on("session_tree",  async (_event, ctx) => reconstructState(ctx));
```

`reconstructState` calls `state.loadFromSession(ctx)` which is structurally identical to our `loadTodosFromSession` — same `getBranch()` scan, same filter on `toolName === "manage_todo_list"`, same `details.todos` extraction.

**The canonical pattern: extensions ignore compaction. The session log carries the state through.**

### 5. The pattern is documented and enforced ecosystem-wide

Pi's built-in `examples/extensions/todo.ts` declares this design explicitly:

> "State is stored in tool result details (not external files), which allows proper branching — when you branch, the todo state is automatically correct for that point in history."

Issue [#326](https://github.com/badlogic/pi-mono/issues/326) (Unified extension loading) confirms the maintainer's intent:

> "tool writes state to session upon agent invocations... hook parses last state from session and displays it"

Tool writes to session, hook reads from session. That **is** the cross-extension protocol.

### 6. Why it's correct, not brittle

The session log is the only mechanism that is simultaneously:

- **Branch-correct**: fork creates a new branch; `getBranch()` walks the right path automatically
- **Compaction-survivable**: log entries are append-only, never deleted
- **Reload-survivable**: state is on disk, not in memory
- **Time-travel-correct**: `/tree` navigation moves the leaf pointer; reading from the new leaf gives the state at that point in history
- **Fork-isolated**: divergent branches share ancestry but not future entries

In-memory state, shared files, or direct API access all fail on at least one of these.

### 7. Performance is not a real concern

`getBranch()` is O(n) where n is the depth of the session branch. For typical sessions (50-300 entries), this is sub-millisecond. Our prior worry about "O(n)×2 scan per agent_end" turned out to be an optimization opportunity, not a correctness issue. We've also since merged `shouldContinue` and `buildIterationPrompt` into a single `iterate()` call, eliminating the double-scan entirely.

### 8. The only real coupling risk is shallow

`loadTodosFromSession` couples to tintinweb on two facts:

1. `toolName === "manage_todo_list"` (the npm package's identity — won't change without breaking their users)
2. `details: { todos: TodoItem[] }` (their public contract; the `TodoDetails` type)

If tintinweb breaks either, our list goes empty visibly — easy to detect, easy to fork. No silent corruption. This is the same coupling tintinweb has to itself via its own `loadFromSession`.

## Decisions taken on the back of this audit

1. **Drop `compactionSummary` from `LoopDriver`** — wrong abstraction. Compaction is handled by Pi's append-only design; extensions don't need to participate. Evolve (which keeps state outside the session log in `.pi/dacmicu/state/`) can hook `session_before_compact` directly if it ever needs to inject a summary.

2. **Drop the snapshot-cache workaround in `@pi-dacmicu/todo`** — was solving a non-problem. We thought it was a correctness fix for the compaction-pruning bug; turns out the bug didn't exist.

3. **Drop `onLoopStart` / `onLoopEnd` hooks** — YAGNI. Evolve will add them back if needed.

4. **Merge `shouldContinue` + `buildIterationPrompt` into `iterate(ctx) → Prompt | null`** — one scan, one decision, one return. Matches opencode's `oc check`-style pattern.

5. **Re-affirm dependency on tintinweb** — the audit removed the only real concern (brittleness). Owning ~300 LOC of duplicate tool+widget+validation code is strictly worse than depending on the canonical Pi todo package.

## Final LoopDriver shape (post-audit)

```typescript
export interface LoopDriver {
  driverId: string;
  iterate(ctx: ExtensionContext):
    | { content: (TextContent | ImageContent)[]; customType: string }
    | null
    | Promise<{ content: (TextContent | ImageContent)[]; customType: string } | null>;
}
```

Three lines. No compactionSummary. No lifecycle hooks. No phase machine. No state file writes from the todo driver. The base does state-file cleanup on `session_shutdown` (for drivers like evolve that DO use the state file).

## Lessons

- Read primary sources before designing fixes. I added snapshot caching to fix a compaction bug that didn't exist because I hadn't read `session-manager.d.ts` carefully.
- "Brittleness" is sometimes a felt sense rather than a real risk. The audit cost a few hours and converted a felt-brittle design into a known-robust one without code changes.
- Pi's design is genuinely good. Append-only logs + branch traversal is the right primitive for everything we want: forking, compaction, time travel, cross-extension state.
