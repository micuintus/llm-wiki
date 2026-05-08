---
title: Subprocess + RPC + custom rendering — the visibility-preserving subagent pattern
type: concept
updated: 2026-05-08
sources:
  - https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/rpc.md
  - https://cdn.jsdelivr.net/npm/ralph-loop-pi@1.0.1/ralph-loop.ts
  - https://github.com/lnilluv/pi-ralph-loop
  - "../../packages/coding-agent/src/modes/rpc/"
  - "../../packages/coding-agent/examples/extensions/subagent/"
tags: [architecture, rpc, subagent, rendering, ralph]
---

# Subprocess + RPC + custom rendering — the visibility-preserving subagent pattern

When an extension wants to run **another Pi instance** as a subagent or loop iteration **and have the user see what happens inside it** — not just a final text dump — this is the architecture that works. Used by `ralph-loop-pi`, `lnilluv/pi-ralph-loop`, and `pi-mono`'s own `examples/extensions/subagent`.

It's heavier than the in-session pattern ([loop-extensions](../ecosystem/loop-extensions.md) Variant A), but it's the only way to get **opencode DACMICU's UX property** — visible nested tool calls and reasoning — without modifying Pi core.

## TL;DR — two paths, one rendering technique

| Path | When | Cost |
|---|---|---|
| `pi --mode json -p --no-session` (one-shot, JSON event stream) | Default for non-interactive subagents (worker, ask-specialist, parallel fan-out) | ~300 LOC; the in-tree `examples/extensions/subagent/index.ts:265` reference |
| `pi --mode rpc` (multi-turn, JSON-RPC bidirectional) | Children that need to be steered, paused (SIGSTOP), follow_up'd, aborted | ~1300 LOC; `lnilluv/pi-ralph-loop` reference |

**Both paths use the same rendering technique** in the parent's `renderResult`: parse `message_end` + `tool_result_end` events into `Message[]`, store in `result.details`, re-render with Pi's exported components (`AssistantMessageComponent`, `ToolExecutionComponent`, `UserMessageComponent`, `Container`, `Spacer`, `Markdown`).

**Visibility is decided by the parent invocation site, not the child mode.** A bash tool calling any of these modes (including `--mode rpc`) collapses output to text-as-blob. Visibility comes from being an extension-registered tool with `renderResult` on the parent side, not from the child's mode flag. See "Why this is the only path..." below.

## Three pieces

### Piece 1 — Subprocess

Each subagent invocation = one fresh `pi --mode rpc` child process:

```typescript
const sessionFile = path.join(subagentSessionDir, `${ts}_${name}_${uuid}.jsonl`);
const args = ["--mode", "rpc", "--session", sessionFile];
if (model)        args.push("--provider", provider, "--model", modelId);
if (thinkingLevel) args.push("--thinking", thinkingLevel);

const proc = spawn("pi", args, {
  cwd, shell: false,
  stdio: ["pipe", "pipe", "pipe"],   // stdin, stdout, stderr piped
  env,
});
```

Each child has its own session JSONL, model, thinking level, extension stack. They are independent processes — clean cold start, no shared memory state.

`pi --mode rpc` is Pi's **third run mode** alongside `interactive` and `print` ([architecture/loop-internals](loop-internals.md#layer-1-cli-entry-coding-agentsrcmaints)). It reads JSON-RPC commands from stdin, writes events to stdout. See `packages/coding-agent/src/modes/rpc/`.

### Piece 2 — JSON-RPC over stdin/stdout

Line-delimited JSON. Each command optionally carries an `id`; the response carries the same `id` and `success: bool`.

**Parent → child commands** (full set in [packages/coding-agent/docs/rpc.md](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/rpc.md)):

| Command | Purpose |
|---------|---------|
| `prompt` | Send a user prompt to the child |
| `steer` | Queue mid-turn (delivered after current tool calls) |
| `follow_up` | Queue post-completion (delivered after agent stops) |
| `abort` | Abort current run |
| `get_state` | Inspect streaming state |
| `set_model`, `cycle_model`, `cycle_thinking_level` | Model/thinking control |
| `compact`, `set_auto_compaction`, `set_auto_retry` | Compaction/retry control |
| `bash`, `abort_bash` | Direct bash execution (separate from LLM tool) |
| `new_session`, `switch_session`, `fork`, `clone` | Session lifecycle |
| `get_messages`, `get_session_stats`, `get_state` | State queries |
| `export_html` | Serialize session to HTML |
| `set_session_name`, `get_commands` | Misc session ops |

**Child → parent stream** — the same `AgentEvent` types Pi emits internally, just JSON-serialized:

| Event | When |
|-------|------|
| `agent_start`, `agent_end` | Run lifecycle (`agent_end` includes all generated messages) |
| `turn_start`, `turn_end` | Per-turn boundaries |
| `message_start`, `message_update`, `message_end` | Streaming message lifecycle |
| `tool_execution_start`, `tool_execution_update`, `tool_execution_end` | Tool execution |
| `queue_update`, `compaction_start`, `compaction_end` | Async state changes |
| `auto_retry_start`, `auto_retry_end` | Transient-error recovery |
| `extension_error` | Extension failures inside the child |
| `extension_ui_request` | Child wants to interact with user (see "Extension UI sub-protocol" below) |

**Implementation pattern** in the parent extension (from `ralph-loop-pi`):

```typescript
// Send command and await keyed response
const sendCommand = (command) => new Promise((resolve, reject) => {
  const id = `req_${++requestId}`;
  pending.set(id, { resolve, reject });
  proc.stdin.write(`${JSON.stringify({ ...command, id })}\n`);
});

// Read events line-by-line, handling responses vs events
proc.stdout.on("data", (data) => {
  buffer += data.toString();
  const lines = buffer.split("\n");
  buffer = lines.pop() || "";
  for (const line of lines) processLine(line);
});

const processLine = (line) => {
  const event = JSON.parse(line);
  if (event.type === "response" && handleResponse(event)) return;
  processEvent(event);  // message_end, tool_execution_*, agent_end, etc.
};
```

**Important framing rule** (from `rpc.md`): split records on `\n` only. Don't use Node's `readline` — it splits on `U+2028`/`U+2029` which are valid inside JSON strings. Strip optional trailing `\r`.

### Piece 3 — Custom rendering with Pi's own components

This is the magic piece. `@mariozechner/pi-coding-agent` exports the **same UI components Pi's interactive mode uses internally**:

```typescript
import {
  AssistantMessageComponent,
  ToolExecutionComponent,
  UserMessageComponent,
  DynamicBorder,
} from "@mariozechner/pi-coding-agent";

import { Box, Container, Spacer, Text } from "@mariozechner/pi-tui";
```

The extension stores everything emitted by the child in `result.details`, then `renderResult` (the per-tool render hook on `pi.registerTool`) composes those components into a nested view inside the parent's tool execution box:

```typescript
renderResult(result, { expanded }, theme) {
  const details = result.details as RalphLoopDetails;
  const wrapper = new Container();
  const mainBox = new Box(1, 0, (text) => theme.bg("toolPendingBg", text));
  const container = new Container();

  for (const iteration of details.iterations) {
    container.addChild(new Text(`Iteration ${iteration.index}`));
    for (const result of iteration.details.results) {
      for (const msg of result.messages) {
        if (msg.role === "assistant") {
          container.addChild(new AssistantMessageComponent(msg, false));
          for (const part of msg.content) {
            if (part.type === "toolCall") {
              const tc = new ToolExecutionComponent(
                part.name, part.arguments, { showImages: false },
                undefined, ui, cwd
              );
              tc.updateResult(toolResults.get(part.id), false);
              tc.setExpanded(expanded);
              container.addChild(tc);
            }
          }
        } else if (msg.role === "user") {
          container.addChild(new UserMessageComponent(text));
        }
      }
    }
  }
  mainBox.addChild(container);
  wrapper.addChild(mainBox);
  return wrapper;
}
```

The result: inside the parent's tool execution display, every iteration's full message tree renders **with the same components Pi uses for top-level rendering** — same colors, same expand/collapse, same diff rendering, same syntax highlighting:

```
▾ ralph_loop chain (3 steps) [user]
   cond: ./check.sh
   prompt: worker fix the auth tests
   max:50 sleep:1000ms
   ┌─────────────────────────────────────────────┐
   │ Iteration 1 (single)                        │
   │ ✓ worker (user)                             │
   │                                             │
   │ I'll start by reading the test file...      │  ← AssistantMessage
   │ ▾ read src/auth.test.ts                     │  ← ToolExecution
   │   1  describe('auth', () => {               │
   │   ...                                       │
   │ ▾ bash npm test                             │
   │   FAIL  src/auth.test.ts                    │
   │   ...                                       │
   │                                             │
   │ Iteration 2 (single)                        │
   │ ...                                         │
   └─────────────────────────────────────────────┘
```

Nested. Expandable. Looks like Pi.

## Why this is the only path to opencode-DACMICU UX without core changes

The competing options:

| Approach | LLM "writes loop"? | Iterations visible? | Pi changes? |
|---|---|---|---|
| Bash tool runs `pi --print` in a `while` | Yes (literal `while`) | **No** — subprocess output is a single bash text blob | None |
| Subprocess + RPC + custom rendering | Partial (LLM specifies tool args) | **Yes** — full event stream re-rendered with Pi components | None |
| In-session via `pi.sendMessage(triggerTurn:true)` | No (extension drives) | **Yes natively** — events fire on parent's bus | None |
| Hypothetical in-process `dacmicu_loop` tool | Partial (loop spec args) | Yes natively | Yes (nested run support) |

`pi --print` from a bash tool **collapses every nested Pi call into a single bash output blob**. The user sees text, not tool calls. Every reasoning step, every `read`/`edit`/`bash` invocation inside the inner Pi is invisible. That kills the DACMICU UX property of "you see tools called by the script".

The RPC approach **forwards Pi's actual event stream** through a structured channel and re-renders it inside the parent's UI tree using Pi's own components. The visibility property is preserved end-to-end.

## Trade-offs

| Pro | Con |
|-----|-----|
| Visibility — full event stream rendered with Pi components | Each iteration is a fresh Pi process (cold start: extension reload, session reload, model client init) |
| Each iteration can use a different model/thinking level (set per RPC subprocess) | No shared in-memory state between iterations |
| Iteration boundary is a hard process boundary — no context bleed | Each iteration gets its own session JSONL (typically `~/.pi/agent/sessions/subagents/`), separate from parent |
| Pause/abort via OS signals (clean): `proc.kill("SIGSTOP")`, `SIGCONT`, `SIGTERM` | ~1300 LOC for the full pattern (`ralph-loop-pi`); RPC plumbing, child cleanup, signal handling, response correlation |
| Cross-iteration steering via RPC commands (`{type:"steer"}`, `{type:"follow_up"}`) | Harder to compose with other extensions in the parent — the parent doesn't see the child's `agent_end` etc. on its own bus |
| Subagents can use child Pi's full feature set (extensions, MCP, OAuth, compaction) | Each child loads its own extension stack — can be slow to start; can be controlled via `--extension <path>` to pin a minimal set |

## Pi-mono ships a reference implementation

`packages/coding-agent/examples/extensions/subagent/` is the canonical example: spawns `pi --mode rpc`, listens for events, renders the child's messages back inside a tool result. Single-shot subagent, not a loop, but the rendering pattern is identical.

## Extension UI sub-protocol — bonus

When the child needs to interact with the user (e.g., `ctx.ui.confirm()`), it emits `extension_ui_request` events with a unique `id`. The parent client must respond with matching `extension_ui_response` on the child's stdin. Methods supported: `select`, `confirm`, `input`, `editor` (dialog, blocks until response); `notify`, `setStatus`, `setWidget`, `setTitle`, `set_editor_text` (fire-and-forget).

This means an extension running inside a subagent can prompt the human via the parent — the parent extension surfaces the prompt in its own TUI and forwards the response down. See `packages/coding-agent/examples/rpc-extension-ui.ts` for a worked example.

## When NOT to use this pattern

- If iterations should share **the same context window**, use the in-session pattern (`pi.sendMessage({triggerTurn:true})`) instead. See [ecosystem/loop-extensions](../ecosystem/loop-extensions.md) Variant A and `kostyay/agent-stuff/loop.ts`.
- If you need **lots** of iterations (>50), the cold-start cost adds up. Each iteration pays for extension load, session init, model client setup. In-session pattern is faster.
- If the loop's whole point is **preserving learned context** across iterations (DACMICU's central thesis), subprocess defeats it — every iteration starts with no memory of the prior one.

For *DACMICU specifically*, the in-session pattern is the better fit because it preserves the single-context-window property. Subprocess + RPC is the better fit for **Ralph-style autonomous campaigns** where each iteration should be a clean slate (fresh context, fresh chance, results checked via external state files).

## Cross-references

### pi-mono wiki
- [loop-internals](loop-internals.md) — Pi's run modes (interactive/print/rpc/json) and `runLoop()` mechanics
- [component-flow](component-flow.md) — keystroke-to-loop component diagram
- [ecosystem/loop-extensions](../ecosystem/loop-extensions.md) — Ralph extensions; categorizes which use this pattern
- [ecosystem/subagents](../ecosystem/subagents.md) — broader subagent landscape
- [dacmicu/concept](../dacmicu/concept.md) — DACMICU and the visibility property
- [dacmicu/pi-port](../dacmicu/pi-port.md) — port architecture (in-session is preferred for DACMICU; subprocess pattern documented here as the alternative)
- [dacmicu/implementation-plan](../dacmicu/implementation-plan.md) — concrete build plan
