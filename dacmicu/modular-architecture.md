---
title: DACMICU modular architecture
type: decision
updated: 2026-05-10
sources:
  - "concept.md"
  - "implementation-plan.md"
  - "pi-port.md"
  - "../../examples/extensions/pi-evolve.ts"
  - "../../packages/coding-agent/examples/extensions/todo.ts"
  - "../../packages/coding-agent/examples/extensions/subagent/index.ts"
  - "../../packages/coding-agent/examples/extensions/plan-mode/index.ts"
  - "/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md"
  - "/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/docs/packages.md"
  - "/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/docs/rpc.md"
  - "raw-sources/conversations/2026-05-08-pi-session-dacmicu-modular-design.md"
tags: [dacmicu, decision, architecture, packaging, modular]
see_also:
  - "concept.md"
  - "implementation-plan.md"
  - "pi-port.md"
  - "spirit-vs-opencode.md"
  - "../implementations/pi-evolve-extension.md"
  - "../implementations/pi-callback-extension.md"
  - "../architecture/subprocess-rpc-rendering.md"
  - "../architecture/steering-vs-followup.md"
---

# DACMICU modular architecture

> **WARNING: This architecture has been critically reviewed.** See [archive/research-2026-05-10-critical-plan-review.md](archive/research-2026-05-10-critical-plan-review.md) for challenges to every load-bearing assumption. Key findings: the 5-package structure is over-engineered for v1; `evolve` should be removed; `base` is better as an internal module than a standalone package; the "2-3 days" estimate is 3-5× too low.

Supersedes the single-extension decision in [implementation-plan](implementation-plan.md). DACMICU ships as a modular monorepo of six small Pi packages with a small shared runtime library. The umbrella framing from [concept](concept.md) survives as architecture; the deliverable is six focused, composable packages.

> **Post-critique v1 scope**: User overrode the critique's scope reduction. Final v1: base (internal module) + todo + ralph + evolve + fabric. **~2,100 LOC.** 2-4 weeks. See implementation-plan for revised estimates and deep review corrections.

## The six packages

| # | Package | LOC est. | Hard deps | Purpose |
|---|---|---|---|---|
| 1 | `@pi-dacmicu/base` | **~250** | none | Deterministic in-session loop primitive: `agent_end` driver, `signal_loop_success` tool, compaction preservation (CompactionResult + file fallback), abort detection, state rehydration, `appendSystemPrompt` helper, single-driver sentinel. Exports the runtime as a library for consumers. |
| 2 | `@pi-dacmicu/todo` | ~250 | base | Deterministic TODO system. The TODO list IS the loop's state machine; the outer loop checks `unchecked > 0`, reassesses validity, syncs state, works the next item. Tool + widget + `/todo-loop` command. |
| 3 | ~~`@pi-dacmicu/subagent`~~ | — | — | **Dropped 2026-05-08.** Replaced by `pi.events`-RPC dependency on `Hopsken/pi-subagents` (or `tintinweb/pi-subagents`). Their `createAgentSession` + ConversationViewer + agent-tree widget + cross-extension RPC is ~10K LOC of production-validated code we'd otherwise reinvent. See [concept § Subagent build-vs-reuse decision](concept.md#subagent-build-vs-reuse-decision-2026-05-08). |
| 4 | `@pi-dacmicu/fabric` | ~250 | none | Bash callback infrastructure. Unix socket + `pi-callback` CLI on PATH + bash env injection via `tool_call` interceptor. Closes the mid-step recursive judgment gap; serves shell-pipeline composition. |
| 5 | `@pi-dacmicu/ralph` | ~200 | base; **runtime-soft `Hopsken/pi-subagents`** | Ralph-loop UX: `/ralph "<goal>"` command. Variant A (in-session) by default. Variant B (subagent-per-iteration) when Hopsken's RPC is available — emits `subagents:rpc:spawn` per iteration for fresh-context-per-check parity with opencode `oc check`. Graceful degrade if subagent provider absent. |
| 6 | `@pi-dacmicu/evolve` | **~1,200** | base; **runtime-soft `Hopsken/pi-subagents`** | MATS-style code-evolution loop. **Target: Variant B** (each candidate in isolation via subagent). Existing 510-LOC draft is Variant A (in-session git ops, no subagent code); requires significant rewrite for spawn coordination, result extraction, timeout handling. Variants on git branches `evolve/vN/<slug>`; `selection.md` ledger; `init/run/log_experiment` tools; `signal_evolve_success` breakout. **No validated upstream prototype exists.**

Dependency DAG:

```
                   base ───── todo                        (Variant A consumer)
                    │
                    └──── ralph ······► [Hopsken/pi-subagents]   (Variant A or B; soft dep)
                    │
                    └──── evolve ─────► [Hopsken/pi-subagents]   (Variant B consumer; soft dep)

                   fabric (independent)
```

Solid arrows = hard NPM dependency. Dotted arrows = runtime-soft (`pi.events`-RPC; consumer functions without it but with reduced capability).

## Why this split, not the single-extension plan

The original [implementation-plan](implementation-plan.md) committed to one `pi-dacmicu` extension with mode dispatch (`mode: "in-agent" | "subagent" | "auto"`) on a generic `dacmicu_loop` tool. Modular split is preferred because:

1. **Separation of concerns matches user mental models.** Someone who wants a deterministic TODO workflow does not also want to opt into subagent infrastructure. Someone who wants Ralph does not want git-branch evolve plumbing. Each package = one job.
2. **Three of the six (subagent, fabric, base) are independently useful.** Bundling them under one umbrella obscures their value as building blocks for other extensions outside the DACMICU family.
3. **The `dacmicu_loop` tool was hypothetical.** It is not implemented anywhere in pi-mono. The actual pattern in `examples/extensions/pi-evolve.ts` and the ecosystem (kostyay, mitsuhiko, tmustier) is per-extension custom tools. The modular split formalizes what the ecosystem already does, with a shared runtime library so the loop driver isn't reimplemented six times.
4. **Pi extension API rewards small, single-purpose extensions.** Each registers its own `agent_end` listener, its own tools, its own commands. No exclusive locks. The architecture composes cleanly.

The umbrella framing in [concept](concept.md) is preserved — the four downstream concerns (Ralph, FABRIC, TODO, evolve) all derive from the same loop primitive. The change is that the primitive lives in `base` as a *library function* rather than as a single tool with mode dispatch.

## The module-isolation constraint

This is the hard architectural constraint that shapes delivery, not just package layout.

`docs/packages.md` "Dependencies" section:

> Other pi packages must be bundled in your tarball. Add them to `dependencies` and `bundledDependencies`, then reference their resources through `node_modules/` paths. **Pi loads packages with separate module roots, so separate installs do not collide or share modules.**

Implications:

- **npm `peerDependencies` for cross-pi-package code sharing does not work.** `peerDependencies` is only for Pi's bundled core (`@earendil-works/pi-coding-agent`, `@earendil-works/pi-ai`, `@earendil-works/pi-tui`, `typebox`, `@earendil-works/pi-agent-core`). All five must be listed with `"*"` and not bundled.
- **Two separately installed pi packages cannot share an imported module.** If a user installs `@pi-dacmicu/base` and `@pi-dacmicu/todo` separately, todo cannot `import { runLoopBody } from "@pi-dacmicu/base"` and get the same instance base's extension uses. Each lives in its own module root.
- **Sharing code requires `bundledDependencies`.** Each consumer bundles a copy of base inside its own tarball. This works for *code reuse* but creates *runtime duplication*: if both base (via standalone install) and todo (via bundled copy of base) try to register an `agent_end` listener, both fire, and you have two loop drivers competing for the same session.

## Delivery strategies — three options, pick one

| Strategy | Setup | Pros | Cons |
|---|---|---|---|
| **(A) Mono-package** | One npm package `pi-dacmicu` with all six extensions in `pi.extensions: ["./packages/base/index.ts", "./packages/todo/index.ts", ...]`. Internal relative imports across `packages/*` work because they're in the same package. User enables/disables via `pi config`. | Cleanest code reuse. One install. No module-isolation problems. | Loses install-time granularity. User installs everything to use one piece. |
| **(B) Per-package + bundling** | Each `@pi-dacmicu/*` package is independently installable. Consumers `bundledDependencies` their dep. Each package has a runtime guard: "if base's listener already attached, become a no-op." | Install-time granularity per user's original vision. Independent versioning. | Code duplication on disk. Runtime dedup logic in every consumer. Easy to break (versions drift, dedup misses an edge case). |
| **(C) Per-package, loose coupling** | Each `@pi-dacmicu/*` package is fully self-contained. No code sharing. Coordination via `pi.appendEntry` + `customType` messages. Each package implements its own `agent_end` driver. | Maximally independent. No bundling complexity. | Driver logic implemented N times. Updates to the loop pattern require N coordinated releases. Defeats most of "shared library" benefit. |

**Recommendation: Strategy (A) — mono-package, multi-extension.**

Rationale:
- Pi's `pi config` enable/disable already provides the modular UX the user wanted. "Install once, opt in per extension" is functionally equivalent to "install per extension" for end users.
- Strategy (A) is the only one that lets `base` be a real shared library without runtime dedup hacks.
- If demand for individual install ever materializes, switching A → B is a publishing change, not an architectural change. Reverse is much harder.
- All six extensions in one repo also matches how Pi's own examples are structured (`examples/extensions/*` as siblings).

If the user explicitly wants per-package install: Strategy (B), with a documented runtime-dedup contract in base.

## Mono-package layout (Strategy A)

```
pi-dacmicu/
├── package.json                    # name: pi-dacmicu
│                                   # pi.extensions: [
│                                   #   "./packages/base/index.ts",
│                                   #   "./packages/todo/index.ts",
│                                   #   "./packages/subagent/index.ts",
│                                   #   "./packages/fabric/index.ts",
│                                   #   "./packages/ralph/index.ts",
│                                   #   "./packages/evolve/index.ts"
│                                   # ]
│                                   # bin: { "pi-callback": "./bin/pi-callback.js" }
├── packages/
│   ├── base/
│   │   ├── index.ts               # extension factory; registers signal_loop_success
│   │   └── runtime.ts             # exports runLoopWithCheck, attachLoopDriver helpers
│   ├── todo/
│   │   ├── index.ts               # imports ../base/runtime; registers todo + /todo-loop
│   │   └── component.ts           # /todos UI
│   ├── subagent-client/           # NOT a published extension — internal helper
│   │   └── rpc-client.ts          # thin wrapper over Hopsken's `subagents:rpc:spawn`
│   │                              # used by ralph + evolve for Variant B; ~80 LOC
│   ├── fabric/
│   │   ├── index.ts               # tool_call interceptor + Unix socket server
│   │   └── prompt.ts              # FABRIC system-prompt fragment
│   ├── ralph/
│   │   └── index.ts               # imports ../base, ../subagent; /ralph command
│   └── evolve/
│       ├── index.ts               # imports ../base, ../subagent-client
│       ├── ledger.ts              # selection.md read/write
│       └── git.ts                 # branch/commit/revert helpers
├── bin/
│   └── pi-callback.js             # ~50 LOC CLI; on PATH via npm bin
└── docs/
    ├── architecture.md
    └── per-package-readmes/
```

User onboarding:

```bash
pi install npm:pi-dacmicu        # installs all six extensions
pi config                          # enable/disable individual ones
```

## Verified Pi primitives — what each package uses

All listed primitives are verified against pi-mono source as of 2026-05-08.

| Package | Primitive | Verified at |
|---|---|---|
| base | `pi.on("agent_end", ...)` | `packages/coding-agent/examples/extensions/plan-mode/index.ts:220` |
| base | `pi.sendMessage({customType, content, display}, {triggerTurn:true, deliverAs:"followUp"})` | types `core/extensions/types.ts:372`; agent-session `core/agent-session.ts:1268-1295` |
| base | `pi.on("session_before_compact", ...)` returning `{compaction:{summary, firstKeptEntryId, tokensBefore}}` | `extensions.md:413` |
| base | `pi.on("session_start" / "session_tree", ...)` | `examples/extensions/todo.ts` |
| base | `ctx.hasPendingMessages()` | types `core/extensions/types.ts:318` |
| base | `ctx.signal?.aborted` for abort detection | `extensions.md`; subagent example `:339` |
| base | `pi.registerTool` with `signal_loop_success` style | `extensions.md:77` |
| todo | Tool result `details` for branching state | `examples/extensions/todo.ts` (state in details, reconstructed from `getBranch()` on `session_tree`) |
| todo | `pi.on("before_agent_start", ...)` returning `{systemPrompt}` for TODO context | `extensions.md:471-475` |
| subagent-client | `pi.events.emit("subagents:rpc:spawn", {requestId, type, prompt, options})` + `pi.events.on("subagents:rpc:spawn:reply:${requestId}", ...)` | `Hopsken/pi-subagents/src/cross-extension-rpc.ts` exposes the contract. **DACMICU's only subagent integration point** — see [concept § Subagent build-vs-reuse decision](concept.md#subagent-build-vs-reuse-decision-2026-05-08). |
| subagent (provider, reference) | Hopsken/tintinweb's `createAgentSession` + ConversationViewer + agent-tree widget | `Hopsken/pi-subagents/src/agent-runner.ts:240-345`, `src/ui/conversation-viewer.ts` (243 LOC), `src/ui/agent-widget.ts` (488 LOC). **We do not implement these — we depend on them.** |
| subagent (provider, optional fallback) | `createAgentSession` directly (~400 LOC, no UI layer) | If Hopsken integration proves untenable. Last-resort fallback only — visibility/navigability lost. |
| todo widget (status) | `ctx.ui.setStatus(key, text)` (footer/status bar) | (no verified ecosystem reference; tmustier claim from earlier wiki was disputed in evening 4 audit — needs re-survey) |
| todo widget (above-editor, static) | `ctx.ui.setWidget(key, string[], {placement?})` | `mitsuhiko/agent-stuff/extensions/loop.ts:162` (one-liner "Loop active: {summary} (turn N)") |
| todo widget (above-editor, reactive) | `ctx.ui.setWidget(key, (tui, theme) => Component & {dispose?()}, opts)` — factory form, `render(width):string[]` + `invalidate():void` | **`tintinweb/pi-manage-todo-list/src/ui/todo-widget.ts:70`** (verified evening 4) — production reference for the factory form. Earlier wiki citation of `davebcn87/pi-autoresearch/extensions/pi-autoresearch/index.ts:1294,1316,1348` was **wrong** — that file uses `ctx.ui.notify` only, no `setWidget` factory form. |
| todo widget (inline pinned in stream) | `pi.registerMessageRenderer(customType, (msg, {expanded}, theme) => Component)` invoked when extension emits `pi.sendMessage({customType, details, display:true})` | `examples/extensions/message-renderer.ts` (in-tree demo only). **No ecosystem extension uses this yet.** Closest analog to Claude Code's `TodoWrite`. |
| todo widget (per-tool inline) | `renderResult(result, {expanded}, theme, ctx)` returning a TUI Component | `examples/extensions/todo.ts:228` ("✓ #3 buy milk") |
| todo widget (modal viewer) | `ctx.ui.custom<T>(factory, {overlay?, overlayOptions?})` | `examples/extensions/todo.ts` (`/todos`), pi-autoresearch dashboard fullscreen, mitsuhiko loop preset selector |
| fabric | `tool_call` event mutating `event.input.command` (env injection) | `extensions.md` `tool_call` section: input is mutable, mutations affect actual execution |
| fabric | `tool_call` event mutating `event.input.timeout` (no-timeout for `pi-callback`) | Same mechanism; `BashToolInput` includes `timeout?: number` |
| fabric | Unix socket server in extension factory | Standard Node `net.createServer`; lifecycle hooks `session_start` / `session_shutdown` |
| ralph | All of base + (optional) `subagent-client` for Variant B | (composition only) |
| evolve | All of base + `subagent-client` (required for Variant B) + `pi.exec("git", [...])` | `extensions.md:1474` |

## Open verification gaps

1. ~~**In-process subagent variant** — no in-tree precedent.~~ **Resolved 2026-05-08**: `createAgentSession` from `@earendil-works/pi-coding-agent` is the validated path; `Hopsken/pi-subagents` and `tintinweb/pi-subagents` ship it in production with full `session.subscribe()` + `steer()` + `abort()`. See [ecosystem/subagents](../ecosystem/subagents.md). Bare `ctx.modelRegistry.stream()` only useful for non-tool-using specialist asks (oracle/critique) — separate variant if needed.
2. **Per-turn `systemPrompt` cost**: `before_agent_start` returning `{systemPrompt}` is per-turn, not cached. For long evolve sessions injecting selection.md every turn, measure whether this materially affects cost. Alternative: inject as `customType` message that compacts naturally.
3. **Unix socket lifecycle in TUI mode**: [pi-callback-extension](../implementations/pi-callback-extension.md) documents three layers (lifecycle / env injection / install-or-promote). Verify the socket survives reload via `session_start` reason `"reload"` re-binding.
4. **FABRIC env injection conflict with other bash extensions**: `tool_call` handlers chain in load order; if multiple extensions prepend `export ...`, ordering matters. Document the contract.
5. **`bundledDependencies` runtime-dedup contract** if Strategy (B) is adopted: needs a precise rule. Suggested: base's `attachLoopDriver()` keys on session id + a sentinel in `appendEntry`; second caller becomes a passive client. Not built.

## Visibility & widget design — evidence-driven defaults

Research into the ecosystem (2026-05-08) settled two architectural defaults that earlier drafts left ambiguous. Both findings update the per-package guidance.

### Subagent visibility — the parent invocation site decides

The child mode (`pi --print` vs `pi --mode json` vs `pi --mode rpc`) does **not** decide visibility on its own. The parent invocation site does:

- **Bash tool calling any mode** — invisible. Stdout becomes a text blob in the bash tool's output. Even `--mode rpc` JSON is rendered as text-of-JSON inside bash.
- **Extension-registered tool calling `--mode json -p --no-session`** — fully visible. Parse `message_end` + `tool_result_end` events into `Message[]`, store in `result.details`, re-render in `renderResult` with Pi's exported components.
- **Extension-registered tool calling `--mode rpc`** — fully visible **and** bidirectionally controllable (steer / follow_up / abort / SIGSTOP-SIGCONT pause-resume). ~5× the LOC of the JSON path.

**Subagent integration for DACMICU** (revised 2026-05-08 after deep ecosystem cascade — see [ecosystem/subagents](../ecosystem/subagents.md) and [concept § Subagent build-vs-reuse](concept.md#subagent-build-vs-reuse-decision-2026-05-08)):

- **DACMICU does not ship a subagent extension.** `@pi-dacmicu/ralph` and `@pi-dacmicu/evolve` are Variant B consumers that depend at runtime on `Hopsken/pi-subagents` (or `tintinweb/pi-subagents` superset) via `pi.events`-based RPC.
- **Why**: Hopsken's stack is ~10K LOC of production-validated code (in-process `createAgentSession`, ConversationViewer modal, agent-tree widget, cross-extension RPC, custom-agent loading, themed completion notifications, worktree isolation). Reproducing it would be a multi-month side quest with no architectural payoff.
- **Coupling shape**: `subagent-client/rpc-client.ts` (~80 LOC) wraps the two-step event-bus contract. Step 1: emit `subagents:rpc:spawn`, get `{id}` in reply. Step 2: listen for `subagents:completed`/`subagents:failed` events keyed by that `id`. **Note**: `pi.events` is a bare `node:events.EventEmitter` (~30 LOC wrapper). No envelope, no version negotiation, no replay. The request/response correlation and `PROTOCOL_VERSION` are conventions from tintinweb's `cross-extension-rpc.ts` (95 LOC) — a soft dependency on a convention file, not a formal Pi API.
- **Visibility & navigability** are inherited from Hopsken — ConversationViewer (`src/ui/conversation-viewer.ts`, 243 LOC) is the closest current analog to opencode's Tab-switch but is **not equivalent**: read-only modal, single-agent, 500-char tool-result truncation, modal blocks parent view. Sufficient for casual oversight; insufficient for evolve-grade candidate comparison. Agent-tree widget (`src/ui/agent-widget.ts`, 488 LOC) provides always-visible status.
- **Graceful degradation**: if Hopsken is not installed, ralph silently falls back to Variant A (in-session). Evolve refuses to start with a clear error message pointing at install instructions.
- **Fallback** if Hopsken integration proves untenable: a thin internal wrapper over `createAgentSession` (~400 LOC), no UI layer. Documented as last-resort only.

**Rendering**: store `result.details.results[i].messages: Message[]` accumulated from `message_end` + `tool_result_end` events, re-render in `renderResult` via Pi's exported components (`AssistantMessageComponent`, `ToolExecutionComponent`, `UserMessageComponent`, `Container`, `Spacer`, `Markdown`). The in-tree `examples/extensions/subagent/index.ts:600-770` is the line-precise reference.

**FABRIC corollary**: `@pi-dacmicu/fabric` must never offer a bash recipe like `pi --print -- ...` for sub-agent invocation. The bash route is invisible regardless of child mode. FABRIC's visibility-preserving path is the `pi-callback` socket round-trip back to the parent's `pi.sendMessage` event stream.

### TODO widget — four-layer stack matching pi-autoresearch's polish

[ecosystem/todo-visualizations](../ecosystem/todo-visualizations.md) documents the survey. Defaults for `@pi-dacmicu/todo`:

| Layer | Primitive | Default behaviour |
|---|---|---|
| 1. Action confirmation | per-tool `renderResult` | Compact one-line "✓ Added #3 'buy milk'" — already exists in the in-tree `todo.ts` reference; lift it. |
| 2. Persistent status | `ctx.ui.setWidget("todo", factory)` (component factory form, **not** the static `string[]` form) | Reactive, width-aware. Collapsed (one-liner: "TODO: 3/7 done — buy milk") and expanded (full list) states, toggle via configurable shortcut. Match `tintinweb/pi-manage-todo-list/src/ui/todo-widget.ts:70` (corrected evening 4 — earlier `pi-autoresearch` citation was wrong). |
| 3. Stream-pinned snapshot | `pi.registerMessageRenderer("todo-snapshot", ...)` + extension emits `pi.sendMessage({customType:"todo-snapshot", details:{todos}, display:true})` after meaningful state changes | Closest analog to Claude Code's `TodoWrite` polish. **No production extension uses this yet** — unrealized polish gap, free win. Branches with session tree via the message's `details`. |
| 4. Modal deep-dive | `/todos` command + `ctx.ui.custom<T>(factory)` | On-demand fullscreen viewer. Already in the in-tree `todo.ts` reference. |

Key idiomatic detail (verified in `tintinweb/pi-manage-todo-list/src/ui/todo-widget.ts:70`): `setWidget` factory returns `(_tui, theme) => ({ render(width):string[], invalidate():void })`. `render` is invoked on every paint, so any state mutation reflects immediately without manual repaint plumbing. Collapse/expand is a flag in extension state that selects between two factory branches.

> **Correction (evening 4)**: earlier wiki cited `davebcn87/pi-autoresearch` as the production reference for the factory form. Verification showed that file uses `ctx.ui.notify` only and has NO `setWidget` factory call. Replaced with tintinweb's verified production reference.

Neither static `setWidget(key, [...])` nor a single rendering layer matches what the user expects from a polished TODO system in 2026. The four-layer stack is the recommended baseline.

### Wiki path corrections discovered during research

- `mitsuhiko/agent-stuff` loop extension lives at `extensions/loop.ts`, not `pi-extensions/loop.ts`.
- The in-tree visibility-preserving subagent reference (`examples/extensions/subagent/index.ts:265`) uses `--mode json -p --no-session`, not `--mode rpc`. Earlier wiki text conflated the two paths.
- `tmustier/pi-extensions` ralph extension lives at `pi-ralph-wiggum/index.ts`, not `ralph-wiggum/index.ts`.

## What this replaces in the wiki

- [implementation-plan](implementation-plan.md) "Decision: Build pi-dacmicu as a single Pi extension" → superseded by this page.
- [implementation-plan](implementation-plan.md) "Primary design — `dacmicu_loop` LLM tool" → not built. Each consumer registers its own tool; `base` exports library helpers.
- [pi-port](pi-port.md) "Option 1 — Outside-loop port (works today)" → still functional but anti-pattern (visibility loss). Demoted to caveat; in-session driver is THE port.
- [implementations/pi-evolve-extension](../implementations/pi-evolve-extension.md) → repositioned as the canonical reference impl that should be repackaged as `@pi-dacmicu/evolve` consuming `@pi-dacmicu/base`.

## Cross-references

- [concept](concept.md) — umbrella framing (preserved)
- [implementation-plan](implementation-plan.md) — build sequence against this architecture
- [pi-port](pi-port.md) — port architecture
- [spirit-vs-opencode](spirit-vs-opencode.md) — divergence analysis
- [../implementations/pi-evolve-extension](../implementations/pi-evolve-extension.md) — reference impl for `@pi-dacmicu/evolve`
- [../implementations/pi-callback-extension](../implementations/pi-callback-extension.md) — design for `@pi-dacmicu/fabric`
- [../architecture/subprocess-rpc-rendering](../architecture/subprocess-rpc-rendering.md) — the visibility-preserving subagent substrate
- [../architecture/steering-vs-followup](../architecture/steering-vs-followup.md) — why `triggerTurn:true` + `deliverAs:"followUp"` is the right loop-driver primitive

---

## History & audit trail

For the full research history (decisions, verification passes, corrections, scale-down explorations):

- [archive/research-2026-05-10-comprehensive-verification-audit.md](archive/research-2026-05-10-comprehensive-verification-audit.md) — Latest audit: 70 claims checked.
- [archive/](archive/) — All research sessions.
