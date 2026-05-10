---
title: Critical Plan Review — Assumptions Challenged
type: audit
status: draft
updated: 2026-05-10
sources:
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/dacmicu/concept.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/dacmicu/implementation-plan.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/dacmicu/modular-architecture.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/dacmicu/spirit-vs-opencode.md
  - /opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/packages/coding-agent/src/core/extensions/types.ts
  - https://github.com/mitsuhiko/agent-stuff/blob/main/extensions/loop.ts
  - https://github.com/tmustier/pi-extensions/blob/main/pi-ralph-wiggum/index.ts
  - https://github.com/latent-variable/pi-auto-continue
  - https://github.com/edxeth/pi-tasks
  - /tmp/pi-github-repos/edxeth/pi-tasks/src/index.ts
tags: [audit, critique, assumptions, dacmicu, plan-review]
see_also:
  - "../concept.md"
  - "../implementation-plan.md"
  - "../modular-architecture.md"
  - "research-2026-05-10-comprehensive-verification-audit.md"
---

# Critical Plan Review — Assumptions Challenged

**Scope**: A deliberately hostile reading of the current DACMICU plan. Every load-bearing assumption is challenged, with evidence where available and honest uncertainty where not.

**Method**: For each assumption, ask: (1) What would have to be true for this to work? (2) Is that actually true? (3) If not, what's the impact?

---

## 1. The Core Claim: "Deterministic"

**Assumption**: The loop is deterministic — the extension, not the LLM, decides when to continue.

**What would have to be true**: The extension can reliably detect loop termination without LLM cooperation.

**Is it true? Partially.**

The plan lists four termination conditions:
1. `signal_loop_success` tool called by LLM
2. Iteration cap hit
3. Task predicate false (e.g., `unchecked == 0`)
4. `ctx.hasPendingMessages()` true (user typing)

**Problem**: Three of four require LLM cooperation. `signal_loop_success` is explicitly LLM-callable. The task predicate (`unchecked == 0`) depends on the LLM having correctly updated the TODO list — if the LLM forgets to mark an item done, the loop runs forever. `hasPendingMessages()` is the only purely mechanical guard.

**The iteration cap is the only truly deterministic break** — and it's a failure mode, not a success criterion. A loop that hits its cap and stops with unfinished work is a failed loop.

**What the ecosystem actually does**: `mitsuhiko/agent-stuff/extensions/loop.ts` uses `signal_loop_success` as the primary termination. The iteration cap is a safety rail. `tmustier/pi-ralph-wiggum` uses `ralph_done` (same pattern). `latent-variable/pi-auto-continue` doesn't even have a breakout tool — it just keeps saying "continue" until the user hits Escape or the 100-iteration cap.

**Verdict**: "Deterministic" is overstated. The loop is **constrained** (bounded by cap + user interrupts) and **prompted** (LLM instructed to call breakout), not deterministic. The extension schedules turns; the LLM decides when to stop. This is still valuable — it's "structured iteration with guardrails" — but calling it "deterministic" sets the wrong expectation.

**Impact**: Rename concept? No — the term is established. But document honestly: the determinism is in the *scheduling* (extension controls when turns fire), not the *termination* (LLM controls when to stop).

---

## 2. The Reassessment Step — Unverified and Potentially Harmful

**Assumption**: Before working each item, the loop injects a "reassessment" turn where the LLM validates the next item is still correct.

**What would have to be true**: The reassessment turn (a) doesn't waste tokens, (b) actually catches stale items, (c) doesn't confuse the LLM about what to do next.

**Is it true? Unverified — and there are reasons to doubt it.**

**Token cost**: Every reassessment turn is a full LLM call. For a 10-item TODO list, that's 10 extra turns — potentially doubling cost. The plan acknowledges the cost model as an "open question" but doesn't quantify it.

**Effectiveness**: There's no evidence that LLMs reliably self-correct TODO ordering when asked. If the LLM created the TODO list in turn 1, why would it identify errors in the same list in turn 3? The items it thought were valid then are likely still what it thinks is valid now, unless new information emerged from the work — in which case the *work itself* should have updated the TODO list.

**Confusion risk**: After a reassessment turn that says "yes, item #3 is correct," the next turn says "now work item #3." This is two turns for one item. The LLM might lose track of state or produce redundant work.

**Alternative**: Skip reassessment. Trust the LLM to update the TODO list when it learns new information. The loop checks `unchecked == 0`; if the LLM didn't update the list, the loop continues until the cap or the LLM calls `signal_loop_success`. This is what the ecosystem does today (mitsuhiko, tmustier, latent-variable) — none have reassessment.

**Verdict**: Reassessment is a **hypothetical improvement**, not a validated pattern. It should be an opt-in feature, not the default. Default should be: check state → if items remain → work next item. No validation turn.

**Impact**: Redesign `@pi-dacmicu/todo` to make reassessment optional (config flag: `reassess: boolean`, default `false`). Reduces complexity and token cost for the common case.

---

## 3. The `base` Package — Over-Engineered?

**Assumption**: A shared `attachLoopDriver()` library is necessary and justified. It consolidates the loop pattern that would otherwise be reimplemented 3× (todo, ralph, evolve).

**What would have to be true**: The savings from shared code outweigh the complexity of a shared library, and the abstraction is clean enough that consumers don't fight it.

**Is it true? Questionable.**

**The actual savings**: The loop driver pattern is ~35 lines:
```ts
pi.on("agent_end", async (event, ctx) => {
  if (!state.active) return;
  if (state.signaledSuccess) { state.active = false; return; }
  if (event.aborted) { state.active = false; return; }
  if (ctx.hasPendingMessages()) return;
  if (state.iterations >= MAX) { state.active = false; return; }
  state.iterations++;
  pi.sendMessage({ customType: "loop-step", content: state.prompt, display: true },
    { triggerTurn: true, deliverAs: "followUp" });
});
```

That's it. The "consolidation" argument saves maybe 20 lines per consumer (the `agent_end` handler) but costs:
- A new abstraction (`LoopDriver` interface with 5 methods)
- Runtime coordination (multiple drivers, single `sendMessage` caller invariant)
- Session-scoped registry logic
- Testing complexity (base must be tested in isolation, then integrated)

**What the ecosystem does**: Every loop extension implements its own `agent_end` handler. `mitsuhiko/agent-stuff/extensions/loop.ts` (~250 LOC total) includes its own driver, breakout tool, compaction preservation, and widget — no shared library. `tmustier/pi-ralph-wiggum` (~700 LOC) same pattern. `latent-variable/pi-auto-continue` (~50 LOC) is a minimal standalone.

None of them felt the need for a shared loop library. They copy the ~35-line pattern inline. The pattern is small enough that copy-paste is cheaper than dependency management.

**The module-isolation problem**: As documented in `modular-architecture.md`, Pi's package system doesn't allow cross-package imports without `bundledDependencies`. Strategy A (mono-package) solves this but means `base` isn't a separate package — it's a file inside `pi-dacmicu` that other files import. At that point, it's just an internal module, not a "shared library" in the NPM sense.

**Verdict**: `base` as a separate *concept* is useful (centralized loop orchestration prevents conflicts). But `base` as a *package* is overkill. In a mono-package layout, it's just `packages/base/index.ts` — a file that registers `signal_loop_success` and exports a helper. Call it ~100 LOC of shared infrastructure, not a "package."

**Impact**: Keep `base` as an internal module in the mono-package. Don't present it as a standalone package. The `LoopDriver` interface can be simplified: consumers just call `startLoop(prompt, predicate)` and `stopLoop()` — no need for a full interface with 5 methods.

---

## 4. The Mono-Package Decision — Correct but Unexamined

**Assumption**: Strategy A (one npm package, multiple extensions) is the right delivery model.

**What would have to be true**: Users are okay installing everything to use one piece, and `pi config` is sufficient for enable/disable.

**Is it true? Probably, but the justification is circular.**

The argument: "Pi's `pi config` enable/disable already provides the modular UX." But `pi config` controls which extensions are *active*, not which are *installed*. A user who installs `pi-dacmicu` gets all the code whether they use it or not. For a ~1,500 LOC package this is negligible. But the precedent matters: if DACMICU grows (evolve gets complex, ralph adds features), the package bloats.

**Counter-argument**: The whole point of modular packages is "install what you need." Forcing a monolithic install contradicts the user's stated preference: "I would still believe dacmicu base could be worse building" (evening 6 pushback against dropping base). The user values modularity.

**Alternative not considered**: Per-package install with zero shared code (Strategy C). Each package is self-contained. Yes, the ~35-line loop driver is duplicated 3×. But that's ~100 lines of duplication across ~1,500 LOC total — 7% overhead. In exchange, users install only what they need, and there's no `bundledDependencies` complexity.

**Verdict**: Strategy A is pragmatic for v1. But the "module-isolation constraint" is presented as a hard blocker for Strategy B/C when the real trade-off is minor code duplication vs. user install flexibility. The constraint is overstated.

**Impact**: Document that Strategy A is a v1 convenience, not an architectural mandate. If evolve proves too heavy for users who just want TODO, revisit Strategy C (self-contained packages) for v2.

---

## 5. The `ralph` Package — What Unique Value?

**Assumption**: `@pi-dacmicu/ralph` adds unique value beyond what existing ecosystem extensions provide.

**What would have to be true**: The ralph package does something that `mitsuhiko/agent-stuff/extensions/loop.ts`, `tmustier/pi-ralph-wiggum`, or `latent-variable/pi-auto-continue` doesn't already do.

**Is it true? Unclear.**

**What existing extensions do**:
- `mitsuhiko/loop.ts`: `/loop tests | custom <cond> | self`, `signal_loop_success`, compaction preservation, widget. The canonical pattern.
- `tmustier/pi-ralph-wiggum`: `ralph_done` tool, reflection cadence, multiple parallel loops, state persistence. 927 weekly downloads.
- `latent-variable/pi-auto-continue`: `agent_end` → `sendUserMessage("continue")`, 100-iteration cap, abort-aware. Minimal.
- `lnilluv/pi-ralph-loop`: Subprocess + RPC + pause/resume (SIGSTOP/SIGCONT). Heavy but complete.
- `rahulmutt/pi-ralph`: Branched session per iteration. Minimal.

**What `@pi-dacmicu/ralph` would do**: `/ralph "<goal>"`, per-iteration check with optional tintinweb subagent, fallback to inline. ~200 LOC.

**The gap**: What does DACMICU ralph do that tmustier's doesn't? tmustier already has: loop driver, breakout tool, state persistence, widget, reflection. The only "new" feature is optional tintinweb subagent dispatch — but that's a runtime soft-dep that tmustier could add in a PR.

**Honest assessment**: `@pi-dacmicu/ralph` is a packaging of existing patterns, not a novel capability. The value is in "DACMICU branding + integration with the TODO base" — not in unique functionality.

**Verdict**: `ralph` is justified if the user wants a single "DACMICU" branded experience. It's not justified on technical novelty. Consider making it a thin wrapper/configurator around existing ecosystem extensions rather than a full reimplementation.

---

## 6. The `evolve` Package — The Weakest Part of the Plan

**Assumption**: A 600-LOC MATS-style code-evolution loop is buildable and useful.

**What would have to be true**: (a) The evolve pattern is validated by user need, (b) the 600-LOC estimate is realistic, (c) the subagent-per-candidate model works in practice.

**Is it true? None of the three are validated.**

**(a) User need**: The user has never explicitly asked for MATS evolution. The entire "evolve" feature was derived from the local draft file (`examples/extensions/pi-evolve.ts`) that the agent wrote during planning. It's a solution looking for a problem.

**(b) LOC estimate**: 600 LOC for "tools + ledger + git + loop driver + JSONL writer" is optimistic. The local draft is 510 LOC and handles only the happy path (no error handling in git ops, no race conditions in branch naming, no compaction edge cases, no subagent integration). Adding robustness would push it toward 800-1,000 LOC.

**(c) Subagent-per-candidate model**: Each evolve candidate spawns a subagent, runs a benchmark, captures output. The plan assumes tintinweb's `subagents:rpc:spawn` handles this. But:
- Subagent spawn latency: unknown. Could be seconds per candidate.
- Cost: each candidate = one full LLM session. 10 candidates = 10× cost of a single loop.
- Visibility: the 500-char truncation in ConversationViewer makes comparing candidates painful — the JSONL writer is a workaround, not a fix.
- Candidate comparison: the LLM reads `selection.md` and picks the next parent. But `selection.md` is a markdown file; the LLM must parse it correctly. No structured format is proposed.

**What the ecosystem actually has**: `davebcn87/pi-autoresearch` (6,443 stars) implements a real evolution loop with metric-gated keep/revert, confidence scoring, dashboard, compaction awareness. It's 2,500 LOC and heavily tested. DACMICU's 600-LOC evolve would be a toy in comparison.

**Verdict**: `evolve` should be **deferred indefinitely** or **dropped entirely**. It's the highest-risk, lowest-validated part of the plan. The user's actual need is a deterministic TODO loop (Variant A), not MATS evolution (Variant B).

**Impact**: Remove `evolve` from v1. If the user later asks for code evolution, evaluate whether to (a) depend on `pi-autoresearch` (it's already the ecosystem standard), (b) build a thin wrapper, or (c) build from scratch with real requirements.

---

## 7. The `fabric` Package — Independent but Unvalidated

**Assumption**: A Unix-socket bash callback (FABRIC) is useful and buildable in ~250 LOC.

**What would have to be true**: (a) The socket round-trip works reliably, (b) the `pi-callback` CLI is installable and discoverable, (c) there's a real use case.

**Is it true? (a) and (b) are plausible; (c) is unvalidated.**

The design is sound: socket server in extension, `pi-callback` CLI on PATH, bash env injection via `tool_call` hook. The protocol is simple JSON lines. The sketch in `pi-callback-extension.md` is ~200 LOC and seems correct.

**But**: What actual workflow requires this? The opencode use case is `cat file | oc check "is this buggy?" | oc run "fix it"` — shell pipeline composition. Pi doesn't have a CLI mode that supports this (no `pi --print` with callback). The socket path only works *inside* an active Pi session's bash tool.

**Use cases inside Pi**:
- "For each file in src/, ask the agent if it's buggy, then fix it" — but this is already doable with a loop + tool calls, no socket needed.
- "Run a benchmark, then ask the agent to judge the result" — same, doable with `manage_todo_list` + loop.
- "Makefile step that calls back to the agent" — requires the socket to be discoverable from outside the session, which the design explicitly says is "out of scope for v1."

**Verdict**: `fabric` is technically correct but practically unnecessary for the user's stated need (deterministic TODO loop). It's a nice-to-have for v2, not a v1 requirement. The plan correctly says it's "independent" — but then includes it in the build sequence anyway.

**Impact**: Move `fabric` to a separate, lower-priority track. Don't let it gate the TODO loop work.

---

## 8. The Subagent Integration Model — Trusting an Undocumented RPC

**Assumption**: `tintinweb/pi-subagents` exposes a stable `pi.events` RPC contract (`subagents:rpc:spawn`) that DACMICU can depend on.

**What would have to be true**: The RPC contract is (a) documented, (b) stable across versions, (c) semantically appropriate for DACMICU's use case.

**Is it true? (a) and (b) are weak; (c) is questionable.**

**(a) Documentation**: The contract is only documented in Hopsken's source code (`cross-extension-rpc.ts`). There's no README section, no API docs, no example code for cross-extension callers. The wiki reverse-engineered it from source.

**(b) Stability**: `PROTOCOL_VERSION = 2` is a version number, not a semver guarantee. There's no CHANGELOG entry saying "RPC contract stable since v0.5." The version could bump to 3 with breaking changes and no migration guide.

**(c) Semantic fit**: The RPC contract is designed for Hopsken's use case: spawn a subagent, wait for completion, return result. DACMICU's evolve use case needs: spawn candidate, run benchmark, capture metric, kill if hung, compare across candidates. The RPC returns a final result, not intermediate events. For evolve, you'd want streaming updates ("candidate 3 is still running, 4/10 tools done") — the RPC doesn't support this.

**What the ecosystem does**: No other extension depends on Hopsken's RPC. Everyone either (a) imports Hopsken's code directly (if in the same package), (b) uses `createAgentSession` directly, or (c) spawns `pi --mode json` subprocesses. DACMICU would be the first cross-extension RPC consumer.

**Verdict**: The soft-dep on tintinweb is **higher risk than documented**. If the RPC contract changes or tintinweb breaks, ralph's Variant B and evolve stop working. Mitigation: pin to a tested version, monitor for breakage, and have a fallback (Variant A for ralph, error message for evolve).

---

## 9. The TODO Base Decision — Correct but the Reasoning Has a Hole

**Assumption**: `tintinweb/pi-manage-todo-list` is the right TODO base because it's a passive state primitive; `edxeth/pi-tasks` is rejected because its DAG and file-backed storage fight the loop driver.

**The reasoning is mostly correct**, but there's a hole: **session-entry persistence vs. file-backed persistence**.

The plan claims session-entry persistence "branches with `/fork` for free." This is true for `/fork` (the session JSONL is copied). But what about:
- **Session switch** (`/switch` to a different session file): the new session has its own JSONL; TODO state from the old session is not automatically available. File-backed storage (`~/.pi/tasks/`) survives session switches.
- **Session reload** (`/reload`): the session JSONL is re-read from disk. If the session was compacted, the tool-result `details` may have been summarized or dropped. File-backed storage survives compaction.
- **External editing**: A user can't open `~/.pi/tasks/<session>/1.json` and edit it manually with a text editor. They *can* edit `selection.md` (for evolve) or `TODO.md` (for `forjd/pi-todo-md`).

**The trade-off**: session-entry persistence is branch-safe but session-fragile and compaction-fragile. File-backed persistence is branch-unsafe but session-robust and compaction-robust.

`edxeth/pi-tasks` solves this with snapshots: on every leaf change, it copies the task store to `.tree/<leafId>/`. On branch switch, it restores from the snapshot. This is *almost* as branch-safe as session entries, with the added benefit of surviving compaction and session switches.

**Verdict**: The rejection of `edxeth/pi-tasks` is correct for v1 (DAG is the dealbreaker). But the "file-backed breaks branch isolation" argument is weaker than presented — edxeth's snapshot mechanism largely fixes this. If a future v2 wants session-switch survival, reconsider.

---

## 10. The "2-3 Days" Estimate — Wildly Optimistic

**Assumption**: "Roughly 2-3 days for a proficient Pi extension developer."

**What would have to be true**: The developer knows Pi's extension API intimately, the requirements are stable, and nothing unexpected comes up.

**Is it true? No.**

**Realistic breakdown**:
- `base`: 1 day (including testing the loop driver in real TUI sessions)
- `todo`: 2-3 days (loop driver + reassessment + widget + `/todo-loop` command + testing `/fork`, `/compact`, `/reload`)
- `ralph`: 1-2 days (if it's just a config wrapper around existing patterns)
- `evolve`: **Not buildable in 2-3 days.** If attempted, 1-2 weeks minimum for a toy, months for production.
- `fabric`: 1 day (socket server + CLI + testing)
- Integration testing (all packages together, tintinweb compatibility): 2-3 days
- Documentation, examples, edge cases: 1-2 days

**Total realistic estimate**: 1-2 weeks for base + todo + ralph (without evolve). With evolve: 3-4 weeks minimum.

**The plan's estimate is based on "lift existing code"** — but the existing code is either (a) unverified drafts (pi-evolve.ts), (b) ecosystem extensions with different semantics (mitsuhiko's loop doesn't have reassessment), or (c) in-tree examples that are demos, not production (todo.ts has no widget, no loop driver).

**Verdict**: The estimate is 3-5× too low. This matters because the user uses estimates to prioritize. If they believe it's "2-3 days," they might start it on a Friday expecting it done by Monday. In reality, it's a multi-week project.

---

## 11. Unverified Assumptions That Could Kill the Project

These are assumptions the plan makes without evidence. Each is a potential project-killer if false.

| # | Assumption | What if it's false? | Verification path |
|---|---|---|---|
| U1 | `pi.events.emit("subagents:rpc:spawn")` works when tintinweb is loaded after DACMICU | Subagent integration silently fails; no error, just no response | Runtime test: load DACMICU first, then tintinweb, try spawn |
| U2 | Multiple `before_agent_start` handlers chain deterministically | DACMICU's system prompt and tintinweb's/TODO's prompts conflict in undefined order | Runtime test: register two handlers, verify order |
| U3 | `ctx.hasPendingMessages()` returns true only for *user* messages, not followUps | Loop stomps on its own followUp messages | Runtime test: send followUp, check hasPendingMessages in next agent_end |
| U4 | `session_before_compact` can preserve `customType` messages across compaction | Loop state lost after `/compact` mid-flight | Runtime test: start loop, trigger compact, verify loop resumes |
| U5 | `manage_todo_list` survives `/fork` with session-entry persistence | TODO state not available in forked branch | Runtime test: create todos, /fork, verify state in branch |
| U6 | The LLM reliably calls `signal_loop_success` when asked to | Loop hits cap every time, user frustrated | Observational: run mitsuhiko's loop.ts, measure breakout rate |
| U7 | Reassessment step actually improves outcome vs. no reassessment | Wasted tokens with no benefit | A/B test: run with/without reassessment on same task |
| U8 | 500-char truncation in ConversationViewer is the only evolve blocker | Other blockers emerge (latency, cost, candidate comparison) | Real evolve run with tintinweb subagents |
| U9 | `pi.sendMessage({triggerTurn:true})` doesn't race with user typing | User message and followUp collide, undefined behavior | Stress test: type rapidly while loop is active |
| U10 | The npm `@earendil-works/*` scope will remain stable | tintinweb's peer-dep on `@mariozechner/*` breaks, users can't install | Monitor npm registry, file issue on tintinweb repo |

---

## User Response (2026-05-10)

The user reviewed this critique and made three explicit priority decisions that override the review's recommendations:

1. **Ralph: Keep as thin wrapper around DACMICU base.** Must leverage the shared loop infrastructure. Flexible to run in-session (Variant A) or on top of configured subagent infrastructure (Variant B). Not a standalone reimplementation.

2. **Evolve: Keep. This is a key feature the user wants to build.** The lack of an upstream prototype and the high-risk assessment are acknowledged. Build from scratch consuming base's `attachLoopDriver()`.

3. **Fabric: Keep. User has tried FABRIC-style composition in opencode and confirmed it works well.** Wants it in Pi. Independent capability, but included in v1.

These decisions restore `evolve` and `fabric` to v1 scope. The risk warnings in this review remain valid (subagent RPC stability, evolve LOC uncertainty, reassessment unvalidated, estimate too low) but the build scope is what the user wants.

**Final v1 scope**: base + todo + ralph + evolve + fabric. ~1,350 LOC. 2-4 weeks.

---

## Summary of Critical Findings

| Finding | Severity | Recommendation |
|---|---|---|
| "Deterministic" is overstated | Medium | Document as "structured iteration with guardrails" |
| Reassessment step unvalidated | High | Make optional (default: off) |
| `base` as "package" is over-engineered | Low | Keep as internal module in mono-package |
| `evolve` is unvalidated and high-risk | **Critical** | **Remove from v1** |
| `ralph` adds no unique value | Medium | Consider thin wrapper around existing extensions |
| `fabric` is nice-to-have, not v1 | Low | Move to separate track |
| Subagent RPC is higher risk than documented | Medium | Pin version, monitor, have fallback |
| File-backed vs session-entry trade-off is nuanced | Low | Document honestly; reconsider for v2 |
| "2-3 days" estimate is 3-5× too low | **Critical** | Revise to 1-2 weeks for base+todo+ralph |
| 10 unverified assumptions could kill the project | High | Write and run runtime tests before any build |

---

## Recommended v1 Scope (Revised)

Based on this critique, the honest minimum viable DACMICU:

| Package | LOC | Rationale |
|---|---|---|
| `base` (internal module) | ~100 | `attachLoopDriver` helper + `signal_loop_success` |
| `todo` | ~200 | Loop on `manage_todo_list`, **no reassessment by default**, widget |
| `ralph` | ~100 | Thin wrapper/configurator, or **defer to existing ecosystem** |
| ~~`evolve`~~ | — | **Removed** |
| ~~`fabric`~~ | — | **Deferred** |
| `all` (meta) | ~10 | `pi.extensions` array |

**Total**: ~400 LOC. **Timeline**: 1 week for a proficient developer with Pi extension experience. **Risk**: Low (mostly proven patterns).

This is the "KISS" version the user asked for in evening 6. The difference is: this recommendation is grounded in critical analysis, not context-pressure-driven scale-down.

---

*Review completed 2026-05-10. Supersedes the uncritical presentation in implementation-plan.md § "Estimated effort."*
