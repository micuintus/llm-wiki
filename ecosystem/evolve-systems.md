---
title: Evolve Systems as Pi Extensions — Full Survey
type: synthesis
updated: 2026-05-07
sources:
  - https://github.com/davebcn87/pi-autoresearch
  - https://github.com/SakanaAI/ShinkaEvolve
  - https://github.com/codelion/openevolve
  - "../../../../MetaHarness/llm-wiki/proposals/mats.md"
  - "../../../../MetaHarness/llm-wiki/systems/dgm.md"
  - "../../../../MetaHarness/llm-wiki/systems/evogit.md"
  - "../../../../MetaHarness/llm-wiki/systems/shinkaevolve.md"
  - "../../../../MetaHarness/llm-wiki/systems/openevolve.md"
  - "../../../../MetaHarness/llm-wiki/systems/autoresearch.md"
  - "../../../../MetaHarness/llm-wiki/concepts/deterministic-agent-loops.md"
tags: [extension, evolve, evolutionary, dacmicu, mats, comparison]
---

# Evolve Systems as Pi Extensions — Full Survey

Survey of Pi extensions implementing **evolutionary code optimization** — try a variant, benchmark it, keep or discard, repeat — and how they relate to the broader code-evolve research landscape (AlphaEvolve, OpenEvolve, ShinkaEvolve, DGM, MATS).

Companion to [ecosystem/loop-extensions](loop-extensions.md) (which covers iteration patterns), [dacmicu/concept](../dacmicu/concept.md), and the MetaHarness research wiki.

## TL;DR — the niche is nearly empty

**Only one production evolve extension exists for Pi today: `davebcn87/pi-autoresearch`** (6,443⭐). Everything else in the Pi ecosystem either iterates without variant storage (Ralph extensions) or doesn't tackle the metric-gated keep/discard pattern at all.

The MATS-style **branched-variant + markdown-ledger** pattern is **not yet implemented as a Pi extension**. This is an open architectural niche.

## What counts as an "evolve system"?

For this survey: tries variant → measures with explicit metric → keeps or discards based on metric → archives lineage. Distinguishing properties:

- **Has an explicit fitness metric** (not just "until done")
- **Persists variants** (in git history, branches, or files) across iterations
- **Has a keep/discard decision** based on the metric
- **Archives the lineage** so later iterations can learn from prior ones

Pi Ralph extensions ([loop-extensions](loop-extensions.md)) are *iteration* — they don't have these properties (no metric gating, no variant archive). They're complementary but distinct.

## The lone production extension

### `davebcn87/pi-autoresearch` — the only mature evolve extension

**Stats**: 6,443⭐, 375 forks, 14 contributors, 943/wk npm downloads, 16+ releases, comprehensive CHANGELOG, CI/CD via GitHub Actions, npm OIDC trusted publishing. Production-grade by every measure.

**Inspiration**: Karpathy's [autoresearch](https://github.com/karpathy/autoresearch) (single-branch hill-climbing). pi-autoresearch is essentially the Pi-native productionized version, with extension UI, dashboard, compaction-awareness, and branch-aware resumability.

**Architecture**:

| Aspect | Implementation |
|--------|---------------|
| **LLM tools** | `init_experiment`, `run_experiment`, `log_experiment` |
| **Variant store** | **Linear git timeline.** Kept experiments → commits (`experiment-NNN-description`). Discards are reverted. |
| **Index file** | `autoresearch.md` — objective, metric, unit, direction, baseline, files-in-scope, ideas-to-try, what's-been-tried |
| **Run log** | `autoresearch.jsonl` (append-only iteration metadata with ASI annotations) |
| **Benchmark** | `autoresearch.sh` outputs `METRIC name value` lines (one or more metrics) |
| **Correctness gate** | Optional `autoresearch.checks.sh` (tests/lint must pass for `keep`) |
| **Lifecycle hooks** | Optional `autoresearch.hooks/before.sh`, `after.sh` (research, learnings, anti-thrash) |
| **Selection policy** | None (pure hill-climbing — always continues from current best, like Karpathy autoresearch) |
| **Multi-objective** | One primary metric drives keep/discard; secondary metrics for monitoring only |
| **Compaction-aware** | Yes — `session_before_compact` snapshots state losslessly; auto-resume on overflow with re-read of state files |
| **Confidence scoring** | After 3+ runs, compares best improvement vs noise floor (≥2.0× green, 1.0–2.0× yellow, <1.0× red) |
| **UI** | Status widget always visible, `Ctrl+Shift+T` inline dashboard, `Ctrl+Shift+F` fullscreen, `/autoresearch` command, live HTML export |
| **Skills** | `autoresearch-create` (sets up session), `autoresearch-finalize` (splits noisy branch into clean per-change branches), `autoresearch-hooks` (optional lifecycle scripting) |

**Use cases (from README)**: test speed, bundle size, LLM training (val_bpb), build times, Lighthouse scores. *Any optimization target with a measurable metric.*

**Workflow per iteration**:
1. Agent reads `autoresearch.md` → picks an idea from the ideas list
2. Agent edits files in scope
3. Agent runs `./autoresearch.sh` via `run_experiment` (captures METRIC values)
4. Agent runs `./autoresearch.checks.sh` if configured
5. Agent calls `log_experiment({ status: "keep" | "discard" | "crash", metrics: {...} })`:
   - `keep` → tool commits to git as `experiment-N-description`
   - `discard` → tool reverts working tree
   - `crash` → tool reverts and logs failure
6. Loop fires next iteration; agent re-reads `autoresearch.md` (now updated with the previous attempt)

**Critical design rules** (from `autoresearch-create` skill):
- **Don't commit/revert manually** — tools own git ops; manual ops corrupt experiment lineage
- **`keep` only when primary metric improved** — secondary metrics are monitoring, never drive decisions
- **Append to `autoresearch.md` what was tried** — build a history the next iteration can read
- **Reset on context exhaustion via auto-compaction** — loop continues automatically

## Why the niche is otherwise empty

Surveyed 14 Pi Ralph/loop extensions ([loop-extensions](loop-extensions.md)) and they all share a structural limitation that prevents them from being evolve systems:

| Pattern | Why it's not "evolve" |
|---------|----------------------|
| Ralph variants A–B (in-process loop drivers) | No metric gate, no variant archive — just keeps iterating |
| Variant C (subprocess+RPC, `ralph-loop-pi`) | Has bash condition for stopping but no metric-driven keep/discard, no variant tree |
| Variant D (branched-session, `rahulmutt/pi-ralph`) | Each iter is a separate branched session, but no metric, no merging back |
| Variant E (PTY-embedded external runtimes) | External tool's responsibility, not Pi-native |
| Variant F (hat-based, `samfoy/pi-ralph`) | Workflow engine, not evolve |
| Variant G (cron-style, `emanuelcasco`) | Scheduled prompts, not evolve |

Even `nicobailon/pi-review-loop` ("review until no issues found") is iteration without metric persistence.

The closest neighbor is `akijain2000/hermes-loop` — self-improving via skill creation — but it evolves *capabilities* (skill files), not *code variants* under a metric.

## The MetaHarness theoretical landscape

The MetaHarness wiki documents the broader research space. None of these are Pi extensions; they're external systems and proposals. They form the conceptual backdrop for any Pi-native evolve build.

| System | Properties | Variant store | Selection | Pi extension? |
|--------|-----------|--------------|-----------|---------------|
| **AlphaEvolve** (DeepMind, closed) | LLM mutation + evolutionary algorithms; discovered first Strassen improvement in 56 years | In-memory archive | MAP-Elites grid | No (closed source) |
| **OpenEvolve** (codelion, open) | AlphaEvolve clone — MAP-Elites + islands + migration | Archive + islands | Multi-dim behavior space | No (Python framework) |
| **ShinkaEvolve** (Sakana, ICLR 2026) | Sample-efficient: novelty rejection + bandit LLM ensemble; SOTA circle packing in ~150 samples | Archive | Power-law + novelty filter | No (Python `shinka` lib, `shinka_launch` CLI) |
| **CodeEvolve** (Inter&Co) | Prompt co-evolution + rank-proportional selection | Archive | Rank-proportional | No |
| **DGM** (Sakana/UBC) | Agentic proposer (Claude w/ filesystem) + tree archive + selection_log.md per node; ~90% match to MATS | Tree of nodes | 90% greedy + 10% random | No |
| **EvoGit** | Multi-agent, **git as canonical archive substrate**, crossover via git merge | Git branches (phylogenetic graph) | Multi-agent picks branches | No |
| **Karpathy autoresearch** | Pure hill-climbing single-branch loop | Single branch + program.md | Always best | Yes — `pi-autoresearch` is essentially this |
| **MATS** (Voigt's proposal) | Markdown ledger + git branches + agentic proposer w/ full creativity, NO GA, NO selection policy | Git branches in tree | Agent judgment | **Not yet built** |
| **AIDE** (Weco) | Tree-search for ML engineering; draft/debug/improve modes | Tree | Algorithmic | No |
| **CliffSearch** | Co-evolves theory + code for scientific discovery | Structured | Custom | No |
| **AI Scientist-v2** (Sakana, Nature 2026) | Progressive agentic tree search for paper generation | Tree | Algorithmic | No |
| **SWE-Search** | MCTS + iterative refinement on SWE-bench | Tree | MCTS | No |
| **Robeyns Self-Improving Coding Agent** | Linear self-improvement, no archive | Linear | Greedy | No |

Closest precedents to MATS-on-Pi: **DGM** (architectural match minus the policy layer) and **EvoGit** (git-substrate precedent).

## Mapping `pi-autoresearch` onto the theory landscape

| Property | pi-autoresearch | Karpathy autoresearch | MATS proposal | DGM | EvoGit |
|----------|----------------|----------------------|---------------|-----|--------|
| Variant storage | Linear git commits | Linear git rebases | **Git branches in tree** | In-memory tree | Git phylogenetic graph |
| Failed-path archive | ❌ (reverted) | ❌ | ✅ (branches kept) | ✅ | ✅ |
| Parent selection | Always current best | Always current best | **Agent judgment from full archive** | 90% greedy + 10% random | Multi-agent picks |
| Selection policy | None (hill-climb) | None | **None (agent replaces it)** | Algorithmic | Implicit |
| Markdown ledger | `autoresearch.md` (only kept) | `program.md` | **`selection.md` (all variants)** | `selection_log.md` per node | Implicit in git history |
| Multi-objective | Primary + secondary monitoring | Single | Agent's choice | Single | Implicit |
| Crossover | ❌ | ❌ | ❌ (single agent, agent could merge) | ❌ | ✅ (git merge) |
| Compaction-aware | ✅ (best of class in Pi) | N/A | Should adopt | N/A | N/A |
| Pi-native? | ✅ | No | **Open niche** | No | No |

`pi-autoresearch` is structurally **Karpathy autoresearch productionized for Pi**. It has Karpathy's same fundamental limitation — single-branch hill-climbing means failed exploration paths are lost — but it adds Pi-grade UX, compaction-awareness, hooks, and skills.

## The open niche: MATS-style on Pi

The user's target — **branched variants with markdown ledger across runs** — is a clean architectural pivot from `pi-autoresearch`'s linear timeline to a **tree of branches** indexed by a single `selection.md` ledger.

What you'd reuse from existing Pi extensions:

| Source | What to take |
|--------|-------------|
| **`pi-autoresearch`** (davebcn87) | Tool shape (`init_experiment` → `run_experiment` → `log_experiment`); compaction-aware state pattern (`session_before_compact` lossless snapshot); ASI confidence scoring; hooks pattern; skill-based session setup |
| **`mitsuhiko/agent-stuff/loop.ts`** | DACMICU loop driver (`agent_end` → `pi.sendMessage({...}, {triggerTurn:true, deliverAs:"followUp"})`); `signal_loop_success` breakout tool; `wasLastAssistantAborted` detection |
| **`pi-mono/examples/extensions/todo.ts`** | State-in-tool-result-`details` pattern (branches correctly with session tree forks/clones) |
| **`@tmustier/pi-ralph-wiggum`** | `before_agent_start` system-prompt injection (per-iteration context including current `selection.md` excerpt); state file rehydration on `session_start` |

Add on top:

1. **Branch-per-variant** instead of commits-on-one-branch. Each new variant: `git checkout -b variant-NNN parent-branch && <changes> && git commit`.
2. **`selection.md` ledger** listing all variants (active, tested, superseded) with parent, score, status, free-form insights.
3. **Agent picks parent** by reading `selection.md` and choosing — no algorithmic policy.
4. **Per-iteration prompt** injects current `selection.md` state into the agent's context via `before_agent_start`.

What you'd skip (relative to AlphaEvolve / OpenEvolve / ShinkaEvolve):

- ❌ MAP-Elites grid → agent judgment replaces it
- ❌ Islands / migration → flat archive
- ❌ Power-law / UCB / rank-proportional selection → agent reads ledger, picks
- ❌ Novelty signature embedding → agent does it implicitly via reading prior variants
- ❌ Bandit LLM ensemble → single model (or rotate via `--model` flag)
- ❌ Crossover via merge → optional, can be added later (EvoGit precedent)

Estimated extension size: **400–600 LOC** TypeScript. No Pi core changes (all hooks already exist — see [dacmicu/implementation-plan](../dacmicu/implementation-plan.md) for the hook surface).

## Why "lightweight" is well-positioned for MATS

MATS's central thesis is that **modern LLMs don't need algorithmic policies for code evolution** — agent judgment beats UCB/MAP-Elites/etc. for complex tasks. This is exactly the *minimalist* trade pi-autoresearch already makes (no selection policy, just always-best). Branching adds the archive without adding policy.

Failure modes to design for upfront:
- **Objective hacking** (DGM node-114 case) — correctness gate is mandatory; pi-autoresearch's `autoresearch.checks.sh` is the right pattern
- **Archive scaling** (DGM found issues at 200+ nodes) — pi-autoresearch hits compaction first; copy its `session_before_compact` lossless-summary pattern
- **Agent judgment drift** — same compaction safeguard preserves the breakout condition + ledger summary

## Recommended build sequence

If you build this:

1. **Fork `pi-autoresearch`'s tool shape** as the starting skeleton (`init`, `run`, `log` with branch awareness instead of linear commits)
2. **Replace linear commits with `git checkout -b variant-NNN` per attempt**
3. **Add `selection.md` as the canonical ledger** (parent, score, status, notes per variant)
4. **Add `parent_branch` parameter to `run_experiment`** (agent picks from ledger)
5. **Inject `selection.md` excerpt via `before_agent_start`** (per-iteration context)
6. **Wire `session_before_compact`** — borrow pi-autoresearch's lossless-snapshot pattern verbatim
7. **DACMICU loop driver** — `agent_end` → `pi.sendMessage({triggerTurn:true})` to fire next iteration
8. **`signal_evolve_success` breakout tool** for LLM-initiated stop
9. **Status widget** showing variant tree (use `pi-autoresearch`'s widget pattern)

## Cross-references

### pi-mono wiki
- [ecosystem/loop-extensions](loop-extensions.md) — 14 Ralph/loop extensions; iteration patterns (complementary, not evolve)
- [dacmicu/concept](../dacmicu/concept.md) — DACMICU primitive that the build sits on
- [dacmicu/pi-port](../dacmicu/pi-port.md) — port architecture
- [dacmicu/implementation-plan](../dacmicu/implementation-plan.md) — hook surface; reuse for evolve build
- [architecture/loop-internals](../architecture/loop-internals.md) — why these hooks exist where they do
- [architecture/subprocess-rpc-rendering](../architecture/subprocess-rpc-rendering.md) — alternative for fresh-process-per-variant if isolation needed
- [implementations/pi-evolve-extension](../implementations/pi-evolve-extension.md) — first MATS-style branched-variant Pi extension (510 LOC)

### MetaHarness wiki (research)
- [MATS proposal](../../../../MetaHarness/llm-wiki/proposals/mats.md) — the user's proposed minimal evolve system this build implements
- [DGM](../../../../MetaHarness/llm-wiki/systems/dgm.md) — closest published precedent (~90% architectural match to MATS)
- [EvoGit](../../../../MetaHarness/llm-wiki/systems/evogit.md) — git-as-archive precedent
- [ShinkaEvolve](../../../../MetaHarness/llm-wiki/systems/shinkaevolve.md) — sample-efficiency lessons (novelty + bandit)
- [OpenEvolve](../../../../MetaHarness/llm-wiki/systems/openevolve.md) — full algorithmic system this is reacting against
- [Karpathy autoresearch](../../../../MetaHarness/llm-wiki/systems/autoresearch.md) — pi-autoresearch's direct ancestor
- [Deterministic Agent Loops](../../../../MetaHarness/llm-wiki/concepts/deterministic-agent-loops.md) — DACMICU positioning
- [Selection Policies](../../../../MetaHarness/llm-wiki/concepts/selection-policies.md) — why MATS rejects them
- [Population Models](../../../../MetaHarness/llm-wiki/concepts/population-models.md) — islands / MAP-Elites / archives
- [History Mechanisms](../../../../MetaHarness/llm-wiki/concepts/history-mechanisms.md) — why the markdown ledger works as history
- [Objective Hacking](../../../../MetaHarness/llm-wiki/concepts/objective-hacking.md) — DGM node-114; correctness gating
