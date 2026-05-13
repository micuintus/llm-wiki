---
title: "DACMICU runtime walkthrough"
type: architecture
updated: 2026-05-12
sources:
  - "../../pi-dacmicu/packages/base/runtime.ts"
  - "../../pi-dacmicu/packages/todo/index.ts"
  - "/tmp/pi-github-repos/tintinweb/pi-manage-todo-list@main/src/tool.ts"
  - "/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/session-manager.d.ts"
see_also:
  - "README.md"
  - "log.md"
  - "../architecture/pi-session-architecture.md"
  - "archive/research-2026-05-12-session-as-sot.md"
---

# DACMICU runtime walkthrough

Turn-by-turn detail of how `tintinweb/pi-manage-todo-list`, `@pi-dacmicu/todo`, and `@pi-dacmicu/base` interact during a live session. Companion to [README.md](README.md) — that page has the canonical design; this page has the dynamic flow at finer granularity.

*Updated: 2026-05-12 — reflects the post-audit simplification: single `iterate()` method, no `compactionSummary`, no phase machine, no lifecycle hooks, no state writes from `todo`.*

## How `@pi-dacmicu/todo` discovers the TODO list

**It doesn't subscribe — it polls. And polling is correct.**

There is no event listener on tintinweb's tool, no intercept, no shared in-memory state. The coupling is purely indirect, via Pi's append-only session log:

1. LLM calls `manage_todo_list(write, todoList=[...])`
2. tintinweb's tool executes, returns `{content, details: {todos: [...]}}`
3. Pi appends a `toolResult` message entry to the session branch
4. Turn ends → `agent_end` fires
5. `base`'s `agent_end` handler calls `driver.iterate(ctx)`
6. `todo`'s `iterate` calls `loadTodosFromSession(ctx)`, which scans `ctx.sessionManager.getBranch().reverse()` for the latest `toolName === "manage_todo_list"` entry and reads `details.todos`

This is **stateless polling against a persistent, branch-correct log.** `todo` has no idea *whether* the LLM updated the list during the just-finished turn — it just re-reads. If the list is unchanged, the prompt is identical and the loop converges.

Why this is the right design (not a workaround):

- **Append-only**: `getBranch()` returns the full history. Compaction doesn't prune the file; only `buildSessionContext()` filters for the LLM. Our scan sees through compaction natively.
- **Branch-correct**: `/fork` creates a new branch; `getBranch()` from the new leaf returns the parent's history. The TODO list is automatically correct for the forked branch.
- **Reload-survivable**: no in-memory cache to lose.
- **Mirrors tintinweb**: tintinweb's own `state-manager.loadFromSession` does the exact same scan to rebuild its in-memory state on `session_start`. We use the same primitive.

See [pi-session-architecture](../architecture/pi-session-architecture.md) for the general pattern; [research-2026-05-12-session-as-sot](archive/research-2026-05-12-session-as-sot.md) for the audit that established it.

**Cost:** O(branch depth) per `agent_end`. Sub-millisecond for typical sessions.

**Brittleness:** if tintinweb renames the tool or changes `details.todos` shape, our scan silently returns `[]`. Visible failure mode (loop never fires). Pinned by version range in `package.json` and a CONTRACT comment in `loadTodosFromSession`.

## Who builds and who sends the prompt

`@pi-dacmicu/todo` **authors** the prompt. `@pi-dacmicu/base` **sends** it.

| Step | Owner | What happens |
|---|---|---|
| Decide whether to continue and what to inject | `todo` | `iterate(ctx)` returns `null` (stop) or `{customType, content}` (continue) |
| Decide WHEN | `base` | `agent_end` handler — fires once per turn end |
| Actually send | `base` | `pi.sendMessage(prompt, {triggerTurn: true, deliverAs: "followUp"})` |

`todo` never calls `pi.sendMessage`. It describes a prompt; base handles dispatch. Future drivers (ralph, evolve) share base's wiring without reimplementing it.

## The `@pi-dacmicu/base` API surface

Four exports. That's everything.

### 1. `LoopDriver` interface — the contract

```typescript
export interface LoopDriver {
    driverId: string;
    iterate(ctx: ExtensionContext):
        | { content: (TextContent | ImageContent)[]; customType: string }
        | null
        | Promise<{ content: (TextContent | ImageContent)[]; customType: string } | null>;
}
```

| Method | Called when | Returns | Purpose |
|---|---|---|---|
| `iterate` | every `agent_end` (modulo abort / pending-user-message guards) | `null` to stop; prompt to continue | One decision, one prompt build, one scan |

That's it. No `shouldContinue`. No `buildIterationPrompt`. No `compactionSummary`. No `onLoopStart` / `onLoopEnd`. The audit (2026-05-12) established that:

- Splitting continuation-check from prompt-build was an opencode-style separation that gave us nothing here and cost a duplicate scan
- `compactionSummary` was solving a non-existent problem — append-only session log + `getBranch()` survives compaction natively
- Lifecycle hooks were YAGNI for TODO; evolve adds them back if needed

### 2. `attachLoopDriver(pi, driver): void`

The wiring function. One call per driver, at extension load time. Registers:

- `pi.on("agent_end", ...)` — guards on `hasPendingMessages` and `signal.aborted`, then calls `driver.iterate(ctx)`. If `null`, the state file slot for `driver.driverId` is cleared. Otherwise dispatches via `pi.sendMessage` with `{triggerTurn: true, deliverAs: "followUp"}`.
- `pi.on("session_shutdown", ...)` — deletes `.pi/dacmicu/state/<sessionId>.json` so old state files don't accumulate. (No-op if the file doesn't exist; safe for drivers that never use the state file.)

Errors thrown from `iterate` or `sendMessage` are caught and surfaced via `ctx.ui.notify`. The loop continues — a single failure doesn't kill the driver.

### 3. State helpers (for drivers that need state outside the session log)

```typescript
function readState<T>(ctx: ExtensionContext, key: string): T | undefined
function writeState<T>(ctx: ExtensionContext, key: string, value: T): void
function deleteState(ctx: ExtensionContext, key: string): void
```

All read from / write to `<cwd>/.pi/dacmicu/state/<sessionId>.json`. Flat key→JSON map. Multiple drivers store under different keys without collision.

**Today, only `evolve` plans to use these.** The `todo` driver is pure: it reads the session log and writes nothing to the state file. The state file machinery exists for drivers like evolve where state is genuinely outside the conversation (git branches, candidate metadata, MATS tree).

### Explicitly NOT in the API

- No "stop loop" tool — exit is purely `iterate`-driven (returns `null` against objective state). The LLM cannot escape the deterministic skeleton via a tool call.
- No registry / discovery — caller owns the `LoopDriver` instance and constructs it inline.
- No multi-driver coordination — loading two drivers in one session is the caller's problem (in practice it works because each registers its own `agent_end` listener; both fire).
- No iteration cap, no timeout.
- No compaction hook in `LoopDriver`. Drivers can still register their own `session_before_compact` handler directly if needed.

## One full iteration, step by step

```
┌─ Iteration boundary: assistant finishes a turn ──────────────┐
│                                                              │
│ 1. Pi emits "agent_end" event                                │
│                                                              │
│ 2. base's handler runs:                                      │
│      a. ctx.hasPendingMessages()?  → bail (yield to user)    │
│      b. ctx.signal?.aborted?       → bail (Ctrl-C)           │
│                                                              │
│ 3. base calls driver.iterate(ctx):                           │
│      └─ todo runs loadTodosFromSession(ctx)                  │
│         scans branch (reverse) for latest                    │
│         manage_todo_list toolResult                          │
│                                                              │
│         IF all items completed (or list empty):              │
│           return null                                        │
│         ELSE:                                                │
│           return {                                           │
│             customType: "todo-iterate",                      │
│             content: [{ type: "text", text:                  │
│               "The TODO loop is iterating. Current list:     │
│                [ ] #1: Write greeting                        │
│                [>] #2: Add tests                             │
│                ...                                           │
│                Before working the next item:                 │
│                1. Reassess the list...                       │
│                2. If yes, call manage_todo_list(write...)    │
│                3. Then pick the top not-completed item       │
│                   and work on it..." }]                      │
│           }                                                  │
│                                                              │
│ 4. If iterate returned null:                                 │
│      base calls deleteState(driverId), returns. Loop exits.  │
│                                                              │
│ 5. If iterate returned a prompt:                             │
│      base calls pi.sendMessage(                              │
│        { customType, content, display: false },              │
│        { triggerTurn: true, deliverAs: "followUp" }          │
│      )                                                       │
│        └─ Pi receives this:                                  │
│           - At agent_end, agent is idle                      │
│           - triggerTurn:true → agent runs again with the     │
│             message as a new user turn                       │
│           - display:false hides from the TUI transcript      │
│             (the LLM still sees it)                          │
│                                                              │
│ 6. Pi schedules the next assistant turn                      │
│                                                              │
└─ Next iteration starts ──────────────────────────────────────┘

LLM receives the prompt → uses manage_todo_list to update status
→ tintinweb appends a new toolResult to the branch
→ LLM finishes turn → agent_end fires → cycle repeats
```

## Load-bearing details

**Reassessment is part of the prompt, not a separate turn.** The unified `ITERATION_PROMPT` instructs the LLM to reassess the list before working the next item, in a single turn. There is no phase machine alternating WORK / REASSESS turns. The audit found the phase machine to be unnecessary complexity — the LLM is perfectly capable of "reassess, then work" in one turn, and inlining it halves the token cost.

**The injection is the same mechanism a user typing into the TUI would use.** `pi.sendMessage({triggerTurn: true})` is the same code path as user input. The LLM cannot distinguish "user typed this" from "the loop driver sent this." That's intentional — the deterministic skeleton works because the LLM treats injected prompts as authoritative user input.

**`display: false`** hides the prompt from the human-visible transcript but not from the LLM. The LLM sees the full conversation; the TUI shows only the LLM's responses to keep the transcript readable.

**`customType: "todo-iterate"`** is the loop's introspection hook. Lets `/dacmicu_status` and tests identify what kind of prompt drove each turn without parsing text. Metadata for tooling; ignored by the LLM.

## Exit paths

There are exactly three:

1. **Objective state says done.** `iterate` returns `null`. base calls `deleteState(driverId)` and the loop ends. For TODO this fires when `todos.every(t => t.status === "completed")`, when the list is empty (LLM cleared it during reassessment), or when no `manage_todo_list` toolResult exists yet (no list has ever been written).
2. **User yields mid-turn.** `ctx.hasPendingMessages()` is `true` at `agent_end` — the user typed something while the LLM was responding. base bails without scheduling the next iteration; the user's message takes over.
3. **User aborts.** `ctx.signal?.aborted` is `true` — Ctrl-C pressed. base bails. The state file is NOT deleted — on the next `agent_end` (next user message) the loop resumes against whatever state is in the session.

There is intentionally no LLM-callable break. The deterministic skeleton is the whole point: the LLM must work the list or change the list, not escape the cycle.

## How `/fork` affects the loop

`/fork` creates a new session ID. The state file is keyed by session ID, so the forked session starts with an empty state file. But the forked session sees the parent's session entries (that's what `/fork` is for) — including the `manage_todo_list` toolResults. So `loadTodosFromSession` returns the parent's latest list, and the loop continues from there in the forked branch.

The `todo` driver in particular has no per-session state (its scan is pure), so forking is fully transparent — both branches drive independently with their own future entries but share ancestor history.

## What survives compaction

| Thing | Survives? | How |
|---|---|---|
| Latest TODO list | YES | Session log is append-only; `getBranch()` returns full history regardless of compaction; `loadTodosFromSession` finds it |
| Driver attachment | YES | Registered handlers persist for the Pi process lifetime |
| Driver state file (used by evolve, not todo) | YES | File lives on disk under `.pi/dacmicu/state/`; compaction only touches in-memory session entries |
| LLM's understanding that a loop is running | DEPENDS | After compaction, the LLM sees only the summary + recent entries. The next iteration prompt re-establishes context. No special `compactionSummary` machinery is needed. |

**The audit found that `compactionSummary` was solving a non-problem.** Compaction doesn't prune the file. Extensions reading via `getBranch()` see through compaction natively. tintinweb has no `session_before_compact` handler. Neither do we.

## See also

- [README](README.md) — single-page canonical design (concept + architecture in one)
- [log](log.md) — chronological design-decision history
- [pi-session-architecture](../architecture/pi-session-architecture.md) — Pi's append-only session model in depth
- [research-2026-05-12-session-as-sot](archive/research-2026-05-12-session-as-sot.md) — the audit behind this design
- [TODO Tool APIs](../ecosystem/todo-tool-apis.md) — comparing tintinweb's tool to Claude Code's `TodoWrite` and opencode's `todowrite`/`todoread`
