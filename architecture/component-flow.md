---
title: Component Interaction — Keystroke to Agent Loop and Back
type: concept
updated: 2026-05-06
sources:
  - ../../packages/coding-agent/src/modes/interactive/interactive-mode.ts
  - ../../packages/coding-agent/src/core/agent-session.ts
  - ../../packages/agent/src/agent.ts
  - ../../packages/agent/src/agent-loop.ts
  - ../../packages/coding-agent/src/core/tools/
tags: [architecture, agent-loop, tui, data-flow]
---

# Component Interaction — Keystroke to Agent Loop and Back

Companion to [loop-internals](loop-internals.md) and [agent-loop](agent-loop.md). Where those pages explain the loop mechanics and nomenclature, this page traces the **exact boundary crossings** between packages and components when the user hits Enter in the TUI.

## Five-layer architecture

Pi splits cleanly across three packages:

| Package | Role |
|---------|------|
| `@mariozechner/pi-tui` | Generic terminal widgets (Editor, Box, Text, Input, Markdown, SelectList). Knows nothing about agents. |
| `@mariozechner/pi-agent-core` | Generic agent loop (`Agent`, `runAgentLoop`). Knows nothing about Pi's slash commands, skills, or TUI. |
| `@mariozechner/pi-coding-agent` | Application layer. Glues TUI to session, owns tools, extensions, persistence, auth. |

## Interaction diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              YOU HIT ENTER                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  LAYER 1: TUI INPUT                                                         │
│  packages/coding-agent/src/modes/interactive/interactive-mode.ts            │
│                                                                             │
│  Editor (pi-tui) → onSubmit callback → InteractiveMode.setupEditorSubmit    │
│                                                                             │
│    if idle:        await this.session.prompt(text)                          │
│    if streaming:   await this.session.prompt(text, { streamingBehavior:     │
│                    "steer" })  ← queues mid-loop, or "followUp"             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  LAYER 2: AGENT SESSION  (Pi-specific business logic)                       │
│  packages/coding-agent/src/core/agent-session.ts                            │
│                                                                             │
│  AgentSession.prompt(text, options)                                         │
│    ├── Slash command?      → execute extension command immediately          │
│    ├── "input" hook?       → extension intercepts/transforms                │
│    ├── Skill /template?    → expand content                                 │
│    ├── Already streaming?  → queue steer() or followUp() on Agent           │
│    ├── Validate model + auth                                                │
│    ├── "before_agent_start" hook → extensions inject context / sys prompt   │
│    └── await this.agent.prompt(messages)  ─────────────────────────────┐    │
└────────────────────────────────────────────────────────────────────────┘    │
                                                                         │    │
                                    │                                    │    │
                                    ▼                                    │    │
┌────────────────────────────────────────────────────────────────────────┴─┐  │
│  LAYER 3: AGENT  (generic loop lifecycle)                                │  │
│  packages/agent/src/agent.ts                                             │  │
│                                                                          │  │
│  Agent.prompt(messages)                                                  │  │
│    ├── Guard: reject if activeRun exists                                 │  │
│    ├── runWithLifecycle() → sets isStreaming=true, abort controller      │  │
│    └── await runAgentLoop(...)  ─────────────────────────────────────┐   │  │
└──────────────────────────────────────────────────────────────────────┘   │  │
                                                                       │   │  │
                                    │                                  │   │  │
                                    ▼                                  │   │  │
┌──────────────────────────────────────────────────────────────────────┴───┴┐ │
│  LAYER 4: AGENT LOOP  (THE ACTUAL LOOP)                                   │ │
│  packages/agent/src/agent-loop.ts                                         │ │
│                                                                           │ │
│  runAgentLoop(prompts, context, config, emit, signal, streamFn)           │ │
│    ├── emit agent_start                                                   │ │
│    ├── emit turn_start                                                    │ │
│    └── runLoop(currentContext, newMessages, config, signal, emit)  ───┐   │ │
└────────────────────────────────────────────────────────────────────────┘   │ │
                                                                         │   │ │
                                    │                                    │   │ │
                                    ▼                                    │   │ │
┌────────────────────────────────────────────────────────────────────────┴───┴┐│
│  LAYER 5: RUN LOOP  (nested while(true))                                    ││
│  ───────────────────────────────────────                                    ││
│                                                                             ││
│   OUTER while (true)          ← restarts when followUp messages arrive      ││
│     │                                                                       ││
│     └── INNER while (hasMoreToolCalls || pendingMessages > 0)               ││
│           │                                                                 ││
│           ├── Inject steering messages (if any)                             ││
│           │                                                                 ││
│           ├── streamAssistantResponse()  ──────────────────────────────┐    ││
│           │   │   ONE LLM ROUND-TRIP                                   │    ││
│           │   ├── Convert AgentMessage[] → Message[] for LLM           │    ││
│           │   ├── streamSimple(model, context)  → provider stream      │    ││
│           │   ├── Stream events: text_delta, thinking_delta,           │    ││
│           │   │   toolcall_start, toolcall_delta ...                   │    ││
│           │   └── Returns AssistantMessage                             │    ││
│           │                                                            │    ││
│           ├── stopReason === "error"/"aborted"?                        │    ││
│           │   → emit turn_end → emit agent_end → RETURN                │    ││
│           │                                                            │    ││
│           ├── Any toolCall blocks?                                     │    ││
│           │   → executeToolCalls()  ────────────────────────────────┐  │    ││
│           │       │                                                 │  │    ││
│           │       ├── beforeToolCall hook (extensions can block)    │  │    ││
│           │       ├── tool.execute(id, args, signal, onUpdate)      │  │    ││
│           │       │   → bash, read, write, edit, grep, ls, find     │  │    ││
│           │       ├── afterToolCall hook (extensions can rewrite)   │  │    ││
│           │       └── Returns ToolResultMessage[]                   │  │    ││
│           │                                                         │  │    ││
│           ├── All tools returned terminate:true?                    │  │    ││
│           │   → hasMoreToolCalls = false  (force exit)              │  │    ││
│           │                                                         │  │    ││
│           ├── emit turn_end(message, toolResults)                   │  │    ││
│           │                                                         │  │    ││
│           ├── shouldStopAfterTurn?  → emit agent_end → RETURN       │  │    ││
│           │                                                         │  │    ││
│           └── Poll steering queue  ─────────────────────────────────┘  │    ││
│               → pendingMessages = getSteeringMessages()                │    ││
│                                                                        │    ││
│     ←── INNER loop repeats if hasMoreToolCalls or pendingMessages      │    ││
│                                                                          │    ││
│     ←── OUTER loop repeats if followUp messages queued                   │    ││
│                                                                          │    ││
│     emit agent_end  ←────────────────────────────────────────────────────┘    ││
└───────────────────────────────────────────────────────────────────────────────┘│
                                                                                 │
                                    │                                            │
                                    ▼                                            │
┌────────────────────────────────────────────────────────────────────────────────┘
│  EVENTS FLOW BACK UP  (rendering)
│
│  Agent.processEvents(event)  →  Agent.listeners  →  AgentSession._handleAgentEvent
│    │                              │                    │
│    │                              │                    ├── Persist to JSONL
│    │                              │                    ├── Auto-compaction check
│    │                              │                    ├── Retry logic
│    │                              │                    └── AgentSession._emit(event)
│    │                              │                         │
│    │                              │                         └── InteractiveMode.handleEvent(event)
│    │                              │                              │
│    │                              │                              ├── message_start / message_update
│    │                              │                              │   → render streaming text/tool calls
│    │                              │                              ├── tool_execution_start / _end
│    │                              │                              │   → render bash box, file diff, spinner
│    │                              │                              ├── turn_end
│    │                              │                              │   → finalize message component
│    │                              │                              └── agent_end
│    │                              │                                  → show input prompt again
│    │                              │
│    │                              └── ExtensionRunner.emit(event) → extension hooks fire
│    │
│    └── state.isStreaming = false  (run finished)
│
└────────────────────────────────────────────────────────────────────────────────
```

## Component boundary summary

| Component | Package | File | Responsibility |
|-----------|---------|------|--------------|
| **Editor** | `pi-tui` | `tui/src/components/editor.ts` | Text input widget with history, undo, keybindings. Emits `onSubmit`. |
| **InteractiveMode** | `pi-coding-agent` | `modes/interactive/interactive-mode.ts` | TUI mode controller. Owns layout, event routing, editor submit handler, session viewer. |
| **AgentSession** | `pi-coding-agent` | `core/agent-session.ts` | Pi-specific session logic: slash commands, skills, templates, auth, compaction, steering/follow-up queues, JSONL persistence. |
| **Agent** | `pi-agent-core` | `agent/src/agent.ts` | Generic stateful wrapper: `prompt()`, `steer()`, `followUp()`, run lifecycle, abort, listener dispatch. |
| **runAgentLoop / runLoop** | `pi-agent-core` | `agent/src/agent-loop.ts` | The nested `while(true)`. Streams from LLM, executes tools, decides when done. |
| **streamSimple** | `pi-ai` | `ai/src/stream-simple.ts` | Provider-agnostic streaming. Talks to OpenAI, Anthropic, Google, etc. |
| **Built-in tools** (read, bash, edit, write, grep, ls, find) | `pi-coding-agent` | `core/tools/*.ts` | File system and shell operations. Called by `executeToolCalls()`. |

## Why the split matters

- **`pi-tui` is reusable.** It knows nothing about LLMs. You could build a terminal spreadsheet or IRC client with it.
- **`pi-agent-core` is reusable.** It knows nothing about Pi's slash commands, skills, or file-tool implementations. You could build a different agent on top of it with entirely different tools.
- **`pi-coding-agent` is the product.** It glues the two together and adds everything that makes Pi Pi: the coding tools, session trees, extension system, compaction, and interactive TUI layout.

## Event flow back to the screen

The loop emits events upward through three stages:

1. **`Agent.processEvents()`** — updates internal state (`isStreaming`, `streamingMessage`, `pendingToolCalls`).
2. **`AgentSession._handleAgentEvent()`** — persists to JSONL, checks auto-compaction, manages retry state, re-emits to session listeners.
3. **`InteractiveMode.handleEvent()`** — routes to the correct TUI component for rendering (streaming text, bash execution box, file diff, footer update).

Extensions intercept via `ExtensionRunner` at stages 2 and 3.

## Cross-references

### pi-mono wiki
- [agent-loop](agent-loop.md) — high-level architecture, turns vs loops, `packages/ai` rationale.
- [loop-internals](loop-internals.md) — line-precise walkthrough from `pi <prompt>` to inner-most while-loop.
- [turn-and-loop-nomenclature](turn-and-loop-nomenclature.md) — Karpathy "turn" vs Pi "turn" reconciled.
- [comparisons/loop-architectures](../comparisons/loop-architectures.md) — pi-mono vs opencode2 vs Claude Code.

### MetaHarness wiki (research)
- [Deterministic Agent Loops](../../../../MetaHarness/llm-wiki/concepts/deterministic-agent-loops.md) — Pi, Praetorian, Temporal, and SGH compared
