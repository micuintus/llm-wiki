---
title: Pi agent loop, turns, and entry points
type: concept
updated: 2026-05-06
sources:
  - ~/.pi/agent/sessions/--Users-michael.voigt-devel-AI-aiAgentResearch-agents-pi-mono--/2026-04-17T13-29-34-211Z_019d9ba1-ef03-7425-ab23-be00d42dde15.jsonl
  - ~/devel/AI/aiAgentResearch/agents/pi-mono/packages/
tags: [architecture, agent-loop]
---

# Pi agent loop, turns, and entry points

The Pi agent loop is the unit of execution that runs between user prompts. Understanding turns vs loops is the prerequisite for designing extensions that hook into Pi's iteration — including DACMICU-style deterministic loops.

## Key claims

- **Turn vs loop nomenclature** (settled in session):
  - One turn = (user prompt → LLM thinks → LLM responds *or* issues tool call + tool result → loop continues until LLM emits a stop signal).
  - Thinking is a response in `<thinking>` brackets, not a separate turn.
  - Multi-tool-call sequences are multiple turns within one loop iteration.
  - The LLM tells the agent it's done by emitting a stop reason (`stop`, not `toolUse`).
- Pi is a **monorepo** under `packages/` — `packages/ai` is Pi's own model-interaction layer, the equivalent of what Vercel's AI SDK provides for opencode. Mario chose not to depend on Vercel/vLLM/etc. (rationale not surfaced in session).
- Two entry points to the loop:
  1. **`pi --print`** — non-interactive, single-shot. Runs the agent loop once with a given prompt; exits when the LLM emits stop.
  2. **TUI** — interactive, persistent. Maintains session state, supports re-entry, hooks for keybindings/themes.
- Pi extensions like `until-done` exist as ecosystem-level loop primitives that wrap `pi --print` rather than hook into the in-process loop. Hooks into the in-process loop are limited.
- Each element in a session tree (user message, agent message, tool call, tool result) is **inside** a single loop iteration; it's not one-iteration-per-element. This matters for DACMICU because a deterministic-script-controlling-the-loop primitive could either run **outside** (multiple `pi --print` calls) or **inside** (one extended loop) — radically different ergonomics.
- Async/Promise model relevant to extension design: JS Promises are eager (start when created); `await` only suspends the awaiting function. Pi's TypeScript codebase uses `async/emit` patterns for streaming — extension authors must understand this to safely interpose.

## Cross-references

- [loop-internals](loop-internals.md) — line-precise walkthrough.
- [component-flow](component-flow.md) — package boundary diagram and component responsibilities.
- [turn-and-loop-nomenclature](turn-and-loop-nomenclature.md) — terminology reconciliation.
- [comparisons/loop-architectures](../comparisons/loop-architectures.md) — pi-mono vs opencode2 vs Claude Code.
