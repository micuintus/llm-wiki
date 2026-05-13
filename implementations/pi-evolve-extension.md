---
title: pi-evolve Extension — Design (Variant B)
type: implementation
updated: 2026-05-13
sources:
  - "../dacmicu/README.md"
  - "../ecosystem/evolve-systems.md"
  - "../ecosystem/subagents.md"
  - "../architecture/pi-session-architecture.md"
  - "session:2026-05-13-evolve-design-revision"
  - "session:2026-05-13-evolve-design-review"
tags: [extension, evolve, dacmicu, implementation, subagent, variant-b]
see_also:
  - "../dacmicu/README.md"
  - "../dacmicu/log.md"
  - "../dacmicu/spirit-vs-opencode.md"
  - "pi-callback-extension.md"
  - "../ecosystem/evolve-systems.md"
  - "../ecosystem/subagents.md"
  - "../concepts/deterministic-agent-control-mechanisms.md"
---

# pi-evolve Extension — Design (Variant B)

Code-evolution extension for Pi. **Variant B (subagent-per-iteration with isolated context).** Built on `@pi-dacmicu/base` for the loop primitive. ~80–100 LOC target (TS skeleton) + ~60 lines of subagent prompt.

> **History:** An earlier 510 LOC Variant A draft (`examples/extensions/pi-evolve.ts` in pi-mono, 2026-05-07) targeted in-session git ops with four tools. Superseded 2026-05-13 by the design on this page after a user-driven review concluded fresh-context subagents are the right substrate. The old draft remains as historical reference; do not use as the implementation target.

## Design constraints (load-bearing)

The design is shaped by three explicit constraints. Every trade-off below traces back to one of these:

1. **No algorithmic policy for variant selection.** The LLM has full freedom to diverge, converge, or combine from the archive. There is no forced-exploration counter, no hill-climb-then-jump policy, no temperature schedule. This is the central thesis bet: agent judgment over an unstructured ledger is the policy.
2. **Lightweight; runnable on a developer's machine for a developer's task.** Target use case: 5–20 iterations on a small project. Scaling concerns (ledger bloat at 100+ iterations, multi-objective metrics, noise-averaged scores) are explicitly deferred.
3. **TUI environment, foregrounded.** The dev sits at Pi while the evolve loop runs. They see iteration output, can Escape, can intervene. Not a detached daemon; not a background process.

These constraints invalidate several otherwise-reasonable design moves (forced exploration, multi-objective metrics, detached daemon mode, hardcoded subagent timeouts). They are stated up front so future reviewers don't relitigate decisions whose answer flows directly from the constraints.

## TL;DR

Main session's `iterate()` is the orchestrator. On every `agent_end`, it parses `evolve.md`, evaluates **deterministic termination predicates** (max_iterations, target_score, stale_streak), and either stops (returns `null`) or spawns a **fresh-context subagent** via `pi.events` RPC. The subagent reads `evolve.md` (goal, metric, gates, inspiration, ledger), decides what to try, creates a git branch in `target/`, runs user-provided gate commands, benchmarks, appends its own row to `evolve.md`'s ledger, and exits.

**Zero tools.** Zero LLM agency over termination. The deterministic skeleton enforces stop conditions the LLM cannot evade — the same `@pi-dacmicu/todo`-style guarantee, just with predicates parsed from a file instead of a `manage_todo_list` toolResult.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  User initiates evolve (via `evolve-init` skill, future)        │
│     ↓                                                           │
│  evolve.md written to project root                              │
│     ↓                                                           │
│  Main session is the ORCHESTRATOR                               │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  @pi-dacmicu/evolve LoopDriver (attached to base)         │ │
│  │  on agent_end → iterate(ctx):                             │ │
│  │    if !exists(evolve.md) → null  (loop exits)             │ │
│  │    parse ## Termination + ledger (try/catch)              │ │
│  │      parse failure → notify user → null                   │ │
│  │    if any predicate hits → null  (loop exits)             │ │
│  │      - iterationCount >= max_iterations                   │ │
│  │      - bestValue past target_score                        │ │
│  │      - staleStreak >= stale_streak                        │ │
│  │    else:                                                  │ │
│  │      spawn subagent via pi.events RPC                     │ │
│  │      await subagents:completed                            │ │
│  │      return brief follow-up prompt to re-fire agent_end   │ │
│  └───────────────────────────────────────────────────────────┘ │
│                          ↓ spawn                                │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Subagent (fresh AgentSession)                            │ │
│  │   1. read evolve.md                                       │ │
│  │   2. delete orphan evolving/ branches                     │ │
│  │   3. decide diverge / converge / combine                  │ │
│  │   4. cd target && git checkout -b evolving/vN/slug ...    │ │
│  │   5. make changes                                         │ │
│  │   6. run every gate → fail = delete branch + exit         │ │
│  │   7. run benchmark → capture METRIC line                  │ │
│  │   8. append row to evolve.md's ledger                     │ │
│  │   9. exit                                                 │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## File layout in user's project

```
project/
├── evolve.md         # Single source of truth: goal, metric, termination,
│                     # gates, inspiration, ledger
└── target/           # The repo being evolved (hardcoded subdir name)
    ├── .git/         # Variants branch here, isolated from outer
    ├── benchmark.sh  # User-provided
    ├── scripts/      # User's gate scripts
    └── ...source...
```

Hardcoded `target/` chosen for razor-sharpness: zero ambiguity for subagents, no parameter to plumb. Existing repos `mv`'d or symlinked in. Configurable path deferred to v2 if it bites.

## `evolve.md` schema

```markdown
# Evolve: <experiment name>

## Goal
<free-form description>

## Metric
- Primary: <metric_name> (<unit>), <lower|higher> is better

## Termination
- max_iterations: 50         # required
- target_score: 200          # optional: stop when bestValue meets target
- stale_streak: 10           # optional: stop after N consecutive non-improving rows

## Gates (must pass before recording)
- <shell command 1>     # e.g. `cd target && cmake --build build`
- <shell command 2>     # e.g. `cd target && ctest --output-on-failure`
- <shell command 3>     # e.g. `cd target && ./scripts/llm-quality-check.sh`

## Inspiration
<free-form notes: prior attempts, directions, hunches>

## Ledger
| Branch | Parents | Score | Core idea |
|--------|---------|-------|-----------|
| evolving/v1/baseline | main | 850 ms | Initial baseline run, no code changes. |
| ...
```

**Single source of truth.** Goal + metric + termination + gates + inspiration + ledger in one human-readable file. Survives compaction, session restart, fork. Git-trackable. Diff-friendly.

**"Core idea" column is non-negotiable.** It is the subagent's only meaningful signal beyond the score. Subagent's prompt requires it: one sentence stating what was tried, not just a name.

**Status column intentionally absent.** Score + Core idea is sufficient for the next subagent to judge whether a low-score run was a dead end or a stepping stone. Gate failures leave no row at all (branch deleted, ledger untouched) — see *Why gate-failure amnesia is intended* below.

**Parents column is conceptual lineage.** Format:
- `main` — fresh from main, no inspiration from prior runs
- `#N` — built directly on or inspired by run N (the row at position N in the ledger; bijective with branch `evolving/vN/...`)
- `#N,#M,...` — combination/synthesis of multiple runs

A variant's branch may or may not git-merge from these — it's the subagent's call. The column records *what informed the design*, not the git topology. Self-reported by the subagent; same trust surface as the Score and Core idea columns.

### Why gate-failure amnesia is intended

When a gate fails, the variant branch is deleted and **no row is written**. This is a deliberate choice, not an oversight.

Reasoning: a gate failure means *this concrete implementation* did not satisfy compile/test/quality requirements. It does **not** mean the *approach* was bad. The same approach with a different implementation may pass. Writing a `GATE_FAILED` row would mislead the next subagent into discarding a viable idea on weak evidence.

By leaving no trace, the failure is information-symmetric: no positive signal (no Score), no negative signal (no row). The next subagent is free to retry the same direction with a different implementation, and the ledger's structure stays clean.

This is the same philosophy as Variant A's branch-delete-on-failure, but applied consistently to the "single SOT, append-only ledger" model.

### `evolve.md` is executable

The `## Gates` section is shell commands run with full shell access by the subagent. The file is plaintext, but it's effectively a Makefile. Review it like one. (Not a v1 risk since the file is dev-authored on the dev's own machine, but worth noting for any future shared-`evolve.md` use case.)

## Extension surface

**Zero tools.** The extension registers exactly one hook (`agent_end`) via `attachLoopDriver`. No LLM-callable surface at all.

**Activation:** `evolve.md` existence is the activation signal. A skill (`evolve-init`, future) scaffolds the file via dialogue with the user. Power users can hand-craft `evolve.md` and start the loop without going through any tool or skill.

**Termination:** evaluated programmatically by `iterate()` against `## Termination` predicates. The LLM has no escape hatch. Same DACMICU philosophy as `@pi-dacmicu/todo` — exit by objective state only.

**Subagent writes ledger rows.** No `record_variant` tool. Single SOT. Trust-LLM choice — same trust surface as the Score column; if we trust the LLM to report its own benchmark, we trust it to format a row.

## Loop driver behavior

```typescript
// Pseudocode
attachLoopDriver(pi, {
  iterate: async (ctx) => {
    if (!fs.existsSync("evolve.md")) return null;

    let parsed;
    try {
      parsed = parseEvolveMd(fs.readFileSync("evolve.md", "utf8"));
      // { metric: {name, unit, direction}, termination: {...}, ledger: [rows] }
    } catch (e) {
      pi.ui.notify(`evolve.md parse error: ${e.message}. Loop paused.`);
      return null;
    }

    // Termination predicates (any hit → stop)
    if (parsed.ledger.length >= parsed.termination.max_iterations) return null;
    if (passesTarget(parsed)) return null;
    if (staleStreakHit(parsed)) return null;

    // Spawn subagent and wait
    const spawnId = crypto.randomUUID();
    pi.events.emit("subagents:rpc:spawn", {
      id: spawnId,
      prompt: buildSubagentPrompt(parsed),
      cwd: process.cwd(),
    });
    await waitForCompletion(pi.events, spawnId);

    // Return a brief prompt so main session has a turn → next agent_end fires
    return {
      customType: "evolve-iterate",
      content: [{
        type: "text",
        text: "Iteration complete. Acknowledge briefly; next iteration will fire on the next agent_end.",
      }],
    };
  },
});
```

**Why a follow-up prompt instead of `null` between iterations?** Base's `attachLoopDriver` only re-fires when the main session has another `agent_end`. If `iterate()` returns `null`, no message is sent and no further turn happens — the loop ends. To continue, `iterate()` must send a prompt to the main session, the LLM responds, `agent_end` fires, `iterate()` runs again, and either spawns the next subagent or stops via a predicate.

Cost: one cheap turn in the main session per iteration. For the dev-machine, 5–20-iteration target, this is negligible. A base-side `{continue: true}` return would eliminate it cleanly; deferred until it bites.

**No subagent timeout in v1.** A hardcoded timeout would be wrong for legitimate long-running workloads (large compile + long benchmark = 20+ min legitimately). In a TUI run, the dev sees the hung iteration and can Escape. If hangs become a recurring pain in dogfooding, we add a configurable timeout then.

## Subagent prompt template

```
You are one iteration in an evolutionary code-optimization run. A series of
subagents like you, each with fresh context, takes turns proposing and
benchmarking variants. The ledger in evolve.md is the collective memory —
your only window into what's already been tried. Your job is to add one
useful variant to it (or learn from a failure) and exit. The next subagent
will see what you did via the ledger.

Read evolve.md in this directory. Review the goal, metric, gates, inspiration,
and the full ledger.

Decide what to try next. You can diverge (try something experimental),
converge (refine a promising approach), or combine (merge ideas from multiple
runs). The ledger's "Core idea" column and scores are your only guidance —
lower-scoring rows may still hold useful structure for combination.

All previous variants are git branches in target/. You can:
  cd target && git checkout evolving/vN/slug
to inspect any prior attempt.

Workflow:
1. cd target
2. Sweep orphan evolving/* branches with no corresponding ledger row; delete them.
3. If the ledger is empty, run a baseline (no code changes) on main first.
   Otherwise, decide your approach. You may:
     - start fresh from main
     - build on a single prior run
     - combine ideas from multiple prior runs
   Create the variant branch with:
     git checkout -b evolving/vN/<short-slug> <base-branch>
   where N = (number of rows in ledger) + 1. <base-branch> is whichever git
   ref you want as the actual starting point (this is independent of the
   conceptual Parents column you'll fill in step 7).
4. Make your changes (skip for baseline run).
5. Run every gate command listed in evolve.md's ## Gates section. If any fails:
     git checkout main
     git branch -D evolving/vN/<short-slug>
     exit with: GATE_FAILED: <which gate>
     Do NOT write to evolve.md
   (Gate failure leaves no ledger row by design — the failure is about your
   implementation, not the approach. The next subagent may retry the same
   direction with a different implementation.)
6. If all gates pass, run the benchmark, capture the metric.
7. Append one row to evolve.md's ## Ledger table:
     | evolving/vN/<slug> | <parents> | <score> <unit> | <one-sentence core idea> |
   Parents column:
     - `main` if your approach is from scratch with no inspiration from prior runs
     - `#N` if built on or inspired by run N
     - `#N,#M,...` if combining multiple runs
   (Parents is conceptual lineage — what informed your design — not git topology.)
8. Exit with: DONE
```

The prompt is **load-bearing artifact code**, not configuration. Material changes go in `dacmicu/log.md` like any other API change.

## Termination predicates (driver-side)

```
max_iterations:   stop when ledger row count >= this value
target_score:     stop when bestValue meets the target
                  - direction "lower": stop when bestValue <= target_score
                  - direction "higher": stop when bestValue >= target_score
stale_streak:     stop when bestValue hasn't improved in N consecutive rows
                  ("hasn't improved" = strictly no movement of bestValue)
```

**Validation:**
- `max_iterations` is required (else infinite loop risk). Driver errors loudly with a UI notification if absent: *"evolve.md missing required `max_iterations` in ## Termination"*.
- `target_score` and `stale_streak` are optional. Any combination is valid.
- Any parse failure → `pi.ui.notify` with the line/column → `iterate()` returns `null` (loop paused, not crashed). User fixes the file and triggers another turn to resume.

## Comparison to pi-autoresearch and earlier Variant A draft

| Property | pi-autoresearch | Variant A draft (superseded) | Variant B (this design) |
|---|---|---|---|
| Substrate | Linear commits in main session | In-session git ops | **Subagent-per-iteration** |
| Variant store | Commits (rebased) | Branches (`evolve/vN/…`) | **Branches (`evolving/vN/…`) in `target/`** |
| Failed-path archive | Lost (reverted) | Lost (reverted, branch deleted) | **Branch deleted only on gate failure; non-improving runs keep their branch** |
| Parent / lineage selection | Always current best | Agent picks (LLM in main session) | **Subagent picks (fresh context); `Parents` column records conceptual lineage** |
| Ledger | `autoresearch.md` | `selection.md` (kept-only header rewrites) | **`evolve.md` (full, no rewrites — subagent appends only)** |
| Tools | `init/run/log` | `init/run/log/signal` | **Zero tools** |
| Termination | Selection-policy infinite (user kills) | LLM-callable `signal_loop_success` | **Driver-side predicates in `evolve.md`** |
| Correctness gate | `autoresearch.checks.sh` | Manual in benchmark | **Explicit `## Gates` section; subagent runs each** |
| Compaction-aware | `session_before_compact` | Same | **Not needed (fresh subagent context each iteration)** |
| Size | ~2,500 LOC | ~450 LOC | **~80–100 LOC TS + ~60 lines subagent prompt** |

## Trade-offs and known risks

### Accepted by design (do not relitigate)

- **No algorithmic exploration policy.** Constraint #1. Diversity comes from LLM judgment over the ledger, or it doesn't come at all. If the thesis is wrong, we falsified it; we don't patch in a policy.
- **Gate failure leaves no ledger row.** See *Why gate-failure amnesia is intended* above.
- **No subagent timeout in v1.** Constraint #3 (TUI dev can Escape). YAGNI until hangs prove recurrent.
- **`target/` hardcoded.** Razor-sharpness over configurability.
- **Ledger growth → context bloat after ~50+ iterations.** Constraint #2: target is 5–20 iterations on a dev machine. Defer archive/summarize until first user hits the wall.
- **Single-objective `target_score`.** Constraint #2: dev tasks rarely have two competing metrics worth scripting an evolve run over. Multi-objective deferred to v2.
- **Score-as-single-snapshot, no noise model.** Same; dev can rerun.
- **Cheap follow-up prompt per iteration.** Inelegant but ~zero cost at the 5–20-iteration scale. Base-side `{continue: true}` is a clean future fix; deferred.

### Open implementation gaps (must address during build)

1. **Subagent provider contract is unverified.** `pi.events` channel name (`subagents:rpc:spawn`), payload shape, completion event semantics — all guessed from ecosystem context. **Preflight verification is the first commit before any other implementation work.** See *Preflight verification* below.
2. **Provider-not-installed silent failure.** Emitting `subagents:rpc:spawn` with no listener fails silently. Short detection timeout on first spawn (5s) → surface "no subagent provider responded — install `tintinweb/pi-subagents`."
3. **Parser failure must pause cleanly, not crash.** ~10 LOC of try/catch around the markdown parser + `pi.ui.notify` on error. Without this, a malformed row crashes the extension inside `agent_end` — much worse failure mode than "loop paused with clear error."
4. **Subagent crash recovery.** Subagent crashes mid-iteration → orphan branch in `target/`. Mitigation: subagent prompt step 2 sweeps orphans on each iteration. Sufficient for v1.
5. **`evolve.md` is single-writer-assumed.** Editing during a subagent run races. Document: user pauses (Escape) before editing.
6. **Fuzzy LLM gates use subprocess, not nested subagents.** v1 documents fuzzy gates as `pi --print -p ...` subprocess calls. Nested-subagent behavior with tintinweb is unverified and not required for the dev-machine use case.

### Subagent-decides vs orchestrator-decides

The orchestrator could see the full ledger and dictate "try X next." Rejected because:
- Orchestrator context bloats over iterations
- Anchoring bias from past calls
- Compaction logic needed
- Collapses the value of fresh-context subagents — one agent in two bodies

Subagent-decides preserves agent judgment from archive and keeps the orchestrator trivially small.

### Why an extension, not a skill or a CLI subcommand

Skills are user-invoked; they don't fire on `agent_end`, and they cannot enforce termination predicates atomically. The deterministic loop — "every turn, evaluate termination predicates and either continue or stop" — requires the `agent_end` hook plus stateful predicate enforcement.

A `pi evolve` CLI subcommand (detached process) was considered and rejected per constraint #3: the dev *wants* their TUI to be the orchestrator for the duration of the experiment. The extension shape fits the use case.

Skills handle setup (`evolve-init`) and teardown (`evolve-finalize`), not the loop itself.

## Preflight verification (must run before implementation)

Three preflight checks. None of them is a tool; all are throwaway probes. Implementation work does not start until all three pass.

**P1. Verify tintinweb `subagents:rpc:spawn` contract.**
- Source read: clone `tintinweb/pi-subagents`, grep for `subagents:rpc:spawn`, read the handler's expected payload and reply contract. ~15 min.
- Live probe: ~20 LOC throwaway extension that emits `subagents:rpc:spawn` with our guessed payload and logs every event the bus surfaces. ~15 min.
- Outputs: confirmed channel names, payload schema, completion event semantics. If contract differs from the design's assumption, the design updates before code starts.

**P2. Verify fresh-context spawn.** Confirm a subagent spawned this way inherits no parent context (message history, tool state). If it does, the entire design premise needs revisiting. The P1 probe can answer this by inspecting whatever the subagent's first turn sees.

**P3. Verify `await`-able RPC.** Confirm `iterate()` can `await` completion of a `pi.events` RPC cleanly without blocking other event traffic. Same probe.

All three are answerable in ~30 minutes of work with one cloned repo and one ~20-line probe. If any fails, the design rewrites before code.

## Test harness (must accompany implementation)

A **fake subagent provider** integration test, ~50 LOC, registered as a `pi.events` listener for `subagents:rpc:spawn`. On spawn:
1. Append a hardcoded row to a temp `evolve.md`.
2. Emit `subagents:completed` with the spawn id.

The driver should then evaluate termination predicates against the new state. Loop a few times (varying the hardcoded scores), assert the final ledger shape and termination reason.

This proves the orchestrator independent of tintinweb. It is cheap and catches the "parser breaks on edge-case rows" and "predicate misfires at exact boundaries" bug classes early.

## Skills (future, separate)

- **`evolve-init`** — Dialogue-based setup. Helps user converge on goal/metric/termination/gates via Q&A. Validates `target/benchmark.sh` exists. Writes `evolve.md`.
- **`evolve-finalize`** — Surfaces the best branch, optionally merges to `target/main`, deletes orphan branches, generates summary report.

Programmatic skeleton + dialogic surface. Skeleton stays minimal; setup/teardown UX lives in skills where it can iterate freely.

## Subagent provider dependency

Per the wiki (DACMICU log 2026-05-08), we depend rather than build. Targets `tintinweb/pi-subagents` (preferred — superset of Hopsken). Protocol (guessed; **see Preflight P1 before relying on this**):

- Emit `pi.events.emit("subagents:rpc:spawn", { id, prompt, cwd })`
- Receive reply via `subagents:rpc:spawn:reply` (or whatever tintinweb returns)
- Wait for `subagents:completed` or `subagents:failed` event keyed by spawn ID
- Subagent's final assistant message extractable from completion payload — but we don't rely on it; the subagent writes the ledger row to disk

## Cross-references

### pi-mono wiki
- [dacmicu/README](../dacmicu/README.md) — DACMICU as a whole; the three loops
- [dacmicu/log](../dacmicu/log.md) — design-decision history
- [dacmicu/spirit-vs-opencode](../dacmicu/spirit-vs-opencode.md) — Variant A/B framing
- [architecture/pi-session-architecture](../architecture/pi-session-architecture.md) — append-only log, fresh context
- [ecosystem/evolve-systems](../ecosystem/evolve-systems.md) — survey of evolve systems
- [ecosystem/subagents](../ecosystem/subagents.md) — subagent provider landscape (tintinweb, Hopsken, HazAT)
- [implementations/pi-callback-extension](pi-callback-extension.md) — sibling extension for bash callbacks
- [concepts/deterministic-agent-control-mechanisms](../concepts/deterministic-agent-control-mechanisms.md) — taxonomy

### MetaHarness wiki (research)
- [MATS proposal](../../../../MetaHarness/llm-wiki/proposals/mats.md) — Minimal Agentic Tree Search; the conceptual ancestor for the "agent-decides, no algorithmic policy" approach. pi-dacmicu/evolve is a direct implementation but does not market itself as "MATS-style" — we ship as `@pi-dacmicu/evolve`.
- [DGM](../../../../MetaHarness/llm-wiki/systems/dgm.md) — closest published precedent
- [EvoGit](../../../../MetaHarness/llm-wiki/systems/evogit.md) — git-as-archive precedent
