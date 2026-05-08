---
title: Steering vs Follow-up — Practical Semantics
type: concept
updated: 2026-05-06
sources:
  - "../../packages/agent/src/agent-loop.ts"
  - "../../packages/agent/src/agent.ts"
  - "../../packages/coding-agent/src/core/agent-session.ts"
  - "../../packages/coding-agent/src/modes/interactive/interactive-mode.ts"
tags: [architecture, agent-loop, steering, follow-up, ux]
---

# Steering vs Follow-up — Practical Semantics

Pi has two queues for messages typed while the agent is running: **steering** and **follow-up**. They look superficially similar — both result in more LLM turns — but they differ in **when the message is evaluated relative to the agent's current task**. This page explains the difference in practical terms.

For the loop mechanics, see [loop-internals](loop-internals.md). For the component-flow context, see [component-flow](component-flow.md).

## TL;DR

| Queue | Evaluated | Effect | Default keybinding (TUI) |
|-------|-----------|--------|--------------------------|
| **Steering** | After **every turn** (end of inner loop body) | **Interrupts** an ongoing chain of tool calls; injects message before the next LLM call | `Enter` while streaming |
| **Follow-up** | After **inner loop fully exits** (no tool calls AND no steering) | **Waits** for the agent's current task to finish, then starts a new agent run | `Alt+Enter` while streaming |

Both keep the same `activeRun` alive — neither emits `agent_end` between iterations. The difference is purely in the queue timing.

## Where each is polled in `runLoop()`

From `packages/agent/src/agent-loop.ts:155`:

```typescript
async function runLoop(currentContext, newMessages, config, signal, emit, streamFn) {
  let firstTurn = true;
  let pendingMessages = (await config.getSteeringMessages?.()) || [];

  while (true) {                                          // ← OUTER loop
    let hasMoreToolCalls = true;

    while (hasMoreToolCalls || pendingMessages.length > 0) {   // ← INNER loop
      // ... inject pendingMessages, stream LLM response, execute tools ...

      await emit({ type: "turn_end", message, toolResults });

      // STEERING POLL — checked at end of EVERY turn
      pendingMessages = (await config.getSteeringMessages?.()) || [];
    }

    // INNER LOOP EXITED — no more tool calls AND no steering messages

    // FOLLOW-UP POLL — checked only here
    const followUpMessages = (await config.getFollowUpMessages?.()) || [];
    if (followUpMessages.length > 0) {
      pendingMessages = followUpMessages;
      continue;       // restart outer loop with follow-ups as the next "user message"
    }
    break;
  }

  await emit({ type: "agent_end", messages: newMessages });
}
```

So:

- **Steering** is checked at line ~219, at the bottom of every inner-loop iteration. If steering exists, the inner-loop condition (`hasMoreToolCalls || pendingMessages.length > 0`) stays true and the loop continues. The agent never reaches a "done" state — it just keeps processing.
- **Follow-up** is checked at line ~224, only after the inner loop has fully exited. If follow-up exists, the outer loop restarts with it as `pendingMessages`, which re-enters the inner loop.

## Concrete example

User says: *"Fix the bug in src/main.ts"*. Agent's plan:

- **Turn 2**: LLM calls `read src/main.ts`
- **Turn 3**: LLM calls `edit src/main.ts`
- **Turn 4**: LLM emits text "Done."

While Turn 2 is running, the user types a second message and submits it.

### If submitted as **steering** (Enter)

```
Turn 2: read src/main.ts ← user's message arrives in steering queue
        turn_end fires → poll steering → INTERRUPTED
Turn 3: [steering message injected as user message] → LLM responds
        ... agent has been redirected ...
```

The agent's current task is **interrupted**. The bug fix may not complete.

### If submitted as **follow-up** (Alt+Enter)

```
Turn 2: read src/main.ts ← user's message in follow-up queue (NOT polled here)
        turn_end fires → poll steering (empty) → continue
Turn 3: edit src/main.ts ← still in queue
        turn_end fires → poll steering (empty) → continue
Turn 4: emits "Done." → no tool calls → hasMoreToolCalls=false
        turn_end fires → poll steering (empty) → INNER LOOP EXITS
        Now poll follow-up → message found → restart outer loop
Turn 5: [follow-up message injected as user message] → LLM responds
        ... agent starts the new task ...
```

The agent's current task **finishes first**, then the follow-up runs as a new task.

## The "extension drives loops" connection

For loop extensions ([ecosystem/loop-extensions](../ecosystem/loop-extensions.md)) and DACMICU ([dacmicu/concept](../dacmicu/concept.md)), this distinction matters:

- An extension hooking `agent_end` to call `pi.sendMessage({...}, { triggerTurn: true })` is using the **follow-up semantic** — drive the next iteration only after the agent reaches a natural stopping point.
- An extension calling `pi.sendMessage({...}, { deliverAs: "steer" })` from a streaming context would **interrupt** the current iteration. Almost never the right choice for loop drivers.
- The `kostyay/agent-stuff/loop.ts` pattern (`{deliverAs:"followUp", triggerTurn:true}`) is correct: deliver as follow-up so the LLM finishes its current chain, then trigger a new turn for the next iteration.

## Why `Enter` defaults to steer (and not follow-up)

The TUI default is "what happens when the user is impatient". An impatient user typing while the agent is in the middle of something usually wants to **redirect**, not queue. If they wanted to queue, the more deliberate `Alt+Enter` is right there.

If the user wants follow-up to be the default (their workflow is "let me queue work while you finish"), they can swap the keybindings via the `tui.editor.submit` / `tui.editor.followup` keybinding settings. Both bindings call `session.prompt(text, { streamingBehavior })` with the same code path; only `streamingBehavior` differs.

Source: `packages/coding-agent/src/modes/interactive/interactive-mode.ts:2592` (`Enter` → `streamingBehavior: "steer"`) and `packages/coding-agent/src/modes/interactive/interactive-mode.ts:3355` (`Alt+Enter` → `streamingBehavior: "followUp"`).

## What both queues share

- Both keep the same `activeRun` alive. No `agent_end` fires between iterations.
- Both go through `AgentSession.prompt(text, { streamingBehavior })` → `agent.steer()` / `agent.followUp()` → internal `PendingMessageQueue`.
- Both are subject to the queue mode (`"all"` vs `"one-at-a-time"`) — by default `one-at-a-time`, meaning only the first queued message is delivered per polling tick.
- Both can be cleared with `clearAllQueues()` / `agent.clearAllQueues()`.
- Both fire `queue_update` events for UI rendering (the "queued messages" indicator below the editor).

## What they don't share

- **Steering** can interrupt a multi-turn tool chain. Follow-up cannot.
- **Steering** is polled at every `turn_end`. Follow-up is polled at one place: just before `agent_end`.
- **Steering** with `mode: "all"` floods the next turn with everything queued. Follow-up with `mode: "all"` does the same after the agent stops.

## Cross-references

- [loop-internals](loop-internals.md) — full code walkthrough of `runLoop()` including these polling points
- [component-flow](component-flow.md) — keystroke-to-loop diagram showing where steering/follow-up enter the system
- [agent-loop](agent-loop.md) — high-level architecture overview
- [ecosystem/loop-extensions](../ecosystem/loop-extensions.md) — loop extensions almost universally use follow-up semantics for next-iteration injection
- [dacmicu/concept](../dacmicu/concept.md) — DACMICU drives iterations via follow-up + `triggerTurn:true`
