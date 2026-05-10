---
title: Deep Critical Review — Implementation Concepts and Assumptions
type: audit
status: draft
updated: 2026-05-10
sources:
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/packages/coding-agent/src/core/extensions/types.ts
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/packages/coding-agent/src/core/extensions/runner.ts
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/packages/coding-agent/src/core/agent-session.ts
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/packages/coding-agent/src/core/event-bus.ts
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/packages/coding-agent/src/core/compaction/compaction.ts
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/packages/coding-agent/examples/extensions/todo.ts
  - /tmp/pi-github-repos/mitsuhiko/agent-stuff@main/extensions/loop.ts
  - /tmp/pi-github-repos/tintinweb/pi-subagents@main/src/cross-extension-rpc.ts
  - /tmp/pi-github-repos/tintinweb/pi-subagents@main/src/index.ts
  - /tmp/pi-github-repos/tintinweb/pi-manage-todo-list@main/src/state-manager.ts
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/dacmicu/implementation-plan.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/dacmicu/modular-architecture.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/implementations/pi-callback-extension.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/implementations/pi-evolve-extension.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/examples/extensions/pi-evolve.ts
tags: [audit, critique, implementation, assumptions, dacmicu, deep-review]
see_also:
  - "../implementation-plan.md"
  - "../modular-architecture.md"
  - "../concept.md"
  - "research-2026-05-10-critical-plan-review.md"
---

# Deep Critical Review — Implementation Concepts and Assumptions

**Method**: Re-read primary sources (Pi extension types, runner, agent-session, event-bus, compaction, todo example, mitsuhiko loop, tintinweb subagents/todo) without relying on prior wiki summaries. Identify concrete implementation assumptions in the canonical docs and verify them against actual code.

**Findings**: Numerous load-bearing claims in canonical docs are **false** when checked against code. Several are **architecturally broken** (deadlock, lost state). Listed in severity order.

---

## Severity scale

- **CRITICAL**: Implementation as designed cannot work; will fail at runtime.
- **HIGH**: Wrong primitive cited; partial mitigation possible but design needs rework.
- **MEDIUM**: Overstated guarantee; works in some cases but fragile.
- **LOW**: Cosmetic / inaccurate but not blocking.

---

## CRITICAL-1: pi-callback synchronous wait deadlocks by design

**Claim** (`implementations/pi-callback-extension.md`):

> `pi.sendMessage({customType, content, display:false}, {triggerTurn:true, deliverAs:"followUp"})` triggers a new turn whose assistant text is captured by `message_end` and returned via the socket.

**Verified against code** (`agent-session.ts:1287-1297`):

```ts
if (options?.deliverAs === "nextTurn") { ... }
else if (this.isStreaming) {
  if (options?.deliverAs === "followUp") this.agent.followUp(appMessage);
  else this.agent.steer(appMessage);
}
else if (options?.triggerTurn) await this.agent.prompt(appMessage);
```

`agent.followUp()` and `agent.steer()` **queue** messages for processing after the current stream completes. They do **not** start a new agent loop concurrently.

**Failure mode** (deadlock):

1. Agent calls `bash` tool with command containing `pi-callback prompt "..."`.
2. While bash is executing, `this.isStreaming === true` (the bash tool execution is part of the stream).
3. pi-callback CLI connects to socket, sends prompt, **waits for response**.
4. Extension calls `pi.sendMessage({...}, {triggerTurn:true, deliverAs:"followUp"})`.
5. Code path: `isStreaming === true` → `agent.followUp(msg)` → message queued.
6. Queue is processed when current stream (bash) finishes.
7. Bash finishes when pi-callback returns.
8. pi-callback never returns because it's waiting for the queued followUp's response.
9. **Deadlock.**

**Wiki's defense** (Open Question #5):

> "Nested callbacks: If the agent's response triggers another bash tool that calls pi-callback, we need to prevent deadlocks."

This is mis-scoped. The deadlock is the **base case**, not a nested case. Any synchronous `wait:true` from inside a running tool will deadlock.

**Why opencode's `oc check` works**: opencode spawns a **new child session** for the callback. Child has its own context, runs to completion, returns text. Parent's tool resumes with the text. There is no deadlock because the callback runs in a **separate process**, not in the parent's queue.

**Correct design for pi-callback**:

- `wait:true` callbacks must spawn a **subagent** (`createAgentSession` or `subagents:rpc:spawn`), not a followUp in the parent session.
- OR: `wait:true` is removed; `pi-callback` is fire-and-forget only (queues a message; returns immediately; bash continues).

The current design (followUp + wait) is **physically impossible** under Pi's queue semantics. The page documents broken architecture.

**Severity rationale**: This is the central use case of FABRIC ("agent as a stage in a Unix pipeline that asks itself for judgment"). If `wait:true` doesn't work, FABRIC has no value beyond "fire-and-forget message queueing."

---

## CRITICAL-2: TODO state is lost on compaction (silent breakage)

**Claim** (`concept.md` deterministic-todo-loop section):

> "TODO state is passive. The loop reads state; the LLM mutates it via the standard tool. ... Session-entry persistence (tool-result `details`) branches with `/fork` automatically. File-backed storage does not."

**Verified against code** (`tintinweb/pi-manage-todo-list/src/state-manager.ts:82-88`):

```ts
loadFromSession(ctx: ExtensionContext): void {
  this.todos = [];
  for (const entry of ctx.sessionManager.getBranch()) {
    if (entry.type !== "message") continue;
    const msg = entry.message;
    if (msg.role !== "toolResult" || msg.toolName !== "manage_todo_list") continue;
    // ... apply state
  }
}
```

**Verified against compaction code** (`agent-session.ts:1620+`, `compaction/compaction.ts:594-610`):

`prepareCompaction()` returns `{ firstKeptEntryId, messagesToSummarize, ... }`. After compaction, the `messagesToSummarize` are **dropped** from the session and replaced with a summary entry. Subsequent `getBranch()` calls return only the summary + post-compaction entries.

**Failure mode**:

1. Loop starts. LLM creates 10 todos via `manage_todo_list`.
2. Loop works items 1-3. Each iteration appends ~2k tokens.
3. Context approaches threshold. Auto-compaction fires.
4. Compaction summarizes pre-cutoff messages, including the 10 `manage_todo_list` tool-result entries.
5. After compaction, `getBranch()` no longer contains the original tool results. tintinweb's `loadFromSession` finds zero `manage_todo_list` results → `todos = []`.
6. Loop's CHECK step: `unchecked == 0` (because list is empty) → loop terminates as "done."
7. **The user's task is silently abandoned mid-flight, without warning.**

**Tintinweb has NO `session_before_compact` handler** (verified by full-tree grep — the only matching files are `state-manager.ts`'s `loadFromSession` mentioned above, no compaction hook).

**Mitsuhiko's loop ext compensates** by appending compaction instructions: "Loop active. Breakout condition: X. Preserve this loop state and breakout condition in the summary." This influences the LLM-generated summary text, but it does **not** preserve the TODO list itself — only the awareness that "a loop was active." The TODO items themselves are lost in the summary noise.

**Impact on DACMICU**: The "deterministic TODO loop" rests on TODO state surviving across iterations. With compaction inevitable on long workflows, the loop will lose its state and terminate prematurely on every long run. This is the dominant failure mode for the central feature.

**Required mitigation** (not in plan):

- DACMICU's `base` package must add a `session_before_compact` handler that:
  - Inspects `preparation.messagesToSummarize` for `manage_todo_list` tool results
  - Either: (a) extracts the latest TODO state and re-emits it after compaction as a custom entry; (b) builds a `CompactionResult` whose summary explicitly contains the structured TODO list; (c) shifts `firstKeptEntryId` to keep the latest todo result in-context.
- All three options require non-trivial code (~50-100 LOC) NOT in the current plan.

**Severity rationale**: Without this, the TODO loop is unusable for any task long enough to need TODOs. Long tasks are the only reason to use a TODO loop. Therefore the feature is broken end-to-end.

---

## HIGH-3: `pi.wrapTool` does not exist as a public API

**Claim** (`implementations/pi-callback-extension.md`, "Layer 2 — env injection"):

> "Belt-and-suspenders: tool-wrap `bash` (see `examples/extensions/tool-override.ts` pattern) to set the env explicitly per call:
> ```ts
> pi.wrapTool("bash", (orig) => async (id, params, signal, onUpdate, ctx) => { ... });
> ```"

**Verified against code** (`packages/coding-agent/src/core/extensions/types.ts`):

The `ExtensionAPI` interface has `registerTool`, `registerCommand`, `registerShortcut`, `registerFlag`, `registerMessageRenderer`, `registerProvider`, `unregisterProvider`. **No `wrapTool`.**

`wrapToolDefinition` exists in `core/tools/tool-definition-wrapper.ts` and is used internally by built-in tools (`bash.ts:439`, `read.ts:361`, etc.) — but it is **not exposed** to extensions.

**Impact**: Layer 2 of the pi-callback "three-layer guarantee" cannot be implemented. The `tool_call` event mutation (Layer 1 mechanism) is the only available primitive — and it requires the bash command string mutation pattern, not a tool-wrapper.

**Mitigation**: Drop Layer 2. Rely on `tool_call` event mutation alone. Document that env injection only works for bash invocations actually emitted by the LLM (not ones the extension synthesizes itself).

---

## HIGH-4: `subagents:rpc:spawn` is fire-and-forget; no result via RPC

**Claim** (`modular-architecture.md`, "Verified Pi primitives" table):

> "subagent-client: `pi.events.emit("subagents:rpc:spawn", {requestId, type, prompt, options})` + `pi.events.on("subagents:rpc:spawn:reply:${requestId}", ...)` ... DACMICU's only subagent integration point."

The implication (and the explicit pseudocode in `concept.md`) is that the reply contains the subagent's result.

**Verified against code** (`tintinweb/pi-subagents/src/cross-extension-rpc.ts:79-84`):

```ts
const unsubSpawn = handleRpc(events, "subagents:rpc:spawn", ({ type, prompt, options }) => {
  const ctx = getCtx();
  if (!ctx) throw new Error("No active session");
  return { id: manager.spawn(pi, ctx, type, prompt, options ?? {}) };
});
```

`manager.spawn()` returns synchronously with a string ID. The reply envelope is `{ success: true, data: { id: string } }`. **The reply contains an ID, not a result.** There is no `subagents:rpc:wait` or `subagents:rpc:getResult` RPC.

**Tintinweb does emit completion events** on the bus (`index.ts:377-379`):

```ts
pi.events.emit("subagents:failed", eventData);  // or
pi.events.emit("subagents:completed", eventData);
```

These contain `{ id, type, description, result, error, status, toolUses, durationMs, tokens }`.

**Correct two-step pattern for evolve**:

```ts
const id = await rpcCall("subagents:rpc:spawn", { type, prompt, options });
const result = await new Promise((resolve, reject) => {
  const offC = pi.events.on("subagents:completed", (data) => {
    if (data.id === id) { offC(); offF(); resolve(data); }
  });
  const offF = pi.events.on("subagents:failed", (data) => {
    if (data.id === id) { offC(); offF(); reject(data); }
  });
});
```

**Brittleness**:
- `result` is whatever tintinweb captured as the agent's final output — likely the last assistant message text. Evolve must extract benchmark numbers from prose. Brittle.
- No timeout primitive — caller must wrap in own race.
- Race condition: spawn → completion event could fire before `on()` registers if the subagent finishes very fast (unlikely but undefined).
- `pi.events` is `node:events.EventEmitter` (`event-bus.ts`) — no replay, no late-subscribe semantics.

**Wiki understates this two-step pattern**. The single-RPC framing in concept.md is wrong.

---

## HIGH-5: `event.messages` in `agent_end` does NOT include followUps from the same loop

**Claim** (implicit in plan): The `agent_end` listener can read `event.messages` to inspect the full conversation including the loop's own injected followUps.

**Verified against code** (`agent-session.ts:639-640`):

```ts
} else if (event.type === "agent_end") {
  await this._extensionRunner.emit({ type: "agent_end", messages: event.messages });
}
```

`event.messages` is whatever the agent emitted with the `agent_end` event. The agent loop itself produces this — it includes messages from the **just-completed** loop iteration. Each `agent_end` corresponds to one `agent_start` → `agent_end` cycle.

When the loop driver calls `pi.sendMessage({...}, {triggerTurn:true, deliverAs:"followUp"})` from inside an `agent_end` handler:
- If `isStreaming === false` (which is the normal case at `agent_end` — the stream just ended), `agent.prompt(msg)` is called.
- This **starts a new agent loop**. The followUp message is a synthesized "user" turn. A new `agent_start` fires, then turns, then a new `agent_end`.

**Implication**: The loop driver does NOT see "all messages across all loop iterations" in any single `agent_end`. Each `agent_end` shows messages from one cycle. To get cross-iteration state, the driver must either:
- Read `ctx.sessionManager.getBranch()` (which has everything persisted)
- Or maintain its own state via `pi.appendEntry`

The wiki's `LoopDriver.shouldContinue(ctx)` API is workable, but the docstring needs to be explicit: `event.messages` is just the latest cycle, not the loop's full history.

**Severity**: Not architecturally broken; this is just an undocumented detail that will trip up implementers. Mitsuhiko's loop.ts demonstrates the correct pattern: it persists state via `appendEntry` and only uses `event.messages` for one specific check (`wasLastAssistantAborted`).

---

## HIGH-6: "Single-driver invariant" is a documentation convention, not enforced

**Claim** (`implementation-plan.md` "Hooks each package uses" matrix):

> "Only `base` writes to `pi.sendMessage(triggerTurn:true)`, ensuring single-driver invariant."

**Verified against code** (`runner.ts:emit()`, lines ~470-510):

```ts
for (const ext of this.extensions) {
  const handlers = ext.handlers.get(event.type);
  if (!handlers || handlers.length === 0) continue;
  for (const handler of handlers) {
    try { await handler(event, ctx); } catch (err) { ... }
  }
}
```

All `agent_end` handlers from all extensions fire sequentially. There is **no enforcement** that only one calls `sendMessage(triggerTurn:true)`. Furthermore:

`agent-session.ts:2159`:
```ts
sendMessage: (message, options) => {
  this.sendCustomMessage(message, options).catch((err) => { ... });
},
```

The `sendMessage` action is **not awaited** by the runner. If extension A's handler calls `sendMessage(triggerTurn:true)`, the underlying `agent.prompt()` is scheduled but the handler returns immediately. The runner moves to extension B's handler, which can also call `sendMessage(triggerTurn:true)`. Two new turns are queued back-to-back.

**Real-world failure mode**: User installs DACMICU + tintinweb's `pi-subagents` + mitsuhiko's `loop`. All three may register `agent_end` handlers. If DACMICU's todo loop is active AND mitsuhiko's `/loop` is active simultaneously, both will fire `sendMessage(triggerTurn:true)` from `agent_end`. Result: alternating prompts from two loops, undefined ordering, conflicting goals. The user has no way to know this is happening except by observing weird agent behavior.

**Mitigation**: Either:
- Enforce in core: only one extension can have an active `triggerTurn` per session (would require a Pi core change — out of scope).
- Convention + check: each loop driver registers a sentinel via `appendEntry`; on attach, check if another driver is active and refuse / warn.
- Document loudly: "Do not run more than one loop extension simultaneously."

The plan currently does none of these. The "single-driver invariant" is wishful thinking.

---

## HIGH-7: `before_agent_start` handlers chain — but `systemPrompt` chaining semantics are non-obvious

**Claim** (`implementation-plan.md` Hooks matrix): Multiple packages set `before_agent_start: ✓ (chains additions)`.

**Verified against code** (`runner.ts:emitBeforeAgentStart`, ~lines 720-790):

```ts
let currentSystemPrompt = systemPrompt;
const messages: NonNullable<BeforeAgentStartEventResult["message"]>[] = [];
let systemPromptModified = false;

for (const ext of this.extensions) {
  for (const handler of handlers) {
    const handlerResult = await handler(event, ctx);
    if (handlerResult?.message) messages.push(result.message);
    if (handlerResult?.systemPrompt !== undefined) {
      currentSystemPrompt = result.systemPrompt;  // ← REPLACES
      systemPromptModified = true;
    }
  }
}
```

Critical: Each handler receives `event.systemPrompt = currentSystemPrompt`. If extension A returns `{systemPrompt: "X"}`, extension B sees `event.systemPrompt = "X"` and must read it, modify it, and return the result. **If B just returns its own fragment, A's contribution is overwritten.**

**Implication for DACMICU**: If `base` injects "Loop is active, breakout condition: ..." and `todo` injects "Current TODO list: ...", the second handler must do `return { systemPrompt: event.systemPrompt + "\n\n" + myFragment }`. If either handler returns just its own fragment, the other's is lost.

This is documented tersely in `types.ts`:

> "Replace the system prompt for this turn. If multiple extensions return this, they are chained."

But "chained" here means "iterated, with each handler seeing the previous result" — NOT "concatenated automatically." Implementers must be careful.

**Mitigation**: DACMICU's `base` package should provide a helper:

```ts
function appendSystemPrompt(currentPrompt: string, addition: string): string {
  return currentPrompt + "\n\n" + addition;
}
```

And document the convention. This is a small but real footgun.

---

## HIGH-8: The "deterministic" reassessment step has no defined termination

**Claim** (`concept.md`): The loop pattern is `CHECK → UPDATE → WORK`, where UPDATE "Reassess: are items still valid? Reorder? Merge?"

**Verified against the canonical reference** (`mitsuhiko/agent-stuff/extensions/loop.ts`): NO reassessment step exists. The pattern is just `agent_end → if active && no pending && not aborted → fire next prompt`.

**No specification exists for how reassessment terminates**:
- Is reassessment one LLM turn? Multiple?
- Does the LLM call a `confirm_reassessment` tool? Or does the driver just trust the next agent_end?
- If the LLM responds "yes, item #3 is still valid" but doesn't actually do work in that turn, the next `agent_end` fires the loop again. Does the driver detect that no progress was made?

**The plan has no design for any of these**. The reassessment step is hand-waved as "a bounded LLM turn" with no mechanism for what "bounded" means.

**Combined with the ungated cost**: every reassessment is a full LLM call. For a 10-item list, this doubles cost. For a 100-item enterprise checklist, it 2× cost. No A/B evidence shows reassessment improves outcomes vs. just trusting the LLM to update the list when it learns new info.

**Mitigation**: Default reassessment OFF (already done in latest plan). Document that turning it on is opt-in and may degrade performance. But the docs still describe reassessment as "load-bearing" — that wording should be retracted.

---

## MEDIUM-9: `session_before_compact` "preservation" is misdescribed

**Claim** (`concept.md`):

> "session_before_compact preservation — mark `customType: 'dacmicu-*'` messages so `/compact` mid-loop doesn't drop the loop's reasoning chain. Only mitsuhiko/agent-stuff/loop.ts does this in the existing ecosystem; it is the rarest and most important detail."

**Verified against code** (`compaction/compaction.ts:103-110`):

```ts
export interface CompactionResult<T = unknown> {
  summary: string;
  firstKeptEntryId: string;
  tokensBefore: number;
  details?: T;
}
```

The compaction API has **no concept of "marked messages."** There is no field, attribute, or mechanism that says "preserve customType-prefixed messages." Extensions intercepting `session_before_compact` can:

1. Return `{cancel: true}` to abort compaction.
2. Return `{compaction: CompactionResult}` to **fully replace** the result with their own (summary text + cut point + details).

That's it. No selective preservation API.

**What mitsuhiko's loop.ts actually does** (verified, lines ~285-310):

```ts
pi.on("session_before_compact", async (event, ctx) => {
  if (!loopState.active || !loopState.mode || !ctx.model) return;
  ...
  const compaction = await compact(
    event.preparation,
    ctx.model,
    auth.apiKey ?? "",
    auth.headers,
    instructionParts,  // ← appended hint about loop being active
    event.signal,
  );
  return { compaction };
});
```

It re-runs the **default** `compact()` function with extra instructions appended ("Loop active. Breakout condition: X. Preserve this loop state and breakout condition in the summary."). This influences the **summary text** the LLM produces, hoping the LLM remembers the loop is active when reading the summary later. **It does not preserve any specific messages.**

The wiki's claim "mark customType messages so they survive" is wrong on three counts:
- No marking mechanism exists in the API.
- mitsuhiko doesn't do "marking" — it appends instructions to influence the summary.
- The pattern doesn't preserve messages; it preserves *awareness* via the LLM-generated summary.

**Impact on plan**: The `base` package's `session_before_compact` design is built on a misunderstanding. The actual capability is "influence summary text" or "fully replace with custom CompactionResult," not "mark and preserve."

To actually preserve TODO state (CRITICAL-2), the design must be one of:
- Build a `CompactionResult` whose `summary` contains the structured TODO list as text.
- Use `details: {todos: [...]}` in the CompactionResult and re-hydrate from there.
- Adjust `firstKeptEntryId` to keep the latest tool-result in-context (works only if it's recent).

These are all 50-100 LOC of nontrivial logic. The plan has none of them.

---

## MEDIUM-10: `pi.events` is bare `EventEmitter` — no envelope, no version

**Claim** (`modular-architecture.md`): tintinweb's RPC contract uses `PROTOCOL_VERSION = 2`, suggesting a stable protocol.

**Verified against code** (`event-bus.ts`):

```ts
export function createEventBus(): EventBusController {
  const emitter = new EventEmitter();
  return {
    emit: (channel, data) => emitter.emit(channel, data),
    on: (channel, handler) => { ... emitter.on(channel, ...); ... },
    clear: () => emitter.removeAllListeners(),
  };
}
```

That's the entire `pi.events` infrastructure: 30 lines wrapping `node:events.EventEmitter`. **No envelope, no correlation, no version negotiation.** Everything else (request/response correlation, success/error envelope, scoped reply channels, `PROTOCOL_VERSION`) is a **convention invented by tintinweb in their `cross-extension-rpc.ts`**.

**Implications**:
- DACMICU's "soft-dep on tintinweb via RPC" depends on a 95-LOC convention file in someone else's repo. There is no Pi-level guarantee that this contract is stable.
- If tintinweb forks or refactors, DACMICU's RPC client breaks. No semver enforcement at the Pi level.
- The PROTOCOL_VERSION is informational only — there's no auto-negotiation; consumers must manually check via `subagents:rpc:ping`.

**Risk understated in plan**. The "soft-dep on tintinweb" is more like "soft-dep on tintinweb's specific RPC convention file," with no formal contract guarantee.

---

## MEDIUM-11: Loop iteration count claim is unfounded

**Claim** (`concept.md`): "iteration cap hit" is one of four termination conditions.

**Verified against canonical reference** (mitsuhiko's loop.ts, full file, 400 LOC): **No iteration cap exists.** Mitsuhiko has only:
- `signal_loop_success` tool called → `clearLoopState`
- Last assistant message was aborted → user confirms → `breakLoop`
- `ctx.hasPendingMessages()` → skip current iteration but loop is not terminated

`latent-variable/pi-auto-continue` has a hardcoded 100-iteration cap. tmustier was incorrectly claimed earlier to have a max-iteration cap; the verification audit (db1f295) confirmed it does not.

**Impact**: The "iteration cap" termination is a feature DACMICU could add, but it is NOT inherited from the reference implementation. If DACMICU ships without a cap, the only mechanical brake is "user hits Escape" or "LLM calls breakout tool." Neither is mechanical from DACMICU's perspective.

The "deterministic" framing requires at least the cap. Without it, there is **zero** mechanical termination — every termination condition requires LLM cooperation or user action.

---

## MEDIUM-12: Strategy A mono-package contradicts user-stated install model

**Claim** (`modular-architecture.md`): Strategy A is recommended; user enables/disables via `pi config`.

**User's prior preference** (in original requirements): "Modular monorepo with individually installable packages."

These conflict. Strategy A is one package with internal modules. The user has consistently said "individually installable" but accepted A.

**Risk**: Once Strategy A is shipped, the precedent is set. If `evolve` grows complex (likely — 600 LOC is optimistic per CRITICAL/HIGH findings above), every `pi-dacmicu` install carries it. Users who want only TODO get the entire package.

**Reality check**: ~1,350 LOC is small. This concern is theoretical for v1. But the architecture is now Strategy A regardless of LOC growth, with no stated trigger for revisiting.

**Mitigation**: Document a concrete LOC threshold (e.g., 3,000) at which Strategy A is revisited.

---

## LOW-13: "Tintinweb has 5,217 LOC" — counted, "6,600 LOC reused" — overstated

**Claim** (`implementation-plan.md`): "Reused via soft-deps: ~6,600 LOC. tintinweb/pi-subagents + tintinweb/pi-manage-todo-list."

**Verified**: tintinweb/pi-subagents `src/*.ts` totals **5,217 LOC**. tintinweb/pi-manage-todo-list `src/*.ts` totals **506 LOC**. Combined: **5,723 LOC**.

The "~6,600 LOC reused" figure is ~15% too high. Not material, but a sign of imprecise accounting.

---

## LOW-14: `manage_todo_list` widget storage mismatch

**Claim** (`modular-architecture.md` widget table): Both edxeth and tintinweb use the `setWidget(key, factory)` factory form.

**Verified**: Confirmed for tintinweb at `src/ui/todo-widget.ts:70`. Edxeth verified earlier (`74e2b52` commit). This claim is correct.

No issue here — listed for completeness.

---

## LOW-15: pi-evolve.ts has no subagent code, contradicting "Variant B consumer" framing

**Claim** (`modular-architecture.md`): `@pi-dacmicu/evolve` is a "Variant B consumer — each candidate evaluated in isolation via `subagents:rpc:spawn`."

**Verified against `examples/extensions/pi-evolve.ts`** (510 LOC, full grep):

- Zero references to `subagent`, `createAgentSession`, `pi.events`, `spawn`, `Hopsken`, `tintinweb`.
- All git operations via `pi.exec("git", ...)` — runs in **parent session**.
- All benchmark execution via the bash tool — runs in **parent session**.

**Impact**: The plan calls evolve a "Variant B consumer," but the only existing draft implementation is **Variant A** (in-session). To actually implement Variant B requires a significant rewrite, not "lift the draft + consume base."

The "build evolve from scratch" estimate of ~600 LOC must include:
- Subagent spawn coordination (~80 LOC, see `subagent-client/rpc-client.ts` sketch)
- Result extraction from subagent's `record.result` (text parsing)
- Per-candidate timeout handling
- Aggregation logic across candidates
- Comparison + selection (the `selection.md` ledger from the draft is only the *output* — the *evaluation logic* is new)

Realistic LOC for Variant B evolve: **1,000-1,500 LOC**, not 600. Estimate is 2-2.5× too low.

---

## Summary table

| # | Severity | Finding | Impact |
|---|---|---|---|
| 1 | **CRITICAL** | pi-callback `wait:true` deadlocks by design | FABRIC's main use case unworkable |
| 2 | **CRITICAL** | TODO state lost on compaction | Central feature broken on long workflows |
| 3 | HIGH | `pi.wrapTool` doesn't exist | pi-callback Layer 2 design invalid |
| 4 | HIGH | `subagents:rpc:spawn` returns ID, not result | Two-step pattern required, plan understates this |
| 5 | HIGH | `event.messages` is one cycle, not full history | Implementer footgun, undocumented |
| 6 | HIGH | "Single-driver invariant" is unenforced convention | Two loops can fire concurrently with no warning |
| 7 | HIGH | `before_agent_start` `systemPrompt` chaining is replace-not-append | Implementer footgun, easy to overwrite siblings |
| 8 | HIGH | Reassessment step has no termination spec | Ill-defined; default OFF is right |
| 9 | MEDIUM | `session_before_compact` "preservation" misdescribed | Plan is built on wrong API model |
| 10 | MEDIUM | `pi.events` is bare EventEmitter; no envelope/version | tintinweb soft-dep is on a 95-LOC convention, not a contract |
| 11 | MEDIUM | "Iteration cap" not in canonical reference | Plan lists 4 termination conditions; only 0-1 are mechanical without an added cap |
| 12 | MEDIUM | Strategy A contradicts stated install preference | No stated trigger for revisit |
| 13 | LOW | "~6,600 LOC reused" actually 5,723 | Imprecise but immaterial |
| 14 | LOW | Widget storage form claim correct | (no issue) |
| 15 | LOW | pi-evolve.ts has no subagent code | "Variant B consumer" framing requires significant rewrite |

---

## Required actions before any code is written

1. **Resolve CRITICAL-1**: Decide pi-callback's `wait:true` semantics. Either spawn a subagent (correct), or remove `wait:true` (degraded), or accept deadlock (broken). Document the choice.

2. **Resolve CRITICAL-2**: Design the actual TODO-state-survives-compaction mechanism. Specify which of (a) custom `CompactionResult`, (b) `details` re-hydration, (c) cut-point shift the base package will use. Estimate +50-100 LOC.

3. **Rewrite `subagents:rpc:spawn` integration spec** (HIGH-4): two-step pattern (spawn + listen for `subagents:completed`/`failed`). Include timeout. Include benchmark-result extraction strategy from `record.result` text.

4. **Document "single-driver invariant" enforcement** (HIGH-6): registry sentinel pattern via `appendEntry` + on-attach check. Reject second loop driver with clear error. Estimate +30 LOC.

5. **Add `appendSystemPrompt` helper** (HIGH-7): document the chaining contract.

6. **Remove "iteration cap" claim from concept.md** (MEDIUM-11) OR specify a default (e.g., MAX_LOOPS=50) and add the check.

7. **Retract "preservation" framing in concept.md** (MEDIUM-9): replace with accurate description of the `CompactionResult` override mechanism.

8. **Revise evolve LOC estimate** (LOW-15): from 600 to 1,000-1,500. Re-evaluate whether evolve fits in v1 timeline.

9. **Run end-to-end runtime tests**:
   - T1: Loop starts → triggers compaction mid-flight → verify state survives
   - T2: Two loop extensions installed → verify only one fires `triggerTurn`
   - T3: pi-callback `wait:true` from inside bash → verify deadlock or workaround
   - T4: `subagents:rpc:spawn` → verify result extraction via `subagents:completed`
   - T5: `before_agent_start` chaining → verify both extensions' fragments survive

Without these, the build will hit walls.

---

## Honest restatement of the plan's confidence level

**Previous wiki framing**: "All 15/15 Pi primitives confirmed against pi-mono source." (from past audits)

**Reality after this review**: The primitives **exist** as named. But **how they actually behave** in the contexts the plan uses them is misdescribed in 8+ places, including 2 critical-severity architectural impossibilities. The "verification audit" (db1f295) checked **claim shapes** (does this function exist?) but not **claim semantics** (does this function do what we said?).

The plan is not ready to build. It is ready to be **redesigned** in light of the above, then re-reviewed.

---

## Fixes applied to canonical docs (2026-05-10)

The following corrections have been merged into the canonical wiki documents:

| Finding | File(s) | Fix |
|---|---|---|
| **CRITICAL-1** pi-callback deadlock | `implementations/pi-callback-extension.md` | Complete redesign: `wait:true` spawns subagent; `wait:false` is fire-and-forget only; removed `pi.wrapTool` Layer 2 |
| **CRITICAL-2** TODO state lost on compaction | `concept.md`, `implementation-plan.md` | File-backed primary storage (`~/.pi/dacmicu/state/<session-id>.json`); session entries secondary; base exports `readState`/`writeState` |
| **HIGH-3** `pi.wrapTool` nonexistent | `pi-callback-extension.md` | Removed Layer 2; documented `tool_call` mutation as only mechanism |
| **HIGH-4** `subagents:rpc:spawn` returns ID | `concept.md`, `modular-architecture.md` | Documented two-step pattern (spawn + `subagents:completed`/`failed` events) |
| **HIGH-5** `event.messages` is one cycle | `concept.md`, `pi-port.md` | Clarified: use `getBranch()` or `appendEntry()` for cross-iteration state |
| **HIGH-6** Single-driver unenforced | `concept.md`, `implementation-plan.md` | Added sentinel registry pattern via `appendEntry`; `attachLoopDriver` checks for existing sentinel |
| **HIGH-7** `systemPrompt` REPLACES | `concept.md`, `implementation-plan.md` | Added `appendSystemPrompt` helper; documented chaining contract |
| **HIGH-8** Reassessment no termination | `concept.md` | Designed phase state machine (WORK → REASSESS → WORK); termination implicit via `agent_end` + state read |
| **MEDIUM-9** Preservation misdescribed | `concept.md`, `pi-port.md` | Replaced "mark customType" with accurate `CompactionResult` override description |
| **MEDIUM-10** `pi.events` bare EventEmitter | `modular-architecture.md` | Documented 30-LOC wrapper; noted soft-dep on tintinweb convention |
| **MEDIUM-11** Iteration cap not in reference | `concept.md`, `pi-port.md` | Documented as optional guardrail (default: 50), not inherited from reference |
| **LOW-13** 6,600 LOC overstated | `implementation-plan.md`, `log.md` | Corrected to 5,723 |
| **LOW-15** pi-evolve.ts no subagent | `concept.md`, `modular-architecture.md`, `implementation-plan.md` | Updated to "Target: Variant B"; draft is Variant A; LOC revised 600→1,200 |

---

*Review completed 2026-05-10. Method: read primary sources (Pi extension types, runner, agent-session, event-bus, compaction code, todo example, mitsuhiko loop, tintinweb subagents/todo) and verify each load-bearing claim against actual code. Findings ordered by severity.*
