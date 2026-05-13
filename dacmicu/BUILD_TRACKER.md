# pi-dacmicu — Build Tracker

Status of the extension packages and what's verified.

## Package status (2026-05-13)

| Package | Status | LOC | Coverage |
|---|---|---|---|
| `@pi-dacmicu/base` | **Done.** Loop driver primitive only. Single file: `LoopDriver` interface + `attachLoopDriver()` + empty Pi factory. Escape hard-stops the loop for the session. | ~55 | 2 tests pass |
| `@pi-dacmicu/todo` | **Done + dogfooded with real LLM.** Auto-attached loop driver. Pure stateless polling of session entries. Single `todo-iterate` prompt per iteration. No off switch by design. | ~90 | 12 integration tests + live verification |
| `@pi-dacmicu/ralph` | Not built. Variant A wrapper around `attachLoopDriver`; Variant B if subagent provider available. | — | — |
| `@pi-dacmicu/evolve` | **Design locked 2026-05-13 — Variant B.** Subagent-per-iteration, fresh context, single `evolve.md` SOT (goal + metric + termination + gates + inspiration + ledger), hardcoded `target/` subdir for evolving repo. **Zero tools.** Driver-side termination via `## Termination` predicates (`max_iterations` required + optional `target_score`/`stale_streak`). Subagent decides what to try, runs user-defined gates, writes its own ledger row. Gate failure ⇒ branch deleted, no row written (amnesia intentional). Variant A scaffolding deleted. **Implementation gated by 3 preflight probes.** See [pi-evolve-extension.md](../implementations/pi-evolve-extension.md). | ~80–100 TS + ~60 prompt | — |

## API surface

### `@pi-dacmicu/base`

```typescript
export interface LoopDriver {
  iterate(ctx: ExtensionContext):
    | { content: (TextContent | ImageContent)[]; customType: string }
    | null
    | Promise<{ content: (TextContent | ImageContent)[]; customType: string } | null>;
}
export function attachLoopDriver(pi, driver): void;
```

### `@pi-dacmicu/todo`

```typescript
export function loadTodosFromSession(ctx): TodoItem[];
export default function (pi: ExtensionAPI): void;  // auto-attaches loop driver
```

## What's verified

- **All 14 tests pass** (`npm test` runs both `base-todo.test.ts` and `todo-loop-integration.test.ts`)
- **TypeScript clean** (only pre-existing pi-tui declaration noise from upstream)
- **Real LLM end-to-end with current simplified design** (2026-05-12):
  - Claude Opus 4.7 session via claude-agent-sdk provider
  - Prompt: create 3 TODO items, then implement greet.py + test_greet.py + run tests
  - LLM created the list via `manage_todo_list`
  - Driver auto-fired 4 `todo-iterate` prompts on successive `agent_end` events
  - LLM worked through items: write greet.py → write test_greet.py → run bash → mark all completed
  - Loop exited cleanly when all items reached `status: "completed"`
  - Zero `.pi/dacmicu/state/*.json` writes (todo is pure stateless polling, as designed)
  - No infinite loop, no premature exit, no LLM-callable break needed

## Next steps

**`@pi-dacmicu/evolve` — Variant B implementation (gated by preflight).**

Phase 0 — Preflight (gates implementation start; ~30 min total):
1. **P1: Verify tintinweb `subagents:rpc:spawn` contract.** Source-read `tintinweb/pi-subagents` for channel name, payload shape, completion event semantics. Live probe (~20 LOC throwaway extension) to confirm actual behavior matches.
2. **P2: Verify fresh-context spawn.** Confirm a subagent spawned this way inherits no parent context (message history, tool state).
3. **P3: Verify `await`-able RPC.** Confirm `iterate()` can `await` completion of the `pi.events` RPC cleanly without blocking other event traffic.

If any preflight check fails, the design rewrites before code starts.

Phase 1 — Implementation (~80–100 LOC TS + ~60 lines subagent prompt):
4. `evolve.md` parser with **try/catch + `pi.ui.notify`** on malformed input (~10 LOC of error handling — non-negotiable; without it a bad row crashes the extension inside `agent_end`).
5. Termination predicates (`max_iterations`, `target_score`, `stale_streak`).
6. Subagent spawn via `pi.events`; await completion.
7. Brief follow-up prompt to re-fire `agent_end`.
8. Subagent prompt template (load-bearing artifact code — changes go in `dacmicu/log.md`).

Phase 2 — Test (alongside Phase 1, not after):
9. **Fake-provider integration test** (~50 LOC). Registers a `pi.events` listener for `subagents:rpc:spawn` that appends hardcoded rows and emits `subagents:completed`. Proves the orchestrator independent of tintinweb. Catches parser-edge-case + predicate-boundary bugs early.

Phase 3 — Dogfood:
10. One real evolve experiment on a small project (5–20 iterations). Log every observed failure mode for one week, triage.

**Other packages:**
- Build `@pi-dacmicu/ralph` — thin wrapper around `attachLoopDriver`. Not gated by evolve work.
