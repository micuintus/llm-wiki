---
title: pi-callback — Lightweight Bash Callback via Unix Socket
type: implementation
updated: 2026-05-08
sources:
  - "../../packages/coding-agent/src/modes/rpc/rpc-client.ts"
  - "../../packages/coding-agent/src/modes/rpc/rpc-types.ts"
  - "../../packages/coding-agent/src/core/extensions/types.ts"
  - "../../examples/extensions/pi-evolve.ts"
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
---

# pi-callback — Lightweight Bash Callback via Unix Socket

A design for giving Pi the same bash-callback capability as opencode's `oc check`, but built entirely on Pi's existing extension + RPC mechanisms — no core changes, no HTTP server.

**Status (2026-05-08):** This is the design for the `@pi-dacmicu/fabric` package in the modular DACMICU monorepo (see [modular-architecture](../dacmicu/modular-architecture.md)). It is **independent of the in-session loop primitive** — see the FABRIC-not-prereq Correction in [concept](../dacmicu/concept.md). Build it on its own track when shell-composition use cases demand it; do not gate the DACMICU base + todo + evolve packages on it.

## The Insight

Pi already has `RpcClient` which spawns `pi --mode rpc` as a subprocess and talks JSON-RPC over stdio. We can use the **same protocol in reverse**: the parent session (interactive Pi) exposes a Unix socket, and a lightweight `pi-callback` CLI connects to it.

This mirrors how Pi subagents work, but in the opposite direction: instead of the parent spawning a child RPC process, the child (bash) calls back to the parent via socket.

## Architecture

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
│  │     ↓ calls pi.sendMessage({triggerTurn:true})         │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │  bash tool interceptor                          │   │   │
│  │  │  injects PI_CALLBACK_SOCKET into bash env       │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│     ↓                                                           │
│  Agent turns (normal Pi flow)                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↑
                              │ connect
┌─────────────────────────────────────────────────────────────────┐
│  Bash script (LLM-written) inside parent session                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  pi-callback CLI (~50 LOC)                              │   │
│  │  reads $PI_CALLBACK_SOCKET → connects → sends JSON      │   │
│  │  { type: "prompt", message: "...", wait: true }         │   │
│  │  → receives response over same socket                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│     ↓                                                           │
│  for file in *.ts; do                                           │
│    result=$(pi-callback "is $file buggy?")                      │
│    [ "$result" = "true" ] && pi-callback "fix $file"            │
│  done                                                           │
└─────────────────────────────────────────────────────────────────┘
```

## Why This Works

| Property | How it's achieved |
|----------|-------------------|
| **No core changes** | Pure extension + standalone CLI binary |
| **No HTTP server** | Unix domain socket (Node.js `net.createServer`) |
| **Low latency** | ~1-5ms (local socket, no TCP, no spawn) |
| **Session continuity** | `pi.sendMessage()` triggers turn in same session |
| **Visibility** | Callback appears as a `followUp` message in TUI |
| **State preservation** | Uses existing `session_before_compact` + `details` |
| **Mirrors subagent pattern** | Same JSON-RPC style, reverse direction |

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
{"type": "response", "success": false, "error": "Agent aborted"}
```

When `wait: true`, the server waits for the agent turn to complete and sends the assistant's text back. When `wait: false`, it returns immediately after queueing the message.

## Extension Sketch (~150 LOC)

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createServer, type Server, type Socket } from "node:net";
import { unlinkSync } from "node:fs";

export default function (pi: ExtensionAPI) {
  const socketPath = `/tmp/pi-callback-${process.pid}.sock`;
  let server: Server | null = null;
  let pending = new Map<string, { resolve: (text: string) => void; reject: (err: string) => void }>();

  // Start Unix socket server
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

  // Inject callback socket into bash env
  pi.on("tool_call", async (event) => {
    if (event.toolName === "bash") {
      const cmd = event.input.command as string;
      // Don't double-inject
      if (!cmd.includes("PI_CALLBACK_SOCKET")) {
        event.input.command = `export PI_CALLBACK_SOCKET="${socketPath}"; ${cmd}`;
      }
    }
  });

  // Capture assistant responses for pending callbacks
  pi.on("message_end", async (event) => {
    if (event.message.role !== "assistant") return;
    const text = event.message.content
      .filter((c): c is { type: "text"; text: string } => c.type === "text")
      .map((c) => c.text)
      .join("");
    // Match to pending request (simplistic: FIFO for now)
    const [id, resolver] = pending.entries().next().value || [];
    if (resolver) {
      pending.delete(id);
      resolver.resolve(text);
    }
  });

  async function handleRequest(req: any, socket: Socket) {
    const id = req.id || crypto.randomUUID();
    switch (req.type) {
      case "prompt":
        pi.sendMessage(
          {
            customType: "callback_prompt",
            content: [{ type: "text", text: req.message }],
            display: false,
          },
          { triggerTurn: true, deliverAs: "followUp" }
        );
        if (req.wait) {
          const text = await new Promise<string>((resolve, reject) => {
            pending.set(id, { resolve, reject });
            setTimeout(() => {
              pending.delete(id);
              reject("timeout");
            }, 60000);
          });
          socket.write(JSON.stringify({ type: "response", success: true, text, id }) + "\n");
        } else {
          socket.write(JSON.stringify({ type: "response", success: true, id }) + "\n");
        }
        break;
      case "tool":
        // Direct tool execution: pi.exec equivalent
        try {
          const result = await pi.exec(req.command, req.args || []);
          socket.write(JSON.stringify({ type: "response", success: true, stdout: result.stdout, stderr: result.stderr, code: result.code, id }) + "\n");
        } catch (e) {
          socket.write(JSON.stringify({ type: "response", success: false, error: String(e), id }) + "\n");
        }
        break;
    }
  }

  // Cleanup on shutdown
  pi.on("session_shutdown", () => {
    server?.close();
    try { unlinkSync(socketPath); } catch {}
  });
}
```

## CLI Sketch (~50 LOC)

```typescript
#!/usr/bin/env tsx
import { createConnection } from "node:net";

const socketPath = process.env.PI_CALLBACK_SOCKET;
if (!socketPath) {
  console.error("pi-callback: PI_CALLBACK_SOCKET not set — are you running inside a Pi bash tool?");
  process.exit(1);
}

const type = process.argv[2] || "prompt"; // "prompt" or "tool"
const message = process.argv.slice(3).join(" ");

const client = createConnection(socketPath);
const id = crypto.randomUUID();

client.write(JSON.stringify({ type, message, id, wait: true }) + "\n");

let buffer = "";
client.on("data", (data) => {
  buffer += data.toString();
  const lines = buffer.split("\n");
  buffer = lines.pop() || "";
  for (const line of lines) {
    if (!line.trim()) continue;
    const res = JSON.parse(line);
    if (res.id === id) {
      if (res.success) {
        console.log(res.text || res.stdout || "");
        client.end();
      } else {
        console.error(res.error);
        client.end();
        process.exit(1);
      }
    }
  }
});
```

Usage from bash:
```bash
for file in *.ts; do
  if [ "$(pi-callback prompt "is $file buggy?")" = "yes" ]; then
    pi-callback prompt "fix $file"
  fi
done
```

## Comparison to opencode `oc`

| Property | opencode `oc` | Pi `pi-callback` (proposed) |
|----------|--------------|----------------------------|
| **Transport** | HTTP POST to `/session/:id/exec` | Unix domain socket |
| **Latency** | ~5-40ms | ~1-5ms |
| **Server** | Full HTTP server (Hono) | Node.js `net.createServer` |
| **Env injection** | Auto-injected (`OPENCODE_*`) | Injected via `tool_call` hook |
| **Timeout bypass** | AST detection of `oc` commands | Can implement same pattern |
| **TUI visibility** | `metadata.oc` ToolParts | Appears as followUp message |
| **Direct tools** | `/session/:id/tool` endpoint | `pi.exec()` via socket |
| **Child sessions** | `/exec` creates child session | Runs in same session (or could fork) |
| **Size** | ~2,000 LOC (shell + binary + endpoints) | ~200 LOC (extension + CLI) |

## Why This Is Better Than HTTP

1. **No dependency**: Unix sockets are built into Node.js. No HTTP framework, no routing, no middleware.
2. **Faster**: No TCP handshake, no HTTP parsing. Just JSON over a pipe.
3. **Simpler protocol**: No status codes, no headers. Just request/response JSON lines.
4. **Security**: Socket is only accessible to the same user. No open port.
5. **Cleanup**: Socket file auto-deleted on shutdown.

## Why This Is Better Than `pi --mode rpc` from Bash

| | `pi --mode rpc` from bash | `pi-callback` |
|---|---|---|
| **Latency** | Seconds (spawn, init, bind) | ~1-5ms |
| **Session** | New session (no history) | Same session |
| **State** | Lost between calls | Preserved |
| **Visibility** | Invisible to parent TUI | Visible as followUp |
| **Compaction** | Independent | Shared |

## Open Questions

1. **Multiple concurrent callbacks**: If bash runs `pi-callback` in parallel (e.g., `xargs -P`), the socket needs request/response correlation (the `id` field above handles this).
2. **Timeout handling**: What if the agent is already streaming? The `followUp` message will queue. Need timeout for `wait: true`.
3. **Response extraction**: The `message_end` hook captures the full assistant message. For structured responses, the agent might need to emit JSON.
4. **Tool execution**: Should `pi-callback tool read file.txt` bypass the LLM (direct `pi.exec()`) or go through the agent? The sketch supports both via `type: "tool"`.
5. **Nested callbacks**: If the agent's response triggers another bash tool that calls `pi-callback`, we need to prevent deadlocks.

## Integration with pi-evolve design sketch

With `pi-callback`, the evolve benchmark script (from the [pi-evolve draft](../implementations/pi-evolve-extension.md)) could be:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Run benchmark
START=$(date +%s%N)
npm test > /dev/null
END=$(date +%s%N)

# Ask agent to judge if this is worth keeping
METRIC=$(( (END - START) / 1000000 ))
VERDICT=$(pi-callback prompt "Test runtime: ${METRIC}ms. Best so far: $(pi-callback prompt 'what is best?'). Keep or discard?")

echo "METRIC test_runtime_ms $METRIC"
echo "VERDICT $VERDICT"
```

The agent sees the callback as a followUp, can access the full session history, and responds with the verdict — all in the same session.

## Cross-references

- [dacmicu/spirit-vs-opencode](../dacmicu/spirit-vs-opencode.md) — Why this extension exists: closes the *mid-step recursive judgment* spirit gap
- [dacmicu/concept](../dacmicu/concept.md) — FABRIC-not-prereq correction; this extension serves FABRIC, not DACMICU itself
- [architecture/pi-print-rpc-vs-oc-check](../architecture/pi-print-rpc-vs-oc-check.md) — The comparison this design addresses; reverse-RPC reuse
- [concepts/deterministic-agent-control-mechanisms](../concepts/deterministic-agent-control-mechanisms.md) — M1 (CLI callback) mechanism
- [pi-evolve Extension](pi-evolve-extension.md) — System that would benefit from callbacks
- [concepts/pi-extension-primitive-mapping](../concepts/pi-extension-primitive-mapping.md) — Bidirectional hook mapping (M1 consumer)
- [dacmicu/implementation-plan](../dacmicu/implementation-plan.md) — Hook surface used

## TUI socket guarantee — lifecycle, env injection, promotion roadmap

This extension closes the *recursive self-reach* gap (property 4 in [spirit-vs-opencode](../dacmicu/spirit-vs-opencode.md)) by opening a Unix socket scoped to the Pi process and giving spawned bash a way to call back. Three layers must hold for the socket to actually be open when bash needs it.

### Layer 1 — extension lifecycle

The extension factory runs **once at process start**, after `loadExtensions` resolves the paths — regardless of TUI / `--print` / `--mode rpc`. Open the socket there. No race with `session_start` or the first `bash` invocation:

```typescript
export default function (pi: ExtensionAPI) {
  const socketPath = `/tmp/pi-callback-${process.pid}.sock`;
  try { unlinkSync(socketPath); } catch {}
  const server = createServer(handleConnection);
  server.listen(socketPath);
  process.on("exit", () => { try { unlinkSync(socketPath); } catch {} });
  process.on("SIGINT", () => { try { unlinkSync(socketPath); } catch {} process.exit(0); });
}
```

### Layer 2 — env injection

`process.env.PI_CALLBACK_SOCKET = socketPath` at extension init. Every bash spawned by the agent inherits it. Outside this Pi process the var is unset, so a stray `pi-callback "..."` from elsewhere does not accidentally connect to the wrong session.

Belt-and-suspenders: tool-wrap `bash` (see `examples/extensions/tool-override.ts` pattern) to set the env explicitly per call — protects against bash invocations that scrub env:

```typescript
pi.wrapTool("bash", (orig) => async (id, params, signal, onUpdate, ctx) => {
  process.env.PI_CALLBACK_SOCKET = socketPath;
  return orig(id, params, signal, onUpdate, ctx);
});
```

### Layer 3 — install / promotion path

| Stage | Guarantee | How |
|-------|-----------|-----|
| **v1 — user-installed** | Socket open iff user installed and registered the extension | Standard `~/.pi/extensions/` or per-project `.pi/extensions/` |
| **v2 — bundled** | Install one, get both | `pi-dacmicu` (bash mode) declares `pi-callback` as dependency; `pi-evolve` and other consumers do the same |
| **v3 — core promotion** | Always on in TUI, default-off in `--print` | Move socket server + env injection into pi-mono core, gated by `callback.enabled` config flag. Protocol handlers stay extensible; listening socket becomes a core concern. |

Until v3 lands, "always open in TUI" means "always installed by the user."

### Lifecycle edge cases

- **Stale socket on crash.** `unlinkSync(socketPath)` before `listen` clears leftovers from a prior crashed Pi (`EADDRINUSE` on Unix sockets manifests as the file existing).
- **Multiple Pi instances.** Per-pid socket name prevents collision. Env var carries the resolved path; each bash sees its own session's socket.
- **Cleanup on normal exit.** `process.on("exit")` and `process.on("SIGINT")` to remove the socket file. Otherwise `/tmp` accumulates corpses.
- **Session switch / fork within same process.** Socket lives at the process level, not the session level. Same socket serves both sessions.
- **Subagents.** A Pi-spawned subagent (via `--mode rpc`) is a separate process with its own pid → its own socket. Bash inside the subagent talks to the subagent, not the parent. Correct scoping.
- **Discovery from outside the agent.** If `pi-callback` is to work from external Makefile / CI / cron without env, you need a session-discovery layer (list `/tmp/pi-callback-*.sock`, pick by rule). Out of scope for v1; needed before claiming full FABRIC parity.
- **Reentrancy.** A callback that triggers a turn that runs more bash that calls back — ensure the queue serializes turns. The `triggerTurn:true` path already does this; callback handler should `await` the in-flight turn before queueing the next.
- **Abort semantics.** If the user hits Escape while a `wait:true` callback is in flight, return a clean error to the CLI, do not hang.
- **Non-TUI parity.** Same socket should also be openable in `pi --mode rpc` (if the embedder wants it). Pointless in `pi --print` (one turn, no loop). Easiest: extension is the single owner of the socket regardless of mode.
