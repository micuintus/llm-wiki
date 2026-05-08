---
title: Pi --print vs --mode rpc vs opencode `oc check` — Headless Deterministic Control
type: synthesis
updated: 2026-05-07
see_also:
  - "../dacmicu/concept.md"
  - "../dacmicu/spirit-vs-opencode.md"
  - "../dacmicu/implementation-plan.md"
  - "../implementations/pi-callback-extension.md"
  - "subprocess-rpc-rendering.md"
  - "../concepts/deterministic-agent-control-mechanisms.md"
sources:
  - "../../packages/coding-agent/src/modes/print-mode.ts"
  - "../../packages/coding-agent/src/modes/rpc/rpc-mode.ts"
  - "../../packages/coding-agent/src/modes/rpc/rpc-types.ts"
  - "../../packages/coding-agent/src/modes/rpc/rpc-client.ts"
  - https://github.com/anomalyco/opencode/issues/20018
  - https://github.com/anomalyco/opencode/pull/20074
  - "../../llm-wiki/concepts/deterministic-agent-control-mechanisms.md"
tags: [architecture, rpc, print-mode, headless, deterministic-control, opencode, comparison]
---

# Pi `--print` vs `--mode rpc` vs opencode `oc check`

Comparison of three approaches to headless / non-interactive deterministic agent control. The core question: **how do you run an agent loop when there's no TUI, and how do you let bash scripts call back into the agent for judgment?**

## TL;DR

| Aspect | `pi --print` | `pi --mode rpc` | opencode `oc check` |
|--------|-------------|-----------------|---------------------|
| **Process lifetime** | Single-shot, exits after result | Persistent, runs until killed | Persistent (server), bash is ephemeral |
| **Turns** | Exactly one turn per invocation | Unlimited via `prompt`/`steer`/`follow_up` commands | Single turn per `oc check` call |
| **Session persistence** | ❌ None (unless `--session` saved) | ✅ Full session tree | ✅ Full session tree |
| **Extensions** | ✅ Load and run | ✅ Load and run | ✅ Plugin system |
| **Auto-loop (DACMICU)** | ❌ Impossible — process exits | ✅ `agent_end` → `sendMessage()` works | ✅ `oc check` + `followUp` schema |
| **Bash callback** | ❌ No callback | ❌ No callback | ✅ `oc` CLI POSTs to `/session/:id/exec` |
| **Fabric composition** | ❌ No pipes | ❌ No pipes | ✅ `cat file | oc agent ... | oc tool write ...` |
| **UI** | ❌ None | Emulated over RPC (select/confirm/input/notify/widget) | TUI + bash visibility |
| **Use case** | CI/CD, one-off tasks | Programmatic control, subagents | Full CLI orchestration, Unix pipes |

## Pi `--print` — Single-Shot Mode

```bash
pi -p "fix the bug in src/index.ts"
# → runs one turn, outputs result, exits
```

**Architecture** (`packages/coding-agent/src/modes/print-mode.ts`):

```
┌─────────────────────────────────────────┐
│  CLI parses args                        │
│     ↓                                   │
│  Create AgentSession + runtime          │
│     ↓                                   │
│  Bind extensions (no TUI)               │
│     ↓                                   │
│  session.prompt(initialMessage)         │
│  → agent runs one turn                  │
│     ↓                                   │
│  Output: text (default) or JSON events  │
│     ↓                                   │
│  Dispose runtime, exit process          │
└─────────────────────────────────────────┘
```

**Properties**:
- **One turn only**. After `session.prompt()` completes, the process outputs the result and exits.
- **No session tree** unless `--session path.jsonl` is provided (saves to disk, but process still exits).
- **Extensions load** but cannot auto-loop because `agent_end` fires → process exits. There's no next turn.
- **No UI**. `ctx.hasUI` is false. Extensions that try `ctx.ui.select()` or `ctx.ui.confirm()` get no-op or fallback behavior.
- **JSON mode**: `--mode json` outputs every AgentEvent as JSON lines, useful for programmatic parsing.

**Implications for deterministic control**:
- ❌ **DACMICU loops impossible**: `agent_end` → `sendMessage({triggerTurn:true})` fires, but the process is already shutting down.
- ❌ **No state persistence across invocations**: Each `pi -p` is a fresh session unless `--session` points to an existing file.
- ❌ **No bash callback**: Bash runs, outputs text, done.
- ✅ **Use case**: CI/CD pipelines, one-off code generation, batch processing where each item is independent.

**Workaround for multi-turn in print mode**: The caller (shell script) must orchestrate:
```bash
for file in $(find src -name "*.ts"); do
  result=$(pi -p "review $file")
  # script decides next step based on $result
  pi -p "fix issues: $result"
done
```
The **script** is the control flow, not the agent. This is the opposite of DACMICU.

---

## Pi `--mode rpc` — JSON-RPC Server

```typescript
// In a Node.js script
import { RpcClient } from "@mariozechner/pi-coding-agent/modes/rpc";

const client = new RpcClient({ cwd: "/my/project" });
await client.start();

await client.prompt("fix the bug");
// Events stream as JSON lines on stdout
// Response: { type: "response", command: "prompt", success: true }

await client.prompt("now test it");  // Second turn in same session
await client.shutdown();
```

**Architecture** (`packages/coding-agent/src/modes/rpc/rpc-mode.ts`):

```
┌─────────────────────────────────────────┐
│  Process starts, takes over stdout      │
│     ↓                                   │
│  Create AgentSession + runtime          │
│     ↓                                   │
│  Bind extensions (emulated UI)          │
│     ↓                                   │
│  Listen on stdin for JSON commands      │
│     ↓                                   │
│  Commands: prompt / steer / follow_up   │
│            abort / bash / compact       │
│            fork / clone / get_state     │
│            set_model / set_thinking...  │
│     ↓                                   │
│  Events stream as JSON on stdout        │
│     ↓                                   │
│  Process runs until stdin EOF or signal │
└─────────────────────────────────────────┘
```

**Properties**:
- **Persistent process**. Session survives across multiple `prompt` commands.
- **Full session tree**. `fork`, `clone`, `switch_session`, `navigateTree` all work.
- **Extensions load and run** including auto-loop extensions. `agent_end` → `sendMessage({triggerTurn:true})` **does work** because the process stays alive.
- **Emulated UI**. Extensions can call `ctx.ui.select()`, `ctx.ui.confirm()`, `ctx.ui.input()`, `ctx.ui.notify()`, `ctx.ui.setWidget()`, etc. These are serialized as JSON `extension_ui_request` on stdout; the client responds with `extension_ui_response` on stdin.
- **No TUI rendering**. Custom tool renderers (like pi-evolve's status widget) return components but there's no TUI to render them. The RPC client receives the raw events.

**Implications for deterministic control**:
- ✅ **DACMICU loops work**: `agent_end` → `sendMessage()` triggers follow-up turns. The loop extension stays loaded.
- ✅ **State persists**: `session_start`/`session_tree` rehydration works. `session_before_compact` preserves state.
- ❌ **No bash callback**: A bash tool running inside an RPC-mode agent cannot call back into the agent. There's no `pi` CLI injected into bash's environment.
- ❌ **No Fabric composition**: Cannot do `cat file | pi agent "review"` because no `pi` CLI exists.
- ✅ **Use case**: Programmatic control from another application, subagent spawning, long-running background agents, CI/CD that needs multi-turn reasoning.

**Key insight**: RPC mode gives you everything *except* the bash callback. The agent can loop, fork, compact, and persist — but bash is still "just bash." The control flow must be driven by the extension (TypeScript) or the RPC client, not by LLM-written bash scripts.

---

## opencode `oc check` — Bash Callback

```bash
# Inside an openCode bash tool, the LLM writes:
for file in $(find src -name "*.ts"); do
  if oc check "is $file buggy?"; then
    oc agent "fix $file"
  fi
done
```

**Architecture** (from PR #20074):

```
┌─────────────────────────────────────────┐
│  openCode server runs (HTTP on port)    │
│     ↓                                   │
│  Bash tool executes LLM-written script  │
│     ↓                                   │
│  Script calls `oc check "question?"`    │
│     ↓                                   │
│  `oc` CLI POSTs to /session/:id/exec    │
│     ↓                                   │
│  Server creates child session           │
│  → runs LLM on "question?"              │
│  → returns {result: boolean, text: "…"} │
│     ↓                                   │
│  Bash script continues based on result  │
│     ↓                                   │
│  (loop repeats, or script ends)         │
└─────────────────────────────────────────┘
```

**Properties**:
- **Bash is the control flow**. The LLM writes a bash script with loops, conditionals, pipes. Bash runs it deterministically.
- **Callback for judgment**. When bash needs LLM judgment, it calls `oc check` or `oc agent`. The callback creates a **child session** (isolated context), runs the LLM, returns the result.
- **Direct tool execution**. `oc tool read file.txt` bypasses the LLM entirely — just executes the tool directly via `/session/:id/tool` endpoint.
- **Env var injection**. `OPENCODE_SERVER_URL`, `OPENCODE_SESSION_ID`, `OPENCODE_MESSAGE_ID`, `OPENCODE_AGENT` are auto-injected into bash.
- **Timeout bypass**. Scripts containing `oc` commands disable the bash timeout (AST detection).
- **TUI visibility**. `oc` calls are rendered as ToolParts with `metadata.oc` so the user sees them inline.

**Implications for deterministic control**:
- ✅ **Full DACMICU**: Bash handles loops/conditionals; LLM handles judgment. The LLM writes the orchestration.
- ✅ **Fabric composition**: `cat file | oc agent "extract" | oc tool write out.txt` — Unix pipes with AI judgment.
- ✅ **Deterministic split**: `if oc check "..."; then ... fi` — bash conditional with LLM judgment.
- ✅ **Ralph loop**: `while ! oc check "done?"; do ... done` — bash loop with per-iteration LLM check.
- ✅ **Direct tools**: `oc tool read` bypasses LLM for pure tool calls (faster, cheaper).
- ✅ **Use case**: Full CLI orchestration, batch operations, map-reduce across codebases, complex multi-step workflows where bash is the scaffold and LLM is the judgment engine.

---

## Detailed Comparison

### Process Model

| | `pi --print` | `pi --mode rpc` | opencode `oc check` |
|---|---|---|---|
| **Lifetime** | Ephemeral (one turn) | Persistent (until killed) | Persistent server + ephemeral bash |
| **Entry point** | CLI args + stdin | JSON commands on stdin | LLM generates bash script |
| **Control flow** | Caller script (external) | RPC client (external) or extension (internal) | Bash script (internal, LLM-written) |
| **Context window** | One turn, then lost | Persistent across commands | Parent session + child sessions |

### Session & State

| | `pi --print` | `pi --mode rpc` | opencode `oc check` |
|---|---|---|---|
| **Session tree** | ❌ None (unless `--session`) | ✅ Full tree | ✅ Full tree |
| **Fork/clone** | ❌ | ✅ Via RPC commands | ✅ Via `oc` subcommands |
| **Compaction** | ❌ (one turn, no need) | ✅ Auto + manual | ✅ Auto |
| **State rehydration** | ❌ Fresh each invocation | ✅ `session_start`/`session_tree` | ✅ Session persistence |

### Loop & Callback

| | `pi --print` | `pi --mode rpc` | opencode `oc check` |
|---|---|---|---|
| **Auto-loop** | ❌ Impossible | ✅ `agent_end` → `sendMessage()` | ✅ `followUp` schema in `oc check` |
| **Bash callback** | ❌ | ❌ | ✅ `oc` CLI → HTTP POST |
| **Deterministic split** | ❌ | ❌ (no bash callback) | ✅ `if oc check; then … fi` |
| **Fabric pipes** | ❌ | ❌ | ✅ `… | oc agent … | oc tool …` |
| **Signal breakout** | ❌ | ✅ Extension tools | ✅ `oc check` boolean |

### UI & Visibility

| | `pi --print` | `pi --mode rpc` | opencode `oc check` |
|---|---|---|---|
| **TUI** | ❌ | ❌ | ✅ |
| **Tool rendering** | ❌ (text/JSON output only) | ❌ (raw events) | ✅ (`metadata.oc` ToolParts) |
| **Interactive prompts** | ❌ | Emulated (JSON request/response) | ✅ Native |
| **Widget/status** | ❌ | ❌ | ✅ |

### Extension Ecosystem

| | `pi --print` | `pi --mode rpc` | opencode `oc check` |
|---|---|---|---|
| **Extensions load** | ✅ | ✅ | ✅ (plugins) |
| **Auto-loop extensions** | ❌ Dead on `agent_end` | ✅ Full functionality | ✅ Via `followUp` |
| **Custom tools** | ✅ Work | ✅ Work | ✅ Work |
| **Custom renderers** | ❌ No TUI to render | ❌ No TUI to render | ✅ Renders in TUI |
| **State in `details`** | ✅ Branches correctly | ✅ Branches correctly | ⚠️ Plugin-dependent |

## Mapping to the Mechanism Taxonomy

From [concepts/deterministic-agent-control-mechanisms](../concepts/deterministic-agent-control-mechanisms.md):

| Mechanism | `--print` | `--mode rpc` | `oc check` |
|-----------|-----------|--------------|------------|
| M1 CLI Callback | ❌ | ❌ | ✅ `oc` CLI |
| M2 Auto-Loop | ❌ | ✅ | ✅ |
| M3 Subagent Spawn | ❌ | ✅ `fork()` | ✅ Child session |
| M4 State in Tool Results | ✅ (but lost on exit) | ✅ | ⚠️ |
| M5 Prompt Injection | ✅ (one turn only) | ✅ | ✅ |
| M6 Compaction-Aware | ❌ | ✅ | ✅ |
| M7 Direct Tool Execution | ❌ | ❌ | ✅ `/tool` endpoint |
| M8 Env Var Injection | ❌ | ❌ | ✅ Auto-inject |
| M9 Timeout Bypass | ❌ | ❌ | ✅ AST detect
| M10 Signal Breakout | ❌ | ✅ Extension tools | ✅ `oc check` boolean
| M11 RPC | ❌ | ✅ JSON-RPC over stdio | ✅ HTTP REST API
| M12 Custom Rendering | ❌ | ❌ | ✅ `metadata.oc` ToolParts
| M13 Event Bus | ✅ (loads) | ✅ (loads) | ⚠️ Plugin hooks
| M14 Git Checkpoint | ❌ | ✅ | ❌
| M15 Tool Override | ✅ (loads) | ✅ (loads) | ✅ Plugin
| M16 Session Tree | ❌ | ✅ First-class | ✅
| M17 Context Loading | ✅ `AGENTS.md` | ✅ `AGENTS.md` | ✅ `@refs`
| M18 Permission Gating | ✅ (loads) | ✅ (loads) | ✅ Role-based
| M19 Multi-Agent | ❌ | ✅ Extensions | ✅ Built-in
| M20 FABRIC Composition | ❌ | ❌ | ✅ `oc` pipes

---

## Architectural Implications

### The Fundamental Divide

The core difference is **where the control flow lives**:

| Approach | Control flow | Judgment | Composition |
|----------|-------------|----------|-------------|
| **pi --print** | External caller (shell script) | LLM (one turn) | Caller orchestrates |
| **pi --mode rpc** | External client (JSON-RPC) or internal extension | LLM (multi-turn) | Client or extension orchestrates |
| **opencode `oc check`** | Internal bash (LLM-written) | LLM (callback) | Bash pipes orchestrate |

**Pi print/RPC** = agent is the **orchestrated**. The caller (shell script or RPC client) decides when to prompt, what to prompt, and when to stop.

**opencode `oc check`** = agent is the **orchestrator**. The LLM writes bash that decides when to call back for judgment. Bash is the scaffold; LLM is the brain.

### Why This Matters for FABRIC

The FABRIC use case (`cat file | ai "extract wisdom" | ai "summarize"`) requires the agent to be callable from within bash pipes. This is impossible in Pi because:

1. No `pi` CLI exists inside bash
2. No HTTP endpoint exposes the agent
3. Bash cannot create new turns

In opencode, this works because:
1. `oc` CLI is injected into bash PATH
2. `oc agent "prompt"` POSTs to `/session/:id/exec`
3. The server creates a child session, runs the LLM, returns the result
4. Bash pipes the result to the next command

### What Pi RPC Mode Enables

Pi RPC mode is actually **more powerful** than opencode for certain patterns:

| Pattern | Pi RPC | opencode |
|---------|--------|----------|
| **Long-running background agent** | ✅ Spawn once, send prompts over hours | ⚠️ Requires server always running |
| **Multi-turn with full tree** | ✅ `fork`, `clone`, `navigateTree` | ✅ But via HTTP |
| **Extension auto-loops** | ✅ `agent_end` → `sendMessage()` | ✅ `followUp` schema |
| **Subagent with isolation** | ✅ `fork()` creates branched session | ✅ Child session |
| **Programmatic control** | ✅ Typed `RpcClient` API | ⚠️ Raw HTTP |
| **Custom compaction** | ✅ `session_before_compact` hook | ⚠️ Less extensible |

Pi RPC is better for **application embedding** — a Node.js app that wants to use Pi as a library. Opencode is better for **CLI orchestration** — the LLM writing bash scripts that compose agent capabilities.

### Correction: Bash CAN Call Pi RPC

Bash can spawn `pi --mode rpc`:

```bash
# From bash inside a Pi session (or anywhere)
pi --mode rpc --session /tmp/sub.jsonl << 'EOF'
{"type":"prompt","message":"review this file"}
EOF
```

This works. It creates a **new Pi process** with a **new session**. The bash script receives JSON events on stdout and can parse the result.

**But this is not a callback into the same session.** The key distinction:

| Aspect | `pi --mode rpc` from bash | opencode `oc check` |
|--------|---------------------------|---------------------|
| **Target** | New process + new session | Same server, same or child session |
| **Latency** | Seconds (process spawn, init, bind) | ~40ms (`oc` binary) or ~5ms (curl fast path) |
| **Context** | Fresh session (no history) | Access to parent session context |
| **State** | Independent | Linked to parent session tree |
| **Visibility** | Invisible to parent TUI | Rendered inline as ToolParts |

So bash CAN orchestrate Pi, but it's **heavyweight subprocess spawning**, not **lightweight callback**. Each `oc check` in opencode is a single HTTP POST. Each Pi RPC invocation from bash is a full process lifecycle.

### The Real Gap: No Callback into Current Session

The gap is not "bash can't call Pi." The gap is **"bash can't call back into the CURRENT session."**

When the LLM writes:
```bash
for file in *.ts; do
  if pi-check "is $file buggy?"; then   # ← hypothetical
    pi-fix "$file"
  fi
done
```

The hypothetical `pi-check` would need to:
1. Know the current session ID
2. Send a message to the running Pi process (not spawn a new one)
3. Wait for the agent to complete a turn
4. Return the result to bash
5. Have the result visible in the parent TUI

This requires:
- An IPC mechanism (HTTP server, Unix socket, or named pipe) exposed by the running Pi process
- A lightweight CLI (`pi-check`) that talks to this IPC endpoint
- Env vars injected into bash so the CLI knows where to connect

This is what opencode built with `oc` + `/session/:id/exec`.

### Path to Closing the Gap

**Option A: Extension-based IPC** (~500-800 LOC)
- Extension starts HTTP server on localhost
- Injects `PI_SERVER_URL` and `PI_SESSION_ID` into bash env
- Provides `pi-callback` CLI that POSTs to `localhost:PORT/session/:id/exec`
- Bash scripts use `pi-callback` for lightweight callbacks

**Option B: Native Pi daemon** (core change)
- Pi runs as persistent daemon with Unix socket
- `pi` CLI talks to daemon instead of spawning new process
- Bash inherits socket path via env var
- This is how opencode works (server always running)

**Option C: Accept the subprocess model**
- Use `pi --mode rpc` from bash for orchestration
- Accept the latency cost (seconds per call)
- Use `--session` to persist state across invocations
- This works today, no changes needed

### Which Pattern Fits Which Use Case

| Use case | Best approach |
|----------|--------------|
| One-off CI task | `pi --print` |
| Multi-turn script (external orchestrator) | `pi --mode rpc` via Node.js/Python client |
| Batch processing with per-file judgment | `pi --mode rpc` from bash (subprocess model) |
| Real-time FABRIC pipes (`cat x | ai "y" | z`) | opencode `oc` (lightweight callback) |
| Long-running background agent | `pi --mode rpc` persistent process |
| Interactive evolve loop | `pi` interactive + extension (`pi-evolve`) |

### Summary

- **Bash CAN call Pi** via `pi --mode rpc` (subprocess, new session)
- **Bash CANNOT call back into the current session** without IPC infrastructure
- **opencode `oc`** provides lightweight callback into the same session (~5-40ms)
- **Pi RPC** provides full programmatic control but requires external orchestration
- **The gap is callback latency and session continuity**, not capability

## Cross-references

- [dacmicu/spirit-vs-opencode](../dacmicu/spirit-vs-opencode.md) — Why this comparison matters: substrate vs spirit
- [implementations/pi-callback-extension](../implementations/pi-callback-extension.md) — Proposed Unix-socket callback extension that closes the FABRIC gap (~200 LOC, no core changes)
- [concepts/deterministic-agent-control-mechanisms](../concepts/deterministic-agent-control-mechanisms.md) — Full 20-mechanism taxonomy
- [concepts/pi-extension-primitive-mapping](../concepts/pi-extension-primitive-mapping.md) — Bidirectional system↔hook mapping
- [dacmicu/implementation-plan](../dacmicu/implementation-plan.md) — DACMICU build plan for Pi
- [ecosystem/loop-extensions](../ecosystem/loop-extensions.md) — Loop extension survey
- [ecosystem/evolve-systems](../ecosystem/evolve-systems.md) — Evolve system survey

## Why `--print` is named `--print`

The flag describes **I/O behavior** (print result to stdout, exit), not lifecycle. Convention from Claude Code; matches across the agent CLI ecosystem so users moving between agents do not relearn.

| Mode | What it prints |
|------|----------------|
| `pi` | Nothing to stdout — opens TUI |
| `pi --print "..."` | Assistant's text reply, then exits |
| `pi --mode json` | Structured JSON event stream |
| `pi --mode rpc` | JSON-RPC frames over stdio (not for humans) |

`--headless`, `--once`, `--non-interactive` would all be defensible alternatives. `--print` won by precedent. Source: `packages/coding-agent/src/cli/args.ts` (`--print, -p` documented as "Non-interactive mode: process prompt and exit").

## RPC mode is the substrate for deep subagents

`pi --mode rpc` is *already* the substrate Pi uses for subagents: `packages/coding-agent/src/modes/rpc/rpc-client.ts` is the parent-side client that spawns child agents via `spawn pi --mode rpc` and talks JSON-RPC over stdio.

Properties for deep / nested / recursive subagents:

- Persistent process per subagent; full session tree, fork/compact/rehydrate.
- Structured event stream re-renderable with Pi's exported TUI components.
- Composable depth: a subagent is itself a Pi process; can spawn its own.
- Lifecycle control via stdio (no HTTP, no port allocation, no cleanup races).
- No core surgery to add new subagent flavors.

Caveats: visibility cost (events have to be re-rendered — see [subprocess-rpc-rendering](subprocess-rpc-rendering.md)); context isolation (opposite of DACMICU single-context spirit — choose mode per task); protocol surface area (keep small to avoid calcifying).

## Reverse-RPC: the same protocol powers the bash callback

[pi-callback-extension](../implementations/pi-callback-extension.md) reuses the JSON-line subagent RPC protocol **in reverse direction**: instead of parent spawning a child and writing to its stdin, the parent extension opens a Unix socket and the child (bash-spawned `pi-callback` CLI) connects to it and writes the same JSON-line frames.

This is why the callback design is so cheap (~150 LOC extension + ~50 LOC CLI): the wire format is already defined and battle-tested by the subagent system. Opening the RPC gate in TUI mode does not invent a new protocol; it just exposes an existing one.


