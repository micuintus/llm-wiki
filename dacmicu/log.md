---
title: DACMICU design-decision log
type: log
updated: 2026-05-13
---

# DACMICU design-decision log

Chronological record of material design decisions. Append-only. Each entry: one date, the change, the reason. New entry on every refactor that changes the public API, package layout, or operating model.

For the canonical current state of the design, see [README](README.md). For deep research and audits, see [archive/](archive/).

## 2026-05-13

**Evolve scope shifted from Variant A to Variant B; tool surface collapsed to zero.**

User-driven design review concluded the in-session loop (Variant A) is wrong for *meta*-evolution. Agent judgment from the archive only works when the deciding agent has unbiased fresh context — an orchestrator-in-main-session accumulates anchoring bias, bloats context, needs compaction logic, and collapses subagents to dumb executors.

Decisions taken:

- **Variant B substrate.** Every `agent_end` in the main session, `iterate()` evaluates termination predicates and either stops or spawns a fresh-context subagent via `pi.events` (`subagents:rpc:spawn`). The subagent decides what to try, runs gates, benchmarks, writes its own ledger row to `evolve.md`, and exits. Orchestrator does nothing but coordinate.
- **Single SOT file `evolve.md`.** Goal + metric + termination + gates + inspiration + ledger in one human-readable file. Subagent writes directly (trust-LLM, no validation tool in v1).
- **Hardcoded `target/` subdir** for the evolving repo. Users `mv`/symlink existing repos in. Configurable path deferred.
- **Zero tools.** No LLM-callable API surface. `evolve.md` existence is the activation signal; a future `evolve-init` skill scaffolds via dialogue. Power users can hand-craft `evolve.md` directly.
- **Termination by driver-side predicates** in `## Termination` section of `evolve.md`: `max_iterations` (required) + optional `target_score` + optional `stale_streak`. `iterate()` parses on every `agent_end`, returns `null` on any hit. Matches `@pi-dacmicu/todo`'s "exit by objective state only" philosophy — no LLM escape hatch.
- **Dropped `signal_evolve_success`** entirely. Initially proposed as the LLM's stop button, then rejected: evolve has no objective end state, but driver-evaluated predicates from `evolve.md` give that objectivity without LLM agency.
- **User-defined gates.** `## Gates` section lists shell commands; subagent runs each before recording. Gate failure ⇒ delete branch, skip ledger row. Zero gate code in the extension. Fuzzy LLM gates documented as "use subprocess (`pi --print`), not nested subagents, in v1."
- **Subagent-decides, not orchestrator-decides.** Full ledger (incl. lower-scoring runs) given as guidance; no priming about which branches to examine. Discarded-looking rows may still hold useful structure for combination.
- **Ledger columns: `Branch | Parents | Score | Core idea`.** Status column dropped — Score + Core idea is sufficient. `Parents` records *conceptual lineage* (e.g. `#1`, `#1,#3`, or `main`), not git topology.
- **MATS terminology dropped from pi-dacmicu docs.** We ship as `@pi-dacmicu/evolve`. The MetaHarness MATS proposal remains the conceptual ancestor and is cited in cross-references, but our docs do not market themselves as "MATS-style."
- **Earlier Variant A scaffolding** (in pi-dacmicu repo: `packages/evolve/SCOPE.md` + 4 ts files, ~300 LOC partial) **to be discarded and rewritten** for ~80–100 LOC target. Implementation pending user green light.

Open implementation items: subagent timeout/liveness, provider-detection short-circuit, exact `subagents:rpc:spawn` payload verification, base re-firing semantics (probably a cheap follow-up prompt per iteration; "continue without prompt" base-side change deferred). See [implementations/pi-evolve-extension](../implementations/pi-evolve-extension.md) § Trade-offs.

Detail: this entry. Code commit: pending. Wiki commit: pending.

## 2026-05-13 (later)

**Design review pass — recalibration against explicit constraints.**

After the morning's redesign, a follow-up review challenged the design against three explicit constraints that hadn't been stated up-front:

1. **No algorithmic policy for variant selection** (LLM has full freedom; the thesis is that agent judgment over the ledger is the policy).
2. **Lightweight; dev's machine, dev's task** (target: 5–20 iterations on a small project).
3. **TUI environment, foregrounded** (dev sits at Pi while the loop runs).

Reviewer initially flagged 9 design flaws plus 11 plan-level recommendations. After confronting them with the three constraints, most of them either dissolved (forced-exploration was *contradicted* by constraint #1; long-run viability concerns *didn't apply* under constraint #2; the "detached daemon / `pi evolve` CLI subcommand" alternative *contradicted* constraint #3) or shrank to small concrete additions.

Decisions taken in this pass:

- **Constraints #1–3 now stated up-front** in `pi-evolve-extension.md` § Design constraints. Future reviewers don't relitigate decisions whose answer flows directly from the constraints.
- **Gate-failure amnesia is intended.** A gate failure means *this implementation* failed compile/test/quality — not that the *approach* is bad. Writing a `GATE_FAILED` row would mislead the next subagent into discarding a viable idea. Leaving no row is information-symmetric: no positive signal, no negative signal. Documented in `pi-evolve-extension.md` § *Why gate-failure amnesia is intended*. **Rejected the earlier reviewer suggestion to add a `GATE_FAILED` ledger row.**
- **No subagent timeout in v1.** Constraint #3: in a TUI run, the dev sees a hung iteration and can Escape. A hardcoded timeout would be wrong for legitimate long compile+benchmark workloads. YAGNI until hangs prove recurrent. **Rejected the earlier reviewer suggestion to add a 30-min timeout.**
- **`Parents` column stays self-reported.** Reviewer flagged "half-trustable metadata" as a flaw. Counter: the column's *reference* is unambiguous (run number ↔ branch is bijective by construction), and its *truthfulness* has the same trust surface as Score and Core idea. If we trust the LLM for those, we trust it for Parents. Consistent, not inconsistent.
- **Parser must fail gracefully.** ~10 LOC of try/catch around the markdown parser + `pi.ui.notify` on error → `iterate()` returns `null` (loop paused, not crashed). User fixes file, triggers another turn, loop resumes. Without this, a malformed row crashes the extension inside `agent_end`.
- **Preflight verification is a gating step**, not an open item. Three throwaway probes (~30 min total): P1 verify tintinweb `subagents:rpc:spawn` channel/payload/completion contract via source-read + 20-line live probe, P2 verify fresh-context spawn, P3 verify `await`-able RPC. Implementation does not start until all three pass. If any fails, the design rewrites first.
- **Fake-provider integration test required** alongside implementation, not deferred. ~50 LOC: register a `pi.events` listener for `subagents:rpc:spawn` that appends a hardcoded row and emits `subagents:completed`. Proves the orchestrator independent of tintinweb; catches parser-edge-case and predicate-boundary bugs early.
- **Subagent prompt is load-bearing artifact code.** Documented as such — material prompt changes go in this log like any other API change.
- **LOC budget honest about prompt.** Updated from "~80–100 LOC target" to "~80–100 LOC TS + ~60 lines subagent prompt."
- **"Subagent decides" is a thesis bet, doc says so.** Previously read as a feature; now explicitly flagged as the design's load-bearing assumption.

Net result: the design is unchanged in shape — same orchestrator, same SOT file, same zero-tool surface, same termination predicates. What changed is the **explicitness of the trust surface** (LLM judgment in 4 columns), the **explicit constraint statement** (which kills several otherwise-reasonable patches), and the **preflight + test additions** that make implementation safe to start.

Must-do additions before/during implementation:
1. Preflight probes (P1/P2/P3) — gates implementation start.
2. Parser try/catch + UI notify on malformed `evolve.md` — ~10 LOC.
3. Fake-provider integration test — ~50 LOC, accompanies implementation.

Detail: this entry, `pi-evolve-extension.md` rewritten with constraints section + preflight section. Code commit: pending. Wiki commit: pending.

## 2026-05-12

**Session log as single source of truth — audit pass + LoopDriver simplification.**

User pushed back on session-history scanning as "brittle and unidiomatic." A deep audit (primary sources: pi `session-manager.d.ts/.js`, `compaction.md`, `event-bus.d.ts`, ecosystem issues #326/#2420/#1370, discussion #1546) concluded the opposite: append-only session log + `getBranch()` is the canonical Pi cross-extension state primitive. Compaction never prunes the file; `getBranch()` sees through compaction natively. tintinweb has no `session_before_compact` handler — neither do we.

Decisions taken:

- **Merged `shouldContinue` + `buildIterationPrompt` into single `iterate(ctx) → Prompt | null`** — one scan per turn, matches opencode's `oc check`-style pattern.
- **Dropped `compactionSummary` from `LoopDriver`** — was solving a non-problem. Append-only log + `getBranch()` survives compaction natively.
- **Dropped `onLoopStart` / `onLoopEnd` lifecycle hooks** — YAGNI; evolve adds them back if needed.
- **Re-affirmed dependency on tintinweb** — only real concern (brittleness) was a felt sense, not a real risk.

Wiki restructured: `README.md` becomes the single living-docs page; `concept.md`, `modular-architecture.md`, `pi-port.md`, `implementation-plan.md` moved to `archive/` as superseded historical record. New cross-cutting page at `architecture/pi-session-architecture.md` documents the pattern for any future Pi extension work.

Detail: [archive/research-2026-05-12-session-as-sot.md](archive/research-2026-05-12-session-as-sot.md). Code commit: `dea0525` (pi-dacmicu). Wiki commit: `258efec` (llm-wiki).

## 2026-05-11

**Collapsed WORK and REASSESS into one prompt per iteration.**

Earlier designs alternated WORK and REASSESS as separate turns with a phase-flipping state machine in the file. Removed (code commit `7ade7f8a`) — the forcing was illusory (the LLM could already return from REASSESS without modifying the list) and the token cost was double. The unified prompt instructs the LLM to reassess the list before picking the next item; the forcing is in the prompt text, where it belongs.

Deleted: phase state machine, sha256 stale-detection hash, `staleReassessCount`, WORK_PROMPT/REASSESS_PROMPT split.

## 2026-05-11

**Razor-sharp API pass (code commit `2da9a4f2`).**

Removed `DacmicuState.data`, `appendSystemPrompt`, `systemPromptAddition` callback, `Phase` type, `dacmicu:driver` sentinel custom-entry. `LoopDriver` methods now take only `ctx`. Sentinel-based `/dacmicu_status` was misleading post-compaction; now reads state file directly.

## 2026-05-11

**Removed `signal_loop_success` tool entirely (code commit `defa5d69`).**

The LLM no longer has an escape hatch from any deterministic loop. Exit is determined by objective state only (`todos.every(completed)`, fitness target, etc.). User decision: the deterministic skeleton is the whole point — the LLM must be forced through reassessment until the work is genuinely done, and the legitimate way to "give up" is to clear the TODO list during reassessment.

## 2026-05-11

**Auto-attached TODO loop driver on extension load (code commit `229f4a2f`).**

Removed the `/todo-loop` command. The loop is the system identity, not an opt-in mode. No-op when the list is empty or completed.

## 2026-05-11

**Documented base/todo/tintinweb mesh.**

tintinweb owns the LLM tool surface (`manage_todo_list`); DACMICU owns turn scheduling. Both auto-load via `pi.extensions`. The LLM never sees DACMICU as a tool. Coupling contract (`toolName === "manage_todo_list"` + `details.todos`) documented in `loadTodosFromSession`.

## 2026-05-10

**v1 scope confirmed by user: base + todo + ralph + evolve + fabric.**

User overrode the critical review's scope reduction. Evolve is a key feature (build from scratch — no validated upstream prototype). Fabric confirmed from opencode experience. Ralph is a thin wrapper around base.

## 2026-05-10

**TODO base decision: `tintinweb/pi-manage-todo-list`, not `edxeth/pi-tasks`.**

`pi-tasks` has better visualization but is a poor foundation for a deterministic loop — file-backed storage breaks branching, dependency DAG fights loop ordering, opinionated behavior fights the driver. tintinweb is a passive state primitive: session-entry storage (branches automatically), one tool (`manage_todo_list`), no DAG, no opinions. Right fit.

## 2026-05-08

**Dropped `@pi-dacmicu/subagent` — reuse tintinweb/Hopsken instead.**

Building a subagent extension would duplicate ~2400 LOC of production-validated code (in-process `createAgentSession`, ConversationViewer, agent-tree widget, cross-extension RPC, custom-agent loading, themed completion notifications). Variant B consumers depend on `Hopsken/pi-subagents` (or its superset `tintinweb/pi-subagents`) via `pi.events`-based RPC.

Coupling shape: two-step RPC. Step 1: emit `subagents:rpc:spawn`, get `{id}` in reply. Step 2: wait for `subagents:completed` / `subagents:failed` event keyed by that id. Result extraction from `result.result` text — brittle for structured data like benchmark scores.

## 2026-05-08

**Refined Variant A vs Variant B framing.**

DACMICU has two architectural variants:
- Variant A — in-session loop, shared context. Used by `todo`, `ralph` (default).
- Variant B — subagent-per-iteration, isolated context. Used by `ralph` (opt-in), `evolve` (target).

Both share the same outer loop driver; they differ in what runs inside each iteration. Earlier framing privileged Variant A; both are now first-class.

## 2026-05-08

**FABRIC-not-prereq correction.**

Earlier framing implied DACMICU needed `pi-callback` / Unix-socket infrastructure to reach opencode parity. That conflated two distinct mechanisms: opencode's bash-callback DACMICU is a workaround for opencode lacking native `agent_end` / `triggerTurn`, not a feature DACMICU requires. Pi's in-agent driver covers Ralph loops natively. FABRIC composition is a real Pi gap but is an independent capability — useful for shell pipelines, not for the loop-until-done pattern.

## 2026-05-07 and earlier

See [archive/](archive/) for prior research sessions, verification audits, scale-down explorations, and critical reviews.
