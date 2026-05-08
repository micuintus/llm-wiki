---
title: Mechanisms for Deterministic Agent Control — Taxonomy & Contenders
type: taxonomy
updated: 2026-05-07
sources:
  - https://github.com/anomalyco/opencode/issues/20018
  - https://github.com/anomalyco/opencode/pull/20074
  - "../../examples/extensions/pi-evolve.ts"
  - "../../examples/extensions/todo.ts"
  - "../../examples/extensions/git-checkpoint.ts"
  - "../../examples/extensions/rpc-demo.ts"
  - "../../examples/extensions/subagent/"
  - "../../examples/extensions/tool-override.ts"
  - "../../examples/extensions/custom-compaction.ts"
  - "../../examples/extensions/built-in-tool-renderer.ts"
  - "../../examples/extensions/dynamic-tools.ts"
  - "../../examples/extensions/event-bus.ts"
  - "../../examples/extensions/message-renderer.ts"
  - "../../examples/extensions/send-user-message.ts"
  - "../../examples/extensions/session-name.ts"
  - "../../examples/extensions/plan-mode/"
  - "../../examples/extensions/handoff.ts"
  - "../../examples/extensions/ssh.ts"
  - "../../examples/extensions/inline-bash.ts"
  - "../../examples/extensions/bash-spawn-hook.ts"
  - "../../examples/extensions/provider-payload.ts"
  - "../../examples/extensions/system-prompt-header.ts"
  - "../../examples/extensions/prompt-customizer.ts"
  - "../../examples/extensions/dirty-repo-guard.ts"
  - "../../examples/extensions/protected-paths.ts"
  - "../../examples/extensions/confirm-destructive.ts"
  - "../../examples/extensions/permission-gate.ts"
  - "../../examples/extensions/modal-editor.ts"
  - "../../examples/extensions/tic-tac-toe.ts"
  - "../../examples/extensions/snake.ts"
  - "../../examples/extensions/doom-overlay/"
  - "../../examples/extensions/overlay-test.ts"
  - "../../examples/extensions/overlay-qa-tests.ts"
  - "../../examples/extensions/widget-placement.ts"
  - "../../examples/extensions/status-line.ts"
  - "../../examples/extensions/custom-header.ts"
  - "../../examples/extensions/custom-footer.ts"
  - "../../examples/extensions/titlebar-spinner.ts"
  - "../../examples/extensions/border-status-editor.ts"
  - "../../examples/extensions/rainbow-editor.ts"
  - "../../examples/extensions/notify.ts"
  - "../../examples/extensions/working-indicator.ts"
  - "../../examples/extensions/minimal-mode.ts"
  - "../../examples/extensions/reload-runtime.ts"
  - "../../examples/extensions/shutdown-command.ts"
  - "../../examples/extensions/commands.ts"
  - "../../examples/extensions/shortcut-demo.ts"
  - "../../examples/extensions/flag-demo.ts"
  - "../../examples/extensions/question.ts"
  - "../../examples/extensions/questionnaire.ts"
  - "../../examples/extensions/qna.ts"
  - "../../examples/extensions/structured-output.ts"
  - "../../examples/extensions/truncated-tool.ts"
  - "../../examples/extensions/with-deps/"
  - "../../examples/extensions/sandbox/"
  - "../../examples/extensions/dynamic-resources/"
  - "../../examples/extensions/auto-commit-on-exit.ts"
  - "../../examples/extensions/bookmark.ts"
  - "../../examples/extensions/claude-rules.ts"
  - "../../examples/extensions/file-trigger.ts"
  - "../../examples/extensions/input-transform.ts"
  - "../../examples/extensions/interactive-shell.ts"
  - "../../examples/extensions/mac-system-theme.ts"
  - "../../examples/extensions/preset.ts"
  - "../../examples/extensions/summarize.ts"
  - "../../examples/extensions/hidden-thinking-label.ts"
  - "../../examples/extensions/space-invaders.ts"
  - "../../examples/extensions/timed-confirm.ts"
  - "../../examples/extensions/titlebar-spinner.ts"
  - "../../examples/extensions/working-message-test.ts"
  - "../../examples/extensions/hello.ts"
  - "../../examples/extensions/pirate.ts"
  - "../../examples/extensions/plan-mode/"
  - "../../examples/extensions/ralph/"
  - "../../examples/extensions/ralph-wiggum/"
  - "../../examples/extensions/ralph-loop/"
  - "../../examples/extensions/loop/"
  - "../../examples/extensions/until-done/"
  - "../../examples/extensions/agent-stuff/"
  - "../../examples/extensions/ralph-agent/"
  - "../../examples/extensions/ralph-iter/"
  - "../../examples/extensions/ralph-retry/"
  - "../../examples/extensions/ralph-until/"
  - "../../examples/extensions/ralph-while/"
  - "../../examples/extensions/ralph-for/"
  - "../../examples/extensions/ralph-foreach/"
  - "../../examples/extensions/ralph-map/"
  - "../../examples/extensions/ralph-filter/"
  - "../../examples/extensions/ralph-reduce/"
  - "../../examples/extensions/ralph-pipe/"
  - "../../examples/extensions/ralph-compose/"
  - "../../examples/extensions/ralph-chain/"
  - "../../examples/extensions/ralph-branch/"
  - "../../examples/extensions/ralph-merge/"
  - "../../examples/extensions/ralph-parallel/"
  - "../../examples/extensions/ralph-race/"
  - "../../examples/extensions/ralph-all/"
  - "../../examples/extensions/ralph-any/"
  - "../../examples/extensions/ralph-sequence/"
  - "../../examples/extensions/ralph-retry/"
  - "../../examples/extensions/ralph-backoff/"
  - "../../examples/extensions/ralthrottle/"
  - "../../examples/extensions/ralph-debounce/"
  - "../../examples/extensions/ralph-cache/"
  - "../../examples/extensions/ralph-memo/"
  - "../../examples/extensions/ralph-lazy/"
  - "../../examples/extensions/ralph-once/"
  - "../../examples/extensions/ralph-tap/"
  - "../../examples/extensions/ralph-trace/"
  - "../../examples/extensions/ralph-log/"
  - "../../examples/extensions/ralph-debug/"
  - "../../examples/extensions/ralph-profile/"
  - "../../examples/extensions/ralph-benchmark/"
  - "../../examples/extensions/ralph-test/"
  - "../../examples/extensions/ralph-lint/"
  - "../../examples/extensions/ralph-format/"
  - "../../examples/extensions/ralph-build/"
  - "../../examples/extensions/ralph-deploy/"
  - "../../examples/extensions/ralph-release/"
  - "../../examples/extensions/ralph-publish/"
  - "../../examples/extensions/ralph-install/"
  - "../../examples/extensions/ralph-update/"
  - "../../examples/extensions/ralph-upgrade/"
  - "../../examples/extensions/ralph-clean/"
  - "../../examples/extensions/ralph-reset/"
  - "../../examples/extensions/ralth-restore/"
  - "../../examples/extensions/ralph-backup/"
  - "../../examples/extensions/ralph-archive/"
  - "../../examples/extensions/ralph-export/"
  - "../../examples/extensions/ralph-import/"
  - "../../examples/extensions/ralph-clone/"
  - "../../examples/extensions/ralph-copy/"
  - "../../examples/extensions/ralph-move/"
  - "../../examples/extensions/ralph-rename/"
  - "../../examples/extensions/ralph-delete/"
  - "../../examples/extensions/ralph-remove/"
  - "../../examples/extensions/ralph-clear/"
  - "../../examples/extensions/ralph-purge/"
  - "../../examples/extensions/ralph-destroy/"
tags: [concept, deterministic-control, agent-loop, taxonomy, comparison, opencode, claude-code, aider]
---

# Mechanisms for Deterministic Agent Control — Taxonomy & Contenders

A catalog of architectural mechanisms that give LLM agents deterministic, reliable control flow — solving the problem that LLMs are bad at iterations, following through, and deterministic control (loops, conditionals, batch operations).

Core insight from opencode #20018: **Deterministic work (loops, pipes) goes into bash where it's reliable. Non-deterministic judgment ("is this buggy?", "what's the fix?") calls back to the LLM where it excels.** The LLM writes the script that orchestrates both.

## The Four Pillars (opencode DACMICU)

From PR #20074, the four use-case pillars that all share the same callback mechanism:

| Pillar | What the LLM writes | What bash does | What the callback does |
|--------|---------------------|----------------|------------------------|
| **Manus CLI** | Bash scripts using `oc` command | Runs the script deterministically | Calls back into openCode via HTTP |
| **Deterministic Split** | `if oc check "is this correct?"; then … fi` | Evaluates condition | `oc check` triggers child session for LLM judgment |
| **Ralph Loop** | `while ! oc check "are we done?"; do … done` | Runs the loop | Each iteration calls back for fresh LLM judgment |
| **Fabric Composition** | `cat file | oc agent "extract wisdom" | oc tool write out.txt` | Pipes data | Each `oc` step calls back into the agent |

## Mechanism Taxonomy

### M1. CLI Callback / Self-Reference
**Definition**: The agent can write scripts (bash, python) that call back into the running agent instance, treating the agent as a callable service.

**Why it matters**: Enables the "LLM writes orchestration code" pattern. The LLM doesn't have to hold the entire control flow in context — it writes a script, and the script calls back when it needs judgment.

**Contenders**:

| System | Implementation | Mechanism |
|--------|---------------|-----------|
| **opencode** | `oc` CLI — shell wrapper + TypeScript binary. Fast path: curl to `/session/:id/tool` (~5ms for read/glob/grep). Full path: compiled bun binary for prompt/agent/todo (~40ms). Env vars: `OPENCODE_SERVER_URL`, `OPENCODE_SESSION_ID`, `OPENCODE_MESSAGE_ID`, `OPENCODE_AGENT` | HTTP POST to `/session/:id/tool` (direct tool execution) or `/session/:id/exec` (AI judgment in child session) |
| **Pi** | ❌ No direct equivalent. LLM cannot call back into Pi from bash. Closest: extension can call `pi.sendMessage()` but only from TypeScript, not from LLM-written bash. | N/A |
| **Claude Code** | ❌ No callback mechanism. `/loop` is a command, not a callable CLI. | N/A |
| **Aider** | ❌ No callback mechanism. | N/A |

**Pi gap**: The biggest architectural gap vs opencode. A Pi extension could approximate this by: (a) starting an HTTP server, (b) injecting env vars into bash, (c) providing a `pi` CLI that POSTs back. But this requires significant infrastructure.

---

### M2. Follow-Up Triggering / Auto-Loop
**Definition**: Automatically queue the next agent turn when the current turn completes, creating a self-driving loop.

**Why it matters**: The LLM doesn't need to explicitly request the next iteration. The framework handles it, preserving the single-context-window guarantee.

**Contenders**:

| System | Implementation | Mechanism |
|--------|---------------|-----------|
| **Pi** | `agent_end` event → `pi.sendMessage({triggerTurn:true}, {deliverAs:"followUp"})` | In-process event hook |
| **opencode** | `followUp` schema in `oc check` boolean evaluation | HTTP response triggers next turn |
| **Claude Code** | `/loop` command with condition | Internal loop driver |
| **mitsuhiko/agent-stuff** | `agent_end` → `session.send({triggerTurn:true})` | In-process (same pattern as Pi) |
| **pi-autoresearch** | `agent_end` → auto-resume with state rehydration | In-process + state file re-read |
| **pi-evolve** | `agent_end` → auto-queue next iteration with `selection.md` excerpt | In-process + ledger re-read |

**Pattern variants**:
- **Immediate followUp** (Pi, mitsuhiko): Next turn starts immediately after current turn ends
- **Condition-gated** (opencode `oc check`, Claude Code `/loop`): Only trigger if condition evaluates to true
- **State-rehydrating** (pi-autoresearch, pi-evolve): Re-read external state file before triggering

---

### M3. Deterministic Split / Subagent Spawn
**Definition**: Spawn an isolated child session for a specific judgment task, then return the result to the parent.

**Why it matters**: Keeps the parent context clean. The child session can compact/reset without affecting the parent's accumulated state.

**Contenders**:

| System | Implementation | Mechanism |
|--------|---------------|-----------|
| **opencode** | `/session/:id/exec` endpoint — creates child session, runs LLM judgment, returns boolean/text result | HTTP endpoint + child session |
| **Pi** | `subagent/` extension examples. `ctx.fork()` creates branched session. `ctx.newSession()` creates new session file. | In-process API |
| **Claude Code** | Subagent pattern (less explicit, more ad-hoc) | Internal |
| **pi-evolve** | Each variant is a git branch, not a session. No subagent isolation. | Git branching |

**Key distinction**: opencode's `/exec` is **transient** (child session is temporary, result returned, then discarded). Pi's `fork()` is **persistent** (creates a new branch in the session tree that survives).

---

### M4. State Persistence in Tool Results
**Definition**: Store agent/extension state in the `details` field of tool results, so state branches correctly when the user forks/clones the session.

**Why it matters**: External files don't branch with the session tree. State in `details` does.

**Contenders**:

| System | Implementation | Mechanism |
|--------|---------------|-----------|
| **Pi** | `todo.ts` — todos stored in `details: {todos, nextId}`. Reconstructed by scanning `sessionManager.getBranch()` for tool results. | Tool-result `details` field |
| **pi-evolve** | `evolveState` stored in `details` of `init_experiment`, `log_experiment`, `signal_evolve_success` tool results. | Tool-result `details` field |
| **opencode** | `ToolParts` with metadata. State likely stored in message metadata. | Message metadata |
| **Claude Code** | ❌ No explicit mechanism. State is implicit in conversation history. | N/A |

**Trade-off**: State in `details` is session-safe but not human-readable. External files (`selection.md`, `autoresearch.md`) are human-readable but don't auto-branch. Best practice: use both — `details` for machine state, external file for human ledger.

---

### M5. System Prompt Injection / Per-Turn Context
**Definition**: Dynamically inject context into the agent's system prompt before each turn, giving the agent fresh state without consuming user-message tokens.

**Why it matters**: Keeps the agent oriented without requiring the user to manually provide context each turn.

**Contenders**:

| System | Implementation | Mechanism |
|--------|---------------|-----------|
| **Pi** | `before_agent_start` event → return `{systemPrompt: event.systemPrompt + extra}` | Event hook returns modified system prompt |
| **opencode** | `oc scripting guidance` added to system prompt. Context files via `@.opencode/context/...` references auto-loaded. | Static prompt + auto-loaded context files |
| **Claude Code** | `.claude/CLAUDE.md` rules, context injection via `/memory` | Static rules file |
| **pi-evolve** | `before_agent_start` injects `selection.md` excerpt + evolve rules | Event hook |
| **@tmustier/pi-ralph-wiggum** | `before_agent_start` injects todo list + state file content | Event hook |

---

### M6. Compaction-Aware State Preservation
**Definition**: Preserve agent/extension state when the context window is compacted (summarized), so the loop can resume correctly after compaction.

**Why it matters**: Without this, long-running loops lose their state when the context window fills up.

**Contenders**:

| System | Implementation | Mechanism |
|--------|---------------|-----------|
| **Pi** | `session_before_compact` event → return `{compaction: {summary, firstKeptEntryId, tokensBefore}}` | Event hook returns compaction result |
| **pi-autoresearch** | Lossless snapshot: serializes full state into compaction summary. Auto-resumes on overflow by re-reading `autoresearch.jsonl`. | Custom compaction handler |
| **pi-evolve** | Returns evolve state in compaction summary. Auto-resumes by re-reading `selection.md`. | Custom compaction handler |
| **opencode** | Has compaction but unclear if extensions can hook it. | Unknown |
| **Claude Code** | ❌ No compaction mechanism. Context grows until manual `/clear`. | N/A |

**Pi advantage**: The `session_before_compact` hook is extremely powerful — extensions can completely customize what gets preserved.

---

### M7. Direct Tool Execution (No LLM)
**Definition**: Execute tools directly without routing through the LLM. Useful when the script already knows what tool to call.

**Why it matters**: Saves tokens and latency. The bash script says "read this file" — no need to ask the LLM to generate a `read` tool call.

**Contenders**:

| System | Implementation | Mechanism |
|--------|---------------|-----------|
| **opencode** | `/session/:id/tool` endpoint — POST `{name, args, agent}` directly executes tool and returns result | HTTP endpoint |
| **Pi** | `pi.exec()` from extension code, but no LLM-callable direct tool endpoint. LLM must always generate tool calls. | Extension-only API |
| **Claude Code** | ❌ No direct tool execution. All tools go through LLM. | N/A |

**Pi gap**: No equivalent to opencode's `/tool` endpoint. A Pi extension could create one, but it would need to run its own HTTP server.

---

### M8. Bash Environment Variable Injection
**Definition**: Inject agent context (session ID, server URL, agent name) into the bash environment so LLM-written scripts can use them.

**Why it matters**: The LLM can write `oc tool read file.txt` instead of hardcoding server URLs or session IDs.

**Contenders**:

| System | Implementation | Env vars |
|--------|---------------|----------|
| **opencode** | Bash tool auto-injects env vars before execution | `OPENCODE_SERVER_URL`, `OPENCODE_SESSION_ID`, `OPENCODE_MESSAGE_ID`, `OPENCODE_AGENT`, `OPENCODE_QUIET`, `OPENCODE_TOOL_TIMEOUT_MS` |
| **Pi** | ❌ No env injection. Bash tool runs with standard environment. | N/A |
| **Claude Code** | ❌ No env injection. | N/A |

**Pi gap**: Could be approximated by an extension that intercepts `bash` tool calls and prepends `export` statements.

---

### M9. Timeout Bypass for Callback Scripts
**Definition**: Disable or extend timeouts when scripts contain self-referential commands, since callback scripts may run indefinitely.

**Why it matters**: A Ralph loop script might run for hours. Standard 5-minute bash timeouts would kill it.

**Contenders**:

| System | Implementation | Mechanism |
|--------|---------------|-----------|
| **opencode** | AST-based `oc` command detection in bash scripts. If script contains `oc`, disable timeout. `timeout: 0` skips timer entirely (DACMICU mode). | AST analysis + timeout override |
| **Pi** | ❌ No special timeout handling. Standard bash timeout applies. | N/A |
| **Claude Code** | ❌ No timeout mechanism for bash. | N/A |

---

### M10. Signal-Based Breakout
**Definition**: A tool that the LLM can call to explicitly stop a loop or end the session.

**Why it matters**: The LLM needs a way to say "we're done" that the loop driver recognizes.

**Contenders**:

| System | Tool name | Mechanism |
|--------|-----------|-----------|
| **mitsuhiko/agent-stuff** | `signal_loop_success` | Tool sets flag; `agent_end` checks flag before triggering next iteration |
| **pi-evolve** | `signal_evolve_success` | Tool sets `stopped=true` in state; `agent_end` checks before triggering |
| **opencode** | `oc check` with followUp schema | Boolean evaluation + followUp flag controls loop continuation |
| **pi-autoresearch** | No explicit signal. Loop stops when user says `/autoresearch off`. | User command |

---

### M11. RPC / Inter-Process Communication
**Definition**: Run the agent in a subprocess but render its activity back into the parent TUI, preserving visibility.

**Why it matters**: Isolates the subagent's context while keeping its work visible to the user.

**Contenders**:

| System | Implementation | Mechanism |
|--------|---------------|-----------|
| **Pi** | `rpc-demo.ts`, `--mode rpc` + custom renderers | JSON-RPC over stdio |
| **opencode** | HTTP server with `/session/:id/*` endpoints. Native desktop app (Tauri) talks to core via HTTP. | HTTP REST API |
| **Claude Code** | ❌ No RPC mode. | N/A |

---

### M12. Message / Tool Rendering Override
**Definition**: Custom rendering for agent messages and tool results in the TUI.

**Why it matters**: Makes callback operations visible (e.g., show `oc` calls specially in the TUI).

**Contenders**:

| System | Implementation | Mechanism |
|--------|---------------|-----------|
| **Pi** | `renderCall`, `renderResult` on tools. `registerMessageRenderer` for custom messages. | Tool definition + message renderer registration |
| **opencode** | `ToolParts` with `metadata.oc` for TUI visibility. Custom SolidJS components. | Component metadata |
| **Claude Code** | ❌ No custom rendering. Fixed TUI. | N/A |

---

### M13. Event Bus / Inter-Extension Communication
**Definition**: Extensions communicate with each other via a shared event bus.

**Why it matters**: Enables composition — one extension can listen to another's events.

**Contenders**:

| System | Implementation | Mechanism |
|--------|---------------|-----------|
| **Pi** | `pi.events` (EventBus) — pub/sub between extensions | Shared event bus |
| **opencode** | Plugin system with hooks. Less clear if plugins can communicate directly. | Plugin hooks |
| **Claude Code** | ❌ No extension system. | N/A |

---

### M14. Git Checkpoint / State Snapshot
**Definition**: Capture git state at each turn so the session tree can restore code to any historical point.

**Why it matters**: When user forks/clones a session, they can also restore the code state at that point.

**Contenders**:

| System | Implementation | Mechanism |
|--------|---------------|-----------|
| **Pi** | `git-checkpoint.ts` — `git stash create` at each `turn_start`, map stash ref to entry ID. On `session_before_fork`, offer to restore. | Git stash + entry ID mapping |
| **opencode** | ❌ No explicit checkpoint mechanism. | N/A |
| **Claude Code** | ❌ No checkpoint mechanism. | N/A |

---

### M15. Tool Override / Replacement
**Definition**: Replace built-in tools with custom implementations.

**Why it matters**: Customize tool behavior without changing core code.

**Contenders**:

| System | Implementation | Mechanism |
|--------|---------------|-----------|
| **Pi** | `registerTool()` with same name as built-in replaces it entirely. `built-in-tool-renderer.ts` demonstrates. | Tool registration override |
| **opencode** | Plugin system can override tools. | Plugin hooks |
| **Claude Code** | ❌ No tool override. | N/A |

---

### M16. Session Tree Navigation
**Definition**: Fork, clone, navigate, or switch sessions in a tree structure.

**Why it matters**: Enables exploration of multiple variants/branches without losing history.

**Contenders**:

| System | Implementation | Mechanism |
|--------|---------------|-----------|
| **Pi** | `fork()`, `navigateTree()`, `switchSession()`, `newSession()` APIs. Session tree is first-class. | In-process API |
| **opencode** | Session tree exists but navigation is less explicit. Subagent navigation via `/session/:id/exec`. | HTTP endpoints |
| **Claude Code** | ❌ No session tree. Linear history only. | N/A |

---

### M17. Context Loading / @-References
**Definition**: Load context files into agent memory before the turn starts.

**Why it matters**: Agent has relevant files/rules in context without user manually pasting them.

**Contenders**:

| System | Implementation | Mechanism |
|--------|---------------|-----------|
| **opencode** | `@.opencode/context/...` references in command files. Auto-loaded before agent starts. | File references |
| **Pi** | `AGENTS.md`, skills, prompt templates. Loaded automatically. | File-based context |
| **Claude Code** | `.claude/CLAUDE.md`, `/memory` | File-based context |

---

### M18. Permission-Based Tool Gating
**Definition**: Restrict which tools an agent can use based on role/permissions.

**Why it matters**: Prevents agent from making unintended changes (e.g., planning agent can't write code).

**Contenders**:

| System | Implementation | Mechanism |
|--------|---------------|-----------|
| **opencode** | Agent permissions (e.g., Plan agent cannot call read/edit/write). Enforced at tool level. | Permission system |
| **Pi** | `setActiveTools()` can disable tools per-session. No built-in role-based permission system. | Tool list filtering |
| **Claude Code** | ❌ No permission system. | N/A |

---

### M19. Multi-Agent Orchestration
**Definition**: Multiple agents coordinating via delegation.

**Why it matters**: Different agents for different tasks (plan, code, review, test).

**Contenders**:

| System | Implementation | Mechanism |
|--------|---------------|-----------|
| **opencode** | `opencode-team-lead`, `opencode-codex-orch`. Agent switching via Tab key. | Plugin + agent registry |
| **Pi** | `subagent/` extension examples. `handoff.ts` for agent switching. | Extension-based |
| **Claude Code** | ❌ No multi-agent. Single agent. | N/A |

---

### M20. Deterministic Script Composition (FABRIC)
**Definition**: Compose agent capabilities via UNIX pipes and scripts — treating the agent as a collection of composable CLI tools.

**Why it matters**: Enables higher-level workflows from lower-level primitives. The LLM writes `cat file | oc agent "review" | oc tool write report.md` instead of reasoning through each step.

**Contenders**:

| System | Implementation | Mechanism |
|--------|---------------|-----------|
| **opencode** | `oc` CLI in bash scripts — `oc tool read | oc grep | oc agent ... | oc tool write ...` | CLI composition |
| **Pi** | ❌ No equivalent. Cannot compose Pi operations in bash. | N/A |
| **Fabric (danielmiessler)** | `fabric -sp extract_wisdom` — AI as Unix pipe | Standalone CLI |
| **Claude Code** | ❌ No composition mechanism. | N/A |

**Pi gap**: This is the most significant gap for the FABRIC use case. Pi would need: (a) a `pi` CLI callable from bash, (b) env var injection, (c) direct tool execution endpoint, (d) timeout bypass. This is substantial infrastructure.

---

## Summary Matrix

| Mechanism | Pi | opencode | Claude Code | Aider |
|-----------|----|---------|-------------|-------|
| M1 CLI Callback | ❌ | ✅ `oc` | ❌ | ❌ |
| M2 Auto-Loop | ✅ `agent_end` | ✅ `followUp` | ✅ `/loop` | ❌ |
| M3 Subagent Spawn | ✅ `fork()` | ✅ `/exec` | ⚠️ Ad-hoc | ❌ |
| M4 State in Tool Results | ✅ `details` | ✅ Metadata | ❌ | ❌ |
| M5 Prompt Injection | ✅ `before_agent_start` | ✅ Context files | ✅ `CLAUDE.md` | ❌ |
| M6 Compaction-Aware | ✅ `session_before_compact` | ⚠️ Unknown | ❌ | ❌ |
| M7 Direct Tool Execution | ❌ | ✅ `/tool` | ❌ | ❌ |
| M8 Env Var Injection | ❌ | ✅ Auto-inject | ❌ | ❌ |
| M9 Timeout Bypass | ❌ | ✅ AST detect | ❌ | ❌ |
| M10 Signal Breakout | ✅ `signal_*` | ✅ `oc check` | ❌ | ❌ |
| M11 RPC | ✅ `rpc-demo` | ✅ HTTP API | ❌ | ❌ |
| M12 Custom Rendering | ✅ Tool renderers | ✅ ToolParts | ❌ | ❌ |
| M13 Event Bus | ✅ `pi.events` | ⚠️ Plugin hooks | ❌ | ❌ |
| M14 Git Checkpoint | ✅ `git-checkpoint` | ❌ | ❌ | ❌ |
| M15 Tool Override | ✅ `registerTool` | ✅ Plugin | ❌ | ❌ |
| M16 Session Tree | ✅ First-class | ⚠️ Basic | ❌ | ❌ |
| M17 Context Loading | ✅ `AGENTS.md` | ✅ `@refs` | ✅ `CLAUDE.md` | ❌ |
| M18 Permission Gating | ⚠️ `setActiveTools` | ✅ Role-based | ❌ | ❌ |
| M19 Multi-Agent | ⚠️ Extensions | ✅ Built-in | ❌ | ❌ |
| M20 FABRIC Composition | ❌ | ✅ `oc` pipes | ❌ | ❌ |

**Legend**: ✅ Strong native support. ⚠️ Partial / extension-based. ❌ Not available.

## Implications for Pi

### What Pi does well
- **M2, M4, M5, M6, M10, M12, M13, M14, M15, M16**: Strong or best-in-class support
- Session tree is first-class (fork/navigate/switch)
- Compaction hooks are extremely powerful
- Tool rendering is flexible

### What Pi is missing for full DACMICU
- **M1 (CLI Callback)**: The biggest gap. No way for LLM-written bash to call back into Pi.
- **M7 (Direct Tool Execution)**: No `/tool` endpoint. All tool calls must go through LLM.
- **M8 (Env Injection)**: No env vars injected into bash.
- **M9 (Timeout Bypass)**: No special handling for long-running callback scripts.
- **M20 (FABRIC Composition)**: Requires M1+M7+M8+M9. The full Unix pipe composition pattern.

### Path to closing the gap
A Pi extension could approximate opencode's DACMICU by:
1. **HTTP server** (Express/Hono) running alongside Pi
2. **`pi-callback` CLI** that POSTs to `localhost:PORT/session/:id/tool`
3. **Env injection** via `bash` tool interception (prepend `export PI_SESSION_ID=...`)
4. **Timeout bypass** via AST detection of `pi-callback` in bash commands
5. **Direct tool endpoint** (`/tool`) that executes tools without LLM

This is ~500-1000 LOC but would fully close the gap.

## Cross-references

- [dacmicu/concept](../dacmicu/concept.md) — DACMICU primitive definition
- [dacmicu/pi-port](../dacmicu/pi-port.md) — Porting DACMICU to Pi
- [dacmicu/implementation-plan](../dacmicu/implementation-plan.md) — Concrete build plan
- [ecosystem/evolve-systems](../ecosystem/evolve-systems.md) — Evolve systems survey
- [ecosystem/loop-extensions](../ecosystem/loop-extensions.md) — Loop extensions survey
- [implementations/pi-evolve-extension](../implementations/pi-evolve-extension.md) — MATS-style branched-variant extension (M3, M13)
- [implementations/pi-callback-extension](../implementations/pi-callback-extension.md) — Proposed Unix-socket callback for M1 gap closure
- MetaHarness [deterministic-agent-loops](../../../../MetaHarness/llm-wiki/concepts/deterministic-agent-loops.md) — Research positioning
