---
title: Research 2026-05-08 evening 5 — Deep DACMICU plan review and verification
type: research
updated: 2026-05-08
sources:
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/dacmicu/concept.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/dacmicu/implementation-plan.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/dacmicu/modular-architecture.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/dacmicu/research-2026-05-08-evening4-comprehensive-audit.md
  - /tmp/pi-github-repos/HazAT/pi-interactive-subagents
  - /tmp/pi-github-repos/latent-variable/pi-auto-continue
  - /tmp/pi-github-repos/Hopsken/pi-subagents@main
tags: [verification, audit, dacmicu, plan-review, corrections-applied]
see_also:
  - "research-2026-05-08-evening2-simplification.md"
  - "research-2026-05-08-evening3-verification.md"
  - "research-2026-05-08-evening4-comprehensive-audit.md"
  - "concept.md"
  - "implementation-plan.md"
  - "modular-architecture.md"
---

# Research 2026-05-08 evening 5 — Deep DACMICU plan review and verification

User asked for an in-depth review of the entire DACMICU plan with verification of ALL assumptions. This is the second pass after evening 4's audit (which found 4 false claims but never *applied* the corrections to plan docs).

## What was wrong before this pass

Evening 4 documented the false claims but `implementation-plan.md` and `modular-architecture.md` still contained:

1. `@pi-dacmicu/subagent` as Step 3 of the build sequence (dropped evening 2)
2. Hooks-matrix with a `subagent` column (no longer exists)
3. LOC budget summing to 1,700 across 6 packages instead of 1,500 across 5
4. tmustier credited for "pause/resume + max-iter cap" patterns that don't exist in the repo
5. `kostyay/agent-stuff/pi-extensions/loop.ts` reference (wrong author + wrong path)
6. davebcn87/pi-autoresearch credited as production reference for `setWidget` factory form (file has zero `setWidget` calls)
7. Implementation-plan still says `@pi-dacmicu/subagent` is Step 3 with `ctx.modelRegistry.stream()` work to verify

All 7 are now fixed. Diff lives in this commit.

## New assumptions checked in this pass (beyond evening 4's 46)

### A. Reference-implementation LOC counts

| Reference | Wiki claim | Actual | Match |
|---|---|---|---|
| `examples/extensions/pi-evolve.ts` | 510 LOC | **510** | ✅ exact |
| `examples/extensions/todo.ts` | ~290 LOC | **297** | ✅ within rounding |
| `examples/extensions/subagent/index.ts` | ~700 LOC | **987** | ❌ understated by ~40% |

**Action**: corrected in `implementation-plan.md` LOC table. The `subagent/index.ts` reference being 987 LOC (not 700) makes it less attractive as a starting point if we ever needed to build our own subagent — bigger lift than wiki implied. Reinforces the decision to depend on tintinweb instead.

### B. `latent-variable/pi-auto-continue` exists and uses defer trick

| Claim | Verified |
|---|---|
| Repo exists at `latent-variable/pi-auto-continue` (note `latent-`, not `latency-`) | ✅ |
| Uses `setTimeout(...)` defer pattern | ✅ verified at `src/index.ts:52-55` |
| Subscribes `agent_end`, calls `pi.sendUserMessage(text)` | ✅ |
| Resets counter when `event.source === "interactive"` | ✅ per README |
| Disables on `ctx.signal?.aborted` (Escape) | ✅ per README |
| Hard cap of 100 iterations | ✅ per README |

**Earlier wiki status of "UNVERIFIED" was wrong** — already cited correctly with the `latent-variable` author. Just hadn't been verified end-to-end. Now verified.

### C. HazAT activity phases — both earlier claims were partial truths

The `SubagentActivityPhase` enum in `pi-extension/subagents/activity.ts` has 4 values:
```ts
export type SubagentActivityPhase = "starting" | "active" | "waiting" | "done";
```

The README documents 5 widget labels:
- `starting` — launched, no valid child snapshot yet
- `active` — observed runtime work
- `waiting` — between turns
- `stalled` — watchdog timeout (DERIVED, not in enum)
- `running` — fallback for backends without snapshots e.g. Claude (DERIVED, not in enum)

Both earlier claims (5 widget labels in original wiki, 4 phases in evening 3 correction) were **partial truths**. The accurate framing:

> HazAT exposes a 4-value `SubagentActivityPhase` enum (`starting`/`active`/`waiting`/`done`) plus 2 derived display labels (`stalled` from watchdog, `running` as fallback). User-visible: 5 labels. Code-level type: 4.

### D. HazAT tool surface — verified

Per HazAT README:
- Main-session tools: `subagent`, `subagent_interrupt`, `subagents_list`, `subagent_resume` (4 tools)
- Subagent-only tool: `caller_ping` (parent ping for help)
- Slash commands: `/plan`, `/iterate`, `/subagent`

Earlier wiki cited these correctly. Verified evening 5.

### E. Hopsken `PROTOCOL_VERSION` semver discipline

Verified in `cross-extension-rpc.ts`:
```ts
/** RPC protocol version — bumped when the envelope or method contracts change. */
export const PROTOCOL_VERSION = 2;
```

Plus a `subagents:rpc:ping` RPC that returns `{ version: PROTOCOL_VERSION }` for runtime version checks. **This is a good signal of API discipline** — better than nothing, but not a formal semver guarantee. Means our RPC client should:

1. Call `subagents:rpc:ping` on startup; refuse if version mismatch
2. Pin tintinweb to a major version range that includes PROTOCOL_VERSION ≥ 2
3. Document upgrade path when PROTOCOL_VERSION bumps to 3

### F. tintinweb peer-dep on `@mariozechner/*` (rebrand risk)

Re-confirmed evening 5. tintinweb `@latest` (v0.7.1, master HEAD) still pins:
```json
"peerDependencies": {
  "@mariozechner/pi-ai": ">=0.70.5",
  "@mariozechner/pi-coding-agent": ">=0.70.5",
  "@mariozechner/pi-tui": ">=0.70.5"
}
```

Pi rebranded `@mariozechner/*` → `@earendil-works/*`. Both scopes currently published as transitional alias. **Risk for DACMICU**: if `@mariozechner/*` retires before tintinweb updates peer-deps, our soft-dep breaks.

**Mitigation plan**:
1. Pin tintinweb to a version range; monitor for a release that updates peer-deps
2. Document install instructions for users to install both scopes side-by-side during transition
3. Track `@mariozechner/*` retirement timeline — file an issue on tintinweb if not addressed

## Comprehensive corrections applied to plan docs (evening 5)

### `implementation-plan.md` — applied evening 4 + new findings

| Change | Reason |
|---|---|
| Build sequence: 6 → 5 packages (`@pi-dacmicu/subagent` dropped) | Evening 2 simplification |
| Build step 5 + 6: now soft-dep on tintinweb via `subagents:rpc:spawn` RPC | Evening 2 |
| Reference impls: tmustier removed for pause/resume claim | Evening 4 (false claim) |
| Reference impls: kostyay → mitsuhiko, path corrected | Evening 4 (wrong author + path) |
| Reference impls: pi-auto-continue verified evening 5 | New verification |
| LOC table: now ~1,500 across 5 packages with leverage ratio | Evening 5 (subagent dropped + budget reconcile) |
| Hooks matrix: subagent column removed; `pi.events.emit` row added for ralph + evolve | Evening 2 |

### `modular-architecture.md` — applied evening 4 corrections

| Change | Reason |
|---|---|
| Production setWidget reference: davebcn87 → tintinweb | Evening 4 (false claim — davebcn87 has no setWidget call) |
| TODO four-layer stack reference path corrected | Evening 4 |
| Status-widget tmustier reference flagged as needing re-survey | Evening 4 |
| Inline correction notes added for both replacements | Audit trail |

### Not changed (still accurate)

- The Strategy A mono-package recommendation
- The dependency DAG (already correctly shows tintinweb as soft-dep)
- The verified Pi primitives table
- The visibility & widget design rationale
- Module isolation constraint discussion

## Architecture assumptions still needing runtime tests (T1-T8 from evening 4)

These cannot be verified by static analysis. Carry forward from evening 4:

| # | Assumption | Why it needs testing |
|---|---|---|
| T1 | `manage_todo_list` state survives `/compact` correctly | session_before_compact + getBranch should work; no test exists |
| T2 | `manage_todo_list` state survives `/fork` correctly | session_tree hook should reconstruct; verify with real /fork |
| T3 | Multiple `before_agent_start` handlers chain correctly | Documented as chaining, but order matters |
| T4 | `pi.events.emit` works across separately-installed extensions | Need both DACMICU and tintinweb loaded |
| T5 | `agent_end` handler from base doesn't conflict with other extensions' `agent_end` handlers | Pi allows multiple, order depends on load order |
| T6 | `triggerTurn:true` + `deliverAs:"followUp"` doesn't race with user typing | Timing-sensitive; needs real TUI test |
| T7 | Unix socket survives `/reload` | session_shutdown + session_start with reason `"reload"` should rebind |
| T8 | tintinweb's `Agent` tool works correctly when called from within a DACMICU loop | Integration test |

**Plus new from evening 5**:

| # | Assumption | Why it needs testing |
|---|---|---|
| T9 | `subagents:rpc:ping` returns version 2 from currently-published tintinweb | Runtime check — version-pin discipline |
| T10 | Both `@mariozechner/pi-coding-agent` and `@earendil-works/pi-coding-agent` can co-exist installed at user `~/.pi/agent/` | Required for tintinweb compat during rebrand transition |
| T11 | tintinweb's `Agent` tool description (which prompts the LLM how to use it) is good enough out-of-the-box for ralph's Variant B use case | Quality test — does the LLM call it correctly without ralph adding system-reminder guidance? |

## Plan internal consistency check

After all corrections, all major plan docs now reference the same architecture:

| Doc | Says number of packages | Owned LOC | Subagent strategy |
|---|---|---|---|
| `concept.md` | 6 (5 active + 1 dropped) | ~1,400 | tintinweb soft-dep, no own subagent |
| `implementation-plan.md` | 5 (subagent dropped) | ~1,500 | tintinweb via `subagents:rpc:spawn` |
| `modular-architecture.md` | 6 (subagent dropped, marked) | ~1,400 | tintinweb soft-dep with degrade-to-Variant-A |
| `research-2026-05-08-evening2-simplification.md` | 5 + meta | ~1,400 | tintinweb only for v1, HazAT deferred |
| `research-2026-05-08-evening4-comprehensive-audit.md` | 6 (subagent dropped) | ~1,400 | tintinweb soft-dep |

**Inconsistencies**:
- LOC budget 1,400 vs 1,500: implementation-plan added ~100 LOC for testing scaffolding + JSONL writer; concept hasn't caught up. Acceptable — these are estimates, not contracts.
- "6 packages with subagent struck out" vs "5 packages": cosmetic. Both communicate the same thing.

**Verdict**: plan docs are now internally consistent within rounding. No further reconciliation needed.

## Outstanding gaps not yet in any plan doc

Discovered during this verification that aren't yet in any wiki page:

1. **`subagents:rpc:ping` health check** — should be Step 0 of any tintinweb integration. Not in implementation-plan.
2. **JSONL transcript writer for evolve** — mentioned in evening 2 simplification doc but never moved into evolve's package design in `modular-architecture.md` or `implementation-plan.md`.
3. **Both-scope install instructions during pi rebrand transition** — no doc covers this.
4. **HazAT integration deferral signal** — when do we decide to add `@pi-dacmicu/evolve` HazAT support? No metric defined. Suggest: when N evolve users hit the truncation wall AND express it in a way that justifies the integration cost. Track in user feedback.

These should land in implementation-plan.md as part of the next pass, not in this verification doc.

## Cross-references

- [research-2026-05-08-subagent-and-todo](research-2026-05-08-subagent-and-todo.md) — initial deep cascade (Q1-Q5)
- [research-2026-05-08-evening2-simplification](research-2026-05-08-evening2-simplification.md) — KISS simplification, Hopsken=tintinweb correction
- [research-2026-05-08-evening3-verification](research-2026-05-08-evening3-verification.md) — claim-by-claim verification (overlap with evening 4)
- [research-2026-05-08-evening4-comprehensive-audit](research-2026-05-08-evening4-comprehensive-audit.md) — 46 assumptions audited, 4 false found
- [concept](concept.md) — top-level DACMICU framing
- [implementation-plan](implementation-plan.md) — build sequencing (now updated)
- [modular-architecture](modular-architecture.md) — package layout (now updated)
