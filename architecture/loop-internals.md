---
title: loop-internals
type: concept
updated: 2026-05-06
sources:
  - "../raw-sources/agent-loop-source-pages.md"
  - "../raw-sources/agent-loop-walkthrough-2026-04-29.md"
  - "../../packages/agent/src/agent-loop.ts"
  - "../../packages/agent/src/agent.ts"
  - "../../packages/coding-agent/src/main.ts"
  - "../../packages/coding-agent/src/modes/print-mode.ts"
  - "../../packages/coding-agent/src/core/agent-session.ts"
---

# Pi Agent Loop — Line-Precise Internals

Companion to [agent-loop](agent-loop.md). This page walks the actual code path from `pi <prompt>` invocation down to the inner-most while-loop and back, with exact file:line references. Where `agent-loop.md` describes the architecture, this page is the literal map.

For the broader concept (turn vs loop, why `packages/ai` exists, modes), see [agent-loop](agent-loop.md). For the comparison to opencode2 and Claude Code, see [comparisons/loop-architectures](../comparisons/loop-architectures.md).

## Five layers of the loop hierarchy

```
                    pi CLI invocation
                          │
                          ▼
             main.ts:main(args)          ← parseArgs, createSessionManager
                          │                createAgentSessionRuntime
                          ▼
             resolveAppMode(parsed, stdin.isTTY)            [main.ts:98]
                    ┌─────┼─────┬──────┐
                    │     │     │      │
              interactive print json  rpc
                    │     │     │      │
                    ▼     ▼     ▼      ▼
        InteractiveMode  runPrintMode  runRpcMode
                    │     │            │
                    └─────┴────────────┘
                          ▼
                AgentSession.prompt(text, options)
                core/agent-session.ts:~933
                          ▼
                Agent.prompt(messages)
                packages/agent/src/agent.ts:313
                          ▼
                runAgentLoop(prompts, context, config, emit, signal, streamFn)
                packages/agent/src/agent-loop.ts:95
                          ▼
                runLoop(currentContext, newMessages, config, signal, emit, streamFn)
                packages/agent/src/agent-loop.ts:155
                          │
                    ┌─────┴─────┐
              OUTER while(true)               [line 168]
                    │
              INNER while(                    [line 172]
                hasMoreToolCalls
                || pendingMessages.length > 0
              )
                    │
              streamAssistantResponse()       [defined at 240]
              executeToolCalls()              [defined at 338]
```

A bash DACMICU outer loop sits above layer 1 — see [dacmicu/concept](../dacmicu/concept.md).

## Layer 1: CLI entry (`coding-agent/src/main.ts`)

Mode routing:

```typescript
// main.ts:98
function resolveAppMode(parsed: Args, stdinIsTTY: boolean): AppMode {
    if (parsed.mode === "rpc") return "rpc";
    if (parsed.mode === "json") return "json";
    if (parsed.print || !stdinIsTTY) return "print";   // pi --print, or piped stdin
    return "interactive";                              // default TUI
}
```

Dispatch (near end of `main()`):

```typescript
if (appMode === "rpc") {
    await runRpcMode(runtime);
} else if (appMode === "interactive") {
    const interactiveMode = new InteractiveMode(runtime, { ... });
    await interactiveMode.run();
} else {
    // print and json both land here
    const exitCode = await runPrintMode(runtime, {
        mode: toPrintOutputMode(appMode),  // "text" or "json"
        messages: parsed.messages,
        initialMessage,
        initialImages,
    });
}
```

All modes receive the **same `runtime`** — an `AgentSessionRuntime` wrapping the same `AgentSession`. They differ only in the I/O glue. This is what makes [DACMICU](../dacmicu/concept.md) work cleanly across modes — the loop is mode-independent.

## Layer 2a: Print mode (`coding-agent/src/modes/print-mode.ts`)

```typescript
// modes/print-mode.ts:31
export async function runPrintMode(runtimeHost: AgentSessionRuntime, options: PrintModeOptions): Promise<number> {
    // ... signal handlers, cleanup setup ...

    await rebindSession();  // bind extensions to UI stubs (no TUI)

    if (initialMessage) {
        await session.prompt(initialMessage, { images: initialImages });
        //       └─────────┘
        //       ONE prompt() call = ONE full agent loop = ONE agent_start → agent_end
    }

    for (const message of messages) {
        await session.prompt(message);  // sequential additional prompts
    }

    if (mode === "text") {
        const lastMessage = state.messages[state.messages.length - 1];
        if (lastMessage?.role === "assistant") {
            for (const content of lastMessage.content) {
                if (content.type === "text") writeRawStdout(`${content.text}\n`);
            }
        }
    }
    // For json mode, every AgentEvent was already streamed via session.subscribe()

    return exitCode;
}
```

`pi --print "prompt"` is literally `session.prompt(initialMessage)` followed by printing the last assistant text. Between those two lines, the **entire agent loop runs to completion** — potentially many turns, many tool calls.

## Layer 2b: Interactive mode

`InteractiveMode` is much larger (TUI rendering, editor, session viewer), but the agent-loop side is identical:

```typescript
// modes/interactive/interactive-mode.ts (conceptual)
class InteractiveMode {
    async run() {
        // ... setup TUI, render chat, editor, etc. ...

        // When the user hits enter:
        await session.prompt(userText, { images });
        //       └─────────┘
        //       Same call as print mode. Same agent loop.
    }
}
```

Interactive mode subscribes to the session's event stream to render turns/tools/streaming as they happen, but `session.prompt()` is the same entry point.

Both modes converge at: `AgentSession.prompt()`.

## Layer 3: `AgentSession.prompt()` — session-level wrapper

Location: `coding-agent/src/core/agent-session.ts:~933`

This is the session-aware wrapper around `Agent.prompt()`. It handles:

```typescript
async prompt(text: string, options?: PromptOptions): Promise<void> {
    // 1. Slash commands (/help, /compact, extension commands)
    if (text.startsWith("/")) {
        const handled = await this._tryExecuteExtensionCommand(text);
        if (handled) return;
    }

    // 2. "input" extension event — extensions intercept or transform
    if (this._extensionRunner?.hasHandlers("input")) {
        const inputResult = await this._extensionRunner.emitInput(text, images, source);
        if (inputResult.action === "handled") return;
        if (inputResult.action === "transform") { text = inputResult.text; }
    }

    // 3. Skill commands and prompt template expansion
    let expandedText = this._expandSkillCommand(text);
    expandedText = expandPromptTemplate(expandedText, [...this.promptTemplates]);

    // 4. If agent already streaming → queue via steer() or followUp()
    if (this.isStreaming) {
        if (options?.streamingBehavior === "followUp") {
            await this._queueFollowUp(expandedText, images);
        } else {
            await this._queueSteer(expandedText, images);
        }
        return;
    }

    // 5. Validate model / API key / compaction
    // ...

    // 6. before_agent_start extension event (can inject context message)
    await this._extensionRunner.emit({ type: "before_agent_start", prompt: expandedText, ... });

    // 7. FINALLY — delegate to the pure Agent
    await this.agent.prompt(messages);
}
```

Everything Pi-specific (slash commands, skills, templates, extension hooks, queueing) lives here. Below this layer, the agent is generic.

## Layer 4: `Agent.prompt()` — run lifecycle

Location: `packages/agent/src/agent.ts:313`

```typescript
async prompt(input: string | AgentMessage | AgentMessage[], images?: ImageContent[]): Promise<void> {
    if (this.activeRun) {
        throw new Error("Agent is already processing a prompt.");
    }
    const messages = this.normalizePromptInput(input, images);
    await this.runPromptMessages(messages);
}

private async runPromptMessages(messages: AgentMessage[], options = {}): Promise<void> {
    await this.runWithLifecycle(async (signal) => {
        await runAgentLoop(
            messages,
            this.createContextSnapshot(),    // { systemPrompt, messages, tools }
            this.createLoopConfig(options),  // { model, beforeToolCall, afterToolCall,
                                             //   getSteeringMessages, getFollowUpMessages, ... }
            (event) => this.processEvents(event),
            signal,
            this.streamFn,
        );
    });
}
```

`runWithLifecycle` manages `activeRun`, abort controllers, the `isStreaming` flag, and the error-handling fallback that injects a synthetic assistant error message if the loop throws.

## Layer 5: `runLoop()` — the actual nested while-loop

Location: `packages/agent/src/agent-loop.ts:155`

This is the heart of pi:

```typescript
async function runLoop(
    currentContext: AgentContext,
    newMessages: AgentMessage[],
    config: AgentLoopConfig,
    signal: AbortSignal | undefined,
    emit: AgentEventSink,
    streamFn?: StreamFn,
): Promise<void> {
    let firstTurn = true;
    let pendingMessages: AgentMessage[] = (await config.getSteeringMessages?.()) || [];

    // ─── OUTER LOOP ────────────────────────────────────────────────
    // Resumes the agent run when followUps were queued after stop.
    while (true) {
        let hasMoreToolCalls = true;

        // ─── INNER LOOP ─── Each iteration = ONE TURN ──────────────
        while (hasMoreToolCalls || pendingMessages.length > 0) {
            // turn_start
            if (!firstTurn) await emit({ type: "turn_start" });
            else firstTurn = false;

            // Inject steering messages as user messages
            if (pendingMessages.length > 0) {
                for (const message of pendingMessages) {
                    await emit({ type: "message_start", message });
                    await emit({ type: "message_end", message });
                    currentContext.messages.push(message);
                    newMessages.push(message);
                }
                pendingMessages = [];
            }

            // THE LLM CALL (one round-trip to provider)
            const message = await streamAssistantResponse(currentContext, config, signal, emit, streamFn);
            newMessages.push(message);

            // Hard exit for errors/abort
            if (message.stopReason === "error" || message.stopReason === "aborted") {
                await emit({ type: "turn_end", message, toolResults: [] });
                await emit({ type: "agent_end", messages: newMessages });
                return;
            }

            // "AM I DONE?" signals
            const toolCalls = message.content.filter((c) => c.type === "toolCall");

            const toolResults: ToolResultMessage[] = [];
            hasMoreToolCalls = false;
            if (toolCalls.length > 0) {
                const executedToolBatch = await executeToolCalls(currentContext, message, config, signal, emit);
                toolResults.push(...executedToolBatch.messages);
                hasMoreToolCalls = !executedToolBatch.terminate;
                //                  └────────────────────┘
                //                  Tools can vote to terminate.
                //                  See shouldTerminateToolBatch() at line 499.

                for (const result of toolResults) {
                    currentContext.messages.push(result);
                    newMessages.push(result);
                }
            }

            await emit({ type: "turn_end", message, toolResults });

            // Drain any extension-queued steering messages
            pendingMessages = (await config.getSteeringMessages?.()) || [];
        }

        // Inner loop exited. Any followUps queued?
        const followUpMessages = (await config.getFollowUpMessages?.()) || [];
        if (followUpMessages.length > 0) {
            pendingMessages = followUpMessages;
            continue;  // restart outer loop
        }
        break;  // truly done
    }

    await emit({ type: "agent_end", messages: newMessages });
}
```

## "Done" signals — full ladder

From strongest to weakest, in order checked inside the loop:

| # | Signal | Where | Behaviour |
|---|--------|-------|-----------|
| 1 | `message.stopReason === "error" \|\| "aborted"` | `agent-loop.ts:195` | Hard exit, immediate `agent_end` |
| 2 | All tools in batch return `terminate: true` | `agent-loop.ts:208`, `499` | Inner loop exits after this turn even if LLM emitted tool calls |
| 3 | No `toolCall` content blocks in assistant message | `agent-loop.ts:202` | Inner loop exits (barring pending steering messages) |
| 4 | Follow-up queue is empty | `agent-loop.ts:224-230` | Outer loop exits, fires `agent_end` |

The most common path is signal 3: **the LLM tells pi it's done by not emitting any tool calls in its response**. There is no `finish` tool, no declarative "I am done" signal. Done is emergent.

Signal 2 is the recently-added escape hatch: a tool can return `{ content, details, terminate: true }` to force the loop to exit. The check (`shouldTerminateToolBatch`) requires **all** tools in a parallel batch to vote `terminate`. This is how tools like a `final_answer` or `submit_structured_output` cleanly end runs.

## Concept-to-code mapping

Every concept in [agent-loop](agent-loop.md), with file:line:

| Concept | File:line | Notes |
|---------|-----------|-------|
| CLI arg parsing | `coding-agent/src/cli/args.ts` | `--print` → `parsed.print = true` |
| Mode selection | `coding-agent/src/main.ts:98` `resolveAppMode()` | Routes to interactive/print/json/rpc |
| Print mode entry | `coding-agent/src/modes/print-mode.ts:31` `runPrintMode()` | Calls `session.prompt()` then prints last message |
| Interactive mode entry | `coding-agent/src/modes/interactive/interactive-mode.ts` | TUI owns input, calls `session.prompt()` on enter |
| Session-level prompt | `coding-agent/src/core/agent-session.ts:~933` `AgentSession.prompt()` | Slash commands, `input` hook, skill/template expansion, queue-if-streaming, `before_agent_start` |
| Agent-level prompt | `packages/agent/src/agent.ts:313` `Agent.prompt()` | Run-lifecycle guard, `runWithLifecycle` |
| Loop bootstrap | `packages/agent/src/agent-loop.ts:95` `runAgentLoop()` | Emits `agent_start`, first `turn_start`, echoes prompt messages |
| Loop continuation | `packages/agent/src/agent-loop.ts:120` `runAgentLoopContinue()` | Same but no new prompts (retry path) |
| Actual nested loop | `packages/agent/src/agent-loop.ts:155` `runLoop()` | Outer + inner while |
| Outer `while(true)` | `agent-loop.ts:168` | Restarts when followUps arrive |
| Inner while | `agent-loop.ts:172` | Drives turns |
| `turn_start` emit | `agent-loop.ts:173-177` | Skipped on first turn (emitted by wrapper) |
| Steering injection | `agent-loop.ts:181-189` | Messages pushed to context before next LLM call |
| LLM call per turn | `agent-loop.ts:192` → `streamAssistantResponse()` at 240 | One provider stream = one assistant message |
| Abort/error short-circuit | `agent-loop.ts:195-199` | Hard exit |
| Tool call detection | `agent-loop.ts:202` | The "done" signal |
| Tool execution dispatch | `agent-loop.ts:207` → `executeToolCalls()` at 338 | Sequential vs parallel based on config |
| Tool terminate signal | `agent-loop.ts:208-209` `hasMoreToolCalls = !executedToolBatch.terminate` | Tools can force loop exit |
| Tool terminate check | `agent-loop.ts:499` `shouldTerminateToolBatch()` | All tools in batch must agree |
| `turn_end` emit | `agent-loop.ts:217` | Per turn with message + toolResults |
| Steering poll per turn | `agent-loop.ts:219` | Drains extension-queued messages |
| Follow-up poll | `agent-loop.ts:224-230` | Drains after inner loop exits |
| `agent_end` emit | `agent-loop.ts:236` | Once per run |
| `beforeToolCall` hook | `agent-loop.ts:517` `prepareToolCall()` | Extensions block/modify tool calls |
| Tool execute | `agent-loop.ts:569` `executePreparedToolCall()` | Calls `tool.execute()` with partial-update callback |
| `afterToolCall` hook | `agent-loop.ts:606` `finalizeExecutedToolCall()` | Extensions modify results |

## Hooks usable for loop control by extensions

Available via `pi.on(...)` in extensions:

| Event | When | Can modify? | Loop-control use |
|-------|------|:---:|------------------|
| `before_agent_start` | Before loop begins | Yes (inject message, replace system prompt) | Inject TODO/plan context |
| `context` | Before each LLM call | Yes (modify messages) | Filter stale context |
| `turn_end` | After each turn | No (observe only) | Track progress, detect markers |
| `tool_call` | Before tool execution | Yes (block, modify args) | Permission gates |
| `tool_result` | After tool execution | Yes (modify result) | Post-processing, rewriting |
| `agent_end` | After loop completes | No (observe only) | **Primary loop driver** for extension-driven outer loops |
| `input` | User input received | Yes (transform, handle) | Transform commands |

Plus three injection mechanisms via the `ExtensionAPI`:

| Mechanism | Trigger | Use case |
|-----------|---------|----------|
| `pi.sendUserMessage(text)` | Immediately if idle, else queued | Drive loop like a user typing |
| `pi.sendMessage({ ... }, { triggerTurn: true })` | Immediately if idle | Inject invisible context that triggers a new run |
| `pi.sendMessage({ ... }, { deliverAs: "steer" })` | After current turn's tool calls | Mid-loop course correction |
| `pi.sendMessage({ ... }, { deliverAs: "followUp" })` | After agent would stop | Queue next task |
| `pi.sendMessage({ ... }, { deliverAs: "nextTurn" })` | Next user prompt | Persist for later |

`triggerTurn: true` on `agent_end` is the **single most important primitive** for building deterministic extension-driven outer loops — see the design sketch in [dacmicu/pi-port](../dacmicu/pi-port.md) and the existing `examples/extensions/plan-mode/` reference implementation in pi-mono.

## Cross-references

### pi-mono wiki
- [agent-loop](agent-loop.md) — high-level architecture, modes, `packages/ai` rationale.
- [component-flow](component-flow.md) — package boundary diagram and component responsibilities.
- [turn-and-loop-nomenclature](turn-and-loop-nomenclature.md) — Karpathy "turn" vs Pi "turn" reconciled.
- [comparisons/loop-architectures](../comparisons/loop-architectures.md) — pi-mono vs opencode2 vs Claude Code.
- [dacmicu/concept](../dacmicu/concept.md) — DACMICU primitive.
- [dacmicu/pi-port](../dacmicu/pi-port.md) — porting DACMICU to Pi, with extension-driven outer-loop sketch.
- [ecosystem/subagents](../ecosystem/subagents.md) — subagent extensions sit on top of this loop.

### MetaHarness wiki (research)
- [MATS](../../../../MetaHarness/llm-wiki/proposals/mats.md) — research context for loop-driving extensions
- [Meta-Harness](../../../../MetaHarness/llm-wiki/systems/meta-harness.md) — filesystem-as-history agentic proposer
- [History Mechanisms](../../../../MetaHarness/llm-wiki/concepts/history-mechanisms.md) — full-history vs compressed summaries
