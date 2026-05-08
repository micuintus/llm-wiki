---
title: Subagent ecosystem and science
type: concept
updated: 2026-05-08
sources:
  - https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent/examples/extensions/subagent
  - https://github.com/badlogic/pi-mono/issues/552
  - https://github.com/aleclarson/pi-subagent
  - https://github.com/nicobailon/pi-subagents
  - https://github.com/Hopsken/pi-subagents
  - https://github.com/tintinweb/pi-subagents
  - https://github.com/lnilluv/pi-ralph-loop
  - https://github.com/Jberlinsky/oh-my-pi
  - https://github.com/anomalyco/opencode/pull/20074
tags: [subagent, extension, dacmicu, in-process, navigability, viewer]
see_also:
  - "../architecture/subprocess-rpc-rendering.md"
  - "../dacmicu/modular-architecture.md"
  - "loop-extensions.md"
  - "todo-visualizations.md"
---

# Subagent ecosystem — full architecture, primitives, in-session variants, visibility, navigability

Deep cascade survey (2026-05-08) of every actively-maintained Pi subagent extension, all clones inspected, code-read. Supersedes the 2026-04-29 stub.

## Repos surveyed

| Repo | LOC | Pattern | Status |
|---|---|---|---|
| `pi-mono/.../examples/extensions/subagent/` | ~990 | Subprocess + JSON | In-tree reference |
| `aleclarson/pi-subagent` | 1,786 | Subprocess + JSON (spawn / fork) | Production, minimalist |
| `nicobailon/pi-subagents` | 38,360 | Subprocess + JSON + worktree + JSONL artifacts + true async | Production, kitchen-sink |
| `Hopsken/pi-subagents` | 7,860 | **In-process via `createAgentSession`** | Production, Claude-Code look-and-feel |
| `tintinweb/pi-subagents` | 11,070 | In-process + scheduling (fork of Hopsken) | Production, superset |
| `lnilluv/pi-ralph-loop` | ~1,300 | Subprocess + RPC mode | Production, steerable loop |
| `Jberlinsky/oh-my-pi` | 391K (full Pi fork) | Pi-core fork with built-in Task tool, `agent://` resources | Fork — not an extension |

## (a) Architectures — three distinct patterns

### Pattern 1 — Subprocess + JSON event stream (default for one-shot)

```ts
spawn("pi", ["--mode", "json", "-p", "--no-session" /* or --session <jsonl> */, ...args]);
```

Parent parses line-delimited `message_end` + `tool_result_end` events into `Message[]`, stores in `result.details`, re-renders in `renderResult` using Pi's exported components. ~300 LOC for the JSON path (in-tree reference is ~990 with extras).

Used by: in-tree reference (`packages/coding-agent/examples/extensions/subagent/index.ts:265`), `aleclarson/pi-subagent`, `nicobailon/pi-subagents`.

`aleclarson` adds two delegation modes:
- `spawn` → `--no-session` (fresh context)
- `fork` → writes parent session snapshot to `tmpDir/fork-X.jsonl` and passes `--session <path>` (inherited context)

`nicobailon` adds: child writes its full transcript via `createJsonlWriter(jsonlPath, proc.stdout)` to disk for **post-mortem inspection**; per-subagent git worktree isolation; true async (returns immediately, `result-watcher.ts` polls); `agent://<id>` resource scheme implied by `subagent-control.ts:171`.

### Pattern 2 — Subprocess + RPC mode (steerable, multi-turn)

```ts
spawn("pi", ["--mode", "rpc", ...]);  // JSON-RPC over stdin/stdout
```

Allows mid-run `steer`, `follow_up`, `abort`, plus pause-resume via SIGSTOP/SIGCONT. ~5× the LOC of the JSON path.

Used by: `lnilluv/pi-ralph-loop` only.

### Pattern 3 — In-process via `createAgentSession` — **production-validated**

This was previously documented as "no in-tree precedent, design hypothesis." **Wrong.** Hopsken and tintinweb both use it in production. Code at `Hopsken/pi-subagents/src/agent-runner.ts:240-345`:

```ts
import { createAgentSession, SessionManager, SettingsManager } from "@mariozechner/pi-coding-agent";

const { session } = await createAgentSession({
  cwd, sessionManager: SessionManager.inMemory(cwd),
  settingsManager: SettingsManager.create(),
  modelRegistry: ctx.modelRegistry, model, tools, resourceLoader,
});
session.setActiveToolsByName(filteredToolNames);
await session.bindExtensions({ onError: ... });
const unsub = session.subscribe(event => {
  if (event.type === "turn_end") { ... }
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") { ... }
  if (event.type === "tool_execution_start") { ... }
});
session.steer("Wrap up immediately");   // <-- mid-run steering, in-process
session.abort();
```

Zero subprocess overhead. Full event subscription. Supports `steer()` and `abort()` like RPC mode. SDK exports: `createAgentSession`, `AgentSession`, `AgentSessionEvent`, `SessionManager`, `SettingsManager`, `createCodingTools`, `createBashTool`, etc. (see `@earendil-works/pi-coding-agent/dist/index.d.ts:15`).

**This is the canonical SDK path for in-process subagents.** A bare `ctx.modelRegistry.stream()` would only run a single LLM turn — for tool-using subagents you want `createAgentSession` + `session.subscribe()`.

## (b) Primitives — consolidated table

| Primitive | Used by |
|---|---|
| `child_process.spawn("pi", ["--mode", "json", "-p", "--no-session"])` | in-tree, aleclarson, nicobailon |
| `child_process.spawn("pi", ["--mode", "rpc"])` | lnilluv |
| `--session <jsonl>` (fork via session snapshot) | aleclarson |
| `createAgentSession({...})` + `session.subscribe()` + `.steer()` + `.abort()` | **Hopsken, tintinweb** |
| `SessionManager.inMemory(cwd)` (ephemeral session) | Hopsken, tintinweb |
| `SettingsManager.create()` (settings inheritance) | Hopsken, tintinweb |
| `ctx.modelRegistry` (model resolution: explicit > config > parent) | Hopsken, tintinweb |
| `pi.events.on/emit` (cross-extension RPC, scoped reply channels) | Hopsken, tintinweb |
| `pi.appendEntry("subagents:record", {...})` (session-persisted state, branches with session tree) | Hopsken |
| `pi.sendMessage({customType, details, deliverAs:"followUp", triggerTurn:true})` (auto-trigger parent turn on bg complete) | Hopsken, tintinweb, nicobailon |
| `pi.registerMessageRenderer("subagent-notification", ...)` | Hopsken, tintinweb, nicobailon |
| `ctx.ui.setWidget("agents", factory, opts)` (reactive component factory) | Hopsken, tintinweb |
| `ctx.ui.custom<T>(factory)` for ConversationViewer overlay | Hopsken, tintinweb |
| Custom JSONL writer to disk | nicobailon |
| Git worktree isolation | Hopsken, tintinweb, nicobailon |
| Cron / interval / one-shot scheduling for subagents | tintinweb only |

## (c) "In-session subtask" — the term is a category error

This section previously listed `createAgentSession` (in-process subagent) under an umbrella called "in-session subtask versions" alongside `pi.sendMessage({triggerTurn:true})` (same-session loop). **That conflates two unrelated things.** Corrected 2026-05-08:

**Subagent = context isolation, by definition.** A subagent always runs in its own `AgentSession` with a separate `state.messages` array. If a thing shares the parent's message array, it isn't a subagent — it's just another turn in the same session.

The orthogonal axis "subprocess vs in-process" describes *where the subagent's node-side host runs*, not whether it has its own context. Both subprocess (`pi --mode json`) and in-process (`createAgentSession`) subagents are subagents — just hosted differently.

This means there is no "in-session subagent." The two cases people sometimes call by that name are actually:

| Case | What it is |
|---|---|
| `pi.sendMessage({triggerTurn:true, deliverAs:"followUp"})` | **Not a subagent.** Just another turn in the same `AgentSession`. The DACMICU Variant A loop primitive. See [dacmicu/concept § Two loop variants](../dacmicu/concept.md#two-loop-variants--the-load-bearing-distinction). |
| `createAgentSession({...})` in same node process | **A subagent**, hosted in-process. Separate `state.messages`, separate context window. The DACMICU Variant B substrate. |

Pick by the actual question you're answering:

- **Need shared context across iterations?** → in-session loop (`triggerTurn`); not a subagent at all.
- **Need context isolation per iteration?** → subagent. Then choose hosting: in-process (`createAgentSession`) for low overhead, subprocess (`pi --mode json`) for crash isolation or true parallel fan-out, RPC mode for SIGSTOP/SIGCONT pause-resume.

## (d) Visibility & navigability

### Visibility (during run)

| Repo | Visibility primitive |
|---|---|
| in-tree reference | JSON events accumulated → `result.details.results[i].messages: Message[]` → `renderResult` re-renders with `AssistantMessageComponent`, `ToolExecutionComponent`, `Container`, `Markdown` |
| aleclarson | Same as in-tree (subprocess JSON → details → renderResult) |
| nicobailon | `customType:"subagent-notify"` inline; live progress streamed; full transcript JSONL on disk |
| **Hopsken/tintinweb** | **Live reactive widget** via `ctx.ui.setWidget("agents", (tui,theme) => ({render(width){...}, invalidate(){}}))` — tree of agents with Braille spinner frames (`describeActivity`), live tool activity, token counters, colored status icons. Updates triggered by `session.subscribe(() => tui.requestRender())`. Plus per-completion themed notification boxes via `registerMessageRenderer("subagent-notification", ...)` (compact, expandable, group-aware). |
| lnilluv | RPC events → custom inline rendering |
| Jberlinsky/oh-my-pi (fork) | Real-time artifact streaming during execution |

### Navigability (post-run / mid-run inspection)

| Repo | Navigation UX |
|---|---|
| in-tree, aleclarson | Inline `renderResult` expand/collapse via `{expanded}` flag — no separate viewer |
| nicobailon | `/run-status` slash; result-watcher polling; transcripts on disk; `agent://<id>` resource scheme implied |
| **Hopsken/tintinweb** | **`/agents` slash command** → menu of all agents → select → open `ctx.ui.custom(ConversationViewer)` modal overlay. **Live-updating** — `session.subscribe(() => tui.requestRender())` so streaming text appears in real time; auto-follows new content; scroll-up pauses autoscroll; ↑↓/k/j/PgUp/PgDn/Home/End/Esc/q. Also `steer_subagent` LLM-callable + `get_subagent_result` LLM-callable, `resume` to continue a previous agent. **The closest Pi analog to opencode's Tab-switch.** |
| lnilluv | Pause-resume via SIGSTOP/SIGCONT; transcript on disk |
| Jberlinsky/oh-my-pi (fork) | `agent://<id>` URI as first-class resource — read full output by ID into parent context window |

### `ConversationViewer` — anatomy (Hopsken/tintinweb)

`src/ui/conversation-viewer.ts` (243 LOC):

```ts
class ConversationViewer implements Component {
  constructor(tui, session: AgentSession, record, activity, theme, done) {
    this.unsubscribe = session.subscribe(() => {
      if (this.closed) return;
      this.tui.requestRender();   // <-- LIVE updates while subagent runs
    });
  }
  handleInput(data) { /* k/j/PgUp/PgDn/Home/End/Esc */ }
  render(width) {
    const messages = this.session.messages;  // <-- live read of subagent state
    // Build content lines for User/Assistant/ToolResult/bashExecution
    // Auto-scroll to bottom when at end; pause on scroll-up
    // Bottom streaming indicator: "▍ {describeActivity(activeTools, responseText)}"
  }
}
```

**This is the gold standard for opencode-style navigability in Pi.** No other extension has anything like it.

## Architectural takeaways for DACMICU

**Decision (2026-05-08): DACMICU does not ship its own subagent extension.** Variant B consumers (`@pi-dacmicu/ralph`, `@pi-dacmicu/evolve`) integrate with `Hopsken/pi-subagents` (or `tintinweb/pi-subagents` superset) via `pi.events`-based RPC. See [dacmicu/concept § Subagent build-vs-reuse decision](../dacmicu/concept.md#subagent-build-vs-reuse-decision-2026-05-08).

Rationale:

1. Hopsken/tintinweb already ship ~10K LOC of production-validated code covering everything we'd need: `createAgentSession`-based in-process execution, ConversationViewer modal (gold-standard opencode-Tab-switch analog), agent-tree widget with live tool activity, cross-extension RPC contract, custom agent loading from `.pi/agents/*.md`, themed completion notifications, worktree isolation, steering, resume.
2. The cross-extension RPC contract (`subagents:rpc:spawn` + scoped reply channels + `PROTOCOL_VERSION`) is exactly the integration shape we'd want anyway. Hopsken designed it for this purpose.
3. Reproducing this would be a multi-month side quest with zero architectural payoff. Reuse, then specialize where actually needed.
4. Soft dependency: if Hopsken not installed, ralph degrades to Variant A; evolve refuses with a clear error.

**What we own**:
- The outer `agent_end`-driven loop driver (`@pi-dacmicu/base`) — different primitive, different concern.
- The Variant A in-session loop (TODO, simple ralph) — no subagent involved.
- Variant B *orchestration logic* — what to spawn, when to spawn, how to combine results. Hopsken provides the vehicle, not the driver.

**Fallback** if Hopsken integration proves untenable: ~400 LOC wrapper over `createAgentSession` directly, no UI layer, no cross-extension RPC. Visibility/navigability lost. Last-resort only.

## Key claims (revised from 2026-04-29 stub)

- ~~Two subagent UX patterns~~ → **three** distinct architectural patterns, not two: subprocess+JSON, subprocess+RPC, in-process via `createAgentSession`.
- ~~no in-tree precedent for in-process subagent~~ → **production precedent in Hopsken & tintinweb** via the official `createAgentSession` SDK export.
- Performance science: condensed result-API on subagent → main-agent handover causes measurable degradation; information lost in summarization is not recoverable downstream. Hopsken's `inherit_context` flag and aleclarson's `fork` mode both attempt to mitigate this; nicobailon's `verbose:true` + JSONL transcript approach is the most thorough mitigation.
- Mario Zechner's stance against default subagents is consistent with the in-tree extensions surfacing `subagent` as opt-in only. None of the surveyed extensions ship as default-on.
- Synthesis: minimal subagent system + system-prompt gating + **navigability primitives** (ConversationViewer + setWidget tree). The navigability piece is what closes the silent-degradation gap; without it the subagent is a black box and failures go unnoticed.

## Open questions

- Quantitative degradation thresholds for condensed-result-API handover (% performance loss vs context-budget saved). No measurements found in any of the surveyed repos.
- Does `pi.appendEntry("subagents:record", ...)` survive `/compact`? Hopsken doesn't appear to call `session_before_compact`. Test before relying on it for long-running background agents.
- `ctx.modelRegistry.stream()` standalone (without `createAgentSession`) — still no precedent. Likely useful for **non-tool-using** specialist asks (oracle/critique). Build a 30-line proof if you want this variant.
