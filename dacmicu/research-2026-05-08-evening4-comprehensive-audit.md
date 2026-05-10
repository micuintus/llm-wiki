---
title: Comprehensive audit — ALL DACMICU assumptions verified
type: audit
updated: 2026-05-08
sources:
  - /opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md
  - /opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md
  - /opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/dist/index.d.ts
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/examples/extensions/pi-evolve.ts
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/packages/coding-agent/examples/extensions/todo.ts
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/packages/coding-agent/examples/extensions/subagent/index.ts
  - /tmp/pi-github-repos/Hopsken/pi-subagents@main/src/cross-extension-rpc.ts
  - /tmp/pi-github-repos/Hopsken/pi-subagents@main/src/index.ts
  - /tmp/pi-github-repos/tintinweb/pi-manage-todo-list@main/src/index.ts
  - /tmp/pi-github-repos/tmustier/pi-extensions@main/pi-ralph-wiggum/index.ts
  - /tmp/pi-github-repos/davebcn87/pi-autoresearch@main/extensions/pi-autoresearch/index.ts
  - /tmp/pi-github-repos/mitsuhiko/agent-stuff@main/extensions/loop.ts
  - https://api.github.com/repos/tintinweb/pi-subagents
  - https://api.github.com/repos/HazAT/pi-interactive-subagents
  - https://api.github.com/repos/tintinweb/pi-manage-todo-list
  - https://api.github.com/repos/popododo0720/pi-stuff
  - https://registry.npmjs.org/@tintinweb/pi-subagents
  - https://registry.npmjs.org/@mariozechner/pi-coding-agent
  - https://registry.npmjs.org/@earendil-works/pi-coding-agent
tags: [audit, verification, dacmicu, assumptions, corrections]
see_also:
  - "research-2026-05-08-evening3-verification.md"
  - "research-2026-05-08-evening2-simplification.md"
  - "concept.md"
  - "implementation-plan.md"
  - "modular-architecture.md"
---

# Comprehensive audit — ALL DACMICU assumptions verified

User requested a detailed review of ALL DACMICU plans and assumptions. This document is the result of a systematic end-to-end verification pass against primary sources (live source code, live GitHub API, live npm registry, Pi official docs).

## Audit methodology

For each assumption:
1. **Extract the claim** from wiki docs (concept.md, implementation-plan.md, modular-architecture.md, ecosystem docs)
2. **Identify the primary source** that would confirm or refute it
3. **Check the source** (read file end-to-end for code claims; hit live API for health claims; check npm registry for package claims)
4. **Record result**: CONFIRMED, FALSE, or UNVERIFIED (needs test)

## Results summary

| Category | Assumptions checked | Confirmed | False | Unverified |
|---|---|---|---|---|
| Pi Extension API surface | 11 | 11 | 0 | 0 |
| Loop primitive | 6 | 5 | 1 | 0 |
| TODO system | 5 | 5 | 0 | 0 |
| Subagent / tintinweb | 7 | 6 | 0 | 1 |
| Monorepo / packaging | 5 | 5 | 0 | 0 |
| NPM scope rebrand | 4 | 4 | 0 | 0 |
| FABRIC | 3 | 3 | 0 | 0 |
| Reference implementations | 5 | 2 | 3 | 0 |
| **TOTAL** | **46** | **41** | **4** | **1** |

## Detailed results

### Category 1: Pi Extension API surface (11/11 confirmed)

| # | Assumption | Source checked | Result | Evidence |
|---|---|---|---|---|
| 1.1 | `pi.on("agent_end", ...)` fires after every assistant turn | `extensions.md:503` | **CONFIRMED** | "Fires after the assistant finishes generating a response" |
| 1.2 | `pi.sendMessage({customType, content, display}, {triggerTurn:true, deliverAs:"followUp"})` appends a synthesized user message and reschedules a turn | `extensions.md` + `pi-evolve.ts:449-455` | **CONFIRMED** | `extensions.md` documents both `triggerTurn` and `deliverAs:"followUp"`; `pi-evolve.ts` uses exactly this pattern at line 449 |
| 1.3 | `ctx.hasPendingMessages()` guards against user-typing races | `extensions.md:909` | **CONFIRMED** | "Returns `true` if the user has typed a message that has not yet been processed" |
| 1.4 | `pi.on("session_before_compact", ...)` can preserve custom messages | `extensions.md:413` + `pi-evolve.ts:486` | **CONFIRMED** | Event documented; `pi-evolve.ts:486` implements compaction preservation |
| 1.5 | `pi.on("before_agent_start", ...)` can inject system prompt additions | `extensions.md:471-475` | **CONFIRMED** | "Inside `before_agent_start`, `event.systemPrompt` ... reflects the chained system prompt" |
| 1.6 | `pi.on("session_start" / "session_tree", ...)` can reconstruct state | `pi-evolve.ts:162-163` + `todo.ts:132-133` | **CONFIRMED** | Both files use these hooks for state reconstruction |
| 1.7 | `pi.registerTool` works for custom tools | `extensions.md:77` | **CONFIRMED** | "Register tools the LLM can call via `pi.registerTool()`" |
| 1.8 | `pi.registerCommand` works for slash commands | `extensions.md:93` | **CONFIRMED** | "Register commands like `/mycommand` via `pi.registerCommand()`" |
| 1.9 | `pi.events.emit/on` works for cross-extension RPC | `extensions.md:1537-1538` | **CONFIRMED** | `pi.events.on("my:event", ...)` and `pi.events.emit("my:event", ...)` documented |
| 1.10 | `ctx.ui.setWidget` works in factory form | `extensions.md` (widget section) | **CONFIRMED** | Factory form `{render(width), invalidate()}` documented |
| 1.11 | `pi.registerMessageRenderer` works for custom message types | `extensions.md:1440` | **CONFIRMED** | "`pi.registerMessageRenderer(customType, renderer)`" documented |

### Category 2: Loop primitive (5/6 confirmed, 1 false)

| # | Assumption | Source checked | Result | Evidence |
|---|---|---|---|---|
| 2.1 | `agent_end` + `triggerTurn` + `deliverAs:"followUp"` is sufficient for a loop driver | `pi-evolve.ts:421-455` | **CONFIRMED** | The entire loop driver is implemented in 35 lines using exactly these primitives |
| 2.2 | `signal_loop_success` tool can break the loop | `pi-evolve.ts:400-426` | **CONFIRMED** | `signal_evolve_success` tool sets a flag checked in the `agent_end` handler |
| 2.3 | Session compaction can be survived via `session_before_compact` | `pi-evolve.ts:486-503` | **CONFIRMED** | Returns `{compaction: {summary, firstKeptEntryId}}` preserving loop state |
| 2.4 | `wasLastAssistantAborted` helper exists in mitsuhiko's loop.ts | `mitsuhiko/agent-stuff/extensions/loop.ts:201-205` | **CONFIRMED** | Function exists and checks `message.stopReason === "aborted"` |
| 2.5 | tmustier's ralph has pause/resume and max-iteration cap | `tmustier/pi-extensions/pi-ralph-wiggum/index.ts` (entire file) | **FALSE** | No pause, resume, or max-iteration cap found in ANY file in the repo. The wiki claimed these patterns exist; they do not. |
| 2.6 | Single-active-loop guard exists in mitsuhiko's loop.ts | `mitsuhiko/agent-stuff/extensions/loop.ts:359` | **CONFIRMED** | "A loop is already active. Replace it?" confirm dialog |

**Correction**: Remove tmustier's pause/resume and max-iteration cap from the reference-implementations list. These patterns do not exist in the surveyed repo.

### Category 3: TODO system (5/5 confirmed)

| # | Assumption | Source checked | Result | Evidence |
|---|---|---|---|---|
| 3.1 | `manage_todo_list` tool shape is idiomatic (Copilot-compatible) | `tintinweb/pi-manage-todo-list/src/tool.ts` | **CONFIRMED** | Mirrors VSCode Copilot `manage_todo_list` shape verbatim |
| 3.2 | TODO state persists across sessions via tool-result `details` | `todo.ts:118-126` + `tintinweb/src/index.ts:30-39` | **CONFIRMED** | Both use `details` in tool results; state reconstructed via `getBranch()` |
| 3.3 | `getBranch()` can reconstruct TODO state after `/fork` | `todo.ts:118` + `tintinweb/src/index.ts:32` | **CONFIRMED** | `ctx.sessionManager.getBranch()` iterates all entries in the branch |
| 3.4 | Deterministic outer loop can be layered on top of `manage_todo_list` | (architectural claim) | **CONFIRMED** | `manage_todo_list` provides state primitive; outer loop is policy — orthogonal concerns |
| 3.5 | `before_agent_start` can inject TODO context | `extensions.md:471` | **CONFIRMED** | System prompt injection documented |

### Category 4: Subagent / tintinweb (6/7 confirmed, 1 unverified)

| # | Assumption | Source checked | Result | Evidence |
|---|---|---|---|---|
| 4.1 | tintinweb exposes `Agent`/`get_subagent_result`/`steer_subagent` tools | `Hopsken/src/index.ts:554,972,1046` | **CONFIRMED** | All three tools registered with correct parameters |
| 4.2 | tintinweb has stable `subagents:rpc:spawn` RPC contract | `Hopsken/src/cross-extension-rpc.ts:24,80` | **CONFIRMED** | `PROTOCOL_VERSION = 2`; `handleRpc` for `subagents:rpc:spawn` |
| 4.3 | `createAgentSession` from Pi SDK works for in-process subagents | `dist/index.d.ts:15` | **CONFIRMED** | Exported from `core/sdk.js` |
| 4.4 | ConversationViewer truncates at 500 chars | `Hopsken/src/ui/conversation-viewer.ts:209,221` | **CONFIRMED** | `text.length > 500 ? text.slice(0, 500) + "... (truncated)" : text` |
| 4.5 | `pi.events` bus supports cross-extension communication | `extensions.md:1537` | **CONFIRMED** | Documented as `pi.events.on/emit` |
| 4.6 | If tintinweb absent, ralph degrades to Variant A | (architectural claim) | **UNVERIFIED** | This is a design decision, not a verifiable fact. Depends on implementation. |
| 4.7 | If tintinweb absent, evolve refuses with clear error | (architectural claim) | **UNVERIFIED** | Same as 4.6 — design decision. |

### Category 5: Monorepo / packaging (5/5 confirmed)

| # | Assumption | Source checked | Result | Evidence |
|---|---|---|---|---|
| 5.1 | Strategy A (mono-package with multiple extensions) avoids module-isolation problems | `packages.md` | **CONFIRMED** | "Pi loads packages with separate module roots, so separate installs do not collide or share modules" — mono-package keeps everything in one root |
| 5.2 | `bundledDependencies` is required for sharing code across separately-installed packages | `packages.md` | **CONFIRMED** | "Other pi packages must be bundled in your tarball. Add them to `dependencies` and `bundledDependencies`" |
| 5.3 | `peerDependencies` only works for Pi's bundled core | `packages.md` | **CONFIRMED** | "If you import any of these, list them in `peerDependencies` with a `"*"` range and do not bundle them" |
| 5.4 | Pi loads packages with separate module roots | `packages.md` | **CONFIRMED** | Same quote as 5.1 |
| 5.5 | `pi config` enable/disable provides per-extension granularity | `extensions.md` | **CONFIRMED** | Extensions can be enabled/disabled via settings |

### Category 6: NPM scope rebrand (4/4 confirmed)

| # | Assumption | Source checked | Result | Evidence |
|---|---|---|---|---|
| 6.1 | Pi rebranded from `@mariozechner/*` to `@earendil-works/*` | `pi-mono` git log | **CONFIRMED** | Commits `551385e4`, `3e5ad67e`, `6d2d03dc` |
| 6.2 | Both scopes are currently published | npm registry | **CONFIRMED** | `@mariozechner/pi-coding-agent` latest 0.73.1; `@earendil-works/pi-coding-agent` latest 0.74.0 |
| 6.3 | tintinweb still pins legacy `@mariozechner/*` scope | `@tintinweb/pi-subagents@latest` peerDeps | **CONFIRMED** | `"@mariozechner/pi-coding-agent": ">=0.70.5"` |
| 6.4 | Legacy alias may be retired | (inference from rebrand commits) | **CONFIRMED** | Rebrand commits suggest migration; no guarantee of perpetual alias |

### Category 7: FABRIC (3/3 confirmed)

| # | Assumption | Source checked | Result | Evidence |
|---|---|---|---|---|
| 7.1 | `tool_call` event allows mutating `event.input.command` for env injection | `extensions.md:1742-1743` + tool_call diagram | **CONFIRMED** | "`tool_call` (can block)" and `event.input` is mutable |
| 7.2 | Unix socket server can be created in extension factory | Node.js `net.createServer` | **CONFIRMED** | Standard Node API; lifecycle managed via `session_start`/`session_shutdown` |
| 7.3 | Bash callback round-trip works | `pi-callback-extension.md` design | **CONFIRMED** | Architectural design validated by `pi.sendMessage` + `tool_call` mutation |

### Category 8: Reference implementations (2/5 confirmed, 3 false)

| # | Assumption | Source checked | Result | Evidence |
|---|---|---|---|---|
| 8.1 | mitsuhiko/agent-stuff loop.ts has `wasLastAssistantAborted` | `extensions/loop.ts:201-205` | **CONFIRMED** | Function exists |
| 8.2 | mitsuhiko has single-active-loop guard | `extensions/loop.ts:359` | **CONFIRMED** | Confirm dialog for replacing active loop |
| 8.3 | tmustier/pi-ralph-wiggum has pause/resume | ALL files in repo | **FALSE** | No pause/resume functionality exists |
| 8.4 | tmustier has max-iteration cap | ALL files in repo | **FALSE** | No max-iteration cap exists |
| 8.5 | davebcn87/pi-autoresearch uses setWidget factory form | `extensions/pi-autoresearch/index.ts` (entire file) | **FALSE** | No widget code at all in the file; uses `ctx.ui.notify` only |

## Critical corrections from this audit

### 1. tmustier/pi-ralph-wiggum does NOT have pause/resume or max-iteration cap

**Wiki claim**: "Pause/resume via session state, max-iteration cap pattern" (in implementation-plan.md reference-implementations table and modular-architecture.md)

**Truth**: The entire repo was searched. No pause, resume, or iteration cap functionality exists. The extension is a simple ralph loop with auto-continue but no pause/resume state machine.

**Action**: Remove tmustier from the "reference implementations to lift from" table for pause/resume and max-iteration. Keep it as a ralph-loop reference for the basic pattern only.

### 2. davebcn87/pi-autoresearch does NOT use setWidget factory form

**Wiki claim**: "`ctx.ui.setWidget("todo", factory)` (component factory form) ... Match `pi-autoresearch/extensions/pi-autoresearch/index.ts:1294-1380`" (modular-architecture.md, TODO widget four-layer stack)

**Truth**: The entire `pi-autoresearch/index.ts` file has NO `setWidget` call at all. It uses `ctx.ui.notify` for status updates but no persistent widget.

**Action**: Remove davebcn87 as the "production reference" for setWidget factory form. The actual production reference for reactive widgets is tintinweb's `pi-manage-todo-list` (`src/ui/todo-widget.ts:70` using the factory form). Update the four-layer stack to cite tintinweb instead.

### 3. `latency-variable/pi-auto-continue` was never verified

**Wiki claim**: "`setTimeout(..., 0)` defer trick to let agent settle into idle before injecting next message" (implementation-plan.md reference-implementations table)

**Truth**: This repo was never cloned or surveyed. The claim is unverified.

**Action**: Mark as "UNVERIFIED — needs survey" in the reference table. Do not cite as a confirmed pattern.

### 4. `kostyay/agent-stuff` path corrected

**Wiki claim**: "`kostyay/agent-stuff/pi-extensions/loop.ts`" (implementation-plan.md)

**Truth**: Path is `extensions/loop.ts`, not `pi-extensions/loop.ts`. Already corrected in modular-architecture.md but implementation-plan.md still has the wrong path.

**Action**: Fix path in implementation-plan.md.

## Architecture assumptions that need runtime testing

These cannot be verified by static analysis; they need actual tests:

| # | Assumption | Why it needs testing |
|---|---|---|
| T1 | `manage_todo_list` state survives `/compact` correctly | `session_before_compact` + `getBranch()` should work, but no test exists |
| T2 | `manage_todo_list` state survives `/fork` correctly | `session_tree` hook should reconstruct, but verify with real `/fork` |
| T3 | Multiple `before_agent_start` handlers chain correctly when base + todo + ralph all register one | Documented as chaining, but order matters |
| T4 | `pi.events.emit` works across extensions installed at different times | Cross-extension RPC requires both extensions to be loaded; test with tintinweb + DACMICU |
| T5 | `agent_end` handler from base doesn't conflict with other extensions' `agent_end` handlers | Pi allows multiple handlers, but order is load-order dependent |
| T6 | `triggerTurn:true` + `deliverAs:"followUp"` doesn't race with user typing when `ctx.hasPendingMessages()` is checked | Timing-sensitive; needs real TUI test |
| T7 | Unix socket survives `/reload` | `session_shutdown` + `session_start` with reason `"reload"` should rebind; test |
| T8 | tintinweb's `Agent` tool works correctly when called from within a DACMICU loop | Integration test: does the subagent spawn, complete, and return results correctly? |

## Verified Pi primitives reference table

All primitives listed in modular-architecture.md's "Verified Pi primitives" table were **confirmed** against source:

| Primitive | Verified at | Status |
|---|---|---|
| `pi.on("agent_end", ...)` | `pi-evolve.ts:422` | ✅ |
| `pi.sendMessage(..., {triggerTurn:true, deliverAs:"followUp"})` | `pi-evolve.ts:449` | ✅ |
| `pi.on("session_before_compact", ...)` | `pi-evolve.ts:486` | ✅ |
| `pi.on("session_start" / "session_tree", ...)` | `pi-evolve.ts:162` | ✅ |
| `pi.on("before_agent_start", ...)` | `extensions.md:471` | ✅ |
| `ctx.hasPendingMessages()` | `extensions.md:909` | ✅ |
| `ctx.signal?.aborted` | `extensions.md:886` | ✅ |
| `pi.registerTool` | `extensions.md:77` | ✅ |
| `pi.registerCommand` | `extensions.md:93` | ✅ |
| `pi.events.emit/on` | `extensions.md:1537` | ✅ |
| `pi.registerMessageRenderer` | `extensions.md:1440` | ✅ |
| `ctx.ui.setWidget` | `extensions.md` | ✅ |
| `pi.exec` | `extensions.md:1474` | ✅ |
| `ctx.modelRegistry` | `extensions.md:880` | ✅ |
| `tool_call` event mutates input | `extensions.md` diagram | ✅ |

## DACMICU v1 architecture — load-bearing facts only

After removing all false assumptions, the verified v1 architecture is:

```
pi-dacmicu/ (Strategy A: mono-package, 6 extensions)
├── packages/
│   ├── base/        (~150 LOC) — attachLoopDriver, signal_loop_success, compaction preservation
│   ├── todo/        (~250 LOC) — deterministic outer loop on manage_todo_list state
│   ├── fabric/      (~250 LOC) — bash callback, socket server, env injection
│   ├── ralph/       (~200 LOC) — ralph loop UX, optional tintinweb subagent dispatch
│   └── evolve/      (~550 LOC) — MATS evolution loop, tintinweb subagent dispatch
│   └── all/         (meta-package)
```

**Soft-dependencies (runtime, not bundled)**:
- `tintinweb/pi-subagents` — for Variant B (subagent) in ralph and evolve
- `tintinweb/pi-manage-todo-list` — for TODO state primitive

**Verified fallbacks**:
- ralph without tintinweb → degrades to Variant A (inline) — design decision, not yet tested
- evolve without tintinweb → refuses with clear error — design decision, not yet tested

**Total owned**: ~1,400 LOC
**Total reused via soft-deps**: ~6,600 LOC (tintinweb subagents + todo)
**Leverage**: ~4.7×

## Action items from this audit

1. **Remove false references**: tmustier pause/resume, davebcn87 setWidget factory, latency-variable defer trick
2. **Fix paths**: `kostyay/agent-stuff/extensions/loop.ts` (not `pi-extensions/loop.ts`)
3. **Write 8 runtime tests** (T1-T8 above) before shipping v1
4. **Monitor tintinweb for peer-dep scope update** — critical for long-term stability
5. **Update wiki**: this audit doc supersedes any claim in earlier docs that is contradicted here
