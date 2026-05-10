---
title: pi-callback — Lightweight Bash Callback via Unix Socket
type: implementation
updated: 2026-05-10
sources:
  - "../../packages/coding-agent/src/modes/rpc/rpc-client.ts"
  - "../../packages/coding-agent/src/modes/rpc/rpc-types.ts"
  - "../../packages/coding-agent/src/core/extensions/types.ts"
  - "../../packages/coding-agent/src/core/agent-session.ts"
  - "../../examples/extensions/pi-evolve.ts"
  - "../../examples/extensions/subagent/index.ts"
  - https://github.com/anomalyco/opencode/pull/20074
tags: [extension, callback, bash, unix-socket, dacmicu, fabric, implementation]
see_also:
  - "../dacmicu/concept.md"
  - "../dacmicu/modular-architecture.md"
  - "../dacmicu/spirit-vs-opencode.md"
  - "../dacmicu/implementation-plan.md"
  - "../dacmicu/pi-port.md"
  - "pi-evolve-extension.md"
  - "../architecture/pi-print-rpc-vs-oc-check.md"
  - "../concepts/deterministic-agent-control-mechanisms.md"
  - "../concepts/pi-extension-primitive-mapping.md"
  - "../dacmicu/archive/research-2026-05-10-deep-implementation-review.md"
---

# pi-callback — Lightweight Bash Callback via Unix Socket

> **CRITICAL FIX (2026-05-10):** The original design's `wait:true` mode deadlocked by design. When bash runs inside an agent stream, calling `pi.sendMessage({triggerTurn:true, deliverAs:"followUp"})` queues via `agent.followUp()` — which only processes after the stream ends. The stream won't end until bash returns; bash won't return until the callback responds. Deadlock. This page documents the **corrected design**: `wait:true` spawns an independent subagent; `wait:false` is fire-and-forget only. See [deep review § CRITICAL-1](../dacmicu/archive/research-2026-05-10-deep-implementation-review.md) for the full trace.

A design for giving Pi bash-callback capability similar to opencode's `oc check`, built on Pi's existing extension + subprocess mechanisms — no core changes, no HTTP server.

**Status:** Design for `@pi-dacmicu/fabric`. Independent of the in-session loop primitive — see [concept § Correction](../dacmicu/concept.md). Build on its own track.

## Two modes, different implementations

The original design conflated two use cases into one socket primitive. They require different architectures:

| Mode | Semantics | Implementation | Use case |
|---|---|---|---|
| **Fire-and-forget** (`wait:false`) | Queue a message in the parent session; return immediately. | Socket server → `pi.sendMessage({...}, {triggerTurn:false})` | "Remind me to check X", "Log this result" |
| **Wait for result** (`wait:true`) | Run a subagent, capture its final output, return it synchronously to bash. | Socket server → spawn subagent (in-process via `createAgentSession` or subprocess via `pi --mode json`) | Pipeline composition: `result=$(pi-callback --wait "is this correct?")` |

**Do not use `wait:true` with `pi.sendMessage({triggerTurn:true})` in the parent session.** That path deadlocks. The subagent path is the only correct synchronous implementation.

## Why opencode's `oc check` works (and ours didn't)

opencode's `oc check` spawns a **child session** — a new process with its own agent loop. The bash parent blocks on the child process, but the main opencode process is NOT blocked — it's the parent of the bash, which is the parent of the child. The child runs independently, produces text, exits. Bash captures the text and returns. No cycle.

Pi's corrected equivalent: the socket handler spawns a subagent (child session) rather than queueing a turn in the parent. Same independence, same result.

## Architecture (corrected)

```
┌─────────────────────────────────────────────────────────────────┐
│  Interactive Pi Session (parent)                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  pi-callback extension                                  │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │  Unix socket server                               │   │   │
│  │  │  /tmp/pi-callback-<pid>.sock                      │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │     ↑ reads JSON line                                  │   │
│  │     ↓ MODE DISPATCH                                    │   │
│  │     ┌─────────────┐   ┌─────────────────────────┐    │   │
│  │     │ wait:false  │   │ wait:true               │    │   │
│  │     │ sendMessage │   │ spawn subagent          │    │   │
│  │     │ (no turn)   │   │ (independent context)   │    │   │
│  │     └─────────────┘   └─────────────────────────┘    │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │  bash tool interceptor                          │   │   │
│  │  │  mutates event.input.command                    │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↑
                              │ connect
┌─────────────────────────────────────────────────────────────────┐
│  Bash script (LLM-written) inside parent session                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  pi-callback CLI (~50 LOC)                              │   │
│  │  reads $PI_CALLBACK_SOCKET → connects → sends JSON      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Protocol

Socket messages are JSON lines (newline-delimited):

**Request (bash → parent):**
```json
{"type": "prompt", "message": "is src/index.ts buggy?", "wait": true}
```

**Response (parent → bash):**
```json
{"type": "response", "success": true, "text": "Yes, line 42 has a null pointer bug."}
```

**Error response:**
```json
{"type": "response", "success": false, "error": "Subagent failed: timeout"}
```

## Extension Sketch (~200 LOC, corrected)

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { createServer, type Server, type Socket } from "node:net";
import { unlinkSync } from "node:fs";

export default function (pi: ExtensionAPI) {
  const socketPath = `/tmp/pi-callback-${process.pid}.sock`;
  let server: Server | null = null;

  try { unlinkSync(socketPath); } catch {}
  server = createServer((socket) => {
    let buffer = "";
    socket.on("data", (data) => {
      buffer += data.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const req = JSON.parse(line);
          handleRequest(req, socket);
        } catch {
          socket.write(JSON.stringify({ type: "response", success: false, error: "Invalid JSON" }) + "\n");
        }
      }
    });
  });
  server.listen(socketPath);

  // Inject callback socket into bash commands
  pi.on("tool_call", async (event) => {
    if (event.toolName !== "bash") return;
    const cmd = event.input.command as string;
    if (cmd.includes("PI_CALLBACK_SOCKET")) return; // already set
    event.input.command = `export PI_CALLBACK_SOCKET="${socketPath}"; ${cmd}`;
  });

  async function handleRequest(req: any, socket: Socket) {
    const id = req.id || crypto.randomUUID();
    switch (req.type) {
      case "prompt":
        if (req.wait) {
          // MODE 2: Spawn subagent, capture result
          try {
            const result = await runSubagent(req.message, req.timeout || 60000);
            socket.write(JSON.stringify({ type: "response", success: true, text: result, id }) + "\n");
          } catch (e) {
            socket.write(JSON.stringify({ type: "response", success: false, error: String(e), id }) + "\n");
          }
        } else {
          // MODE 1: Fire-and-forget, queue message only
          pi.sendMessage(
            {
              customType: "callback_prompt",
              content: [{ type: "text", text: req.message }],
              display: false,
            },
            { triggerTurn: false } // ← NO turn trigger. Queues only.
          );
          socket.write(JSON.stringify({ type: "response", success: true, id }) + "\n");
        }
        break;
      case "tool":
        try {
          const result = await pi.exec(req.command, req.args || []);
          socket.write(JSON.stringify({ type: "response", success: true, stdout: result.stdout, stderr: result.stderr, code: result.code, id }) + "\n");
        } catch (e) {
          socket.write(JSON.stringify({ type: "response", success: false, error: String(e), id }) + "\n");
        }
        break;
    }
  }

  // Subagent spawning: in-process preferred, subprocess fallback
  async function runSubagent(prompt: string, timeoutMs: number): Promise<string> {
    // Preferred: in-process subagent via createAgentSession (if available)
    // Fallback: subprocess via pi --mode json -p --no-session
    const subagent = await createAgentSession({ /* ... */ });
    // ... run to completion, capture final assistant message ...
    return "subagent result text";
  }

  pi.on("session_shutdown", () => {
    server?.close();
    try { unlinkSync(socketPath); } catch {}
  });
}
```

**Key correction from original design:**
- `wait:false` uses `{triggerTurn:false}` — no turn trigger, just queues the message.
- `wait:true` spawns a subagent — never calls `sendMessage({triggerTurn:true})` from inside a running stream.
- Removed `message_end` FIFO matching — subagent result is captured from the subagent's completion, not from parent session messages.

## Env injection mechanism

The only available primitive for env injection is the `tool_call` event mutation:

```typescript
pi.on("tool_call", async (event) => {
  if (event.toolName !== "bash") return;
  const cmd = event.input.command as string;
  if (cmd.includes("PI_CALLBACK_SOCKET")) return;
  event.input.command = `export PI_CALLBACK_SOCKET="${socketPath}"; ${cmd}`;
});
```

`event.input` is mutable (verified: `extensions.md` documents this). Mutations affect the actual command executed by the bash tool.

**`pi.wrapTool` does not exist as a public API** (verified: `core/tools/tool-definition-wrapper.ts` is internal-only). The `tool_call` event mutation is the only working mechanism.

## Comparison to opencode `oc`

| Property | opencode `oc` | Pi `pi-callback` (corrected) |
|----------|--------------|-----------------------------|
| **Transport** | HTTP POST to `/session/:id/exec` | Unix domain socket |
| **Latency** | ~5-40ms | ~1-5ms (fire-and-forget); ~seconds (wait+subagent) |
| **Server** | Full HTTP server (Hono) | Node.js `net.createServer` |
| **Env injection** | Auto-injected (`OPENCODE_*`) | `tool_call` event mutation |
| **`wait:true`** | Spawns child session (correct) | Spawns subagent (correct) |
| **TUI visibility** | `metadata.oc` ToolParts | Fire-and-forget: invisible; Wait: subagent in separate context |
| **Direct tools** | `/session/:id/tool` endpoint | `pi.exec()` via socket |
| **Size** | ~2,000 LOC | ~200 LOC (extension + CLI) |

## Comparison to `pi --mode json -p --no-session` from bash

| | `pi --mode json` subprocess | `pi-callback` fire-and-forget | `pi-callback` wait |
|---|---|---|---|
| **Latency** | Seconds (spawn, init) | ~1-5ms | Seconds (subagent spawn) |
| **Session** | New session (no history) | Same session (queued message) | New session (subagent) |
| **State** | Lost between calls | Preserved in parent session | Preserved in subagent session |
| **Visibility** | Invisible to parent TUI | Invisible (queued, no turn) | Subagent visible if Pi has subagent UI |
| **Compaction** | Independent | Shared with parent | Independent |
| **Use case** | One-off queries | Queue reminders/logs | Pipeline composition |

## Open Questions (revised)

1. **Subagent spawning API**: Does `createAgentSession` expose everything needed? If not, use `pi --mode json -p --no-session` subprocess fallback.
2. **Subagent result capture**: For in-process subagent, subscribe to `session.subscribe()` events and collect `message_end` + `tool_result_end`. For subprocess, parse JSONL stdout.
3. **Nested callbacks**: A `wait:true` callback that itself runs bash calling `pi-callback` is safe because each subagent is independent. No deadlock.
4. **Multiple concurrent callbacks**: The socket handles request/response correlation via `id`. Parallel `wait:true` calls spawn parallel subagents. Pi core handles concurrency.

## Integration with pi-evolve design sketch

With `pi-callback --wait`, the evolve benchmark script could be:

```bash
#!/usr/bin/env bash
set -euo pipefail

START=$(date +%s%N)
npm test > /dev/null
END=$(date +%s%N)

METRIC=$(( (END - START) / 1000000 ))
VERDICT=$(pi-callback --wait "Test runtime: ${METRIC}ms. Best so far: ${BEST_MS}. Keep or discard?")

echo "METRIC test_runtime_ms $METRIC"
echo "VERDICT $VERDICT"
```

The subagent spawned by `--wait` has a clean context. It sees the prompt, accesses the project files, and returns a verdict — all without polluting the parent's message history.

## Cross-references

- [dacmicu/spirit-vs-opencode](../dacmicu/spirit-vs-opencode.md) — Spirit gap this closes
- [dacmicu/concept](../dacmicu/concept.md) — FABRIC-not-prereq correction
- [architecture/pi-print-rpc-vs-oc-check](../architecture/pi-print-rpc-vs-oc-check.md) — Comparison this addresses
- [concepts/deterministic-agent-control-mechanisms](../concepts/deterministic-agent-control-mechanisms.md) — M1 mechanism
- [dacmicu/archive/research-2026-05-10-deep-implementation-review.md](../dacmicu/archive/research-2026-05-10-deep-implementation-review.md) — Full deadlock trace

## Lifecycle edge cases

- **Stale socket on crash.** `unlinkSync(socketPath)` before `listen` clears leftovers.
- **Multiple Pi instances.** Per-pid socket name prevents collision.
- **Cleanup on normal exit.** `process.on("exit")` and `SIGINT` remove socket file.
- **Session switch / fork within same process.** Socket lives at process level, not session level. Correct scoping.
- **Subagents.** A Pi-spawned subagent is a separate process with its own pid → its own socket. Bash inside the subagent talks to the subagent, not the parent. Correct scoping.
- **Reentrancy.** Fire-and-forget mode queues messages serially. Wait mode spawns independent subagents. No queue contention.
- **Abort semantics.** `wait:true` subagent respects `AbortSignal` from the socket timeout. Returns clean error to CLI.
