---
title: Subagent ecosystem — comprehensive survey (rev 2026-05-08)
type: concept
updated: 2026-05-08
sources:
  - https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent/examples/extensions/subagent
  - https://github.com/badlogic/pi-mono/issues/552
  - https://github.com/aleclarson/pi-subagent
  - https://github.com/jamwil/pi-subagent
  - https://github.com/nicobailon/pi-subagents
  - https://github.com/Hopsken/pi-subagents
  - https://github.com/tintinweb/pi-subagents
  - https://github.com/HazAT/pi-interactive-subagents
  - https://github.com/elpapi42/pi-minimal-subagent
  - https://github.com/espennilsen/pi/tree/main/extensions/pi-subagent
  - https://github.com/cmf/pi-subagent
  - https://github.com/tuansondinh/pi-fast-subagent
  - https://github.com/drsh4dow/pi-delegate
  - https://github.com/lnilluv/pi-ralph-loop
  - https://github.com/Jberlinsky/oh-my-pi
  - https://github.com/anomalyco/opencode/pull/20074
  - https://github.com/anomalyco/opencode/pull/14814
  - https://github.com/anomalyco/opencode/issues/3291
  - https://github.com/anomalyco/opencode/issues/16462
  - https://github.com/anomalyco/opencode/issues/5826
  - https://github.com/anomalyco/opencode/issues/17838
tags: [subagent, extension, dacmicu, in-process, navigability, viewer, multiplexer, opencode-comparison]
see_also:
  - "../architecture/subprocess-rpc-rendering.md"
  - "../dacmicu/modular-architecture.md"
  - "../dacmicu/research-2026-05-08-subagent-and-todo.md"
  - "loop-extensions.md"
  - "todo-visualizations.md"
---

# Subagent ecosystem — comprehensive survey

Deep cascade survey rev 2026-05-08, expanded from earlier 5-extension survey to **12+ extensions** plus a corrected comparison against opencode's actual session navigation model (post-PR #14814).

Supersedes earlier overclaim of "Hopsken's ConversationViewer is the gold-standard opencode-Tab-switch analog" — that comparison was based on a misunderstanding of opencode's UX. **Opencode itself has no tabs**; what it has is session cycling between full-screen views. The actual gap is narrower than previously claimed, and Pi has a *different* extension (`HazAT/pi-interactive-subagents`) that mirrors opencode's UX more closely via terminal multiplexer integration.

## Repos surveyed (12+ extensions across 4 architectural patterns)

### Subprocess-based (spawn `pi --mode json -p`)

| Repo | LOC | Distinguishing features | Status |
|---|---|---|---|
| `pi-mono/.../examples/extensions/subagent/` | ~990 | In-tree reference; `--mode json` event parsing → `result.details` → re-render via Pi components | Reference |
| `aleclarson/pi-subagent` (= `jamwil/pi-subagent` fork) | 1,786 | Minimalist; `spawn` (fresh) / `fork` (session snapshot via `--session <jsonl>`) modes; no widget; configurable depth limit | Production, minimalist |
| `elpapi42/pi-minimal-subagent` | 1,144 | One tool; env-injection escape hatch for env-configured extensions; tri-state `extensions` config (null/`[]`/whitelist) | Production, minimalist |
| `@jerryan/pi-subagent-lite` | small | "No agent files, no extras" — zero-config minimal | Production, minimalist |
| `drsh4dow/pi-delegate` | small | Single `delegate` tool, single child | Production, minimalist |
| `@e9n/pi-subagent` (espennilsen) | unsurveyed | 5 modes: single, parallel, chain, orchestrator (hierarchical agent trees), pool (long-lived persistent agents) | Production, kitchen-sink |
| `nicobailon/pi-subagents` | 20,544 src + 17,816 tests = 38,360 | Heavy kitchen-sink: subagent + truncation + JSONL artifacts + git worktree + true async + result-watcher polling + `agent://<id>` resource scheme implied + `/run-status` slash | Production, popular (1284 stars, 24.5K weekly downloads) |
| `@ifi/pi-extension-subagents` (ifiokjr) | unsurveyed (large) | Fork of nicobailon + Agents Manager TUI overlay (`Ctrl+Shift+A`/`/agents`) — multi-screen List/Detail/Edit/ChainDetail/ParallelBuilder/TaskInput/NewAgent + `.chain.md` files + chain-clarify TUI + multi-select chain/parallel + per-agent run history + GitHub Gist export | Production, full-featured |

### In-process via `createAgentSession` SDK

| Repo | LOC | Distinguishing features | Status |
|---|---|---|---|
| `Hopsken/pi-subagents` | 5,159 | `createAgentSession` + ConversationViewer modal (live `session.subscribe`) + agent-tree widget (Braille spinners, live tool activity, token counts) + cross-extension `pi.events` RPC + `.pi/agents/*.md` discovery + DEFAULT_AGENTS registry + memory + group-join + steering + resume + worktree | Production, sophisticated UI |
| `tintinweb/pi-subagents` | 6,082 | Hopsken superset: + cron/interval/one-shot scheduling + settings management + usage tracking | Production, superset |
| `tuansondinh/pi-fast-subagent` | unsurveyed | "In-process subagent delegation with single, parallel, and background modes" — minimal in-process variant | Production |

### Multiplexer-pane-per-subagent (cmux/tmux/zellij/WezTerm)

| Repo | LOC | Distinguishing features | Status |
|---|---|---|---|
| **`HazAT/pi-interactive-subagents`** | **8,227 (incl. tests)** | **Each subagent gets its own multiplexer pane.** Async non-blocking — `subagent()` returns immediately; widget shows live status (`starting`/`active`/`waiting`/`stalled`/`running`); result steered back as completion notification. Status from child-written runtime snapshots (not session-file polling). `caller_ping` (child→parent help request via session exit + parent resume). `/plan` workflow (Investigation→Planning→Review→Execute→Review). `/iterate` workflow (fork into subagent with full context). `subagent_interrupt` (turn-level cancel). | **Production, the only true opencode-equivalent UX in Pi.** |

### RPC-based (subprocess + JSON-RPC over stdin/stdout)

| Repo | LOC | Distinguishing features | Status |
|---|---|---|---|
| `lnilluv/pi-ralph-loop` | ~1,300 | Subprocess + `pi --mode rpc`; mid-run `steer`/`follow_up`/`abort`; pause-resume via SIGSTOP/SIGCONT | Production, ralph loop (not a generic subagent provider) |

### Infrastructure libraries (consumed by other extensions)

| Repo | LOC | Distinguishing features | Status |
|---|---|---|---|
| **`cmf/pi-subagent`** | **1,331** | **Library, not a user-facing extension.** Exports `invokeAgent`, `invokeAgentWithUI`, `registerSubagentRenderer`, `createProgressComponent`, `persistResults`, `discoverAgents`. Recursive step composition: `{cwd, agent, task}` / `{parallel: [...]}` / `{chain: [...]}` arbitrarily nested. Live tree-view UI with Braille spinners. Subprocess-based. | **Production, designed to be embedded.** |

### Pi-core fork (not an extension)

| Repo | LOC | Distinguishing features | Status |
|---|---|---|---|
| `Jberlinsky/oh-my-pi` | 391K | Pi fork with built-in Task tool, `agent://<id>` resources as first-class URIs, real-time artifact streaming | Fork — not an extension |

## Architecture patterns — four distinct approaches

### Pattern 1 — Subprocess + JSON event stream

```ts
spawn("pi", ["--mode", "json", "-p", "--no-session" /* or --session <jsonl> */, ...args]);
```

Parent parses line-delimited `message_end` + `tool_result_end` events → `Message[]` → stores in `result.details` → re-renders in `renderResult` using Pi's exported components.

**Used by**: in-tree reference, aleclarson/jamwil, nicobailon, elpapi42, e9n, jerryan, drsh4dow, cmf (as library).

### Pattern 2 — Subprocess + RPC mode (steerable, multi-turn)

```ts
spawn("pi", ["--mode", "rpc", ...]);
```

JSON-RPC over stdin/stdout. Allows mid-run `steer`, `follow_up`, `abort`, plus pause-resume via SIGSTOP/SIGCONT. ~5× the LOC of the JSON path.

**Used by**: lnilluv/pi-ralph-loop only.

### Pattern 3 — In-process via `createAgentSession`

```ts
import { createAgentSession, SessionManager, SettingsManager } from "@mariozechner/pi-coding-agent";

const { session } = await createAgentSession({
  cwd, sessionManager: SessionManager.inMemory(cwd),
  settingsManager: SettingsManager.create(),
  modelRegistry: ctx.modelRegistry, model, tools, resourceLoader,
});
session.setActiveToolsByName(toolNames);
await session.bindExtensions({ onError: ... });
const unsub = session.subscribe(event => { /* turn_end, message_update, tool_execution_start */ });
session.steer("Wrap up immediately");
session.abort();
```

Zero subprocess overhead. Full event subscription. Supports `steer()` and `abort()`. SDK exports per `@mariozechner/pi-coding-agent/dist/index.d.ts:15`.

**Used by**: Hopsken (production gold-standard), tintinweb (superset), tuansondinh.

### Pattern 4 — Terminal multiplexer pane per subagent

```ts
// Spawn a new mux pane (cmux/tmux/zellij/wezterm) running `pi <args>`
muxBackend.createPane({ command: ["pi", "-p", task, ...flags], title: agentName });
// Track liveness via child-written runtime snapshot (not session-file growth)
const activity: SubagentActivityState = readActivitySnapshot(sessionDir);
// Steer result back to parent on child completion
pi.sendMessage({ customType: "subagent_result", details, deliverAs: "followUp", triggerTurn: true });
```

Each subagent gets a **first-class terminal pane** the user can switch into via the multiplexer's native keybinds (cmux Ctrl+\\, tmux Ctrl+B+arrows, zellij Alt+arrows, etc.). Status flows back to parent via runtime activity snapshots written by the child to a known path.

**Used by**: HazAT/pi-interactive-subagents only.

## Visibility & navigability comparison

### vs opencode's actual UX (post-PR #14814, merged 2026-02-27)

Opencode's session navigation, after the PR #14814 hierarchical model:

| Action | Opencode keybind |
|---|---|
| Enter first child from parent | `<leader>+down` (`session_child_first`) |
| Cycle to next sibling child | bare `right` (only when in child) |
| Cycle to previous sibling child | bare `left` (only when in child) |
| Return to parent from child | bare `up` (`session_parent`, only when in child) |
| List all sessions | `<leader>+l` (session list modal) |

**Critical opencode facts**:
- **No tabs.** Tab bar is an open feature request: [#5826](https://github.com/anomalyco/opencode/issues/5826) and [#17838](https://github.com/anomalyco/opencode/issues/17838).
- **One full-screen view at a time.** Parent OR child, not both.
- Sessions are first-class navigable entities (not modal overlays).
- No tool-result truncation reported.
- "view subagents" button [is sometimes broken](https://github.com/anomalyco/opencode/issues/16796) — keybind path is canonical.
- CLI mode does not print subagent output ([#19278](https://github.com/anomalyco/opencode/issues/19278), open bug).
- Parent appears "stuck loading" when subagent blocks ([#10802](https://github.com/anomalyco/opencode/issues/10802), open bug).

So **opencode's actual UX is**: cycle between full-screen sessions via keybinds, one visible at a time. The gap previously claimed between Hopsken and opencode was overstated.

### Comparison matrix (Pi extensions vs opencode)

| Capability | opencode | Hopsken | tintinweb | HazAT | nicobailon | @ifi | aleclarson | cmf (lib) |
|---|---|---|---|---|---|---|---|---|
| **Switch keybind to subagent** | `<leader>+down` then arrows | `/agents` slash → menu | same as Hopsken | **Multiplexer-native** (cmux Ctrl+\\, tmux Ctrl+B+arrows, etc.) | `/run-status` slash | `Ctrl+Shift+A` overlay | none (renderResult only) | depends on host |
| **One subagent visible at a time** | yes (full-screen) | yes (modal) | yes (modal) | **no — multiplexer panes coexist** | yes (slash output) | yes (overlay) | n/a | n/a |
| **Side-by-side / parallel inspection** | no (open FR) | no | no | **YES via mux split** | no | no | n/a | n/a |
| **Live updates while viewing** | yes | yes (`session.subscribe`) | yes | yes (snapshot polling + mux pane is live) | streaming inline | yes | n/a | yes (callback) |
| **Tool result truncation in viewer** | none | **500 chars** | **500 chars** | **none — full pane** | configurable `maxOutput` | configurable | none | none |
| **Bash output truncation in viewer** | none | **500 chars** | **500 chars** | **none — full pane** | configurable | configurable | none | none |
| **Read-only viewer / can interact** | interact (it's the active session) | read-only modal | read-only modal | **fully interactive** (it's a real `pi` session in a pane) | read-only | read-only | n/a | n/a |
| **Status during execution** | session is foregrounded | agent-tree widget (Braille spinners) | same as Hopsken | always-visible widget + per-pane status snapshot (`starting`/`active`/`waiting`/`stalled`/`running`) | progress widget | live progress in chains/parallel | renderResult | tree progress UI |
| **Steering mid-run** | yes (it's the foregrounded session) | `steer_subagent` LLM tool | same | `subagent_interrupt` (turn cancel) + interactive panes | no | no | no | no |
| **Cross-extension RPC contract** | n/a | yes (`subagents:rpc:spawn`, scoped reply, `PROTOCOL_VERSION=2`) | yes | no (LLM tool only) | yes (extensive `pi.events`) | yes | no | exported library API |

### Three Pi extensions reach opencode-parity along different axes

| For this UX dimension | Best Pi option | Notes |
|---|---|---|
| **Quick keybind switch like opencode** | **HazAT** | Multiplexer-native — depends on user running pi inside cmux/tmux/zellij/wezterm. Switching is the multiplexer's job, not Pi's. |
| **Live updating modal viewer** | Hopsken / tintinweb | ConversationViewer modal with `session.subscribe`. Less keybind-friendly than opencode but live. |
| **Full unrestricted text inspection** | **HazAT** (full pane) or **nicobailon** (JSONL transcripts on disk) | Hopsken/tintinweb truncate at 500 chars in their viewer. |
| **Multi-agent comparison side-by-side** | **HazAT only** | Multiplexer panes coexist visually. No other Pi extension and not even opencode (which has no tabs/panes) does this. |
| **Programmatic library to embed in another extension** | **cmf** | Designed for embedding; `invokeAgentWithUI` + tree progress UI returns rich results. |
| **Sophisticated standalone TUI overlay (browse/edit/launch)** | @ifi | Multi-screen Agents Manager — closest to a full management UI in Pi. |

### Key insight: HazAT > opencode for parallel inspection

For DACMICU evolve specifically (compare N candidates side-by-side), **HazAT is actually better than opencode**, because opencode lacks tabs/panes and forces you to cycle through full-screen views one at a time. HazAT puts each candidate in its own multiplexer pane → user can use cmux/tmux's native split-screen for true parallel inspection. The trade-off: requires the user to launch pi inside a multiplexer.

## ConversationViewer (Hopsken/tintinweb) — capabilities and limits

Read end-to-end on 2026-05-08 from `Hopsken/pi-subagents@main/src/ui/conversation-viewer.ts`:

| What it does | What it doesn't do |
|---|---|
| Modal overlay (`ctx.ui.custom`) with own keyboard handling | No keybind switch between agents (Esc → re-open via `/agents`) |
| Live updates via `session.subscribe(() => tui.requestRender())` | Modal blocks parent view — can't see parent agent while open |
| Full message log scroll (k/j/PgUp/PgDn/Home/End) | **Tool results truncated to 500 chars** (line 175) |
| Streaming indicator at bottom (`▍ describeActivity(...)`) | **Bash output truncated to 500 chars** (line 191) |
| Header with status icon, duration, token count, tool count | Read-only — can't type, inject, steer from viewer |
| ANSI-aware width adaptation (`wrapTextWithAnsi`) | One agent at a time — no side-by-side comparison |

**Compared to opencode**: opencode's session navigation also shows one full-screen view at a time, also has no side-by-side. The two real gaps vs opencode are:

1. **No keybind switch** — Hopsken needs slash + menu reselection where opencode uses bare arrows.
2. **500-char truncation** — opencode shows the full session.

The first is a UX nicety. The second is a real defect for evolve-grade post-mortem inspection where the truncation hurts.

### Sufficient for what

- **Variant A (in-session) DACMICU** — irrelevant; no subagents involved.
- **Variant B simple use cases** (ralph, single subagent at a time) — sufficient.
- **`@pi-dacmicu/evolve` candidate inspection** — **insufficient**; truncation kills post-mortem; no parallel comparison.

## Subagent provider recommendations for DACMICU (revised)

### Variant B (subagent-per-iteration) — pick by use case

| Consumer | Recommended provider | Rationale |
|---|---|---|
| `@pi-dacmicu/ralph` (Variant B path) | **Hopsken** (or tintinweb superset) | Live status widget + modal viewer for casual oversight; cross-extension RPC is the right shape; in-process = zero subprocess overhead |
| `@pi-dacmicu/evolve` candidate inspection | **HazAT** (primary) **+ Hopsken** (fallback) | HazAT puts each candidate in its own mux pane → true parallel inspection, full transcripts, interactive panes. Requires user runs pi in cmux/tmux/zellij/wezterm. Fallback to Hopsken + nicobailon-style JSONL writer if no mux available. |
| Programmatic embedding (a future package) | **cmf/pi-subagent** library | Designed to be embedded; recursive step composition; rich tree progress UI |

### Why three options, not one

The earlier framing assumed one provider would serve both ralph and evolve. After this expanded survey, that's wrong: ralph and evolve have different inspection needs, and Pi has different tools optimized for each.

- **Ralph** is mostly background — user wants to know the loop is making progress, occasionally inspect a stuck iteration. Hopsken's modal is fine.
- **Evolve** is foreground analytical — user actively compares candidates, looks for *why* one outperformed another. HazAT's mux panes give full text + parallel view.

### What still gets dropped from `@pi-dacmicu/*`

`@pi-dacmicu/subagent` remains dropped (decision from 2026-05-08 stands). Custom-building gives no architectural payoff because:

1. Pi has **no native tab/workspace mechanism between AgentSessions** — `InteractiveMode` runs one session at a time. A real Tab-switch needs Pi core changes, not extension code. The architectural ceiling is Pi's, not the extension's.
2. Three production-grade extensions already cover the trade-off space (Hopsken/tintinweb for in-process modal, HazAT for mux panes, cmf for embedded library).
3. Building our own would still hit the same ceiling.

DACMICU consumes whichever provider best fits the consumer's UX needs, via cross-extension RPC contracts (Hopsken's `subagents:rpc:spawn`) or library imports (cmf's `invokeAgent`).

## Performance & quality science

- **Condensed result-API handover** on subagent → main-agent causes measurable degradation; information lost in summarization is not recoverable downstream. Mitigations:
  - aleclarson `fork` mode (inherits parent context)
  - Hopsken `inherit_context` flag
  - **nicobailon `verbose:true` + JSONL transcript** (most thorough)
  - HazAT full-pane interactive (effectively zero loss because user can read everything)
- **Mario Zechner's stance against default subagents** is consistent with all surveyed extensions surfacing subagent as opt-in only. None ship as default-on.
- **Synthesis**: minimal subagent system + system-prompt gating + navigability primitives. The navigability piece is what closes the silent-degradation gap.

## Open questions

- Quantitative degradation thresholds for condensed-result-API handover (% performance loss vs context-budget saved). No measurements in any surveyed repo.
- HazAT activity snapshot pattern (`SubagentActivityState` written by child, polled by parent) — could become a Pi-core primitive for cross-AgentSession liveness. Not yet upstreamed.
- Whether `pi.appendEntry("subagents:record", ...)` (Hopsken) survives `/compact`. No `session_before_compact` handler observed. Test before relying for long-running background subagents.
- `ctx.modelRegistry.stream()` standalone (without `createAgentSession`) — still no precedent. Likely useful for non-tool-using specialist asks (oracle/critique). Build a 30-line proof if needed.
- Pi-core PR for native `agent://<id>` resource scheme + workspace/tab mechanism — would close the only remaining structural gap. Currently only in `Jberlinsky/oh-my-pi` fork.

## Cross-references

- [research-2026-05-08-subagent-and-todo](../dacmicu/research-2026-05-08-subagent-and-todo.md) — DACMICU build-vs-reuse decisions
- [architecture/subprocess-rpc-rendering](../architecture/subprocess-rpc-rendering.md) — JSON event parsing → Message[] → render
- [dacmicu/modular-architecture](../dacmicu/modular-architecture.md) — package layout, soft-dep relationships
- [loop-extensions](loop-extensions.md) — companion survey of loop drivers
- [todo-visualizations](todo-visualizations.md) — companion survey of TODO state extensions
