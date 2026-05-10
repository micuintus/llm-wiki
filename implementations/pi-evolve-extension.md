---
title: pi-evolve Extension — Implementation
type: implementation
updated: 2026-05-08
sources:
  - "../../examples/extensions/pi-evolve.ts"
tags: [extension, evolve, mats, dacmicu, implementation]
see_also:
  - "../dacmicu/concept.md"
  - "../dacmicu/modular-architecture.md"
  - "../dacmicu/spirit-vs-opencode.md"
  - "../dacmicu/implementation-plan.md"
  - "pi-callback-extension.md"
  - "../ecosystem/evolve-systems.md"
  - "../ecosystem/loop-extensions.md"
  - "../concepts/deterministic-agent-control-mechanisms.md"
  - "../concepts/pi-extension-primitive-mapping.md"
---

# pi-evolve Extension — Implementation

Lightweight MATS-style code-evolution extension for Pi. Built as a pure extension — zero core changes.

**Status (2026-05-10):** ⚠️ **PROVENANCE CORRECTION** — This document describes a **DACMICU draft prototype** written during planning (`examples/extensions/pi-evolve.ts`, untracked at repo root, created 2026-05-07). It is **NOT** a canonical upstream reference, NOT in-tree in pi-mono, and NOT validated by real use. The npm package `pi-evolve@0.1.0` is a 143-LOC brainstorming tool by Dunya Kirkali — completely unrelated. See [verification audit](../dacmicu/research-2026-05-10-comprehensive-verification-audit.md) § Category 2 for the full correction.

The draft's hook patterns (`agent_end`, `sendMessage`, `session_before_compact`, etc.) are correctly implemented and the cited line numbers are accurate, but the file was written **by** the planning process, not discovered **in** upstream code. Use `mitsuhiko/agent-stuff/extensions/loop.ts` as the canonical production reference for the driver pattern.

This page is preserved as a design sketch for `@pi-dacmicu/evolve`, not as a reference implementation.

## File

`examples/extensions/pi-evolve.ts` (510 LOC, **untracked draft at repo root** — not in pi-mono, not published, not validated)

## Architecture

```
┌─────────────────────────────────────────┐
│  User: "evolve test speed"              │
│     ↓                                   │
│  init_experiment(name, metric, dir)     │
│     ↓                                   │
│  selection.md created (ledger)          │
│     ↓                                   │
│  ┌─────────────────────────────────┐    │
│  │  LOOP (DACMICU)                 │    │
│  │  agent_end ──► sendMessage()    │    │
│  │     ↓                           │    │
│  │  before_agent_start injects     │    │
│  │  selection.md excerpt           │    │
│  │     ↓                           │    │
│  │  Agent reads ledger → picks     │    │
│  │  parent branch                  │    │
│  │     ↓                           │    │
│  │  run_experiment(parent, cmd)    │    │
│  │  → git checkout -b evolve/vN/…  │    │
│  │  → runs benchmark               │    │
│  │  → captures METRIC lines        │    │
│  │     ↓                           │    │
│  │  log_experiment(status, score)  │    │
│  │  → keep: git commit             │    │
│  │  → discard: git reset --hard    │    │
│  │  → updates selection.md         │    │
│  │     ↓                           │    │
│  │  signal_evolve_success → stop   │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

## Tools (LLM-callable)

| Tool | Purpose |
|------|---------|
| `init_experiment` | Creates `selection.md`, locks metric/direction |
| `run_experiment` | `git checkout -b evolve/vN/slug`, runs benchmark, captures `METRIC name value` lines |
| `log_experiment` | `keep` → commit; `discard`/`crash` → revert; appends to `selection.md`; tracks best-so-far |
| `signal_evolve_success` | Breakout — stops the `agent_end` auto-loop |

## Hooks

| Hook | Behavior |
|------|----------|
| `agent_end` | If evolve active + not stopped + no pending messages → auto-queues next iteration via `sendMessage({triggerTurn:true}, {deliverAs:"followUp"})` |
| `before_agent_start` | Injects `selection.md` excerpt + evolve rules into system prompt |
| `session_before_compact` | Returns compaction summary with `firstKeptEntryId`/`tokensBefore` from preparation (preserves state losslessly) |
| `session_start` / `session_tree` | Reconstructs `evolveState` from tool-result `details` in session branch |

## State management

- **In-memory**: `evolveState` object (active, name, metric, direction, variantCount, bestValue, bestBranch, stopped)
- **Persistent (session-safe)**: Stored in tool-result `details` field — branches correctly when user forks/clones the session
- **Disk**: `selection.md` (ledger) + git branches (`evolve/vN/slug`)

## Variant naming

```
evolve/v1/baseline
  └── evolve/v2/reduce-timeout
        ├── evolve/v3/parallel-tests
        └── evolve/v4/cache-fixtures
```

Each branch is created from an explicit `parent_branch` parameter. The agent reads `selection.md` to decide which parent to evolve from.

## selection.md format

```markdown
# Selection Ledger — DO NOT EDIT MANUALLY

## Experiment: optimize-test-speed
- **Metric**: test_runtime_ms (ms) — lower is better
- **Best so far**: 420 ms on `evolve/v2/reduce-timeout`
- **Total variants**: counted from branches below

## Variants

| Branch | Parent | Status | Score | Notes |
|--------|--------|--------|-------|-------|
| `evolve/v1/baseline` | `main` | keep | 850 ms | baseline run |
| `evolve/v2/reduce-timeout` | `main` | keep | 420 ms | reduced jest timeout |
| `evolve/v3/parallel-tests` | `evolve/v2/reduce-timeout` | discard | 430 ms | no improvement |
```

## Design decisions

| Decision | Rationale |
|----------|-----------|
| **Branches, not commits** | Failed paths remain visible in `git branch -a`; agent can revisit them |
| **Agent picks parent** | No algorithmic policy — MATS thesis: modern LLMs judge better than UCB/MAP-Elites |
| **`selection.md` on disk, not in session** | Survives compaction, forks, and external git ops |
| **Tool-result `details` for state** | Branches correctly (todo.ts pattern); no external state file needed for core loop |
| **Single-file extension** | Minimal, no build step, easy to fork/modify |

## Gaps / future work

1. **Correctness gate** — no built-in `checks.sh` equivalent (pi-autoresearch has this). User can add it manually in `run_experiment` command.
2. **Crossover via merge** — not implemented. Agent could do `git merge` manually if desired.
3. **Multi-objective** — currently single primary metric. Agent can read secondary metrics from `METRIC` lines but only primary drives keep/discard.
4. **Confidence scoring** — no noise-floor analysis (pi-autoresearch has 3+ run statistical comparison).
5. **Widget / dashboard** — no TUI widget yet. Could add status line showing best value + variant count.
6. **Hooks (`before.sh`/`after.sh`)** — not implemented.

## Comparison to pi-autoresearch

| Feature | pi-autoresearch | pi-evolve |
|---------|-----------------|-----------|
| Variant store | Linear commits | **Git branches** |
| Failed-path archive | ❌ Reverted (lost) | ✅ Kept as branches |
| Parent selection | Always current best | **Agent judgment** |
| Selection policy | None (hill-climb) | **None (agent replaces it)** |
| Markdown ledger | `autoresearch.md` (kept only) | **`selection.md` (all variants)** |
| Correctness gate | `autoresearch.checks.sh` | Manual (in benchmark cmd) |
| Confidence scoring | ✅ Statistical | ❌ |
| Compaction-aware | ✅ Best-in-class | ✅ (copies pattern) |
| Widget/dashboard | ✅ Full TUI | ❌ |
| Size | ~2,500 LOC across 25 files | **510 LOC, 1 file** |

## Usage

```bash
# Load the extension
pi --extension examples/extensions/pi-evolve.ts

# In session, tell the agent:
> evolve test speed with metric test_runtime_ms

# Agent calls init_experiment, then loops via run_experiment + log_experiment
# Stop with signal_evolve_success or /compact (auto-resumes)
```

## Cross-references

- [ecosystem/evolve-systems](../ecosystem/evolve-systems.md) — survey of evolve systems; this is the first MATS-style Pi extension
- [dacmicu/implementation-plan](../dacmicu/implementation-plan.md) — hook surface this design sketch targets
- [ecosystem/loop-extensions](../ecosystem/loop-extensions.md) — iteration extensions (complementary)
- [implementations/pi-callback-extension](pi-callback-extension.md) — proposed Unix-socket callback for benchmark judgment
- [concepts/deterministic-agent-control-mechanisms](../concepts/deterministic-agent-control-mechanisms.md) — 20-mechanism taxonomy
- [concepts/pi-extension-primitive-mapping](../concepts/pi-extension-primitive-mapping.md) — Bidirectional hook mapping
- [dacmicu/research-2026-05-10-comprehensive-verification-audit](../dacmicu/research-2026-05-10-comprehensive-verification-audit.md) — provenance correction
- MetaHarness [MATS proposal](../../../../MetaHarness/llm-wiki/proposals/mats.md) — theoretical basis
