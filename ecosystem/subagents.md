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

Deep cascade survey rev 2026-05-08 (evening 2), expanded from earlier 5-extension survey to **12+ extensions** plus a corrected comparison against opencode's actual session navigation model (post-PR #14814).

## Important correction (2026-05-08 evening 2): Hopsken IS tintinweb

The earlier framing in this doc treated `Hopsken/pi-subagents` (5,159 LOC) and `tintinweb/pi-subagents` (6,082 LOC, "superset") as two distinct packages. **They are the same package.** The Hopsken repo's `package.json` says `"name": "@tintinweb/pi-subagents"` and lists tintinweb as the author and repo URL. Hopsken is a **private mirror/snapshot** of the tintinweb upstream. The "5159 vs 6082, superset" comparison was likely two different versions of the same package surveyed at different times.

Canonical reference is **`tintinweb/pi-subagents`** (271 stars, 27 releases, 8 contributors, last push 2026-05-07). All references to "Hopsken" below should be read as the same package as tintinweb.

## Project health (2026-05-08)

| Repo | Stars | Forks | Open issues | Releases | Contributors | Last push | Verdict |
|---|---|---|---|---|---|---|---|
| `nicobailon/pi-subagents` | 1,289 | 181 | 31 | 71 | 20 | 2026-05-03 | Most popular, very active, kitchen-sink |
| **`HazAT/pi-interactive-subagents`** | **394** | 69 | **6** | **22** | **10** | 2026-04-20 | **Healthy, focused, well-maintained** |
| **`tintinweb/pi-subagents`** (= Hopsken mirror) | 271 | 61 | 17 | 27 | 8 | 2026-05-07 | Healthy, mature, recent |
| `tintinweb/pi-manage-todo-list` | 16 | 4 | 1 | — | small | active | Small but focused, single-author |
| `popododo0720/pi-stuff` | 15 | 0 | 0 | — | 1 | 2026-03-03 | Single-dev, stale (2 months), niche — proof-of-pattern only, not a dependency target |

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
| **`tintinweb/pi-subagents`** (Hopsken is a mirror of this) | ~6,000 | `createAgentSession` + ConversationViewer modal (live `session.subscribe`) + agent-tree widget (Braille spinners, live tool activity, token counts) + cross-extension `pi.events` RPC + `.pi/agents/*.md` discovery + DEFAULT_AGENTS registry + memory + group-join + steering + resume + worktree + scheduling + settings/usage tracking. **Claude Code-idiomatic tool names** (`Task`, `get_subagent_result`, `steer_subagent`) — LLM training-known shape, free prompt tokens. | Production, mature (271 stars, 27 releases) |
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

## Architecture patterns — four distinct approaches, in depth

These are *implementation* patterns, not capabilities. Capabilities (parallel, chain, orchestrator, pool) are orthogonal — most patterns can support most capabilities. What changes between patterns is **where the child runs, how the parent observes it, and how output flows back**.

---

### Pattern 1 — Subprocess + line-delimited JSON event stream

**Used by**: in-tree reference, aleclarson/jamwil, elpapi42, jerryan, drsh4dow, e9n (espennilsen), nicobailon, @ifi (nicobailon fork), cmf (as a library).

#### How it works

```ts
const proc = spawn("pi", [
  "--mode", "json",     // emit line-delimited JSON events instead of a TUI
  "-p", task,           // -p = "prompt" mode, run-and-exit
  "--no-session",       // or --session <jsonl-path> to inherit parent context
  ...flags
], { cwd, stdio: ["ignore", "pipe", "pipe"] });

proc.stdout.on("data", chunk => {
  for (const line of buffer.split("\n")) {
    const event = JSON.parse(line);
    if (event.type === "message_end") messages.push(event.message);
    if (event.type === "tool_result_end") toolResults.set(event.id, event.result);
    if (event.type === "usage") usage = event.usage;
  }
});

await once(proc, "exit");
return { messages, finalOutput, usage, exitCode };
```

#### What you get

- **True process isolation.** Crash in child can't take down parent. Memory leaks are reaped.
- **Clean context separation by default.** The child boots a fresh Pi with its own session, model, tools.
- **Optional context inheritance.** Pass `--session <jsonl-path>` to fork the parent's history (aleclarson `fork` mode).
- **Re-renderable transcripts.** Parser stores `Message[]` in `result.details`; parent's `renderResult` pulls Pi's own message-renderer components and re-renders the child's transcript inline. This is what `packages/coding-agent/examples/extensions/subagent/` demonstrates.
- **Cheap parallelism.** N children = N processes. OS scheduler does the work.

#### What you give up

- **Process spawn cost.** ~200-500ms per child to boot Pi, load extensions, read settings. Matters when you fan out 20 ways.
- **No mid-flight steering.** `pi --mode json -p` is run-and-exit. To steer or abort, the parent must SIGTERM the child or use Pattern 2.
- **Result is a *log*, not a *living view*.** You see the child's history after it ends. Live progress requires polling stdout for `message_update` events and rendering them ad-hoc.
- **Tool registration in the child** is whatever the child's pi config does. Parent can't inject a tool into the child unless it preconfigures the child's settings.

#### When this pattern wins

- **Stateless one-shot delegations.** "Search this directory for X." "Review this diff." Spawn, await, render result, done.
- **Parallel fan-out where each child is independent.** N reviews on N different files — no shared state, no inter-agent coordination.
- **When you want to be sure the child can't mess with parent.** Hard isolation guarantee.
- **When you don't have control over the parent extension's runtime.** Subprocess works from anywhere, including non-extension CLI tools.

#### Concrete LOC characterization

Minimum viable: ~150 LOC (drsh4dow `pi-delegate`). With a result viewer + JSONL writer + truncation: ~1,000-2,000 LOC (aleclarson, elpapi42). With chain/parallel/orchestrator/pool/clarify: ~20,000+ LOC (nicobailon).

---

### Pattern 2 — Subprocess + JSON-RPC over stdin/stdout (`pi --mode rpc`)

**Used by**: lnilluv/pi-ralph-loop only (and it's not a generic subagent extension — it's a ralph driver).

#### How it works

```ts
const proc = spawn("pi", ["--mode", "rpc", ...], {
  stdio: ["pipe", "pipe", "pipe"]   // stdin is the request channel
});

// JSON-RPC framing: Content-Length headers + JSON bodies
const rpc = createRpcChannel(proc.stdin, proc.stdout);

await rpc.request("session.start", { task: "..." });
const turnDone = rpc.subscribe("turn_end", evt => { /* ... */ });

// Mid-run controls (impossible in Pattern 1)
await rpc.request("session.steer", { message: "Wrap up immediately" });
await rpc.request("session.abort", {});

// Pause-resume via OS signals (process is still alive)
process.kill(proc.pid, "SIGSTOP");
process.kill(proc.pid, "SIGCONT");
```

#### What you get

- **Bidirectional channel.** Parent can issue commands mid-turn: steer, follow-up, abort, pause, resume.
- **Live event subscription.** `turn_end`, `message_update`, `tool_execution_start` flow back as JSON-RPC notifications.
- **Long-lived child.** One spawn = many turns. Amortizes spawn cost across the session.
- **Process isolation still preserved.** Same crash/leak guarantees as Pattern 1.

#### What you give up

- **~5× the LOC of Pattern 1.** RPC framing, request correlation IDs, notification dispatch, timeout handling, channel cleanup on child crash. lnilluv is ~1,300 LOC for basic ralph; a generic subagent provider would be more.
- **Coupling to Pi's RPC schema.** If `pi --mode rpc` changes its method names or notification payloads (no semver guarantee documented), the extension breaks.
- **Same context-isolation defaults.** Still need `--session` flag for context inheritance.

#### When this pattern wins

- **Long-lived steerable children.** Ralph loops where the parent wants to nudge the child mid-iteration. Background investigators that need redirection.
- **When you need pause-resume.** A budget-aware orchestrator that suspends idle children to free model capacity. Nobody actually does this yet.
- **When a single child handles N tasks.** Spawn one specialist child, ask it 10 questions over the session.

#### Why nobody else uses it for subagents

Pattern 1 covers most one-shot needs more cheaply. Pattern 3 covers steering needs in-process with zero subprocess overhead. Pattern 2 sits in an awkward middle — too heavy for one-shots, too process-isolated when in-process is available.

---

### Pattern 3 — In-process via `createAgentSession` SDK

**Used by**: Hopsken/pi-subagents (production gold standard), tintinweb/pi-subagents (Hopsken superset + scheduling), tuansondinh/pi-fast-subagent.

#### How it works

```ts
import {
  createAgentSession,
  SessionManager,
  SettingsManager,
} from "@mariozechner/pi-coding-agent";

const { session } = await createAgentSession({
  cwd,
  sessionManager: SessionManager.inMemory(cwd),  // or .persistent(path)
  settingsManager: SettingsManager.create(),
  modelRegistry: ctx.modelRegistry,              // share parent's
  model: "claude-opus-4-7",                      // override per-child
  tools: parentTools,                            // optionally filtered
  resourceLoader: ctx.resourceLoader,
});

session.setActiveToolsByName(["bash", "read", "edit"]);   // narrow tool surface
await session.bindExtensions({ onError: (err) => log(err) });

const unsubscribe = session.subscribe(event => {
  if (event.type === "turn_end") onComplete(event);
  if (event.type === "message_update") render(event);
  if (event.type === "tool_execution_start") trackActivity(event);
});

await session.sendMessage({ content: task, triggerTurn: true });

// Mid-flight controls — same process, direct method calls
session.steer("Wrap up immediately");
session.abort();
```

#### What you get

- **Zero subprocess overhead.** No spawn, no IPC, no JSON parsing. Direct in-memory function calls.
- **Full event subscription.** Subscribe to the same `AgentSessionEvent` stream Pi's own InteractiveMode subscribes to. Live updates are the natural shape.
- **Direct steering and abort.** No marshalling — just method calls on the `AgentSession` object.
- **Shared `ModelRegistry`.** Parent's auth, rate limits, model cache all carry over. No re-login per child.
- **The richest UI surface.** Hopsken's `ConversationViewer` (`session.subscribe` → live re-render) and agent-tree widget (Braille spinners, live token counts) are only viable in this pattern. Subprocess transcripts can be re-rendered post-hoc but not made live without polling.

#### What you give up

- **No process isolation.** A bug in the child's tool execution can crash the parent. An infinite loop in child Pi tool burns the parent's process.
- **Memory accumulation.** Long-running parents that spawn many children accumulate session state unless explicitly torn down.
- **Tool conflicts.** Tools registered in the parent's process are visible to the child unless filtered. `setActiveToolsByName` mitigates but isn't bulletproof.
- **SDK coupling.** `createAgentSession` is the most internals-exposing SDK surface — not yet documented as semver-stable. Hopsken pins to a specific Pi version range. Each Pi minor version may break.

#### When this pattern wins

- **Live oversight.** When the user actively watches the child and steers it. Hopsken's modal ConversationViewer is unmatched here.
- **Frequent short tasks.** When subprocess spawn cost would dominate (e.g. "summarize this snippet" over 50 turns of a parent loop).
- **When parent and children share a ModelRegistry.** No login flow per child. No quota fragmentation.
- **Cross-extension RPC backbones.** Hopsken exposes its in-process subagents over `pi.events` so other extensions (DACMICU, ralph drivers) can spawn without owning the SDK code themselves.

#### What's actually inside Hopsken (5,159 LOC)

| Component | Role | LOC |
|---|---|---|
| `agent-runner.ts:240-345` | `createAgentSession` wrapper, prompt assembly, lifecycle | ~250 |
| `ui/conversation-viewer.ts` | Modal `ctx.ui.custom` overlay, live `session.subscribe` re-render, scroll keys | 243 |
| `ui/agent-widget.ts` | Always-visible tree of running agents, Braille spinners, token counts | 488 |
| `cross-extension-rpc.ts` | `pi.events`-based RPC, scoped reply channels, `PROTOCOL_VERSION` gate | 95 |
| `index.ts` | Slash commands (`/agents`), 3 default agents, agent registry, memory, group-join | 1,671 |
| The other ~2,400 LOC | steering, resume, worktree, message-renderer, settings, `.pi/agents/*.md` discovery | — |

The reason "build our own minimal in-process subagent" cost ~700 LOC was that ~400 of those LOC are the UI patterns that *are* the value. The rest is unavoidable wiring. After surveying HazAT, even that 700 is dropped — HazAT covers a different pattern that's better for evolve, and Hopsken covers the in-process pattern.

---

### Pattern 4 — Multiplexer pane per subagent (cmux/tmux/zellij/WezTerm)

**Used by**: HazAT/pi-interactive-subagents only (8,227 LOC including tests).

#### How it works

```ts
// Detect which multiplexer the user is running pi inside
const mux: MuxBackend = detectMux();   // cmux | tmux | zellij | wezterm | none

// Spawn each subagent in its own mux pane
const paneId = await mux.createPane({
  command: ["pi", "-p", task, "--session", sessionPath],
  title: `subagent: ${name}`,
  splitDirection: "right",     // or "down" — user-configurable
});

// Track liveness via runtime snapshots written by the child
//   ~/.pi/sessions/<id>/runtime-state.json
// Child writes: { status: "active"|"waiting"|"stalled"|"running", lastTurnAt, ... }
// Parent polls this file; correlates to its widget
const activity = await readActivitySnapshot(sessionDir);

// On child completion, steer result back to parent
pi.sendMessage({
  customType: "subagent_result",
  details: { name, finalOutput, usage, exitCode },
  deliverAs: "followUp",
  triggerTurn: true,
});
```

#### What you get

- **Each subagent is a real, full Pi session in a real terminal pane.** Full TUI. Full transcript. Fully interactive — you can type into the child if you want.
- **True parallel inspection.** Mux split = N children visible simultaneously. cmux's `Ctrl+\` (or tmux's prefix+arrows, zellij's Alt+arrows) cycles between them.
- **Native multiplexer keybinds.** This is what users already know. No new UX to learn.
- **No truncation anywhere.** It's a real pane — output is whatever the user's terminal shows.
- **Async non-blocking by default.** `subagent()` tool returns immediately; parent keeps working. Result lands in parent context as a system-reminder when child finishes.
- **Liveness is observable without a session-file diff.** The runtime-state snapshot pattern means parent sees `starting`/`active`/`waiting`/`stalled`/`running` cleanly.

#### What you give up

- **Hard dependency on a multiplexer.** If the user runs `pi` from a plain terminal, this pattern degrades. HazAT detects and falls back, but the differentiated UX is lost.
- **Pane management is the user's problem.** Parent can spawn but doesn't own the pane lifecycle the way Hopsken owns its modal. Closing the pane mid-run is a foot-gun.
- **No automatic re-rendering inside parent's TUI.** The widget shows status; the *content* lives in the other pane. Parent can't quote child output back into its own message log without reading the session file.
- **Process isolation but more of it.** Each child is a separate `pi` subprocess. Same memory profile as Pattern 1 plus the multiplexer overhead.

#### When this pattern wins

- **Multi-candidate comparison (DACMICU evolve's core need).** N candidates → N panes → eyes can compare in real time. **No other pattern does this.**
- **When the user already lives in cmux/tmux.** The integration feels native; nothing new to install or configure beyond the extension.
- **When children need full interactivity for steering.** Type directly into the child pane. No "steer tool" indirection.
- **When the parent shouldn't block.** Async non-blocking is the only mode; you can't accidentally write a parent that hangs waiting for a child.

#### Why this is the only Pi extension matching opencode's `<leader>+down` UX

Opencode treats sessions as first-class navigable entities. You can `<leader>+down` into a child, `right`/`left` between siblings. But opencode still shows **one** session full-screen at a time — there's no tab/pane mechanism in the opencode TUI itself.

HazAT externalizes the navigation problem to the multiplexer. The mux is the "window manager" — it has tabs, splits, zoom, copy-mode, scrollback, all already. Pi just needs to spawn a pane and know which session ID it owns. **For parallel inspection, this is strictly more capable than opencode**: opencode forces full-screen cycling; HazAT lets you split-screen four candidates at once.

The trade is the multiplexer dependency. For DACMICU evolve's user (already comfortable with cmux/tmux), that's not a real cost.

---

### Cross-pattern comparison

| Dimension | Pattern 1 (subprocess+JSON) | Pattern 2 (subprocess+RPC) | Pattern 3 (in-process) | Pattern 4 (mux pane) |
|---|---|---|---|---|
| Spawn cost | ~200-500ms | ~200-500ms | ~0 | ~200-500ms + mux pane |
| Process isolation | full | full | none | full |
| Mid-run steer/abort | no (SIGTERM only) | yes (RPC) | yes (method call) | yes (write to pane) |
| Live event stream | poll stdout | RPC notifications | `session.subscribe` | runtime snapshot file + pane |
| Parallel inspection | no | no | no (modal) | **yes (mux split)** |
| Tool result truncation in viewer | extension's choice | extension's choice | Hopsken truncates 500ch | none (real pane) |
| User-interactive child | no | no | no | **yes** |
| LOC for minimum viable | ~150 | ~1,300 | ~3,000 | ~5,000 |
| LOC for production-grade | ~20,000 (nicobailon) | n/a | ~5,000 (Hopsken) | ~8,000 (HazAT) |
| SDK semver risk | low | medium (`--mode rpc` schema) | **high** (`createAgentSession`) | low |
| Best for | one-shot fan-out, isolation | long-lived steerable child | live oversight, low-overhead | parallel candidate comparison |

### Why DACMICU ends up with two providers, not one

The earlier framing was "pick one provider, use it everywhere." That's wrong because **ralph's inspection needs and evolve's inspection needs are categorically different**.

| Consumer | Inspection mode | Right pattern | Right provider |
|---|---|---|---|
| `@pi-dacmicu/ralph` | Mostly background; occasional check on a stuck iteration; one child at a time | **Pattern 3** (in-process modal) | **Hopsken** (or tintinweb superset) |
| `@pi-dacmicu/evolve` | Foreground analytical; compare N candidates side-by-side; "why did B diverge from A?" | **Pattern 4** (mux pane per candidate) | **HazAT** |
| Future programmatic embedding | Library-style, host extension owns the UI | **Pattern 1** wrapped as library | **cmf/pi-subagent** |

If evolve depends on Hopsken alone, the user hits the 500-char truncation wall the moment they want to inspect why candidate B diverged at turn 14. That truncation isn't a UX nicety — it kills the whole point of evolve.

If ralph depends on HazAT alone, the user is forced to run pi inside a multiplexer just to use the loop. That's user-hostile for the easy case.

Hence per-consumer provider selection. The cost is one more soft-dep entry in each consumer package. The win is each consumer gets the inspection model it actually needs.

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

## Subagent provider recommendations for DACMICU (revised v2 — 2026-05-08 evening 2)

### v1 simplification (KISS): tintinweb only, defer HazAT

After the user pushed back on growing complexity (per-consumer providers, multi-mode `delegate()` API), the v1 plan reduces to **one soft-dep on `tintinweb/pi-subagents`** for both ralph and evolve. HazAT integration is deferred to v1.x driven by real evolve usage data. Rationale captured in [research-2026-05-08-evening2-simplification](../dacmicu/research-2026-05-08-evening2-simplification.md).

| Consumer | v1 (KISS) | v1.x (if data justifies) |
|---|---|---|
| `@pi-dacmicu/ralph` | **tintinweb/pi-subagents** via `pi.events` RPC; degrades to inline if absent | unchanged |
| `@pi-dacmicu/evolve` | **tintinweb/pi-subagents** + JSONL transcript writer (workaround for 500-char trunc) | optional HazAT integration for mux-pane inspection |
| Programmatic embedding (future) | **cmf/pi-subagent** library | unchanged |

### Why tintinweb wins for v1

1. **Idiomatic LLM-known shape.** Exposes Claude Code's `Task`, `get_subagent_result`, `steer_subagent` tool names. LLM training-known. Free prompt tokens.
2. **No multiplexer dependency.** Casual ralph users get a working setup with no cmux/tmux setup.
3. **Mature.** 271 stars, 27 releases, 8 contributors, last push 2026-05-07.
4. **Cross-extension RPC contract.** `subagents:rpc:spawn` is the right shape for cross-extension integration.

### What changed from v1 (evening 1)

| Earlier (evening 1) | Now (evening 2) |
|---|---|
| Per-consumer providers: ralph→tintinweb, evolve→HazAT | v1: tintinweb only. HazAT deferred to v1.x. |
| `delegate({ task, mode })` tool with three modes | No DACMICU subagent tool. LLM uses tintinweb's `Task`. |
| Two production soft-deps from day 1 | One production soft-dep from day 1 |

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
