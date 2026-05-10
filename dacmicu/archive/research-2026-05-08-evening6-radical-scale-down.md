---
title: Research 2026-05-08 evening 6 — Scale-down options (DRAFT, NOT ADOPTED — pending fresh-session re-verification)
type: research
status: draft-pending-review
updated: 2026-05-08
warnings:
  - "Doc was written under context-pressure-driven verification slippage. See log.md [2026-05-10] entry."
  - "All `pi-evolve` references in this doc conflated three different things; npm-tarball verification on 2026-05-10 showed `pi-evolve` is a 143-LOC brainstorm tool by Dunya Kirkali, NOT a MATS evolution loop. Provenance of the local 510-LOC `examples/extensions/pi-evolve.ts` is unknown."
  - "Decision (Option A vs B vs original) deferred to fresh session."
sources:
  - "research-2026-05-08-evening5-deep-plan-review.md"
  - "research-2026-05-08-evening4-comprehensive-audit.md"
  - "research-2026-05-08-evening2-simplification.md"
  - "concept.md"
  - "implementation-plan.md"
  - "modular-architecture.md"
tags: [dacmicu, decision, scale-down, kiss, minimal-design]
see_also:
  - "concept.md"
  - "implementation-plan.md"
  - "modular-architecture.md"
  - "research-2026-05-08-evening5-deep-plan-review.md"
---

# Research 2026-05-08 evening 6 — Radical scale-down (Option A adopted)

User pushback on evening 5 review: "Sounds like we should massively scale down on what we want to build with this DACMICU base, NO?"

The answer is yes. After honest accounting of what we actually own vs. what's just packaging around existing code, the v1 surface drops from 5 packages / ~1,400 LOC owned to **2 packages / ~450 LOC owned** plus documentation/recipes for the rest.

## What changed and why

### The honest accounting that triggered the scale-down

| Package | Claimed LOC | Actually new code | Why mostly not new |
|---|---|---|---|
| `base` | ~200 | ~50 | Mostly the `pi.on("agent_end") + sendMessage({triggerTurn})` pattern from pi-evolve.ts, exported as a function. Copy-paste pattern, not a library. |
| `todo` | ~250 | ~150 | tintinweb's `manage_todo_list` provides state + tool + widget. We add the deterministic outer loop. |
| `ralph` | ~200 | ~50 | RALPH.md drafting + breakout tool. Rest is config + delegation. |
| `evolve` | ~600 | **0** | `pi-evolve.ts` already exists in-tree at 510 LOC. JSONL writer is ~50 LOC additive polish. |
| `fabric` | ~250 | ~250 | Genuinely novel. Nothing solves this in the ecosystem. |
| `all` | ~10 | ~10 | Trivial. |

**Real new code: ~510 LOC.** Of which **half is fabric**, the rest split thin across four packages.

### The killer questions

**Q1: Does `@pi-dacmicu/base` justify being a package?**

50 LOC helper + tool. For 90 LOC of saved duplication across 3 consumers, we pay packaging complexity that introduced 14 unverified architectural assumptions (U1-U14 from evening 5). Bad trade.

**Drop.** Replace with `docs/loop-pattern.md` (copy-paste recipe).

**Q2: Does `@pi-dacmicu/ralph` justify being a package?**

50 LOC of new code on top of an inlined loop driver. Ecosystem already has `mitsuhiko/agent-stuff/extensions/loop.ts`, `tmustier/pi-ralph-wiggum`, `latent-variable/pi-auto-continue` — three working ralph extensions covering the trade-off space.

**Drop.** Replace with `docs/ralph-recipe.md` referencing existing extensions + the loop pattern.

**Q3: Does `@pi-dacmicu/evolve` justify being a package?**

`pi-evolve.ts` already exists in pi-mono at 510 LOC verified. The "work" was cosmetic repackaging + base refactor (which is now moot since base is dropped) + JSONL writer (~50 LOC).

**Drop.** Leave pi-evolve.ts where it is. JSONL writer is a 50-LOC PR to pi-mono if wanted.

**Q4: Does `@pi-dacmicu/todo` justify being a package?**

~150 LOC of genuinely new functionality: deterministic outer loop on tintinweb's state, reassessment step, Layer-3 snapshot renderer.

**Keep.** This is what DACMICU is *about*.

(Alternative: contribute as opt-in `loop_until_done` config flag PR to tintinweb/pi-manage-todo-list. Pros: single install, leverages tintinweb velocity. Cons: dependent on maintainer accept, deterministic mode is opinionated. Decision deferred — try package first, PR if integration friction warrants.)

**Q5: Does `@pi-dacmicu/fabric` justify being a package?**

~250 LOC of bash callback + Unix socket + env injection. Nothing else solves this.

**Keep.** Genuinely novel.

## v1 architecture (Option A — adopted)

| Package | Status | LOC owned |
|---|---|---|
| ~~`@pi-dacmicu/base`~~ | **Dropped.** Replaced by `docs/loop-pattern.md`. | 0 |
| `@pi-dacmicu/todo` | **Keep.** Deterministic outer loop on tintinweb's state. | ~200 |
| `@pi-dacmicu/fabric` | **Keep.** Bash callback + socket infrastructure. | ~250 |
| ~~`@pi-dacmicu/ralph`~~ | **Dropped.** Doc + recipe pointing to existing ecosystem. | 0 |
| ~~`@pi-dacmicu/evolve`~~ | **Dropped.** `pi-evolve.ts` already in-tree. | 0 |
| ~~`@pi-dacmicu/all`~~ | **Dropped.** Two packages don't need meta. | 0 |

**Total owned**: ~450 LOC across 2 packages. Down from claimed ~1,400 LOC across 5 packages.

### Soft-deps

- `tintinweb/pi-subagents` — for user recipes that want subagent delegation; not consumed by our packages directly
- `tintinweb/pi-manage-todo-list` — peer-dep for `@pi-dacmicu/todo`

### What ships as documentation, not code

| Recipe | What it covers |
|---|---|
| `docs/loop-pattern.md` | The `agent_end` + `signal_*_success` + `triggerTurn:true` recipe with a ~30 LOC working example. Source: distilled from `examples/extensions/pi-evolve.ts:421-455`. |
| `docs/ralph-recipe.md` | Pointers to `latent-variable/pi-auto-continue`, `mitsuhiko/agent-stuff/extensions/loop.ts`, `tmustier/pi-ralph-wiggum` with use-case guidance. Plus the loop-pattern recipe. |
| `docs/evolve-recipe.md` | Pointer to in-tree `examples/extensions/pi-evolve.ts` (510 LOC) + the JSONL transcript writer recipe (~50 LOC) for working around Hopsken viewer's 500-char truncation. |
| `docs/subagent-recipe.md` | How to call tintinweb's `Agent` tool from your own loop driver. PROTOCOL_VERSION ping pattern. Degradation when tintinweb absent. |

## What this changes about earlier audit findings

### Resolved by scale-down (no longer a concern)

| Concern | Status |
|---|---|
| Module-isolation problem (Strategy A vs B) | **Disappears.** No shared base library. |
| Cross-package dep coordination | **Disappears.** Two independent packages. |
| 14 unverified architectural assumptions | **8 evaporate**: U1, U2, U3, U4, U5, U7, U10, U11. The other 6 (U6, U8, U9, U12, U13, U14) still apply but to user recipes, not our packages. |
| Hopsken/tintinweb scope rebrand risk | **Reduced.** Only `@pi-dacmicu/todo` peer-deps tintinweb; fabric is fully independent. |
| `subagents:rpc:ping` Step 0 health check | **Lives in user recipes**, documented in `docs/subagent-recipe.md`, not in our package init. |

### Still applies

| Concern | Why still real |
|---|---|
| `manage_todo_list` survives `/compact` and `/fork` (T1, T2) | `@pi-dacmicu/todo` directly depends on this; build-time test. |
| pi rebrand `@mariozechner/*` → `@earendil-works/*` | Affects todo's peer-dep on tintinweb. Monitor + document side-by-side install. |
| `before_agent_start` chaining (U10) | Still relevant if user uses fabric + todo + their own loop driver simultaneously. Document as caveat. |
| FABRIC Unix socket on Windows (U8) | Still applies. fabric should detect and either fall back or refuse with clear message. |

### New tests for the scaled-down v1

| # | Test | Validates |
|---|---|---|
| V1-T1 | `@pi-dacmicu/todo` outer loop runs to completion on a 5-item list | Core deterministic-loop functionality |
| V1-T2 | `@pi-dacmicu/todo` survives `/compact` mid-loop | T1 from earlier audit |
| V1-T3 | `@pi-dacmicu/todo` survives `/fork` and continues from forked state | T2 |
| V1-T4 | `@pi-dacmicu/todo` reassessment step correctly skips obsolete items | New, validates the new logic |
| V1-T5 | `@pi-dacmicu/fabric` socket binds, accepts callback, round-trips to `pi.sendMessage` | Core fabric functionality |
| V1-T6 | `@pi-dacmicu/fabric` socket survives `/reload` (T7 from earlier) | Lifecycle correctness |
| V1-T7 | `docs/loop-pattern.md` recipe works when copy-pasted into a fresh extension | Recipe correctness |
| V1-T8 | `docs/subagent-recipe.md` recipe works with current tintinweb release | Recipe + soft-dep working today |

8 tests total, all build-time-natural — exercised by building the two packages and writing the four recipes.

## Why this is the right call

1. **Matches CLAUDE.md principle**: "Don't add features, refactor, or introduce abstractions beyond what the task requires."
2. **Matches user's `feedback-minimal-design` memory**: "user pushes back on overengineering; defer features until their absence hurts."
3. **Honest about what we own vs. what we re-package**: ~450 LOC of genuinely new code, plus recipes that point to existing solutions. No fake productivity from package-multiplication.
4. **Removes the largest unverified architectural assumptions** by removing the architecture that introduced them (`@pi-dacmicu/base` as shared library across packages).
5. **Lower install friction for users**: 2 npm packages instead of 5+meta. No coordination of soft-dep installs across our own packages.
6. **Preserves the umbrella narrative through documentation**, not through package count. DACMICU is still the deterministic-loop concept; we just don't conflate "the concept" with "must be a package."

## What's not preserved from the old plan

| Was | Now |
|---|---|
| 6-package monorepo (5+meta) | 2 independent npm packages |
| Strategy A vs B vs C delivery decision | Moot — both are independent |
| `attachLoopDriver()` library function | Recipe in docs |
| `signal_loop_success` as a tool exported by base | Each consumer registers its own breakout tool |
| `@pi-dacmicu/all` meta-package | Doesn't exist |
| Hopsken/tintinweb soft-dep coordination across packages | Each package handles its own |
| Pre-v1 test phase | Build-time tests integrated with the build |

## Implementation order (revised)

| Step | What | Outcome |
|---|---|---|
| 1 | Update wiki (concept, implementation-plan, modular-architecture) to reflect Option A | This commit |
| 2 | Build `@pi-dacmicu/todo` (~200 LOC) | Working deterministic outer-loop overlay on tintinweb's state |
| 3 | Write `docs/loop-pattern.md` recipe | Copy-paste pattern for users who want to build their own ralph/evolve |
| 4 | Build `@pi-dacmicu/fabric` (~250 LOC) | Bash callback infrastructure |
| 5 | Write `docs/subagent-recipe.md`, `docs/ralph-recipe.md`, `docs/evolve-recipe.md` | Pointers to existing solutions for the user's other concerns |

Total estimate: 1-2 days of focused work for a proficient Pi extension developer. Down from 2-3 days for the previous 5-package plan.

## Cross-references

- [research-2026-05-08-evening5-deep-plan-review](research-2026-05-08-evening5-deep-plan-review.md) — surfaced the gap between claimed and actual new code
- [research-2026-05-08-evening4-comprehensive-audit](research-2026-05-08-evening4-comprehensive-audit.md) — original 46-assumption audit
- [research-2026-05-08-evening2-simplification](research-2026-05-08-evening2-simplification.md) — KISS framing that this builds on
- [concept](../concept.md) — top-level framing (now updated)
- [implementation-plan](../implementation-plan.md) — build sequencing (now updated)
- [modular-architecture](../modular-architecture.md) — package layout (now superseded for v1; old framing kept for history)
