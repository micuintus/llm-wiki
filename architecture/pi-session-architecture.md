---
title: "Pi session model — append-only log, branches, compaction"
type: architecture
updated: 2026-05-12
sources:
  - "/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/session-manager.d.ts"
  - "/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/session-manager.js"
  - "/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/docs/compaction.md"
  - "/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/event-bus.d.ts"
  - "https://github.com/badlogic/pi-mono/issues/2420"
  - "https://github.com/badlogic/pi-mono/issues/326"
tags: [pi, architecture, session, compaction, extensions, cross-extension]
see_also:
  - "../dacmicu/archive/research-2026-05-12-session-as-sot.md"
  - "../dacmicu/runtime-walkthrough.md"
  - "subprocess-rpc-rendering.md"
---

# Pi session model — append-only log, branches, compaction

Pi sessions are not chat transcripts. They are append-only logs of typed entries, organized as a tree (because of `/fork` and `/tree`), where the LLM's view is a filtered projection over the leaf-to-root path. Understanding this model is essential for any extension that needs to know "the current state of X" — whether X is a todo list, a plan, a fitness target, or anything else.

## The data model

Each session is a single JSONL file at `~/.pi/agent/sessions/<encoded-cwd>/<sessionId>.jsonl`. Each line is one entry. Entries are typed and immutable. There are several types:

- `message` — user, assistant, or toolResult message
- `compaction` — a summary that replaces a span of messages in the LLM's view
- `branch_summary` — a summary inserted at `/tree` navigation
- `model_change`, `thinking_level_change` — settings changes
- `custom_message` — extension-defined typed entries
- `bash_execution` — bash output blocks

Entries have parent pointers. The leaf pointer marks "where we are now." Branches form when `/fork` or `/tree` moves the leaf away from the latest entry — new entries become children of the chosen point, not the previous leaf.

```
                                 ┌─ msgK ─ msgL  (forked branch, idle)
                                 │
   header ─ msg1 ─ msg2 ─ ... ─ msgN ─ msgN+1 ─ msgN+2  (active leaf)
                                                ▲
                                                └── new entries appended here
```

## The two walking primitives

The `SessionManager` exposes two distinct ways to walk the tree:

| Method | Returns | Use case |
|---|---|---|
| `getBranch(fromId?)` | **All entries** from leaf to root in path order. Includes message, compaction, model_change, custom_message, etc. | Extensions that need to see history including pre-compaction entries |
| `buildSessionContext()` | Filtered `Message[]` — what the LLM sees. Pre-compaction entries are dropped; the compaction summary takes their place. | Internal — used when sending to the model |

The crucial property: **`getBranch()` ignores compaction.** Compaction adds an entry; it doesn't remove any. The original toolResults, user messages, and assistant turns all stay in the file forever. Only `buildSessionContext()` applies the compaction-induced filter on top.

This is the design that makes Pi extensions robust against compaction without effort.

## Compaction in detail

From `docs/compaction.md`, compaction follows this sequence:

1. Walk backwards from the leaf, accumulating tokens until `keepRecentTokens` (default 20k) is reached. Call this point `firstKeptEntryId`.
2. Collect entries from the previous compaction's kept boundary (or session start) up to `firstKeptEntryId`. Call this `messagesToSummarize`.
3. Call an LLM to summarize `messagesToSummarize` into structured markdown.
4. Append a single `CompactionEntry` containing `{summary, firstKeptEntryId, tokensBefore}`.
5. Reload — but only what's reloaded is the LLM's view, via `buildSessionContext()`. The file is unchanged apart from the appended entry.

```
Before compaction (LLM view):
  [header][m1][m2][m3][m4][m5][m6][m7][m8][m9][m10]
                                     ▲
                              firstKeptEntryId = m7

After compaction (LLM view):
  [header][summary-of-m1..m6][m7][m8][m9][m10][cmp]

After compaction (extension view via getBranch()):
  [header][m1][m2][m3][m4][m5][m6][m7][m8][m9][m10][cmp]
  ▲                                                  ▲
  everything still here                              compaction entry appended
```

## Extension hooks and what they get

Extensions can subscribe to compaction events:

| Hook | When | Can return |
|---|---|---|
| `session_before_compact` | Before the LLM summary call | `{cancel: true}` to abort, or `{compaction: {summary, firstKeptEntryId, tokensBefore, details?}}` to replace the summary |
| `session_compact` | After compaction completes | Read-only notification |

The `event.preparation` payload includes everything needed to do custom summarization: `messagesToSummarize`, `turnPrefixMessages` (for split turns), `previousSummary` (for iterative compaction), `firstKeptEntryId`, `tokensBefore`. The `examples/extensions/custom-compaction.ts` shows a complete implementation using Gemini Flash for cheaper summarization.

**Most extensions don't need to participate in compaction at all.** If your state lives in session entries (tool results, custom_messages), `getBranch()` sees through compaction natively. Only extensions with state living outside the session log need to think about compaction.

## Cross-extension state sharing — the canonical pattern

Pi has no API for one extension to read another extension's internal state. There is no `getToolExecutor()`, no `getExtensionState()`. The closest thing is `pi.events`, a bare `EventBus`:

```typescript
interface EventBus {
  emit(channel: string, data: unknown): void;
  on(channel: string, handler: (data: unknown) => void): () => void;
}
```

This is pub/sub with string channels and untyped payloads. It works for real-time coordination if both extensions agree on a channel name (e.g. `subagents:rpc:spawn`). It does not survive reload, does not branch, does not survive compaction.

**For durable cross-extension state, the canonical pattern is the session log:**

| Producer | Mechanism |
|---|---|
| Extension owning the state | Writes to the session via tool calls (`registerTool` + `details` payload) or `appendEntry` (custom_message) |
| Consumer reading the state | `getBranch()` + filter by `type`, `toolName`, or `customType` |

Examples in the ecosystem:

- `tintinweb/pi-manage-todo-list` writes via `manage_todo_list` toolResult `details.todos`; reads via `loadFromSession` (its own state-rehydration) and our `loadTodosFromSession` (DACMICU's TODO loop driver) both scan the same way
- Pi's built-in `examples/extensions/tools.ts` persists tool selection by appending custom_message entries and rehydrating on load
- Pi's built-in `examples/extensions/todo.ts` makes the design explicit in a header comment: *"State is stored in tool result details (not external files), which allows proper branching"*

Why this pattern wins over alternatives:

| Alternative | Failure mode |
|---|---|
| In-memory shared state | Lost on `/reload`, lost on session restart, lost across forks |
| Shared file outside the session | Same content visible on every branch — breaks branching semantics |
| Cross-extension RPC via `pi.events` | Real-time only; doesn't survive reload; both ends must agree on channel name (no discovery) |
| Direct tool executor access | Not implemented (issue [#2420](https://github.com/badlogic/pi-mono/issues/2420)) |

The session log is the **only** primitive that is simultaneously: branch-correct, fork-correct, compaction-survivable, reload-survivable, and time-travel-correct.

## When NOT to use session entries

If your state genuinely doesn't belong in the conversation, e.g.:

- Long-running pid files (you don't want the LLM to see them)
- Cryptographic keys or credentials
- Multi-megabyte caches

…use the filesystem under `.pi/<your-extension>/` directly. For DACMICU this is `.pi/dacmicu/state/<sessionId>.json`, used today only by drivers like the planned `evolve` that need state too large or too sensitive for the session log.

## Practical extension patterns

### Pattern 1: Read-only consumer

You want to know "what's the latest X that the other extension wrote?" Scan the branch in reverse and stop at the first match:

```typescript
function loadLatest(ctx: ExtensionContext): X | undefined {
  for (const entry of ctx.sessionManager.getBranch().reverse()) {
    if (entry.type !== "message") continue;
    if (entry.message.role !== "toolResult") continue;
    if (entry.message.toolName !== "the-tool-name") continue;
    return entry.message.details as X;
  }
  return undefined;
}
```

Cost: O(branch depth) per call. For typical sessions (50-300 entries), sub-millisecond.

### Pattern 2: Real-time notification + durable backup

You want immediate notification when the other extension writes, but you also want a fallback for reload / fresh sessions.

- Notification: `pi.events.on("their-channel", handler)`. Requires they emit.
- Fallback: scan the branch as in Pattern 1 at load time.

If they don't emit events, Pattern 1 alone is fine. You'll just discover changes on the next `agent_end` instead of immediately.

### Pattern 3: Producer

You're the extension that owns the state. Three options:

1. **LLM-facing tool** — register a tool the LLM can call. The toolResult goes into the session automatically. This is what `manage_todo_list` does.
2. **Custom entry** — call `pi.appendEntry(customType, data)` whenever your state changes. Useful when state changes from human input (e.g. `/tools` toggling tool selection).
3. **Both** — the LLM mutates state via a tool; the human mutates state via a command that calls `appendEntry`. Both flows write to the session log.

## See also

- [DACMICU runtime walkthrough](../dacmicu/runtime-walkthrough.md) — the in-depth example: TODO loop reading tintinweb's writes
- [DACMICU session-as-SOT audit](../dacmicu/archive/research-2026-05-12-session-as-sot.md) — the investigation behind this page
- [Subprocess RPC rendering](subprocess-rpc-rendering.md) — when you actually do need to invoke another agent (subagents)
- Pi's `docs/compaction.md` and `docs/extensions.md` — primary sources
