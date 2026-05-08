---
title: turn-and-loop-nomenclature
type: concept
updated: 2026-04-29
sources:
  - "https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f"
  - "../../packages/agent/src/agent-loop.ts"
  - "../../packages/agent/src/types.ts"
---

# Turn vs Loop — Nomenclature Reconciled

A short reference for talking about Pi's loop without sliding between Karpathy's gist terminology and Pi's source-code terminology. The two communities use the same words for slightly different things.

## The two definitions

**Karpathy's gist** ("LLM Wiki" intro):
- A **turn** = one input/output exchange — user asks, LLM responds. ChatGPT-style.
- An **agent loop** = repeated `think → act → observe → think` cycles, each cycle internally containing turns plus tool execution.

**Pi's source code** (`agent-loop.ts`, `types.ts`):
- A **turn** = one assistant message + its tool execution results (or none). One LLM round-trip.
- A **loop** = one `Agent.prompt()` invocation that may produce many turns until the LLM stops emitting tool calls.

Both are correct. They describe the same machinery at different granularities.

## Worked examples

### Case A: simple Q&A
1. User prompts: "what is 2+2?"
2. LLM responds: "4"

| In Karpathy terms | In Pi terms |
|-------------------|-------------|
| 1 turn | 1 turn, 1 loop |

### Case B: tool-using exchange
1. User prompts: "read foo.txt and summarise"
2. LLM thinks, emits a `read` tool call → `read` executes → result appended  ← **Pi turn 1**
3. LLM thinks, emits final summary text with no tool calls  ← **Pi turn 2**

| In Karpathy terms | In Pi terms |
|-------------------|-------------|
| 1 turn (one exchange, ended with definitive answer) | 2 turns, 1 loop |

So Karpathy's "turn" ≈ Pi's "loop" (or "agent run"). Karpathy's "agent loop" is more abstract — it covers the *style* of operation (cyclic vs single-shot) rather than the specific run.

## Suggested bridging vocabulary

When writing for both audiences, use these terms:

| Concept | Term | Pi's name | Karpathy's name |
|---------|------|-----------|-----------------|
| Whole `prompt → final answer` | **agent run** | `loop` (one `runLoop()` call) | "turn" (in single-shot framing) or one full agent loop traversal |
| One LLM round-trip + its tool execution | **step** or "turn" (Pi) | `turn` (one inner-loop iteration) | one cycle of `think → act → observe` |
| The pattern of cyclic operation | **agent loop** | implicit in `runLoop()` | "agent loop" |
| One token or content delta | **streaming event** | `AssistantMessageEvent` | (not addressed) |

When in doubt, prefer "agent run" for the whole thing and "turn" for one LLM call inside it. This is what the rest of this wiki uses.

## Why this matters for design discussions

When someone says "the model decides when the turn ends", they usually mean "the model decides when the **agent run** ends" — by emitting an assistant message with no tool calls. The mechanism is described in [loop-internals — Done signals](loop-internals.md#done-signals--full-ladder).

When someone says "extensions drive the next turn", they almost always mean "extensions drive the next **agent run**" — by calling `pi.sendMessage({ triggerTurn: true })` on `agent_end`. This wakes a fresh `runLoop()`.

When someone says "the agent did three turns", they almost always mean "three Pi-turns inside one Pi-loop" — i.e. three LLM round-trips inside one agent run.

## Streaming events vs turns vs runs

A turn is the unit of provider call. Streaming events are sub-turn:

```
agent run
├── turn 1
│   ├── message_start (assistant message)
│   ├── thinking_start ─── thinking_delta* ─── thinking_end
│   ├── text_start ─── text_delta* ─── text_end
│   ├── toolcall_start ─── toolcall_delta* ─── toolcall_end
│   ├── message_end (assistant message done)
│   ├── tool_execution_start
│   ├── tool_execution_update*
│   ├── tool_execution_end
│   ├── message_start / message_end (toolResult message)
│   └── turn_end
├── turn 2
│   └── ...
└── agent_end
```

Pi exposes all three layers. Extensions can subscribe to any of them. UI rendering uses streaming events; loop-control extensions usually use `turn_end` and `agent_end`.

## Cross-references

- [loop-internals](loop-internals.md) — full code walkthrough.
- [agent-loop](agent-loop.md) — architecture overview.
- [comparisons/loop-architectures](../comparisons/loop-architectures.md) — how opencode2 and Claude Code use the same nomenclature differently.
