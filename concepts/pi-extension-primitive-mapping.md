---
title: Pi Extension Primitives — Bidirectional System↔Hook Mapping
type: reference
updated: 2026-05-07
sources:
  - "../../examples/extensions/"
  - "../../packages/coding-agent/src/core/extensions/types.ts"
  - "../../llm-wiki/ecosystem/loop-extensions.md"
  - "../../llm-wiki/ecosystem/evolve-systems.md"
  - "../../llm-wiki/ecosystem/todo-visualizations.md"
  - "../../llm-wiki/ecosystem/subagents.md"
  - "../../llm-wiki/dacmicu/implementation-plan.md"
  - "../../examples/extensions/pi-evolve.ts"
tags: [concept, extension, hooks, primitive-mapping, architecture, ecosystem]
---

# Pi Extension Primitives — Bidirectional System↔Hook Mapping

A bidirectional reference: every deterministic control system built as a Pi extension, mapped to the Pi hooks/primitives it uses — and every Pi hook/primitive, mapped to the systems that depend on it.

## Part 1: Systems → Primitives

Deterministic control systems built as Pi extensions, categorized by purpose.

### 1.1 Loop / Iteration Systems

Systems that repeat agent turns until a condition is met.

| System | Author | Pattern | Primitives Used |
|--------|--------|---------|-----------------|
| **mitsuhiko/agent-stuff** | Armin Ronacher | In-process DACMICU loop | `agent_end` → `sendMessage({triggerTurn:true}, {deliverAs:"followUp"})`; `registerTool("signal_loop_success")`; `wasLastAssistantAborted` detection; `session_before_compact` |
| **kostyay/ralph-loop** | Kostya Yegorov | In-process loop driver | `agent_end` → `sendMessage()`; `registerTool("signal_loop_success")` |
| **jayshah5696/pi-ralph-loop** | Jay Shah | In-process loop | `agent_end` → `sendMessage()`; `registerTool("signal_loop_success")` |
| **@tmustier/pi-ralph-wiggum** | Thomas Mustier | In-process loop + state injection | `agent_end` → `sendMessage()`; `before_agent_start` (inject todo + state file); `session_start` (rehydrate); `registerTool("signal_loop_success")` |
| **rahulmutt/pi-ralph** | Rahul Muttineni | Branched-session loop | `agent_end` → `sendMessage()`; `fork()` per iteration; `registerTool("signal_loop_success")` |
| **ralph-loop-pi** (subprocess) | Various | Subprocess + RPC loop | `agent_end` → `sendMessage()`; `--mode rpc` subprocess; custom renderers; `registerTool("signal_loop_success")` |
| **pi-until-done** | Various | Until-done pattern | `agent_end` → conditional `sendMessage()`; `registerTool("signal_done")` |
| **Claude Code /loop** | Anthropic | Cron-scheduled loop | External cron; not a Pi extension |

### 1.2 TODO / Task Tracking Systems

Systems that track tasks across agent turns.

| System | Author | Pattern | Primitives Used |
|--------|--------|---------|-----------------|
| **pi-todoist** | Unknown | Todo tool + widget | `registerTool("todo")`; `registerCommand("todos")`; `session_start`/`session_tree` (reconstruct from `details`); custom TUI component |
| **pi-todo** | Unknown | Simple todo list | `registerTool("todo")`; `before_agent_start` (inject todo list); `session_start` (rehydrate) |
| **pi-taskwarrior** | Unknown | TaskWarrior integration | `registerTool("task")`; `exec("task", ...)`; `registerCommand("tasks")` |
| **@tmustier/pi-ralph-wiggum** | Thomas Mustier | Todo + loop combined | `registerTool("todo")`; `before_agent_start` (inject todo + state file); `agent_end` (loop driver); `session_start` (rehydrate) |

### 1.3 Subagent / Delegation Systems

Systems that spawn child agents for isolated tasks.

| System | Author | Pattern | Primitives Used |
|--------|--------|---------|-----------------|
| **pi-subagent** (builtin examples) | Pi team | Subagent extension | `registerTool("subagent")`; `fork()`/`newSession()`; `sendMessage()`; `session_before_fork` |
| **ralph-loop-pi** | Various | Fresh-process subagent | `--mode rpc` subprocess; custom renderers; `agent_end` → `sendMessage()` |
| **opencode /exec** | opencode team | HTTP subagent | Not Pi — uses `/session/:id/exec` endpoint |

### 1.4 Evolve / Optimization Systems

Systems that try variants, benchmark, keep/discard.

| System | Author | Pattern | Primitives Used |
|--------|--------|---------|-----------------|
| **pi-autoresearch** | davebcn87 | Linear hill-climbing | `registerTool("init_experiment")`; `registerTool("run_experiment")`; `registerTool("log_experiment")`; `agent_end` → `sendMessage()`; `before_agent_start` (inject state); `session_before_compact` (lossless snapshot); `session_start` (rehydrate); `registerCommand("/autoresearch")`; widget/dashboard |
| **pi-evolve** (this repo) | Voigt | MATS-style branched | `registerTool("init_experiment")`; `registerTool("run_experiment")`; `registerTool("log_experiment")`; `registerTool("signal_evolve_success")`; `agent_end` → `sendMessage()`; `before_agent_start` (inject ledger); `session_before_compact` (preserve state); `session_start`/`session_tree` (rehydrate) |

### 1.5 State Preservation / Checkpoint Systems

Systems that preserve state across sessions, forks, compactions.

| System | Author | Pattern | Primitives Used |
|--------|--------|---------|-----------------|
| **git-checkpoint** | Pi team | Git stash per turn | `turn_start` → `git stash create`; `session_before_fork` → offer restore; `tool_result` (track entry ID); `agent_end` (clear checkpoints) |
| **custom-compaction** | Pi team | Full-summary compaction | `session_before_compact` → custom summary with Gemini Flash; `convertToLlm` + `serializeConversation`; `complete()` API |
| **todo.ts** | Pi team | State in tool results | `registerTool("todo")`; `session_start`/`session_tree` → reconstruct from `details`; tool `details` field |
| **preset** | Pi team | Preset state tracking | `registerCommand("preset")`; `registerFlag("preset")`; `registerShortcut`; `before_agent_start` (inject preset context); `session_start` (rehydrate); `turn_start` → `appendEntry`; `setModel`/`setThinkingLevel`/`setActiveTools` |

### 1.6 Guard / Safety Systems

Systems that prevent or confirm destructive actions.

| System | Author | Pattern | Primitives Used |
|--------|--------|---------|-----------------|
| **dirty-repo-guard** | Pi team | Block session switch with dirty repo | `session_before_switch` → check `git status`; `session_before_fork` → check `git status`; `exec("git", ["status"])` |
| **protected-paths** | Pi team | Block edits to protected files | `tool_call` → block if path matches protected pattern |
| **confirm-destructive** | Pi team | Confirm destructive commands | `tool_call` → block + prompt user for confirmation |
| **permission-gate** | Pi team | Gate tool access by permission | `tool_call` → block based on permission level |

### 1.7 UI / Rendering Systems

Systems that customize the TUI appearance.

| System | Author | Pattern | Primitives Used |
|--------|--------|---------|-----------------|
| **message-renderer** | Pi team | Custom message rendering | `registerMessageRenderer("status-update")`; `sendMessage()` |
| **built-in-tool-renderer** | Pi team | Override tool rendering | `registerTool("read")` (override); `renderCall`/`renderResult` |
| **widget-placement** | Pi team | Widget positioning | Custom TUI components |
| **status-line** | Pi team | Status bar | Custom footer component |
| **custom-header** | Pi team | Header customization | `session_start` → inject header |
| **custom-footer** | Pi team | Footer customization | `registerCommand("footer")` |
| **titlebar-spinner** | Pi team | Titlebar animation | `agent_end` → stop spinner; `agent_start` → start spinner |
| **border-status-editor** | Pi team | Border styling | `agent_start`/`agent_end`/`session_shutdown`/`session_start`; `exec("git", ["branch"])`; `getThinkingLevel` |
| **rainbow-editor** | Pi team | Rainbow text effect | Custom rendering |
| **working-indicator** | Pi team | Working status indicator | `session_start` → show indicator; `registerCommand` |
| **doom-overlay** | Pi team | Overlay widget | `registerCommand("doom-overlay")`; overlay API |
| **overlay-test** | Pi team | Overlay testing | Various overlay commands |
| **overlay-qa-tests** | Pi team | Overlay QA suite | Multiple `registerCommand` for overlay tests |
| **modal-editor** | Pi team | Modal text editor | `registerCommand("modal-editor")`; modal API |
| **notify** | Pi team | Desktop notifications | `agent_end` → desktop notification; `execFile` |
| **hidden-thinking-label** | Pi team | Toggle thinking label | `session_start` → read settings; `registerCommand` |
| **mac-system-theme** | Pi team | macOS theme detection | `session_start` → detect theme; `session_shutdown` → cleanup |

### 1.8 Input / Command Systems

Systems that intercept or transform user input.

| System | Author | Pattern | Primitives Used |
|--------|--------|---------|-----------------|
| **input-transform** | Pi team | Transform user input | `input` event → mutate input text |
| **commands** | Pi team | List available commands | `registerCommand("commands")`; `getCommands()` |
| **send-user-message** | Pi team | Send messages programmatically | `sendUserMessage()` |
| **session-name** | Pi team | Name sessions | `setSessionName()`/`getSessionName()` |
| **bookmark** | Pi team | Bookmark entries | `registerCommand("bookmark")`; `setLabel()` |
| **file-trigger** | Pi team | Trigger on file changes | `session_start` → watch files; `sendMessage()` |
| **handoff** | Pi team | Handoff between agents | `registerCommand("handoff")`; mode switching |
| **ssh** | Pi team | SSH remote execution | `registerFlag("ssh")`; `registerTool` overrides (read/write/edit/bash); `session_start` (init SSH) |

### 1.9 Model / Provider Systems

Systems that manage models and providers.

| System | Author | Pattern | Primitives Used |
|--------|--------|---------|-----------------|
| **preset** | Pi team | Model/thinking/tool presets | `registerCommand("preset")`; `registerFlag`; `registerShortcut`; `setModel`/`setThinkingLevel`/`setActiveTools`; `getModel`/`getThinkingLevel`/`getActiveTools`/`getAllTools` |
| **model-status** | Pi team | Model status display | `model_select` event |
| **custom-provider-gitlab-duo** | Pi team | Custom provider | `registerProvider("gitlab-duo", {...})` |
| **system-prompt-header** | Pi team | Custom system prompt header | `agent_start` → inject header; `session_shutdown` → cleanup |
| **prompt-customizer** | Pi team | Prompt customization | `before_agent_start` → modify system prompt |

### 1.10 Tool Systems

Systems that add, override, or customize tools.

| System | Author | Pattern | Primitives Used |
|--------|--------|---------|-----------------|
| **tool-override** | Pi team | Override built-in tools | `registerTool("read")` override; `getActiveTools`/`getAllTools` |
| **dynamic-tools** | Pi team | Dynamic tool registration | `registerTool` at runtime; `refreshTools` |
| **bash-spawn-hook** | Pi team | Bash command interception | `registerTool("bash")` override; delegate to original |
| **inline-bash** | Pi team | Inline bash execution | `registerTool` for inline bash |
| **truncated-tool** | Pi team | Truncate long tool output | `registerTool`; custom execution with truncation |
| **minimal-mode** | Pi team | Minimal tool set | `registerTool` overrides for all built-ins; delegate to originals |
| **structured-output** | Pi team | Structured tool output | `registerTool` with JSON schema output |
| **with-deps** | Pi team | Tools with dependencies | `registerTool` with external deps |

### 1.11 Game / Interactive Systems

Systems that create interactive experiences.

| System | Author | Pattern | Primitives Used |
|--------|--------|---------|-----------------|
| **tic-tac-toe** | Pi team | Tic-tac-toe game | `registerTool` with `executionMode: "sequential"`; custom renderers |
| **snake** | Pi team | Snake game | `registerCommand`; custom rendering |
| **space-invaders** | Pi team | Space Invaders | Custom rendering |

### 1.12 Lifecycle / Utility Systems

Systems that hook into agent lifecycle.

| System | Author | Pattern | Primitives Used |
|--------|--------|---------|-----------------|
| **auto-commit-on-exit** | Pi team | Auto-commit on shutdown | `session_shutdown` → `git add -A` + `git commit` |
| **reload-runtime** | Pi team | Reload extensions | `registerCommand("reload-runtime")`; `registerTool` → `sendUserMessage("/reload-runtime")` |
| **shutdown-command** | Pi team | Shutdown command | `registerTool("shutdown")`; `registerCommand("shutdown")` |
| **trigger-compact** | Pi team | Manual compaction trigger | `turn_end` → check context; `compact()`; `registerCommand` |
| **hello** | Pi team | Hello world | `registerTool("hello")` |
| **pirate** | Pi team | Pirate mode | `registerCommand("pirate")`; `before_agent_start` → pirate system prompt |
| **summarize** | Pi team | Summarize conversation | `registerCommand("summarize")` |
| **question** | Pi team | Ask user questions | `registerTool("question")` |
| **questionnaire** | Pi team | Multi-question flow | `registerTool("questionnaire")` |
| **qna** | Pi team | Q&A mode | `registerCommand("qna")` |
| **event-bus** | Pi team | Inter-extension comms | `pi.events` (EventBus) |
| **rpc-demo** | Pi team | RPC subagent | `session_start`; `turn_start`/`turn_end`; `tool_call`; `session_before_switch`; `registerCommand` |
| **plan-mode** | Pi team | Plan-then-execute mode | `before_agent_start`; `agent_end`; `registerCommand` |
| **sandbox** | Pi team | Sandboxed execution | `registerTool` with sandboxed exec |
| **dynamic-resources** | Pi team | Dynamic resource loading | `resources_discover` event |

---

## Part 2: Primitives → Systems

Every Pi extension primitive (hook, action, registration), mapped to the systems that use it.

### 2.1 Event Hooks

#### `agent_end`
Fired when an agent loop completes. The primary hook for auto-looping.

**Used by**:
- All Ralph/loop extensions (mitsuhiko, kostyay, jayshah5696, ralph-wiggum, ralph-loop-pi, pi-until-done)
- pi-autoresearch (auto-resume next iteration)
- pi-evolve (auto-queue next iteration)
- titlebar-spinner (stop spinner)
- border-status-editor (reset border)
- notify (send desktop notification)
- plan-mode (transition to execute phase)
- git-checkpoint (clear checkpoints)

#### `before_agent_start`
Fired before each LLM call. Used to inject per-turn context.

**Used by**:
- @tmustier/pi-ralph-wiggum (inject todo list + state file)
- pi-autoresearch (inject autoresearch state)
- pi-evolve (inject selection.md excerpt + evolve rules)
- preset (inject preset context)
- system-prompt-header (inject header)
- prompt-customizer (customize system prompt)
- pirate (inject pirate system prompt)
- ssh (inject SSH context)
- plan-mode (inject plan context)
- claude-rules (inject Claude rules)

#### `session_before_compact`
Fired before context compaction. Used to preserve state.

**Used by**:
- mitsuhiko/agent-stuff (lossless state snapshot)
- pi-autoresearch (lossless state snapshot — best-in-class)
- pi-evolve (preserve evolve state in summary)
- custom-compaction (replace with Gemini Flash summary)

#### `session_start`
Fired when a session starts. Used to rehydrate state.

**Used by**:
- todo.ts (reconstruct todos from tool results)
- pi-evolve (reconstruct evolveState)
- pi-autoresearch (rehydrate from state files)
- @tmustier/pi-ralph-wiggum (rehydrate todo + state)
- preset (rehydrate preset state)
- rpc-demo (initialize RPC)
- working-indicator (show indicator)
- mac-system-theme (detect theme)
- hidden-thinking-label (read settings)
- custom-header (inject header)
- border-status-editor (read git branch)
- file-trigger (start watching)
- ssh (init SSH connection)
- git-checkpoint (init checkpoint map)

#### `session_tree`
Fired after navigating the session tree. Used to rehydrate state for the new branch.

**Used by**:
- todo.ts (reconstruct todos for new branch)
- pi-evolve (reconstruct evolveState for new branch)
- pi-autoresearch (rehydrate for new branch)

#### `turn_start`
Fired at the start of each turn.

**Used by**:
- preset (append preset state entry)
- rpc-demo (track turn)
- git-checkpoint (create stash checkpoint)
- trigger-compact (check context usage)

#### `turn_end`
Fired at the end of each turn.

**Used by**:
- rpc-demo (track turn)
- trigger-compact (check if compaction needed)

#### `tool_call`
Fired before a tool executes. Can block or mutate arguments.

**Used by**:
- protected-paths (block edits to protected files)
- confirm-destructive (block + confirm)
- permission-gate (block based on permissions)
- rpc-demo (track tool calls)

#### `tool_result`
Fired after a tool executes.

**Used by**:
- git-checkpoint (track entry ID for checkpoint mapping)

#### `tool_execution_start` / `tool_execution_update` / `tool_execution_end`
Fired during tool execution lifecycle.

**Used by**: (no known extensions use these directly — they are for progress tracking)

#### `message_start` / `message_update` / `message_end`
Fired during message streaming.

**Used by**: (no known extensions use these directly)

#### `agent_start`
Fired when an agent loop starts.

**Used by**:
- system-prompt-header (inject header)
- border-status-editor (style border)
- titlebar-spinner (start spinner)

#### `context`
Fired before provider request. Can modify messages.

**Used by**: (no known extensions)

#### `before_provider_request`
Fired before HTTP request. Can replace payload.

**Used by**: (no known extensions)

#### `after_provider_response`
Fired after HTTP response.

**Used by**: (no known extensions)

#### `session_before_switch`
Fired before switching sessions. Can cancel.

**Used by**:
- dirty-repo-guard (block if dirty repo)
- rpc-demo (cleanup)

#### `session_before_fork`
Fired before forking. Can cancel.

**Used by**:
- dirty-repo-guard (block if dirty repo)
- git-checkpoint (offer to restore code state)

#### `session_compact`
Fired after compaction.

**Used by**: (no known extensions)

#### `session_shutdown`
Fired before shutdown.

**Used by**:
- auto-commit-on-exit (git commit)
- system-prompt-header (cleanup)
- mac-system-theme (cleanup)
- border-status-editor (cleanup)

#### `session_before_tree`
Fired before tree navigation.

**Used by**: (no known extensions)

#### `model_select`
Fired when model changes.

**Used by**:
- model-status (update status)

#### `thinking_level_select`
Fired when thinking level changes.

**Used by**: (no known extensions)

#### `user_bash`
Fired when user runs a bash command.

**Used by**: (no known extensions)

#### `input`
Fired when user submits input. Can mutate.

**Used by**:
- input-transform (transform input text)

#### `resources_discover`
Fired after session start for resource discovery.

**Used by**:
- dynamic-resources (provide additional resource paths)

### 2.2 Registration Primitives

#### `registerTool`
Register an LLM-callable tool.

**Used by**: Almost every extension. Notable:
- All loop extensions (`signal_loop_success`)
- All evolve extensions (`init_experiment`, `run_experiment`, `log_experiment`)
- All TODO extensions (`todo`)
- All subagent extensions (`subagent`)
- tool-override, bash-spawn-hook, minimal-mode (override built-ins)
- dynamic-tools (runtime registration)
- structured-output, truncated-tool, inline-bash
- tic-tac-toe, snake (game tools)
- ssh (remote read/write/edit/bash)
- hello, question, questionnaire
- reload-runtime, shutdown-command
- sandbox, with-deps

#### `registerCommand`
Register a user slash command.

**Used by**:
- todo.ts (`/todos`)
- preset (`/preset`)
- pi-autoresearch (`/autoresearch`)
- commands (`/commands`)
- message-renderer (`/status`)
- bookmark (`/bookmark`, `/unbookmark`)
- custom-footer (`/footer`)
- handoff (`/handoff`)
- notify (implicit)
- hidden-thinking-label (`/thinking-label`)
- doom-overlay (`/doom-overlay`)
- modal-editor (`/modal-editor`)
- overlay-test, overlay-qa-tests (many overlay commands)
- rpc-demo (`/rpc-input`, `/rpc-editor`, `/rpc-prefill`)
- ssh (`/ssh`)
- working-indicator (`/working-indicator`)
- reload-runtime (`/reload-runtime`)
- shutdown-command (`/shutdown`)
- trigger-compact (`/trigger-compact`)
- pirate (`/pirate`)
- summarize (`/summarize`)
- qna (`/qna`)
- plan-mode (plan commands)

#### `registerShortcut`
Register a keyboard shortcut.

**Used by**:
- preset (`Ctrl+Shift+U`)

#### `registerFlag`
Register a CLI flag.

**Used by**:
- preset (`--preset`)
- ssh (`--ssh`)

#### `registerMessageRenderer`
Register custom message rendering.

**Used by**:
- message-renderer (`status-update`)

#### `registerProvider`
Register a custom model provider.

**Used by**:
- custom-provider-gitlab-duo (`gitlab-duo`)

### 2.3 Action Primitives

#### `sendMessage`
Send a custom message to the session. With `triggerTurn:true`, this is the DACMICU primitive.

**Used by**:
- All loop extensions (queue next iteration)
- pi-autoresearch (auto-resume)
- pi-evolve (auto-loop)
- file-trigger (trigger on file change)
- message-renderer (send status)
- rpc-demo (send RPC messages)

#### `sendUserMessage`
Send a user message. Triggers a turn.

**Used by**:
- reload-runtime (`/reload-runtime` as followUp)
- send-user-message (demo)

#### `appendEntry`
Append a non-LLM entry to the session.

**Used by**:
- preset (append preset state)

#### `setSessionName` / `getSessionName`
Set/get session display name.

**Used by**:
- session-name

#### `setLabel`
Set a label on an entry.

**Used by**:
- bookmark (`/bookmark`, `/unbookmark`)

#### `exec`
Execute a shell command.

**Used by**:
- dirty-repo-guard (`git status`)
- auto-commit-on-exit (`git add`, `git commit`)
- git-checkpoint (`git stash create`/`apply`)
- border-status-editor (`git branch`)
- mac-system-theme (`defaults read`)
- notify (PowerShell for Windows toast)
- ssh (SSH command execution)
- truncated-tool (`execSync`)
- pi-evolve (`git checkout`, `git commit`, `git reset`)
- pi-autoresearch (`git commit`, `git revert`)
- todo-taskwarrior (`task` command)

#### `getActiveTools` / `getAllTools` / `setActiveTools`
Tool inventory management.

**Used by**:
- preset (get/set active tools)
- tool-override (get original tools)
- minimal-mode (get original tools)
- commands (list commands)

#### `getCommands`
Get available slash commands.

**Used by**:
- commands (`/commands`)

#### `setModel` / `getThinkingLevel` / `setThinkingLevel`
Model and thinking level management.

**Used by**:
- preset (set model, thinking level)
- model-status (model selection)

#### `events` (EventBus)
Shared event bus for inter-extension communication.

**Used by**:
- event-bus (demo)

---

## Part 3: Core Primitive Combinations

Common combinations of primitives that form architectural patterns.

### Pattern A: DACMICU Auto-Loop
```
agent_end
  → check state (not stopped, no pending)
  → sendMessage({triggerTurn:true}, {deliverAs:"followUp"})
```
**Systems**: mitsuhiko, kostyay, jayshah5696, ralph-wiggum, pi-autoresearch, pi-evolve, pi-until-done

### Pattern B: State Rehydration
```
session_start + session_tree
  → scan getBranch() for tool results
  → reconstruct state from details fields
```
**Systems**: todo.ts, pi-evolve, pi-autoresearch, ralph-wiggum, preset

### Pattern C: Per-Turn Context Injection
```
before_agent_start
  → read external state file
  → return {systemPrompt: event.systemPrompt + extra}
```
**Systems**: ralph-wiggum, pi-autoresearch, pi-evolve, preset, system-prompt-header, prompt-customizer, pirate, ssh, plan-mode, claude-rules

### Pattern D: Compaction-Aware State
```
session_before_compact
  → serialize state into summary
  → return {compaction: {summary, firstKeptEntryId, tokensBefore}}
```
**Systems**: mitsuhiko, pi-autoresearch, pi-evolve, custom-compaction

### Pattern E: Git State Preservation
```
turn_start → git stash create
tool_result → map entry ID to stash ref
session_before_fork → offer restore
agent_end → clear checkpoints
```
**Systems**: git-checkpoint

### Pattern F: Tool Override with Delegation
```
registerTool("bash")
  → execute() delegates to original tool
  → optionally mutates params/env
```
**Systems**: bash-spawn-hook, minimal-mode, tool-override, built-in-tool-renderer

### Pattern G: Permission-Based Gating
```
tool_call
  → check condition
  → return {block:true, reason:"..."} or mutate event.input
```
**Systems**: protected-paths, confirm-destructive, permission-gate

### Pattern H: Subagent Spawn
```
registerTool("subagent")
  → execute() calls fork() or newSession()
  → child runs isolated task
  → result returned to parent
```
**Systems**: pi-subagent, ralph-loop-pi, handoff

---

## Cross-references

- [ecosystem/loop-extensions](../ecosystem/loop-extensions.md) — Detailed loop extension survey
- [ecosystem/evolve-systems](../ecosystem/evolve-systems.md) — Evolve systems survey
- [ecosystem/todo-visualizations](../ecosystem/todo-visualizations.md) — TODO extension survey
- [ecosystem/subagents](../ecosystem/subagents.md) — Subagent landscape
- [dacmicu/implementation-plan](../dacmicu/implementation-plan.md) — DACMICU build plan
- [concepts/deterministic-agent-control-mechanisms](deterministic-agent-control-mechanisms.md) — Cross-system mechanism taxonomy
- [implementations/pi-evolve-extension](../implementations/pi-evolve-extension.md) — Branched-variant extension using 6 hooks
- [implementations/pi-callback-extension](../implementations/pi-callback-extension.md) — Proposed callback extension using tool_call + message_end hooks
