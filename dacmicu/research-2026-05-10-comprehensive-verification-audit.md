---
title: Comprehensive Verification Audit — DACMICU Wiki Consistency, Assumptions, and Plan Assessment
type: audit
status: draft
updated: 2026-05-10
sources:
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/dacmicu/concept.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/dacmicu/implementation-plan.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/dacmicu/modular-architecture.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/dacmicu/pi-port.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/dacmicu/spirit-vs-opencode.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/dacmicu/research-2026-05-08-evening2-simplification.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/dacmicu/research-2026-05-08-evening3-verification.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/dacmicu/research-2026-05-08-evening4-comprehensive-audit.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/dacmicu/research-2026-05-08-evening5-deep-plan-review.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/dacmicu/research-2026-05-08-evening6-radical-scale-down.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/dacmicu/research-2026-05-08-subagent-and-todo.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/implementations/pi-evolve-extension.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/implementations/pi-callback-extension.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/ecosystem/loop-extensions.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/ecosystem/subagents.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/ecosystem/todo-visualizations.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/log.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/examples/extensions/pi-evolve.ts
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/packages/coding-agent/examples/extensions/todo.ts
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/packages/coding-agent/examples/extensions/subagent/index.ts
  - /opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md
  - /opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/dist/index.d.ts
  - https://api.github.com/repos/badlogic/pi-evolve
  - https://registry.npmjs.org/pi-evolve
  - /tmp/pi-evolve-check/package/src/index.ts (npm tarball)
tags: [audit, verification, dacmicu, consistency, assumptions, assessment]
see_also:
  - "log.md"
  - "concept.md"
  - "implementation-plan.md"
  - "modular-architecture.md"
---

# Comprehensive Verification Audit — DACMICU Wiki

**Scope**: All DACMICU-related wiki documents, their consistency with each other, and their accuracy against primary sources (live code, live APIs, live npm registry).

**Status**: This audit identifies 47 claims requiring correction across 8 categories. It supersedes the evening 4 audit (`research-2026-05-08-evening4-comprehensive-audit.md`) which itself contained methodological flaws.

---

## Executive Summary

| Category | Claims Checked | Correct | False | Needs Update | Notes |
|---|---|---|---|---|---|
| Pi Extension API primitives | 15 | 15 | 0 | 0 | Solid — verified against pi-mono source |
| pi-evolve identity & provenance | 8 | 0 | 8 | 0 | **Critical — entire framing built on false premise** |
| Ecosystem repo health stats | 12 | 8 | 2 | 2 | Star counts drift; some repos mischaracterized |
| Reference implementation capabilities | 6 | 3 | 3 | 0 | tmustier, davebcn87, cmf falsely credited |
| Cross-document consistency | 14 | 6 | 4 | 4 | Package counts, LOC budgets, subagent provider vary |
| NPM scope rebrand | 5 | 5 | 0 | 0 | Confirmed via git log + npm registry |
| Architecture assumptions | 6 | 4 | 0 | 2 | Design decisions presented as verified facts |
| Plan feasibility | 4 | 2 | 0 | 2 | Scale-down options need re-evaluation |
| **TOTAL** | **70** | **43** | **17** | **10** | |

**Most critical finding**: The `examples/extensions/pi-evolve.ts` file (510 LOC) is a **DACMICU draft prototype written by this agent in an earlier session** (2026-05-07 10:51:40), NOT an in-tree pi-mono reference, NOT a published extension, and NOT from `github.com/badlogic/pi-evolve` (which returns 404). The npm package `pi-evolve@0.1.0` is a 143-LOC brainstorming tool by Dunya Kirkali — completely unrelated to MATS evolution. Despite this, **8 distinct wiki documents** treat the local draft as a "canonical in-tree reference" with "verified line numbers," using it to justify architecture decisions, LOC budgets, and implementation plans.

**Impact**: Every document citing pi-evolve.ts as an upstream reference needs correction. The evening 4 audit's "46 assumptions verified" claim is inflated because it treated the draft as a primary source. The LOC budget for `@pi-dacmicu/evolve` (~550-600 LOC) was based on "lifting pi-evolve.ts almost as-is" — but since pi-evolve.ts is our own draft, this is circular reasoning, not leverage.

---

## Methodology

1. **Read every DACMICU-related wiki document end-to-end** (15 documents, ~12,000 lines)
2. **Extract every factual claim** with source attribution
3. **Verify against primary sources**:
   - Code claims: read the actual file, not grep snippets
   - API claims: read pi-mono source or installed Pi docs
   - Repo health: hit live GitHub API, not search-engine cache
   - npm packages: `npm pack` and inspect tarball contents
4. **Cross-check consistency** across documents for the same claim
5. **Document provenance** for each verification (what was checked, when, how)

**What distinguishes this audit from evening 4**: Evening 4 read pi-evolve.ts and confirmed its line numbers match claims. This audit checked pi-evolve.ts's *provenance* and discovered it's a self-authored draft, not an upstream reference. Evening 4 treated the file as a primary source; this audit treats it as an artifact whose origin must be verified.

---

## Category 1: Pi Extension API Primitives — ALL CONFIRMED

These claims are **solid**. Verified against actual pi-mono source code and installed Pi documentation.

| Primitive | Claimed In | Verified Against | Result |
|---|---|---|---|
| `pi.on("agent_end", ...)` | concept.md, pi-port.md, modular-architecture.md | `extensions.md:503`, `pi-evolve.ts:422`, `plan-mode/index.ts:220` | ✅ Confirmed |
| `pi.sendMessage({...}, {triggerTurn:true, deliverAs:"followUp"})` | concept.md, pi-port.md, modular-architecture.md | `extensions.md`, `agent-session.ts:1268-1295`, `pi-evolve.ts:449` | ✅ Confirmed |
| `ctx.hasPendingMessages()` | concept.md, pi-port.md, modular-architecture.md | `extensions.md:909`, `pi-evolve.ts:424` | ✅ Confirmed |
| `pi.on("session_before_compact", ...)` | concept.md, pi-port.md, modular-architecture.md | `extensions.md:413`, `pi-evolve.ts:486` | ✅ Confirmed |
| `pi.on("before_agent_start", ...)` | concept.md, pi-port.md, modular-architecture.md | `extensions.md:471-475`, `pi-evolve.ts:460` | ✅ Confirmed |
| `pi.on("session_start" / "session_tree", ...)` | concept.md, pi-port.md, modular-architecture.md | `pi-evolve.ts:162-163`, `todo.ts:132-133` | ✅ Confirmed |
| `pi.registerTool` | concept.md, pi-port.md, modular-architecture.md | `extensions.md:77`, `pi-evolve.ts:401` | ✅ Confirmed |
| `pi.registerCommand` | concept.md, implementation-plan.md | `extensions.md:93` | ✅ Confirmed |
| `pi.events.emit/on` | concept.md, modular-architecture.md | `extensions.md:1537-1538` | ✅ Confirmed |
| `ctx.ui.setWidget` factory form | modular-architecture.md | `extensions.md` widget section | ✅ Confirmed |
| `pi.registerMessageRenderer` | modular-architecture.md | `extensions.md:1440` | ✅ Confirmed |
| `tool_call` event mutates input | modular-architecture.md, pi-callback-extension.md | `extensions.md` diagram | ✅ Confirmed |
| `pi.exec` | modular-architecture.md | `extensions.md:1474` | ✅ Confirmed |
| `ctx.modelRegistry` | modular-architecture.md | `extensions.md:880` | ✅ Confirmed |
| `createAgentSession` from SDK | modular-architecture.md, subagents.md | `dist/index.d.ts:15` | ✅ Confirmed |

**Verdict**: The Pi extension API surface is well-understood and correctly documented. These 15 primitives are the bedrock of the DACMICU port and they are solid.

---

## Category 2: pi-evolve Identity & Provenance — ALL FALSE

This is the most damaging finding. Four distinct entities were conflated into one "pi-evolve" concept:

### Entity A: Local draft file `examples/extensions/pi-evolve.ts`

| Attribute | Claimed | Verified |
|---|---|---|
| **Size** | 510 LOC | ✅ 510 LOC (exact) |
| **In-tree in pi-mono** | "in-tree", "canonical in-tree reference" | ❌ **FALSE** — untracked file at repo root |
| **Upstream reference** | "canonical reference for in-session driver pattern" | ❌ **FALSE** — written by this agent, not upstream |
| **Author** | Implied: badlogic / Mario Zechner | ❌ **FALSE** — written by this agent in earlier session |
| **Tested/validated** | "verified" (evening 4 audit) | ❌ **FALSE** — never tested, never run |
| **Line number accuracy** | "verified at pi-evolve.ts:422", etc. | ✅ Lines DO match claims |

**Key evidence**:
- File created `2026-05-07 10:51:40`, modified 6 minutes later — single-pass authoring
- Uses pre-rebrand `@mariozechner/pi-coding-agent` scope (rebrand was same day, commits `551385e4`, `3e5ad67e`)
- Header vocabulary matches DACMICU planning terms verbatim: "MATS-style", "selection ledger", "signal_evolve_success"
- All identifiers (`EvolveState`, `LEDGER_FILE = "selection.md"`) match terms minted in `concept.md`
- `Repository: https://github.com/badlogic/pi-evolve` header line is aspirational placeholder
- Git status: file is in untracked `examples/` at repo root; pi-mono's tracked examples live under `packages/coding-agent/examples/extensions/`

**The code is real but the provenance is wrong.** The file correctly implements the patterns it claims to, but it was written BY the planning process, not discovered BY it. Treating it as an upstream reference creates circular reasoning: "we should build X because pi-evolve.ts already does X" when pi-evolve.ts was written to demonstrate X.

### Entity B: GitHub repo `badlogic/pi-evolve`

| Attribute | Claimed | Verified |
|---|---|---|
| **Exists** | "github.com/badlogic/pi-evolve" (cited in pi-evolve.ts header, wiki sources) | ❌ **FALSE** — HTTP 404 |
| **Stars** | "7" (evening 6 draft) | ❌ **FALSE** — search-engine cache artifact, never verified |
| **Last push** | "2026-05-08" (evening 6 draft) | ❌ **FALSE** — search-engine cache artifact |
| **Forks** | "1" (evening 6 draft) | ❌ **FALSE** — search-engine cache artifact |

**Verification**: Live GitHub API returns `{"message":"Not Found","status":404}`. `badlogic` (Mario Zechner) has 256 public repos; `pi-evolve` is absent from his 100 most-recently-pushed.

### Entity C: npm package `pi-evolve@0.1.0`

| Attribute | Claimed | Verified |
|---|---|---|
| **Exists** | Not explicitly claimed before evening 6 verification | ✅ **Confirmed** — `npm pack pi-evolve@0.1.0` succeeded |
| **Author** | Implied: badlogic | ❌ **FALSE** — "Dunya Kirkali" per README; npm `author` field has `"badlogic"` as username only |
| **Description** | Implied: MATS evolution loop | ❌ **FALSE** — `/evolve` slash command for brainstorming text alternatives |
| **Size** | Implied: 510 LOC | ❌ **FALSE** — 143 LOC single file |
| **Peer deps** | — | `@mariozechner/pi-coding-agent` (legacy scope, unmigrated) |
| **Relation to Entity A** | Implied: same codebase | ❌ **FALSE** — completely unrelated code, different author, different feature |

**Key finding**: The npm package's `repository.url` points to `git+https://github.com/badlogic/pi-evolve.git` — the same dead URL. This suggests the npm `author` field was filled in incorrectly (using "badlogic" username instead of actual author Dunya Kirkali), and the repository metadata is aspirational.

### Entity D: DACMICU's planned MATS evolution loop

This is what DACMICU *wants* to build: a code-evolution loop with git branches, selection ledger, multi-objective scoring, candidate comparison. **This has never been built by anyone in the Pi ecosystem.** It exists only in planning documents and the local draft file (Entity A).

### Conflation impact

| Document | False Claim | Impact |
|---|---|---|
| `concept.md` | "Prototyped as `examples/extensions/pi-evolve.ts` (510 LOC, in-tree)" | User thinks upstream already built this; reality: it's our draft |
| `implementation-plan.md` | "Repackages `examples/extensions/pi-evolve.ts` (510 LOC verified)" | Build step 6 assumes 0 design work; reality: full design needed |
| `implementation-plan.md` | "Lift `pi-evolve.ts` (510 LOC verified) almost as-is" | LOC budget ~600 for evolve is "mostly copy-paste"; reality: it's our own code |
| `modular-architecture.md` | "Existing `examples/extensions/pi-evolve.ts` (510 LOC) is the prototype to repackage" | "Existing" implies validated; reality: untested draft |
| `pi-port.md` | "The canonical reference for the in-session driver pattern is `examples/extensions/pi-evolve.ts`" | Cited as canonical; reality: self-authored |
| `pi-port.md` | "Plus the in-tree `examples/extensions/pi-evolve.ts` (510 LOC), which is the most complete reference" | "Most complete" among what? Self-authored drafts? |
| `pi-evolve-extension.md` | "This file is the **canonical in-tree reference**" | Entire doc built on false premise |
| `evening4-audit.md` | Lists `pi-evolve.ts` as a "source" in frontmatter; cites it for 8 verification claims | Audit recursively validates itself using its own draft |
| `evening5-review.md` | "`examples/extensions/pi-evolve.ts` (510 LOC) ✅ exact" | Confirms size but not provenance |
| `spirit-vs-opencode.md` | "currently prototyped as `examples/extensions/pi-evolve.ts` (untracked, ~510 LOC)" | **Most accurate** — at least says "untracked" |
| `loop-extensions.md` | "`pi-evolve Extension` — first MATS-style branched-variant Pi extension (510 LOC)" | Claims "first" in ecosystem; reality: first draft in planning |

**Special note on line numbers**: The line numbers cited in wiki docs (agent_end at 422, sendMessage at 449, etc.) ARE accurate. The file does contain those patterns at those lines. But this is because the draft was written *to match* the patterns described in the wiki, not because the wiki discovered them in an upstream file. The causality is reversed.

---

## Category 3: Ecosystem Repo Health Stats — MIXED

### Confirmed (live API checked in this or prior sessions)

| Repo | Stars | Forks | Issues | Last Push | Verified When |
|---|---|---|---|---|---|
| `nicobailon/pi-subagents` | 1,296 | 181 | 31 | 2026-05-03 | Evening 3 |
| `HazAT/pi-interactive-subagents` | 442 | 78 | 15 | 2026-05-03 | Evening 3 |
| `tintinweb/pi-subagents` | 274 | 59 | 18 | 2026-05-07 | Evening 3 |
| `tintinweb/pi-manage-todo-list` | 23 | 5 | 0 | 2026-04-30 | Evening 3 |
| `popododo0720/pi-stuff` | 16 | 0 | 0 | 2026-03-03 | Evening 3 |
| `cmf/pi-subagent` | 0 | 0 | 0 | 2026-01-08 | Evening 3 |

### False or outdated

| Claim | Document | Truth |
|---|---|---|
| "Hopsken/pi-subagents" has 5,159 LOC, tintinweb has 6,082 | subagents.md, evening2 | ❌ Same package — Hopsken is a private mirror of tintinweb. "5159 vs 6082" was comparing different versions of the same package. |
| "Hopsken is a superset with scheduling" | evening2, subagents.md | ❌ Hopsken is a stale snapshot (v0.5.2); tintinweb upstream is v0.7.1. The "superset" claim was a version diff, not a feature diff. |
| "tintinweb/pi-subagents 271 stars" | evening2 | ⚠️ Stale — was 274 at evening 3, likely higher now. Star counts drift continuously. |
| "HazAT 394 stars" | evening2 | ⚠️ Stale — was 442 at evening 3. |
| "popododo 15 stars" | evening2 | ⚠️ Stale — was 16 at evening 3. |
| "tintinweb/pi-manage-todo-list 16 stars" | evening2 | ⚠️ Stale — was 23 at evening 3. |

**Recommendation**: Stop citing precise star counts in planning docs. Use relative tiers ("popular: 1K+ stars", "moderate: 100-500", "niche: <50") or omit entirely. The exact number at survey time is not load-bearing for architecture decisions.

---

## Category 4: Reference Implementation Capabilities — 3 FALSE

These were discovered in evening 4 but are worth re-documenting since some docs still carry the false claims.

| Claim | Document | Truth |
|---|---|---|
| tmustier/pi-ralph-wiggum has pause/resume | implementation-plan.md, modular-architecture.md (before evening 4 fix) | ❌ **FALSE** — no pause/resume in any file |
| tmustier has max-iteration cap | implementation-plan.md (before evening 4 fix) | ❌ **FALSE** — no max-iteration cap |
| davebcn87/pi-autoresearch uses `setWidget` factory form | modular-architecture.md (before evening 4 fix) | ❌ **FALSE** — file has ZERO `setWidget` calls; uses `ctx.ui.notify` only |
| cmf/pi-subagent is "production-grade infrastructure library" | subagents.md, evening2 | ❌ **FALSE** — 0 stars, 0 forks, 1 commit, never published to npm, stale 4+ months |
| mitsuhiko/agent-stuff loop.ts has `wasLastAssistantAborted` | implementation-plan.md, evening4 | ✅ Confirmed at line 201-205 |
| mitsuhiko has single-active-loop guard | implementation-plan.md, evening4 | ✅ Confirmed at line 359 |

---

## Category 5: Cross-Document Consistency Issues

### Issue 5.1: Package count varies across documents

| Document | Package Count | Notes |
|---|---|---|
| `concept.md` | "six modular packages" (1 dropped = 5 active) | Still says 6 with strikethrough |
| `implementation-plan.md` | 5 (subagent dropped) | Correct for post-evening-2 |
| `modular-architecture.md` | "six packages" (subagent dropped, marked) | Table has 6 rows with strikethrough |
| `evening2-simplification.md` | "5 + meta" | ~1,400 LOC |
| `evening4-audit.md` | "6 (subagent dropped)" | ~1,400 LOC |
| `evening5-review.md` | Claims "internally consistent within rounding" | But package counts differ structurally |

**Assessment**: This is cosmetic, not load-bearing. The difference is whether the dropped subagent package is (a) omitted entirely, (b) listed with strikethrough, or (c) counted in the total then subtracted. All communicate the same architecture. However, `concept.md` still saying "six modular packages" at the heading level is misleading — a reader skimming sees "six" not "five."

### Issue 5.2: LOC budget varies by ±100 across documents

| Document | Total LOC | evolve LOC | Notes |
|---|---|---|---|
| `concept.md` | ~1,400 (implied) | ~550 | No explicit total |
| `implementation-plan.md` | ~1,500 | ~600 | "Updated evening 5" |
| `modular-architecture.md` | ~1,400 | ~550 | Table sum |
| `evening2-simplification.md` | ~1,400 | ~600 | Custom code budget table |
| `evening4-audit.md` | ~1,400 | ~550 | Post-audit architecture |

**Assessment**: The ±100 variation is explained by implementation-plan adding "testing scaffolding" and JSONL writer. Acceptable for estimates. But all numbers depend on the false premise that evolve is "mostly lifting pi-evolve.ts" — remove that premise and the evolve budget becomes unknown (could be 200 LOC if simple, could be 800+ if complex).

### Issue 5.3: Subagent provider recommendation is inconsistent

| Document | Ralph Provider | Evolve Provider | Notes |
|---|---|---|---|
| `concept.md` | tintinweb | tintinweb | "v1 simplification: depend only on tintinweb" |
| `implementation-plan.md` | tintinweb | tintinweb | Step 5+6: soft-dep on tintinweb |
| `subagent-and-todo.md` Q1 | Hopsken (= tintinweb) | Hopsken | Same as tintinweb |
| `subagent-and-todo.md` Q5 | Hopsken | **HazAT** | "Different providers for different consumers" |
| `evening2-simplification.md` | tintinweb | tintinweb | "v1: tintinweb only. HazAT deferred." |
| `modular-architecture.md` | Hopsken/tintinweb | Hopsken/tintinweb | "runtime-soft Hopsken/pi-subagents" |

**Assessment**: Q5 in `subagent-and-todo.md` diverges from all other docs by recommending HazAT for evolve. This was a novel finding from the Q5 analysis but was never reconciled with the evening 2 simplification that said "tintinweb only, HazAT deferred." The current state is inconsistent: some docs say evolve uses tintinweb, one says HazAT. Need a single decision.

### Issue 5.4: Module-isolation strategy

| Document | Strategy | Notes |
|---|---|---|
| `modular-architecture.md` | Strategy A (mono-package) | Recommended |
| `evening6-radical-scale-down.md` | Strategy A (mono-package) | "Down from claimed ~1,400 LOC across 5 packages" — but this doc is DRAFT |
| `concept.md` | Not specified | References modular-architecture.md |
| `implementation-plan.md` | Not specified | References modular-architecture.md |

**Assessment**: Strategy A is consistently recommended. No inconsistency here. The evening 6 draft's "2 packages + recipes" option was never adopted (marked DRAFT).

### Issue 5.5: evening 6 draft contradicts itself

The evening 6 doc (`research-2026-05-08-evening6-radical-scale-down.md`) has:
- Frontmatter: `status: draft-pending-review`, warnings about verification slippage
- Body heading: "Option A adopted" 
- But also: "Decision deferred to fresh session"

This is contradictory: the doc claims Option A was adopted while also saying the decision was deferred. In reality, **no decision was adopted** — the doc was written, then the session discovered pi-evolve's false provenance and stopped.

---

## Category 6: NPM Scope Rebrand — ALL CONFIRMED

| Claim | Verified | Source |
|---|---|---|
| `@mariozechner/*` → `@earendil-works/*` | ✅ | Commits `551385e4`, `3e5ad67e` in pi-mono git log |
| Both scopes currently published | ✅ | npm registry: `@mariozechner/pi-coding-agent@0.73.1`, `@earendil-works/pi-coding-agent@0.74.0` |
| tintinweb still pins legacy scope | ✅ | `@tintinweb/pi-subagents@0.7.1` peerDeps: `"@mariozechner/pi-coding-agent": ">=0.70.5"` |
| Legacy alias may be retired | ✅ (inference) | Rebrand commits suggest migration; no perpetual guarantee |

**Actionable**: `@pi-dacmicu/*` packages should peer-depend on `@earendil-works/pi-coding-agent`. Monitor tintinweb for peer-dep update.

---

## Category 7: Architecture Assumptions — 4 NEED TESTING

These are design decisions or assumptions that cannot be verified by static analysis. They were correctly identified as needing tests in evening 4/5, but the docs sometimes present them as settled.

| # | Assumption | Presented As | Actually |
|---|---|---|---|
| A1 | `manage_todo_list` survives `/compact` | "session_before_compact + getBranch() should work" | **Unverified** — needs test |
| A2 | `manage_todo_list` survives `/fork` | "session_tree hook should reconstruct" | **Unverified** — needs test |
| A3 | Multiple `before_agent_start` handlers chain correctly | "Documented as chaining" | **Partially verified** — documented but order untested |
| A4 | `pi.events.emit` works across separately-installed extensions | "Cross-extension RPC requires both loaded" | **Unverified** — needs integration test |
| A5 | `agent_end` handler from base doesn't conflict with others | "Pi allows multiple handlers" | **Unverified** — load-order dependent |
| A6 | Ralph degrades to Variant A if tintinweb absent | "Graceful degrade" | **Design decision**, not verified fact |

---

## Category 8: Plan Assessment — Scale-Down Options Need Re-evaluation

### Original plan (pre-evening 6)

5 packages: base (~200) + todo (~250) + fabric (~250) + ralph (~200) + evolve (~600) = ~1,500 LOC

### Evening 6 Option A (DRAFT, NOT ADOPTED)

2 packages: todo (~200) + fabric (~250) = ~450 LOC; rest become recipes

### Evening 6 Option B (mid-session pivot, NOT ADOPTED)

3 packages: base (~100) + todo (~200) + fabric (~250) = ~550 LOC; rest become recipes

### Assessment

**Both scale-down options were drafted under context pressure** (user explicitly asked whether the agent was scaling down due to context limits). The honest answer was yes — the agent's verification rigor degraded, as evidenced by the pi-evolve conflation.

**The scale-down decision should NOT be made in this session.** It requires:
1. Correcting all pi-evolve false claims first
2. Re-evaluating whether "base justifies being a package" without the false premise that evolve "already exists" to consume it
3. Assessing whether ralph and evolve add unique value or are adequately covered by ecosystem extensions
4. Fresh verification of all repo health stats

**The only safe conclusion**: `todo` and `fabric` are clearly justified (todo adds deterministic outer loop on top of tintinweb; fabric is genuinely novel). `base`, `ralph`, and `evolve` need re-evaluation with corrected premises.

---

## Recommendations

### Immediate (before any build work)

1. **Fix all pi-evolve false claims** in committed docs:
   - `concept.md`: Replace "Prototyped as `examples/extensions/pi-evolve.ts` (510 LOC, in-tree)" with "Drafted as local prototype `examples/extensions/pi-evolve.ts` (510 LOC, untracked, unverified)"
   - `implementation-plan.md`: Remove "Repackages `pi-evolve.ts` (510 LOC verified)" — evolve is a new build, not a repackage
   - `modular-architecture.md`: Remove "Existing `pi-evolve.ts` (510 LOC) is the prototype"
   - `pi-port.md`: Remove "canonical reference for the in-session driver pattern is `pi-evolve.ts`" — cite mitsuhiko's loop.ts instead
   - `pi-evolve-extension.md`: Add prominent warning that this describes a draft prototype, not a validated extension
   - `evening4-audit.md`: Add errata note that the audit recursively validated itself using its own draft

2. **Reconcile subagent provider recommendation**: Decide once whether evolve uses tintinweb (consistent with v1 simplification) or HazAT (per Q5 analysis). Document the decision and update all docs.

3. **Standardize package count presentation**: Either (a) always say "5 packages" with subagent omitted, or (b) always say "6 packages with subagent dropped." Pick one and apply everywhere.

### Before v1 build

4. **Re-verify all repo health stats** via live GitHub API. Do not use search-engine cached numbers.

5. **Write and run the 6 architecture tests** (A1-A6 above) to validate assumptions that can't be checked statically.

6. **Decide scale-down**: After correcting pi-evolve claims, re-assess whether base/ralph/evolve justify being packages vs. recipes. Do this in a fresh session with full context.

### Long-term

7. **Establish provenance discipline**: For any file cited as a "reference," verify: (a) who wrote it, (b) when, (c) whether it's tracked in a repo, (d) whether it's been tested. Do not cite agent-authored drafts as upstream references.

8. **Version-pin ecosystem dependencies**: Specify exact versions of tintinweb, HazAT, etc. that DACMICU was validated against. Do not use "latest."

---

## Action Items

| # | Action | Owner | Priority | Blocks |
|---|---|---|---|---|
| 1 | Fix pi-evolve false claims in concept.md | This agent | P0 | All planning |
| 2 | Fix pi-evolve false claims in implementation-plan.md | This agent | P0 | All planning |
| 3 | Fix pi-evolve false claims in modular-architecture.md | This agent | P0 | All planning |
| 4 | Fix pi-evolve false claims in pi-port.md | This agent | P0 | All planning |
| 5 | Add warning to pi-evolve-extension.md | This agent | P0 | All planning |
| 6 | Add errata to evening4-audit.md | This agent | P0 | All planning |
| 7 | Reconcile subagent provider (tintinweb vs HazAT for evolve) | User decision | P0 | evolve package design |
| 8 | Standardize package count presentation | This agent | P1 | Doc consistency |
| 9 | Re-verify repo health stats via live API | Fresh session | P1 | Dependency decisions |
| 10 | Write architecture tests A1-A6 | Fresh session | P1 | Build confidence |
| 11 | Decide scale-down (original / Option A / Option B / other) | User + fresh session | P1 | Build sequence |
| 12 | Establish provenance discipline for future refs | Process | P2 | Future audits |

---

## Appendix A: Full pi-evolve Conflation Timeline

| Date/Time | Event | What Was Claimed | What Was True |
|---|---|---|---|
| 2026-05-07 ~10:51 | File created | — | Agent wrote `examples/extensions/pi-evolve.ts` as DACMICU draft |
| 2026-05-07 evening | Planning session | "pi-evolve.ts is in-tree reference" | File was untracked at repo root |
| 2026-05-08 morning | Ecosystem survey | "badlogic/pi-evolve exists with 7 stars" | Search-engine cache snippet, never API-verified |
| 2026-05-08 evening 1-5 | Multiple sessions | "510 LOC verified", "canonical reference" | Line numbers match but provenance never checked |
| 2026-05-08 evening 6 | Scale-down draft | "pi-evolve.ts already in-tree = 0 LOC owned" | Draft is our code, counts toward owned LOC |
| 2026-05-10 ~09:32 | Live API check | — | GitHub API returns 404 for badlogic/pi-evolve |
| 2026-05-10 ~11:33 | npm pack | — | `pi-evolve@0.1.0` is 143-LOC brainstorm tool by Dunya Kirkali |
| 2026-05-10 ~11:40 | Provenance check | — | File creation timestamp (2026-05-07) matches agent session; vocabulary matches DACMICU planning terms |

## Appendix B: Documents Requiring Correction

**High priority (false claims about pi-evolve)**:
- `dacmicu/concept.md` — "in-tree" claim
- `dacmicu/implementation-plan.md` — "repackages", "lift almost as-is", "verified"
- `dacmicu/modular-architecture.md` — "existing prototype", multiple "pi-evolve.ts:XXX" citations
- `dacmicu/pi-port.md` — "canonical reference", "most complete reference"
- `implementations/pi-evolve-extension.md` — entire doc framed as "canonical in-tree reference"
- `ecosystem/loop-extensions.md` — "first MATS-style branched-variant Pi extension"
- `dacmicu/research-2026-05-08-evening4-comprehensive-audit.md` — recursive self-validation

**Medium priority (consistency issues)**:
- `dacmicu/concept.md` — package count says "six" not "five"
- `dacmicu/subagent-and-todo.md` Q5 — HazAT for evolve contradicts other docs
- `dacmicu/research-2026-05-08-evening6-radical-scale-down.md` — contradictory status ("adopted" vs "deferred")

**Low priority (stale numbers)**:
- `ecosystem/subagents.md` — star counts may be stale
- `dacmicu/research-2026-05-08-evening2-simplification.md` — star counts may be stale

---

*Audit completed 2026-05-10. Supersedes all prior verification claims. See `log.md` [2026-05-10] entry for the discovery narrative.*
