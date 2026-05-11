# DACMICU Runtime Walkthrough

Turn-by-turn detail of how `tintinweb/pi-manage-todo-list`, `@pi-dacmicu/todo`, and `@pi-dacmicu/base` interact during a live session. Companion to [modular-architecture.md § How base, todo, and tintinweb interact](modular-architecture.md#how-base-todo-and-tintinwebpi-manage-todo-list-interact) — that page has the static structure; this page has the dynamic flow.

*Updated: 2026-05-11*

## How `@pi-dacmicu/todo` discovers the TODO list

**It doesn't subscribe — it polls.**

There is no event listener, no tool intercept, no callback registered against tintinweb's tool. The coupling is purely indirect through Pi's persistent session log:

1. LLM calls `manage_todo_list(write, todoList=[...])`
2. tintinweb's tool executes, returns `{content, details: {todos: [...]}}`
3. Pi appends a `toolResult` message entry to the session branch
4. Turn ends → `agent_end` fires
5. base's `agent_end` handler calls `driver.shouldContinue(ctx, state)`
6. todo's `shouldContinue` calls `loadTodosFromSession(ctx)`, which scans `ctx.sessionManager.getBranch().reverse()` for the latest `toolName === "manage_todo_list"` entry and reads `details.todos`

This is **stateless polling against a persistent log**. todo has no idea *whether* the LLM updated the list in the just-finished turn — it just re-scans the branch every time. If the list didn't change, the scan returns the same snapshot and the loop draws the same conclusion.

Properties of this design:

- Survives extension reload — no in-memory cache to lose
- Works retroactively — if `@pi-dacmicu/todo` loads mid-session, it picks up existing todos immediately
- Forks cleanly — `/fork` creates a new branch; the scan reads the forked branch's history independently
- Zero coupling to tintinweb's runtime — we never call into their code, only read what Pi already persisted

**Cost:** O(branch length) scan per `agent_end`. Trivial in practice.

**Brittleness:** if tintinweb renames the tool or changes `details` shape, the scan silently starts returning `[]`. Pinned by version range in `package.json` and a CONTRACT comment in `loadTodosFromSession`.

## Who injects the next prompt

`@pi-dacmicu/todo` **authors** the prompt text. `@pi-dacmicu/base` **injects** it via `pi.sendMessage`.

| Step | Owner | What happens |
|---|---|---|
| Decide WHAT to inject | `todo` | `buildIterationPrompt` returns `{customType, content}` |
| Flip phase state | `todo` | `writeState(ctx, "todo", {phase: "work"})` inside `buildIterationPrompt` |
| Decide WHEN to inject | `base` | `agent_end` handler — fires once per turn end |
| Actually inject | `base` | `pi.sendMessage(prompt, {triggerTurn: true, deliverAs: "followUp"})` |

todo never calls `pi.sendMessage` itself. It describes the prompt; base handles the plumbing. Future drivers (ralph, evolve) share base's lifecycle wiring without reimplementing it.

## The `@pi-dacmicu/base` API surface

Exactly four exports. That's the entire public API.

### 1. `LoopDriver` interface — the contract

```typescript
interface LoopDriver {
    driverId: string;
    // Required
    shouldContinue(ctx, state): boolean | Promise<boolean>;
    buildIterationPrompt(ctx, state): {
        content: (TextContent | ImageContent)[];
        customType: string;
    };
    // Optional
    systemPromptAddition?(ctx, state): string | undefined;
    compactionSummary?(ctx, state): string | undefined;
}
```

| Method | Called when | Returns | Purpose |
|---|---|---|---|
| `shouldContinue` | every `agent_end` | `true` keep looping; `false` exit | Objective state check (e.g. `todos.some(!completed)`) |
| `buildIterationPrompt` | every `agent_end` where `shouldContinue` is `true` | `{customType, content}` | The actual instruction the LLM gets next |
| `systemPromptAddition` | every `before_agent_start` while loop active | string or `undefined` | LLM-visible context that should accompany every turn |
| `compactionSummary` | every `session_before_compact` while loop active | string or `undefined` | Survives compaction so the LLM remembers it was looping |

### 2. `attachLoopDriver(pi, driver): void`

The wiring function. One call per driver, at extension load time. Effects:

- Appends a `dacmicu:driver` sentinel custom-entry with `{driverId}` to the session (informational)
- Registers `pi.on("agent_end", ...)` — calls `shouldContinue` then either exits or builds the next prompt via `pi.sendMessage`
- Registers `pi.on("before_agent_start", ...)` — calls `systemPromptAddition` and merges via `appendSystemPrompt`
- Registers `pi.on("session_before_compact", ...)` — calls `compactionSummary`, returns `CompactionResult` with `details: {dacmicuState}` so state survives compaction

### 3. State helpers

```typescript
function readState<T>(ctx: ExtensionContext, key: string): T | undefined
function writeState<T>(ctx: ExtensionContext, key: string, value: T): void
function deleteState(ctx: ExtensionContext, key: string): void
```

All read from / write to `<cwd>/.pi/dacmicu/state/<session-id>.json`. Flat key→JSON map. Multiple drivers store under different keys without collision. Survives compaction; isolated per `/fork` (each branch gets a unique session ID, hence its own file).

### 4. `appendSystemPrompt(current, addition): string`

Trivial helper — `current + "\n\n" + addition`, or `current` if addition is empty. Centralized so all drivers chain prompts the same way.

### Explicitly NOT in the API

- No "stop loop" tool — exit is purely `shouldContinue`-driven (removed in commit `defa5d69`; the LLM is not allowed to break out of the deterministic skeleton)
- No registry / discovery — caller owns the `LoopDriver` instance
- No multi-driver coordination — the sentinel is informational; loading two drivers simultaneously is the caller's problem
- No iteration cap, no timeout

## One full iteration, step by step

```
┌─ Iteration boundary: assistant finishes a turn ──────────────┐
│                                                              │
│ 1. Pi emits "agent_end" event                                │
│                                                              │
│ 2. base's handler runs:                                      │
│      a. ctx.hasPendingMessages()?  → bail (yield to user)    │
│      b. ctx.signal.aborted?        → bail (Ctrl-C)           │
│      c. state = readState(ctx, "todo")                       │
│         └─ reads .pi/dacmicu/state/<sid>.json["todo"]        │
│            → { phase: "work" } or { phase: "reassess" }      │
│                                                              │
│ 3. base calls driver.shouldContinue(ctx, state):             │
│      └─ todo runs loadTodosFromSession(ctx)                  │
│         scans branch for latest manage_todo_list result      │
│         returns todos.some(t => t.status !== "completed")    │
│                                                              │
│      If false: deleteState("todo"), return. Loop exits.      │
│                                                              │
│ 4. base calls driver.buildIterationPrompt(ctx, state):       │
│      └─ todo inspects state.phase:                           │
│         IF "work":                                           │
│            writeState("todo", {phase: "reassess"})           │
│            return {                                          │
│              customType: "todo-work",                        │
│              content: [{ type: "text", text:                 │
│                "Work the next TODO item:                     │
│                 [ ] #1: Write greeting                       │
│                 ..."}]                                       │
│            }                                                 │
│         IF "reassess":                                       │
│            writeState("todo", {phase: "work"})               │
│            return {                                          │
│              customType: "todo-reassess",                    │
│              content: [{ type: "text", text:                 │
│                "Reassess the TODO list. ..."}]               │
│            }                                                 │
│                                                              │
│ 5. base calls pi.sendMessage(                                │
│        { customType, content, display: false },              │
│        { triggerTurn: true, deliverAs: "followUp" }          │
│    )                                                         │
│      └─ Pi receives this:                                    │
│         - At agent_end, agent is idle                        │
│         - triggerTurn:true → calls agent.prompt() with       │
│           the message as a new user turn                     │
│         - deliverAs:"followUp" is ignored in idle path       │
│         - display:false hides from the TUI transcript        │
│           (the LLM still sees it)                            │
│                                                              │
│ 6. Pi schedules the next assistant turn                      │
│                                                              │
└─ Next iteration starts ──────────────────────────────────────┘

LLM receives the prompt → uses manage_todo_list to update status
→ tintinweb appends a new toolResult to the branch
→ LLM finishes turn → agent_end fires → cycle repeats
```

## Load-bearing details

**Phase flip happens at prompt-build time, not at receive-time.** `buildIterationPrompt` writes the *next* phase to the state file before returning. Even if Pi crashes between `sendMessage` and the next `agent_end`, the file already says "reassess" — recovery correctly injects a REASSESS prompt next time. Hidden state machine, externalized.

**The injection is the same mechanism a user typing into the TUI would use.** `pi.sendMessage({triggerTurn: true})` is the same code path as user input. The LLM cannot distinguish "user typed this" from "the loop driver sent this." That's intentional — the deterministic skeleton works because the LLM treats injected prompts as authoritative.

**`display: false`** hides the prompt from the human-visible transcript but not from the LLM. The LLM sees the full conversation including injected messages; the TUI shows only the LLM's responses. Without this, every loop iteration would spam the transcript.

**`customType`** is the loop's introspection hook. `"todo-work"` and `"todo-reassess"` let `/dacmicu_status` and tests identify what kind of prompt drove each turn without parsing text. Metadata for tooling, ignored by the LLM.

## Exit paths

There are exactly three:

1. **Objective state says done.** `shouldContinue` returns `false`. base calls `deleteState(driverId)` and the loop ends. For TODO this fires when `todos.every(t => t.status === "completed")`, or when the list is empty (LLM cleared it during REASSESS).
2. **User yields mid-turn.** `ctx.hasPendingMessages()` is `true` at `agent_end` — the user typed something while the LLM was responding. base bails without scheduling the next iteration; the user's message takes over.
3. **User aborts.** `ctx.signal.aborted` is `true` — Ctrl-C pressed. base bails. Note this does NOT delete state — on the next `agent_end` (next user message) the loop resumes from where it stopped.

There is intentionally no LLM-callable break. The deterministic skeleton is the whole point: the LLM must work the list or change the list, not escape the cycle.

## How `/fork` affects state

`/fork` creates a new session ID. The state file is keyed by session ID, so the forked session starts with an empty state file. The forked session DOES see the parent's session entries (that's what `/fork` is for) — including the `manage_todo_list` toolResults. So `loadTodosFromSession` returns the same list the parent had. But the phase resets to default (`work`) because the file is fresh.

In practice this means: a fork mid-loop will restart from a WORK phase against the inherited list. The LLM will be asked to work the next incomplete item rather than reassess. Acceptable default — the alternative (inheriting the phase) would require parsing the parent's state file path, which couples forks to filesystem layout.

## What survives compaction

Compaction summarizes the session to fit within token budget. Two things are at risk and how DACMICU handles each:

| Thing | At risk? | How it survives |
|---|---|---|
| Latest TODO list | YES — tintinweb's toolResult `details` can be summarized away | The list is restated in the `compactionSummary` text returned by todo's driver |
| Phase (work/reassess) | NO — lives in the state file, untouched by compaction | File is on disk, compaction only touches in-memory session entries |
| Driver registration | NO — registered handlers persist for the lifetime of the Pi process | n/a |
| Sentinel entry | YES — could be summarized, but loss is informational only (no logic depends on it post-startup) | n/a |

The compaction summary text mentions "DACMICU TODO loop is ACTIVE. N/M items done. Phase: X." This is the LLM's only window into the loop state after compaction. The driver continues to function regardless — even if the LLM has total amnesia about the loop, the next `agent_end` will still fire shouldContinue/buildIterationPrompt against the file-backed state, and the LLM will receive a fresh WORK or REASSESS prompt.

## See also

- [Modular Architecture](modular-architecture.md) — static structure, dep DAG
- [Concept](concept.md) — why this design (variants A/B, reassess rationale)
- [TODO Tool APIs](../ecosystem/todo-tool-apis.md) — how tintinweb's tool shape compares to Claude Code / Copilot / opencode
