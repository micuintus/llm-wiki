---
title: DACMICU as umbrella, FABRIC vs Ralph, RPC mode, TUI bash callback
source: pi session (Claude/Anthropic) on pi-mono worktree
collected: 2026-05-07
reliability: high
tags: [dacmicu, fabric, ralph, rpc, callback, pi-evolve, conversation]
---

# Conversation summary — DACMICU umbrella + FABRIC + RPC + TUI callback

In-session conversation while reviewing the existing DACMICU wiki pages on the
local pi-mono worktree. Reliability high: the architectural claims map directly
to source files in `packages/coding-agent/src/modes/` and existing wiki pages;
the "spirit vs implementation" framing is the user's own design intent for the
local DACMICU port.

## Threads

### 1. DACMICU is an umbrella, not just Ralph

User clarified DACMICU is intended as the umbrella primitive that unifies:

1. Ralph Loop implementation supporting **both** subagent and in-agent loops
   (dispatched per task / per user request).
2. FABRIC-style Unix-pipe composition of agent capabilities.
3. Base for the TODO system.
4. Foundation for `micu pi evolve` (currently prototyped as
   `examples/extensions/pi-evolve.ts`, untracked, ~510 LOC).

This reframes the existing `dacmicu/implementation-plan.md` from a single-mode
in-agent driver to a multi-mode dispatch.

### 2. Correction: FABRIC is not a DACMICU prerequisite

Earlier framing implied DACMICU needed the `pi` CLI / Unix-socket infrastructure
to reach opencode parity. That conflated two distinct mechanisms:

- opencode's bash-callback DACMICU is a *workaround* for opencode lacking native
  `agent_end` / `triggerTurn` events, not a feature DACMICU requires.
- Pi's in-agent driver covers Ralph loops natively, more cleanly than opencode's
  bash form, while preserving the single-context-window guarantee.

FABRIC composition (M20 in `concepts/deterministic-agent-control-mechanisms.md`)
remains a real Pi gap, but it is an independent capability — useful for shell
pipelines, not for the loop-until-done pattern DACMICU implements.

### 3. Spirit-vs-implementation comparison with opencode PR #20074

Stripped of `oc`-CLI specifics, the opencode PR's load-bearing properties are:

1. LLMs handle judgment, deterministic substrate handles control flow.
2. The LLM commits by writing an inspectable structure (script, predicate,
   pipeline) rather than being prompted again.
3. One uniform callback primitive serves Manus / Split / Ralph / Fabric.
4. Recursive self-reach: agent can synchronously poll itself for judgment from
   inside a deterministic step.

Pi's local DACMICU stack matches (1) and (2), wins on visibility / persistence
/ single-context-guarantee, but currently falls short on (3) uniformity (we are
fragmenting into per-use-case tools) and (4) mid-step recursive judgment (our
loop commits then yields; opencode lets judgment happen synchronously inside
bash). (4) is the only real spirit gap.

### 4. `pi-callback` extension as the path to recursive self-reach

`implementations/pi-callback-extension.md` already sketches the design:
extension opens a Unix socket at session start, injects `PI_CALLBACK_SOCKET`
into the env of every `bash` tool invocation, and a small `pi-callback` CLI
binary connects back over the socket. Reuses the JSON-line subagent RPC
protocol in reverse. ~150 LOC extension + ~50 LOC CLI. No core changes for v1.

This closes spirit gap (4) without requiring the full FABRIC infrastructure.

### 5. Why `--print` is called `--print`

Convention from Claude Code: `--print` / `-p` describes I/O behavior (print
result to stdout, exit), not lifecycle. Compare:

- `pi` → TUI, multi-turn, interactive
- `pi --print "..."` → one turn, prints to stdout, exits — usable in pipes
- `pi --mode rpc` → persistent JSON-RPC subprocess, structured event stream
- `pi --mode json` → prints structured JSON

`--headless` / `--once` / `--non-interactive` would all be defensible names.
`--print` matches Claude Code so cross-agent users do not relearn.

### 6. RPC mode is the substrate for deep subagents

`pi --mode rpc` runs Pi as a persistent subprocess speaking JSON-RPC over
stdio. Source: `packages/coding-agent/src/modes/rpc/`. It is *already* the
substrate for Pi subagents (`rpc-client.ts` is the parent-side client that
spawns child agents).

Properties for deep / recursive / nested subagents:

- Persistent process per subagent, full session tree, fork/compact/rehydrate.
- Structured event stream re-renderable with Pi's exported TUI components.
- Composable depth: a subagent is itself a Pi process; can spawn its own.
- Lifecycle control via stdio (no HTTP, no port allocation).
- No core surgery to add new subagent flavors.

Caveats: visibility cost (events have to be re-rendered), context isolation
(opposite of DACMICU single-context spirit — choose mode per task), protocol
surface area (keep small to avoid calcifying).

### 7. Opening the RPC gate in TUI mode for bash callback

Yes — that is exactly what the `pi-callback` extension does. The TUI session
is already a fully-featured agent runtime; opening a Unix socket gives it
parity with what `--mode rpc` accepts on stdio, but in the right direction
for callbacks (incoming connections from spawned bash, not outgoing JSON to
a parent).

### 8. Three-layer answer for "socket open in TUI"

a. **Extension lifecycle.** Factory runs once at process start (regardless of
   TUI / `--print` / `--mode rpc`). Open socket then. No race with
   `session_start` or first `bash` invocation.

b. **Env injection.** `process.env.PI_CALLBACK_SOCKET = socketPath` at
   extension init. Every bash spawned by the agent inherits it. Outside this
   Pi process the var is unset, so stray callbacks from elsewhere do not
   accidentally connect to the wrong session. Belt-and-suspenders: tool-wrap
   `bash` (`examples/extensions/tool-override.ts` pattern) to set explicitly.

c. **Install / promotion path.**
   - v1: user-installed extension (opt-in).
   - v2: bundled with whatever depends on it (e.g. `pi-dacmicu` depends on
     `pi-callback`, install one get both).
   - v3: socket + env injection promoted into pi-mono core, gated by config
     flag, default-on in TUI / default-off in `--print`. Protocol handlers
     stay extensible; listening socket becomes a core concern.

### 9. Lifecycle edge cases

- Stale socket on crash → `unlinkSync(socketPath)` before `listen`.
- Multiple Pi instances → per-pid socket name (`pi-callback-${process.pid}.sock`).
- Cleanup on exit → `process.on("exit"/"SIGINT", cleanup)`.
- Session switch / fork within same process → same socket serves both sessions.
- Subagent → its own pid → its own socket; bash inside subagent talks to
  subagent (correct scoping).
- External Makefile use → needs session-discovery layer (list `/tmp/*.sock`,
  pick by rule) — out of scope for v1.

## Outputs filed

- New synthesis: `dacmicu/spirit-vs-opencode.md`
- Correction blocks added to: `dacmicu/concept.md`, `dacmicu/implementation-plan.md`
- Sections added to: `architecture/pi-print-rpc-vs-oc-check.md` (naming origin,
  reverse-RPC for callback), `implementations/pi-callback-extension.md` (TUI
  socket guarantee, lifecycle edges, promotion roadmap)
