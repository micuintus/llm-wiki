---
title: loop-architectures
type: concept
updated: 2026-05-01
sources:
  - "../../packages/agent/src/agent-loop.ts"
  - "../../packages/coding-agent/src/core/agent-session.ts"
  - "../../../opencode2/packages/opencode/src/session/prompt.ts"
  - "../../../opencode2/packages/opencode/src/session/llm.ts"
  - "../../../opencode2/packages/opencode/src/session/processor.ts"
  - "https://github.com/sst/opencode/pull/20074"
---

# Loop Architectures Compared — pi-mono vs opencode2 vs Claude Code

All three implement the same logical ReAct/tool-calling loop:

```
while (not done) {
  llm_call() → assistant message
  if (tool_calls present) {
    execute_tools() → results
    append results to context
    continue
  }
  break
}
```

But the implementations diverge significantly. This page captures the differences relevant to porting features (e.g. [DACMICU](../dacmicu/concept.md), TODO/loop-driving extensions) between them.

## Side-by-side summary

| Aspect | pi-mono | opencode2 | Claude Code |
|--------|---------|-----------|-------------|
| **Outer loop granularity** | Per LLM call | Per `streamText()` step (multi-tool internally) | Per `messages.create` call |
| **Tool execution owner** | pi itself | Vercel AI SDK | Anthropic SDK |
| **Stream library** | `pi-ai` (custom) | Vercel `ai` package (`streamText`) | `@anthropic-ai/sdk` |
| **Persistence** | JSONL session file | SQLite | JSONL `~/.claude/projects/` |
| **Effect/async model** | Plain async/await | Effect-ts generators | Unknown (minified) |
| **Subagents** | Extension-provided via `child_process` | Built-in `subtask` part type | Built-in `Task` tool |
| **Compaction** | Extension/built-in | First-class loop branch | Built-in `/compact` |
| **Steering mid-loop** | `steer()` queue drained each turn | Not directly; via message stream | Limited (abort + new prompt) |
| **Follow-ups** | `followUp()` queue, outer-loop resumption | New user message appended to session | New prompt |
| **Doom-loop guard** | None | Yes (3 identical tool calls → permission ask) | Yes (implicit via stop criteria) |
| **Max steps** | None (unbounded until LLM stops) | `agent.steps ?? Infinity` | `maxTurns` config |
| **Retries** | Hook-level (`maxRetryDelayMs`) | `Effect.retry` with `SessionRetry.policy` | SDK-level |
| **DACMICU primitive** | `pi --print` (works today) | `oc` (PR #20074, in progress) | `claude --print` (works today) |

## pi-mono — harness owns the loop

`packages/agent/src/agent-loop.ts:runLoop()` contains the explicit nested while-loop. Pi parses the assistant message, extracts tool calls, runs them via `executeToolCalls()` with `beforeToolCall`/`afterToolCall` hooks, appends results to context, decides whether to continue.

**Stream library**: `@mariozechner/pi-ai` (`packages/ai`) is a custom abstraction over provider stream wire formats. The agent loop talks only to `pi-ai`; `pi-ai` knows about Anthropic, OpenAI, Google, etc.

**Persistence**: JSONL session files in `.pi/sessions/`. Pi maintains the message tree in memory and replays from disk on resume.

**Tool execution**: pi-controlled — `executeToolCallsSequential` and `executeToolCallsParallel` both call `tool.execute()` directly. This is why pi can offer clean `beforeToolCall`/`afterToolCall` hooks: pi itself is the one calling `execute()`, so it can wrap that call.

**Loop iteration granularity**: one iteration = one LLM call + its tools. Fine-grained.

See [loop-internals](../architecture/loop-internals.md) for the full walkthrough.

## opencode2 — SDK owns the loop, Effect-ts shell

Location: `packages/opencode/src/session/prompt.ts`, `llm.ts`, `processor.ts`.

The outer `while (true)` is in `runLoop()` (around `prompt.ts:1347`):

```typescript
const runLoop = Effect.fn("SessionPrompt.run")(function* (sessionID) {
  while (true) {
    yield* status.set(sessionID, { type: "busy" })
    // pull last user/assistant/finished from session stream
    if (lastAssistant?.finish && !["tool-calls"].includes(lastAssistant.finish) && !hasToolCalls && ...) {
      break
    }
    // decide: subtask? compaction? overflow? run step?
    const handle = yield* processor.create({ assistantMessage, sessionID, model })
    const outcome = yield* handle.process({ user, agent, system, messages, tools, model, ... })
    if (outcome === "break") break
    continue
  }
})
```

**Critical difference — opencode2 delegates tool execution to the Vercel AI SDK**. Look at `llm.ts` — it calls `streamText({ tools, ... })` from the `ai` package. **The AI SDK runs the tools internally** during the stream and emits `tool-call` / `tool-result` events back to opencode. Opencode's `processor.ts` just **observes** these events and updates session state:

```typescript
case "tool-call": { ... update part state to "running" ... }
case "tool-result": { ... update part state to "completed" ... }
case "tool-error": { ... }
case "finish-step": { ... check for compaction, track tokens ... }
```

So opencode2's outer `while (true)` is **coarser** than pi's. One iteration of opencode's loop = one `streamText()` call which may internally run **many** tool-call → tool-result cycles before finishing a step.

**Other opencode2 specifics**:
- Messages persisted to SQLite (`session.sql.ts`), streamed via `MessageV2.stream()`, not held in memory arrays.
- "Subtask" and "compaction" are **first-class message part types**, handled as loop branches in `runLoop()` (not extensions).
- Max-steps check: `const isLastStep = step >= maxSteps` (hardcoded loop limit, defaults to `Infinity`).
- Doom-loop detection (`DOOM_LOOP_THRESHOLD = 3`) in `processor.ts`: if same tool is called 3× in a row with identical input, triggers a `permission.ask({ permission: "doom_loop", ... })` gate.
- Built on Effect-ts for cancellation/retries (`Effect.retry(SessionRetry.policy(...))`).
- `oc` CLI (PR #20074) is opencode's [DACMICU](../dacmicu/concept.md) primitive — equivalent to `pi --print` but designed from the start for shell-driven outer loops.

## Claude Code — SDK-driven, opaque

I don't have Claude Code source (minified npm binary), but based on its public behaviour and community reverse-engineering:

- **Uses the Anthropic SDK's native tool loop** via `anthropic.messages.stream()` — similar delegation model to opencode2.
- Each "turn" = one `messages.create` call that may contain multiple parallel `tool_use` blocks.
- Claude Code executes those tools locally and appends `tool_result` blocks back in a `messages.create({ messages: [...previous, {role: "user", content: [{type:"tool_result",...}]}] })` call.
- Loop continues until `stop_reason` is `"end_turn"` (no more tool calls).
- The `Task` subagent tool spawns a separate Claude instance with its own independent loop — this is what pi's subagent extensions mimic via `child_process.spawn('pi --print')`.
- Todos are a built-in tool (`TodoWrite`), stored in session state, rendered by the TUI as a live widget.
- DACMICU equivalent is `claude --print` — works the same way as `pi --print`.

The loop **shape** is identical. The differences are: Claude Code's loop is closed-source, the SDK abstracts more of the tool execution, and there are fewer hook surfaces for extensions.

## Two philosophies

**"Harness owns the loop"** (pi-mono): pi parses assistant messages, extracts tool calls, runs them, appends results. Gives fine control per-turn. Simpler codebase. More work to support each new provider.

**"SDK owns the loop"** (opencode2, Claude Code): the provider's AI SDK runs the tool loop internally; the harness just observes events. Easier to support many providers. Less granular control — you can't intercept between an LLM emitting a tool-call and the SDK executing it without rewiring.

Pi's approach is why it can have `beforeToolCall`/`afterToolCall` hooks so cleanly — pi itself calls `tool.execute()`, so it can wrap that call. Opencode2's `processor.ts` has no equivalent because the AI SDK executes tools out of its reach; permission gates are done via `permission.ask()` *inside* each tool's `execute` function instead.

## What this means for porting features

### DACMICU port
- **pi-mono**: works today via `pi --print`. Bash outer loops are trivial. See [dacmicu/pi-port](../dacmicu/pi-port.md) for inside-loop extension sketch.
- **opencode2**: `oc` PR #20074 lands the equivalent — needs to be tracked.
- **Claude Code**: `claude --print` works today; bash-script DACMICU is the only viable form because Claude Code has no extension hooks for inside-loop tool registration.

### Loop-driving extensions (e.g. TODO + outer loop)
- **pi-mono**: `pi.sendMessage({ triggerTurn: true })` on `agent_end` — clean primitive, see [dacmicu/pi-port](../dacmicu/pi-port.md). The `examples/extensions/plan-mode/` reference implementation already does this interactively.
- **opencode2**: needs hooking the end of `runLoop()` via `status.set(sessionID, { type: "idle" })` plus the `MessageV2.stream` subscription. No direct `agent_end` hook for plugins at the same granularity.
- **Claude Code**: not possible inside-loop. Only outside-loop via `claude --print` from bash.

### Permission/safety gates
- **pi-mono**: `beforeToolCall` hook intercepts before execute. Clean.
- **opencode2**: `permission.ask()` called inside each tool's `execute()`. Tools must opt in.
- **Claude Code**: hardcoded permissions UI; limited extensibility.

### Subagents
- **pi-mono**: extensions register a `Task` tool that `child_process.spawn`s `pi --print`. See [ecosystem/subagents](../ecosystem/subagents.md).
- **opencode2**: built-in. `subtask` is a first-class part type in `runLoop()`.
- **Claude Code**: built-in `Task` tool with provider-side `subagent_type` parameter.

## Mental model takeaway

Pi-mono is the cleanest reference implementation because it strips opencode's session/persistence/UI/Effect-ts layers. Read pi-mono first, then read opencode2 to see what additional concerns (SQLite persistence, doom-loop detection, retry policies, multi-tool steps inside one stream) look like in production. Claude Code's loop is the same shape but inaccessible.

## Cross-references

### pi-mono wiki
- [architecture/agent-loop](../architecture/agent-loop.md) — Pi's high-level architecture.
- [architecture/loop-internals](../architecture/loop-internals.md) — Pi's line-precise walkthrough.
- [architecture/turn-and-loop-nomenclature](../architecture/turn-and-loop-nomenclature.md) — terminology reconciliation.
- [dacmicu/concept](../dacmicu/concept.md) — DACMICU primitive.
- [dacmicu/pi-port](../dacmicu/pi-port.md) — porting DACMICU/loop-driving extensions to Pi.

### MetaHarness wiki (research)
- [MATS](../../../../MetaHarness/llm-wiki/proposals/mats.md) — MATS research proposal: why agent-driven loops beat algorithmic selection
- [Meta-Harness](../../../../MetaHarness/llm-wiki/systems/meta-harness.md) — filesystem-as-history precedent
- [DGM](../../../../MetaHarness/llm-wiki/systems/dgm.md) — archive-based tree search with agentic proposer
- [Selection Policies](../../../../MetaHarness/llm-wiki/concepts/selection-policies.md) — "no policy" vs UCB vs greedy
- [Deterministic Agent Loops](../../../../MetaHarness/llm-wiki/concepts/deterministic-agent-loops.md) — Pi, Praetorian, Temporal, and SGH compared
