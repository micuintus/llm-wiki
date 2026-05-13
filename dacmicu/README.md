---
title: DACMICU
type: living-docs
updated: 2026-05-13
see_also:
  - "log.md"
  - "runtime-walkthrough.md"
  - "spirit-vs-opencode.md"
  - "../architecture/pi-session-architecture.md"
  - "../ecosystem/todo-tool-apis.md"
  - "archive/"
---

# DACMICU

A modular extension architecture for Pi that gives the assistant a **deterministic skeleton**: TODO loop, Ralph loop, self-evolve loop. The LLM is the muscle; DACMICU is the spine.

The LLM never knows DACMICU exists. It uses normal Pi tools (`manage_todo_list` etc.). DACMICU's only job is to fire on every `agent_end` and inject the next iteration's prompt until objective state says the work is done.

## The three loops (the name)

| Letter | Loop | What it drives | Package |
|---|---|---|---|
| **DAC** | Deterministic Action Checkpoints | TODO list — work down items, reassess between each | `@pi-dacmicu/todo` |
| **MIC** | Many Iterations of Code | Ralph-style: pick next thing, fix it, check in, repeat toward a fitness target | `@pi-dacmicu/ralph` (planned) |
| **U** | Underlying meta-evolution | Variants on git branches, evaluate, pick best, repeat | `@pi-dacmicu/evolve` (planned) |

Each loop shares one tiny runtime — `@pi-dacmicu/base` — that owns the `agent_end → check → maybe inject prompt` cycle.

## The two architectural variants

DACMICU has **two execution models**, picked per consumer by whether iterations need shared context or context isolation. Both share the same outer loop driver; they differ in what runs inside each iteration.

| Variant | Context across iterations | Substrate per iteration | Used by |
|---|---|---|---|
| **A — In-session loop** | Shared. Each iteration appends to the same session. | `pi.sendMessage({triggerTurn:true})` against the parent session. | `todo` (always), `ralph` (default) |
| **B — Subagent-per-iteration** | Isolated. Each iteration starts with empty messages. | Fresh `AgentSession` per turn via a third-party subagent provider (`Hopsken/pi-subagents` or `tintinweb/pi-subagents`) over `pi.events` RPC. | `ralph` (opt-in), `evolve` (target) |

Today only Variant A is built (`@pi-dacmicu/todo`). Variant B requires the subagent provider, which we depend on rather than build ourselves — see [spirit-vs-opencode](spirit-vs-opencode.md) and [ecosystem/subagents](../ecosystem/subagents.md).

## The LoopDriver API

The entire public API of `@pi-dacmicu/base` is four exports:

```typescript
export interface LoopDriver {
  driverId: string;
  iterate(ctx: ExtensionContext):
    | { content: (TextContent | ImageContent)[]; customType: string }
    | null
    | Promise<{ content: (TextContent | ImageContent)[]; customType: string } | null>;
}

export function attachLoopDriver(pi: ExtensionAPI, driver: LoopDriver): void;
export function readState<T>(ctx: ExtensionContext, key: string): T | undefined;
export function writeState<T>(ctx: ExtensionContext, key: string, value: T): void;
export function deleteState(ctx: ExtensionContext, key: string): void;
```

`iterate(ctx)` is the entire contract. Return `null` to stop. Return a prompt to continue — base will dispatch it as a `followUp` turn with `triggerTurn: true`.

State helpers (`readState`/`writeState`/`deleteState`) exist for drivers that keep state outside the session log — only `evolve` will need them. `todo` is stateless: it reads from the session log every iteration and writes nothing.

### Explicitly NOT in the API

- **No `compactionSummary`.** Pi's session log is append-only; `getBranch()` returns full history regardless of compaction. Extensions reading from session entries survive compaction natively. See [pi-session-architecture](../architecture/pi-session-architecture.md). The 2026-05-12 audit ([research](archive/research-2026-05-12-session-as-sot.md)) established that the `compactionSummary` machinery we initially designed was solving a non-problem.
- **No `shouldContinue` + `buildIterationPrompt` split.** Merged into one `iterate()` call to eliminate the double-scan. Matches opencode's `oc check`-style pattern.
- **No `onLoopStart` / `onLoopEnd` hooks.** YAGNI for TODO. Evolve will add them back if needed.
- **No LLM-callable "stop loop" tool.** The whole point of the deterministic skeleton is that the LLM cannot escape it. Exit happens only when objective state changes (e.g. `todos.every(completed)`).

## The TODO loop — anatomy

```
User: "Implement feature X"
    ↓
LLM creates a TODO list via manage_todo_list tool
    ↓
agent_end fires → @pi-dacmicu/todo's iterate(ctx):
    scans ctx.sessionManager.getBranch() in reverse for the latest
    manage_todo_list toolResult; reads details.todos
    IF any item is not completed:
        return { customType: "todo-iterate",
                 content: "Reassess the list. Update if needed.
                           Then work the top not-completed item." }
    ELSE:
        return null  (loop exits)
    ↓
base dispatches the prompt via pi.sendMessage({triggerTurn:true,
                                               deliverAs:"followUp"})
    ↓
LLM reviews the list (maybe edits via manage_todo_list), picks the top
item, works on it, marks it completed
    ↓
agent_end fires → iterate runs again → cycle repeats
    ↓
All items completed → iterate returns null → loop exits
```

**Key design properties:**

- **One prompt per iteration.** Reassessment is a behavior in the prompt text, not a separate WORK/REASSESS phase. Earlier designs used a phase machine; it was removed because the forcing was illusory (the LLM could return from REASSESS without modifying the list) and the token cost was double.
- **Exit is purely objective.** `iterate` returns `null` when `todos.every(completed)` or the list is empty. The LLM exits the loop only by changing objective state.
- **State lives in the session log.** No separate file, no in-memory cache. tintinweb's `manage_todo_list` toolResult `details.todos` is the canonical store; `loadTodosFromSession` reads it via `getBranch()`. Branch-correct, fork-correct, compaction-survivable.

## How base, todo, and tintinweb mesh

Three independently-loaded Pi extensions with one-way couplings:

```
                ┌────────────────────────────────────────────┐
                │  LLM sees only: manage_todo_list(op, list) │
                └────────────────┬───────────────────────────┘
                                 │ tool call
                                 ▼
┌──────────────────────────────────────────────────────────────┐
│  tintinweb/pi-manage-todo-list                               │
│  - Owns the LLM tool surface                                 │
│  - Validates input, writes a toolResult with                 │
│    details: { todos: [...] }                                 │
│  - Knows NOTHING about DACMICU                               │
└──────────────────────────────────────────────────────────────┘
                                 │ toolResult appended to session
                                 ▼
┌──────────────────────────────────────────────────────────────┐
│  @pi-dacmicu/todo                                            │
│  - Reads tintinweb's toolResults via loadTodosFromSession    │
│  - On every agent_end:                                       │
│      iterate(ctx) → null (all done) OR                       │
│                  → { customType: "todo-iterate", content }   │
│  - Pure stateless polling: zero state-file writes            │
└──────────────────────────────────────────────────────────────┘
                                 │ uses
                                 ▼
┌──────────────────────────────────────────────────────────────┐
│  @pi-dacmicu/base                                            │
│  - attachLoopDriver: registers agent_end handler             │
│  - On agent_end: guards (hasPendingMessages, signal.aborted),│
│    calls driver.iterate(ctx), dispatches the prompt          │
│  - State-file helpers for drivers that need them (evolve)    │
│  - session_shutdown cleanup of .pi/dacmicu/state/*.json      │
│  - No compaction handling — Pi's session log carries state   │
└──────────────────────────────────────────────────────────────┘
```

**Three responsibilities, cleanly separated:**

| Concern | Owner | Why there |
|---|---|---|
| What the LLM can do | tintinweb | Canonical Pi TODO tool; LLM-training-known shape (Copilot-verbatim) |
| When the LLM gets to do it (turn scheduling) | `@pi-dacmicu/todo` | Auto-attached loop driver — fires on every `agent_end` |
| How a driver attaches to Pi's lifecycle | `@pi-dacmicu/base` | Generic primitive — TODO is just the first consumer; ralph and evolve will reuse it |

## The coupling contract with tintinweb

`@pi-dacmicu/todo` depends on tintinweb on two facts:

1. **`toolName === "manage_todo_list"`** — the npm package's identity. Won't change without breaking their existing users.
2. **`details: { todos: TodoItem[] }`** — their public `TodoDetails` type, where `TodoItem` is `{ id, title, description, status: "not-started" | "in-progress" | "completed" }`.

Both are tintinweb's public API. If either breaks, our list returns empty — visible failure mode, easy to detect, easy to fork tintinweb if needed.

We considered building our own todo extension to avoid the coupling. Rejected — it would duplicate ~300 LOC of tool + validation + widget code for zero current benefit. tintinweb is the canonical Pi todo extension, replicates Copilot's `manage_todo_list` schema, and battle-tested. Owning the dependency is strictly worse than depending on it.

Documented in `loadTodosFromSession` as a CONTRACT comment.

## Why this works: the session log as single source of truth

The premise that makes the architecture small and robust: **Pi sessions are append-only logs, and `getBranch()` returns full history regardless of compaction.**

| Method | Returns | Used by |
|---|---|---|
| `ctx.sessionManager.getBranch()` | All entries from leaf to root in path order | Extensions |
| `buildSessionContext()` (internal) | Filtered view applying compaction | The LLM's view |

The compaction-induced filter happens only when building the LLM's view. The file is never rewritten; entries are never deleted. Our scan in `loadTodosFromSession` finds the latest `manage_todo_list` toolResult **even after compaction** because the toolResult entry is still in the file.

This is also why we don't have a `compactionSummary` handler. tintinweb doesn't have one either — both extensions rely on the append-only log to carry state through compaction. The full investigation is in [research-2026-05-12-session-as-sot](archive/research-2026-05-12-session-as-sot.md); the general pattern (which applies to any Pi extension, not just DACMICU) is in [pi-session-architecture](../architecture/pi-session-architecture.md).

## Exit paths

There are exactly three ways the TODO loop ends:

1. **Objective state says done.** `iterate(ctx)` returns `null`. The loop ends. For TODO: `todos.every(completed)`, list is empty, or no `manage_todo_list` toolResult exists.
2. **User yields mid-turn.** `ctx.hasPendingMessages()` is `true` at `agent_end` — the user typed something during the LLM's response. Base bails; the user's message takes over.
3. **User aborts (Escape / Ctrl-C).** `ctx.signal?.aborted` is `true`. Base bails **and hard-stops the loop for the current session**. The loop does NOT resume on subsequent `agent_end` events. To resume, start a new session (Pi restart, `/fork`, or new conversation).

There is intentionally no LLM-callable break tool and no manual off switch. The package **is** the loop. If you want passive todo tracking without deterministic driving, install `tintinweb/pi-manage-todo-list` alone. The deterministic skeleton is the whole point.

## Build status

| Package | Status | LOC |
|---|---|---|
| `@pi-dacmicu/base` | **Done.** Loop driver primitive only. Single file: `LoopDriver` interface + `attachLoopDriver()` + empty Pi factory. Escape hard-stops per session. | ~55 |
| `@pi-dacmicu/todo` | **Done + dogfooded.** Auto-attached loop, pure stateless polling of session entries. Single `todo-iterate` prompt per iteration. No off switch by design. | ~90 |
| `@pi-dacmicu/ralph` | Not built. Variant A wrapper around `attachLoopDriver`. | — |
| `@pi-dacmicu/evolve` | **Design locked 2026-05-13 → Variant B.** Subagent-per-iteration, single `evolve.md` SOT, hardcoded `target/` subdir, **zero tools**, driver-side termination predicates (`max_iterations` + optional `target_score`/`stale_streak`). Gate failure ⇒ branch deleted, no row written (amnesia intentional). Variant A scaffolding deleted. Implementation gated by 3 preflight probes (~30 min). See [implementations/pi-evolve-extension](../implementations/pi-evolve-extension.md). | ~80–100 TS + ~60 prompt |

Code lives at `~/.pi/agent/git/github.com/micuintus/pi-dacmicu/` (the `pi install` location). Pi loads it via `~/.pi/agent/settings.json` (`"git:github.com/micuintus/pi-dacmicu"`).

## Open questions

- **Evolve preflight (must complete before implementation):** P1 verify tintinweb `subagents:rpc:spawn` channel/payload/completion semantics (source-read + ~20 LOC live probe); P2 verify fresh-context spawn (no parent-context leakage); P3 verify `await`-able RPC. See `BUILD_TRACKER.md` next-steps.
- Ralph build: thin wrapper around `attachLoopDriver`.
- Loop-driver "continue without prompt" semantics: Variant B uses a cheap per-iteration follow-up prompt to keep `agent_end` firing. Base-side change for a true "continue silently" return value deferred unless it bites at the 5–20-iteration scale (probably never).

## Related pages

- **[runtime-walkthrough](runtime-walkthrough.md)** — turn-by-turn deep dive (when you need exact event ordering and load-bearing details)
- **[log](log.md)** — chronological design-decision record (every material change since project start)
- **[spirit-vs-opencode](spirit-vs-opencode.md)** — what we keep from opencode's DACMICU, what we drop, what we replace
- **[../architecture/pi-session-architecture](../architecture/pi-session-architecture.md)** — Pi's append-only session model in depth (applies to any Pi extension)
- **[../ecosystem/todo-tool-apis](../ecosystem/todo-tool-apis.md)** — tintinweb's tool vs Claude Code `TodoWrite` vs opencode `todowrite`/`todoread`
- **[archive/](archive/)** — research notes, audits, superseded designs (concept.md, modular-architecture.md, pi-port.md, implementation-plan.md all moved here on 2026-05-12)
