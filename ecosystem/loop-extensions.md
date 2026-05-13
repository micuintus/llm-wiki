---
title: Pi Ralph and Loop Extensions — Full Comparative Survey
type: synthesis
updated: 2026-05-08
sources:
  - https://github.com/davebcn87/pi-autoresearch
  - https://github.com/mitsuhiko/agent-stuff/blob/main/extensions/loop.ts
  - https://github.com/tmustier/pi-extensions/blob/main/pi-ralph-wiggum/index.ts
  - https://github.com/nicobailon/pi-review-loop
  - https://github.com/jayshah5696/pi-agent-extensions
  - https://github.com/samfoy/pi-ralph
  - https://github.com/kostyay/agent-stuff
  - https://github.com/mikeyobrien/pi-ralph
  - https://github.com/emanuelcasco/pi-mono-extensions
  - https://github.com/lnilluv/pi-ralph-loop
  - https://github.com/rahulmutt/pi-ralph
  - https://github.com/mikeyobrien/pi-autoloop
  - https://github.com/akijain2000/hermes-loop
  - https://github.com/latent-variable/pi-auto-continue
  - https://ghuntley.com/ralph/
tags: [extension, agent-loop, ralph, dacmicu, comparison, deterministic-loops]
---

# Pi Ralph and Loop Extensions — Full Comparative Survey

Comprehensive comparative survey of Pi extensions implementing autonomous agent loops, deterministic iteration patterns, and Ralph Wiggum-style coding campaigns.

**14 distinct projects identified** across 7 architectural variants. Companion to [dacmicu/pi-port](../dacmicu/pi-port.md), [dacmicu/implementation-plan](../dacmicu/implementation-plan.md), [architecture/subprocess-rpc-rendering](../architecture/subprocess-rpc-rendering.md), and [comparisons/loop-architectures](../comparisons/loop-architectures.md).

## Headline metrics (2026-05-06)

Sorted by GitHub stars. Weekly npm downloads as of 2026-04-29 to 2026-05-05.

| Rank | Extension | Repo | ⭐ Stars | 🍴 Forks | 👥 Contrib | 📦 Weekly DL | Last push | Approach |
|------|-----------|------|--------:|--------:|----------:|------------:|-----------|----------|
| 1 | **pi-autoresearch** | davebcn87/pi-autoresearch | **6,443** | 375 | **14** | **943** | 2026-05-06 | Autoresearch (try → measure → keep/revert) |
| 2 | **mitsupi (`loop.ts`)** | mitsuhiko/agent-stuff | **2,275** | 167 | 4 | 168 | 2026-04-29 | LLM-tool breakout (`signal_loop_success`) — **canonical pattern** |
| 3 | **@tmustier/pi-ralph-wiggum** | tmustier/pi-extensions | 291 | 19 | 4 | **927** | 2026-04-28 | LLM-tool advance (`ralph_done`) |
| 4 | **pi-review-loop** | nicobailon/pi-review-loop | 75 | 12 | 2 | 133 | 2026-04-15 | Code review loop until "no issues found" |
| 5 | **emanuelcasco/pi-mono-extensions** | emanuelcasco/pi-mono-extensions | 37 | 5 | 1 | 27 | 2026-05-06 | Cron-style `/loop [interval]` (Claude Code-like) |
| 6 | **jayshah5696/pi-agent-extensions** | jayshah5696/pi-agent-extensions | 24 | 2 | 3 | 208 | 2026-04-28 | Adapts mitsuhiko's `loop.ts` |
| 7 | **samfoy/pi-ralph** | samfoy/pi-ralph | 11 | 1 | 1 | 25 | 2026-04-21 | Hat-based multi-agent orchestration |
| 8 | **kostyay/agent-stuff** | kostyay/agent-stuff | 8 | 1 | 1 | (in-repo) | 2026-05-03 | LLM-tool breakout (`signal_loop_success`, separate from mitsuhiko's) |
| 9 | **mikeyobrien/pi-ralph** | mikeyobrien/pi-ralph (`@rhobot-dev/pi-ralph`) | 7 | 0 | 1 | 8 | 2026-02-07 | PTY-embed external `ralph` CLI |
| 10 | **ralph-loop-pi** | lnilluv/pi-ralph-loop | 2 | 1 | 2 | 21 | 2026-05-04 | Subprocess + RPC + custom rendering; RALPH.md |
| 11 | **mikeyobrien/pi-autoloop** | mikeyobrien/pi-autoloop | 2 | 0 | 1 | (not on npm) | 2026-04-17 | PTY-embed external `autoloop` CLI |
| 12 | **@rahulmutt/pi-ralph** | rahulmutt/pi-ralph | 2 | 0 | 1 | 32 | 2026-04-22 | Branched session per iteration |
| 13 | **akijain2000/hermes-loop** | akijain2000/hermes-loop | 1 | 1 | 1 | (not on npm) | 2026-04-06 | Self-improving (skill creation, context compression) |
| 14 | **@latent-variable/pi-auto-continue** | latent-variable/pi-auto-continue | 1 | 0 | 1 | 10 | 2026-04-11 | `agent_end` → `pi.sendUserMessage("continue")` |

> **Notes**:
> - `pi-autoresearch` dominates by stars and downloads, but is **not a Ralph loop** in the strict sense — it's an *autoresearch* harness (Karpathy-inspired) that combines agent iteration with explicit benchmark-and-keep/revert decisions. Listed here because it implements deterministic agent loops.
> - `mitsupi` (mitsuhiko/agent-stuff) hosts ~25 different extensions, not just `loop.ts`; download counts reflect the entire bundle.
> - `jayshah5696/pi-agent-extensions` explicitly credits and **adapts** mitsuhiko's `loop.ts` — it's a derivative, not a separate design.

## Two stars dominate

**`davebcn87/pi-autoresearch`** (6,443 ⭐, 14 contributors) is the most adopted deterministic-loop project in the Pi ecosystem. It's a Karpathy-inspired autoresearch harness that does:

```
loop:
  try idea → benchmark → if metric improved → keep + commit
                       → if regressed       → revert
  → repeat
```

Used for test speed, bundle size, LLM training, build times, Lighthouse scores. Differs from Ralph because it has a **first-class metric** that gates whether each iteration is kept. State persists in `autoresearch.md` + `autoresearch.jsonl`. Resumable across context resets and `/compact`. Status widget always visible. `Ctrl+Shift+T`/`Ctrl+Shift+F` for inline/fullscreen dashboard. Confidence scoring (after 3+ runs, shows how the best improvement compares to noise floor).

Recent versions added compaction-aware behavior: `session_compact` re-prompts the agent to re-read `autoresearch.md` and continue, **handling pi's auto-compaction without stopping the loop**.

**`mitsuhiko/agent-stuff`** (2,275 ⭐) is Armin Ronacher's personal collection. Contains **the canonical "DACMICU-pattern with `signal_loop_success` breakout tool"** in `extensions/loop.ts` — every later implementation either copies or independently re-derives this pattern.

## Architectural variants — 7 distinct approaches

### Variant A — In-process, LLM-driven via breakout tool

The LLM calls a tool (`signal_loop_success` / `ralph_done`) to advance or break. Extension queues next iteration as `pi.sendUserMessage` or `pi.sendMessage` with `triggerTurn:true`. **Same session throughout** — context window persists across iterations until `/compact`.

| Implementation | Originator | Pattern signature |
|---------------|-----------|-------------------|
| **mitsuhiko/agent-stuff `loop.ts`** | Armin Ronacher (Flask/Sentry creator) | `/loop tests \| custom <cond> \| self`; LLM calls `signal_loop_success`; `pi.sendMessage({...}, {deliverAs:"followUp", triggerTurn:true})` on `agent_end`; `session_before_compact` preserves loop state; condition summarized via Haiku for status widget |
| **@tmustier/pi-ralph-wiggum** | Thomas Mustier | LLM calls `ralph_done` advance tool; text marker `<promise>COMPLETE</promise>` for completion; reflection cadence; multiple parallel loops in one repo |
| **kostyay/agent-stuff `loop.ts`** | Konstantin Yegupov | Independent reimplementation of mitsuhiko's pattern; same `signal_loop_success` shape |
| **jayshah5696 / pi-agent-extensions** | Jay Shah | Adapts mitsuhiko's `loop.ts` directly (with attribution) |

This is the **canonical DACMICU pattern in Pi** today. See [dacmicu/pi-port](../dacmicu/pi-port.md).

### Variant B — In-process, `agent_end`-driven (no LLM tool)

Extension fires next iteration on every `agent_end`, no LLM tool required.

| Implementation | Pattern signature |
|---------------|-------------------|
| **latent-variable/pi-auto-continue** | ~50 LOC. `agent_end` → `pi.sendUserMessage("continue")`. Hard cap of 100 iterations. Disables on user input or abort. Use case: overnight autoresearch. |

### Variant C — Subprocess + RPC + custom rendering

Each iteration spawns `pi --mode rpc` as child; parent re-renders RPC events with Pi's exported components. **Iterations are independent processes** (clean cold start per iteration). See [architecture/subprocess-rpc-rendering](../architecture/subprocess-rpc-rendering.md) for the full pattern walkthrough.

| Implementation | Pattern signature |
|---------------|-------------------|
| **lnilluv/pi-ralph-loop** (`ralph-loop-pi`) | Most production-feature-complete. RALPH.md + YAML frontmatter (commands, guardrails, completion_promise, required_outputs, block_commands, protected_files). 4 presets (fix-tests, migration, research-report, security-audit). `/ralph-pause` (SIGSTOP), `/ralph-resume` (SIGCONT), `/ralph-steer`, `/ralph-follow`, `/ralph-stop`, `/ralph-status`. ~1300 LOC. |

### Variant D — Branched session per iteration (no RPC, no subprocess)

Extension waits for parent agent idle, branches new session per iteration, sends prompt as user message via session APIs.

| Implementation | Pattern signature |
|---------------|-------------------|
| **rahulmutt/pi-ralph** | Minimalist. `/ralph <prompt-file> [iterations]`; each iteration starts in fresh session branched from original. Progress in `.ralph/<YYYY>/<MM>/<DD>/RALPH-*.md` files. Closest to Huntley's "fresh context every iteration" Ralph original — but Pi-native (no `pi --print` overhead). |

### Variant E — PTY-embedded external runtime

Extension wraps an **external** Ralph runtime (separate CLI tool) and embeds its TUI in a PTY. Pi acts as a launcher and inspector, not the loop driver.

| Implementation | Wraps | Notes |
|---------------|-------|-------|
| **mikeyobrien/pi-ralph** (`@rhobot-dev/pi-ralph`) | `ralph` CLI v2.4.4 | Status widget below editor; `/ralph` overlay; `ralph_loop()` LLM tool; PTY embedding; keybindings `s` stop, `m` merge, `d` discard, `r` retry, `H` history, `D` diff, `a` attach shell |
| **mikeyobrien/pi-autoloop** | `autoloop` CLI | Presets: autocode/autoqa/autotest/autofix/autoreview/autosec/autospec; `/loop:run`, `/loop:list`, `/loop:status`, `/loop:stop`, `/loop:inspect`, `/loop:presets`. EventEmitter-based for reactive UI. |

### Variant F — Hat-based multi-agent orchestration

Specialized agent "hats" (Planner, Builder, Reviewer, etc.) hand off work via published events. Closer to a workflow engine than the original Ralph.

| Implementation | Pattern signature |
|---------------|-------------------|
| **samfoy/pi-ralph** | YAML preset defines hats with `triggers`/`publishes`; agent emits `>>> EVENT: <name>` to advance. Built-in presets: feature, code-assist, spec-driven, debug, refactor, review. Includes `/plan` for PDD (Prompt-Driven Development) sessions. |

### Variant G — Cron-style scheduled loop

Recurring interval-based — closer to Claude Code's `/loop` than to Ralph. See [ecosystem/claude-code-loop](claude-code-loop.md).

| Implementation | Pattern signature |
|---------------|-------------------|
| **emanuelcasco/pi-mono-extensions/loop** | `/loop [interval] <prompt>`. Trailing "every" clause supported. 7-day expiry. `/loop stop` to cancel. |

### Special cases — autoresearch and self-improving

These are deterministic agent loops but don't fit the Ralph mold:

| Implementation | Approach | Stars |
|---------------|----------|-------|
| **davebcn87/pi-autoresearch** | Karpathy-inspired autoresearch with metric-gated keep/revert; explicit benchmark backpressure | 6,443 |
| **akijain2000/hermes-loop** | Self-improving runtime: creates skills from experience, iterative context compression, persistent memory; runs on Pi or Claude Code | 1 |
| **nicobailon/pi-review-loop** | Specialized for code review: iterates until "no issues found"; auto-trigger on phrases like "implement the plan"; smart exit detection | 75 |

## Code quality observations (qualitative review of source)

Read the actual source for the top variants:

| Extension | Code quality observations |
|-----------|---------------------------|
| **pi-autoresearch** | Well-tested (CI/CD via GitHub Actions, npm OIDC trusted publishing, 14 contributors, 16+ releases, comprehensive CHANGELOG). Uses TypeBox for schemas, splits responsibilities into extension/skill cleanly. Compaction-aware (v1.2+). Dashboard config supports user shortcut overrides. Production-grade. |
| **mitsuhiko/agent-stuff `loop.ts`** | Concise (~250 LOC), uses TypeBox, structured for clarity. Clean state-machine model. Hooks into `session_before_compact` to preserve loop intent across compaction (the only extension I found that does this correctly). Uses Haiku for the status-widget condition summary. Idiomatic TypeScript. Reflects Armin's general code-quality bar. |
| **@tmustier/pi-ralph-wiggum** | ~700 LOC. State persisted to `.ralph/<name>.state.json` + `.ralph/<name>.md`. Survives reload via `session_start` rehydration. Uses `<promise>COMPLETE</promise>` text marker. Has `migrateState()` for backwards-compat. Production-grade for the use case. |
| **pi-review-loop** | ~250 LOC main extension. Configurable patterns (trigger, exit, prompt). Smart exit detection (won't be fooled by "Fixed N issues. No further issues found."). "Fresh context" mode strips prior review iterations from context. Production-grade for the focused review use case. |
| **ralph-loop-pi** (lnilluv) | ~1300 LOC. Heavy: full RPC parent/child plumbing, signal handling, response correlation with timeout. Tasks-folder workflow. YAML frontmatter with rich validation. Goal-continuation audits per iteration. Test parity harness for iteration determinism. Most production-feature-complete; also most surface area to maintain. |
| **rahulmutt/pi-ralph** | Minimalist (~few hundred LOC). Cleanly written. `.ralph/<YYYY>/<MM>/<DD>/RALPH-*.md` progress hierarchy. Branches new session per iteration via session APIs. No subprocess. Closest to Huntley's original. Small surface area. |
| **samfoy/pi-ralph** | Medium-sized. YAML-driven preset system. Six built-in presets covering common workflows. `/plan` PDD workflow saves artifacts to `specs/<task-name>/`. Single contributor; 11 stars suggests modest adoption. |
| **mikeyobrien/pi-ralph** (PTY) | Small wrapper. Delegates real work to external `ralph` CLI. Status widget + overlay + LLM tool. If the external CLI changes, the wrapper needs updates. |
| **emanuelcasco/pi-mono-extensions/loop** | Small. Smart input parsing (leading token vs trailing "every" clause vs default). 7-day auto-expiry. Clean cleanup on session shutdown. |
| **latent-variable/pi-auto-continue** | ~50 LOC. The minimalist choice. `setTimeout(...,0)` defer trick to let agent settle into idle. User-input counter reset. Aborted-turn detection. |
| **kostyay/agent-stuff `loop.ts`** | Independent reimplementation of mitsuhiko's pattern; ~250 LOC; similar shape with `signal_loop_success`. Author has 25+ other Pi extensions, suggesting active engagement with the ecosystem. |
| **akijain2000/hermes-loop** | Ambitious: combines pi-mono + hermes-agent + Skill Factory. Self-improving (creates skills from experience), iterative context compression, persistent memory. Mostly research-grade; 1 star, 1 contributor. |

## Hook-surface usage matrix

| API | Used by |
|-----|---------|
| `pi.on("agent_end", ...)` | All in-process variants — drives next iteration |
| `pi.on("before_agent_start", ...)` | mitsuhiko, tmustier, pi-autoresearch (inject loop context into system prompt or messages) |
| `pi.on("session_start", ...)` | mitsuhiko, tmustier, pi-autoresearch (rehydrate state on reload/fork/resume) |
| `pi.on("session_before_compact", ...)` | **mitsuhiko only** (preserve loop state across `/compact` — most extensions miss this) |
| `pi.on("input", ...)` | latent-variable, pi-autoresearch (reset counters on user typing) |
| `pi.sendUserMessage(text)` | tmustier, latent-variable, rahulmutt |
| `pi.sendMessage(msg, {triggerTurn:true, deliverAs:"followUp"})` | mitsuhiko, kostyay (the recommended DACMICU primitive) |
| `pi.registerTool(...)` | All — `signal_loop_success`, `ralph_done`, `ralph_loop`, `autoloop`, `init_experiment`, etc. |
| `pi.registerCommand(...)` | All — `/ralph`, `/ralph-stop`, `/loop`, `/autoresearch`, `/review-start`, etc. |
| `pi.appendEntry(type, data)` | mitsuhiko, samfoy, pi-autoresearch (persist state in session JSONL) |
| `ctx.sessionManager.getBranch()` | tmustier (rehydrate from tool result `details` for branch correctness) |
| `ctx.signal?.aborted` on `agent_end` | latent-variable, mitsuhiko (abort detection) |
| `ctx.hasPendingMessages()` | tmustier (don't double-fire if steering already queued) |
| `spawn("pi", ["--mode", "rpc", ...])` | lnilluv (subprocess pattern) |
| RPC commands (`prompt`, `steer`, `follow_up`, `abort`, `get_state`) | lnilluv |
| `spawn` external process in PTY | mikeyobrien (both extensions) |

**Key observation**: only `mitsuhiko/agent-stuff/extensions/loop.ts` uses `session_before_compact` to preserve loop state across compaction. Every other in-process loop will eventually "forget" it's in a loop after `/compact` fires. This is the single most important refinement to copy when building a new loop extension.

## Source-path notes (corrected 2026-05-08 from a clone of each repo)

Wiki/blog citations frequently get these wrong. Verified paths:

- `mitsuhiko/agent-stuff` loop extension lives at `extensions/loop.ts` — not `pi-extensions/loop.ts`. The repo has no `pi-extensions/` directory.
- `tmustier/pi-extensions` ralph extension lives at `pi-ralph-wiggum/index.ts` — not `ralph-wiggum/index.ts`.
- `davebcn87/pi-autoresearch` extension lives at `extensions/pi-autoresearch/index.ts` (3038 LOC, plus `compaction.ts`, `jsonl.ts`, `shortcuts.ts`, `hooks.ts`).
- `lnilluv/pi-ralph-loop` ships as `ralph-loop-pi` on npm.
- The in-tree visibility-preserving subagent reference at `packages/coding-agent/examples/extensions/subagent/index.ts:265` uses `pi --mode json -p --no-session`, **not** `--mode rpc`. RPC is what `lnilluv/pi-ralph-loop` uses for its steerable variant. See [architecture/subprocess-rpc-rendering](../architecture/subprocess-rpc-rendering.md) for the distinction.

## Recommendation matrix

| Goal | Best extension | Why |
|------|---------------|-----|
| **Deterministic improvement loops with metrics** (test speed, bundle size, LLM training) | **pi-autoresearch** | 6.4k ⭐, 14 contributors, production-grade, compaction-aware, confidence scoring, dashboard. Standard for this niche. |
| **DACMICU-style port** (single context, visible iterations, compaction-safe) | Build on **mitsuhiko/agent-stuff `loop.ts`** | The canonical pattern. Compaction-safe via `session_before_compact`. 2.3k ⭐ on the parent repo (high credibility). See [dacmicu/implementation-plan](../dacmicu/implementation-plan.md). |
| **Closest to Huntley's Ralph** (fresh context every iteration, prompt file based) | **rahulmutt/pi-ralph** | Branches new session per iter; clean cold start; minimal LOC; closest to bash `while :; do cat PROMPT.md \| pi -p; done` semantics |
| **Production autonomous campaigns** (guardrails, presets, completion gating, pause/resume, RALPH.md) | **lnilluv/pi-ralph-loop** (`ralph-loop-pi`) | Most complete: RALPH.md frontmatter, completion_gate, required_outputs, block_commands, protected_files, signal-based pause/resume, RPC subprocess architecture |
| **Just want autocontinue overnight** | **latent-variable/pi-auto-continue** | 50 LOC, hard cap of 100, abort-aware. Simplest possible thing. |
| **TODO/PRD/feature-list driven loops with reflection** | **@tmustier/pi-ralph-wiggum** | LLM-driven via `ralph_done` tool; reflection cadence; multiple parallel loops in one repo; 927/wk downloads (highest among Ralph-named extensions) |
| **Multi-role workflow** (Planner→Builder→Reviewer, TDD pipelines) | **samfoy/pi-ralph** | Hat-based with built-in presets (TDD, spec-driven, debug, refactor) |
| **External Ralph CLI integration** | **mikeyobrien/pi-ralph** (for `ralph` CLI) or **mikeyobrien/pi-autoloop** (for `autoloop`) | If you already use these external runtimes, Pi becomes a launcher/inspector |
| **Cron-style scheduled prompts** | **emanuelcasco/pi-mono-extensions/loop** | Closest to Claude Code's `/loop` semantics |
| **Code-review-only loop** | **nicobailon/pi-review-loop** | Specialized for review-until-clean; smart exit detection; auto-trigger on phrases |
| **Self-improving (creates skills from experience)** | **akijain2000/hermes-loop** | Research-grade; combines hermes-agent's learning loop with pi-mono. 1 ⭐ but interesting design. |

## Validation: ecosystem confirms the DACMICU port architecture

The fact that **at least 6 different authors** (mitsuhiko, kostyay, tmustier, lnilluv, samfoy, emanuelcasco) **independently** converged on essentially the same in-session pattern (`pi.on("agent_end", ...)` → `pi.sendMessage({triggerTurn:true})`, with optional LLM-tool breakout) is strong validation that this is the right architecture for Pi.

The hook surface (`agent_end`, `before_agent_start`, `session_before_compact`, `session_start`, `sendMessage(triggerTurn:true)`, `registerTool`, `appendEntry`) **already exists in pi-mono** — no fork needed, no core PR needed. See [dacmicu/implementation-plan](../dacmicu/implementation-plan.md) for the recommended build.

Note that none of these extensions implement the **literal** "LLM emits a script that drives the loop" property of opencode's DACMICU PR #20074. They all delegate loop *control* to the extension while letting the LLM commit to a loop *spec* (via tool args or YAML frontmatter). This is the practical equivalent — see [architecture/subprocess-rpc-rendering](../architecture/subprocess-rpc-rendering.md) for why bash + `pi --print` (the literal version) doesn't work due to invisibility.

## What this means for DACMICU

For a faithful DACMICU port that preserves the **visibility property** (user sees nested tool calls), two paths from the survey:

1. **In-session** (Variants A/B): same context window, native rendering, compaction-safe **only when copying mitsuhiko's `session_before_compact` pattern**. **Recommended for DACMICU.** See [dacmicu/implementation-plan](../dacmicu/implementation-plan.md).
2. **Subprocess + RPC + custom rendering** (Variant C): each iteration in a fresh process; visibility preserved by re-rendering RPC events. Heavier; sacrifices the single-context-window guarantee. See [architecture/subprocess-rpc-rendering](../architecture/subprocess-rpc-rendering.md).

Variant D (branched sessions, rahulmutt-style) is the closest to Huntley's "literal `while` loop" semantics but loses the single-context property. Variant E (PTY-embedded external runtimes) is out-of-scope for a Pi-native port. Variants F (hat-based) and G (cron) solve different problems.

## Cross-references

### pi-mono wiki
- [dacmicu/concept](../dacmicu/concept.md) — what DACMICU is
- [dacmicu/pi-port](../dacmicu/pi-port.md) — port architecture validated by these extensions
- [dacmicu/implementation-plan](../dacmicu/implementation-plan.md) — concrete `pi-dacmicu` build plan
- [architecture/subprocess-rpc-rendering](../architecture/subprocess-rpc-rendering.md) — how Variant C achieves visibility
- [architecture/steering-vs-followup](../architecture/steering-vs-followup.md) — why `triggerTurn:true` + `deliverAs:"followUp"` is the correct primitive
- [architecture/loop-internals](../architecture/loop-internals.md) — why these hooks exist where they do
- [comparisons/loop-architectures](../comparisons/loop-architectures.md) — pi-mono vs opencode2 vs Claude Code at the runtime level
- [ecosystem/claude-code-loop](claude-code-loop.md) — Claude Code's `/loop` (cron-scheduled, complementary)
- [ecosystem/todo-visualizations](todo-visualizations.md) — TODO state machines that compose with these loops
- [ecosystem/subagents](subagents.md) — broader subagent landscape
- [implementations/pi-evolve-extension](../implementations/pi-evolve-extension.md) — `@pi-dacmicu/evolve` design (Variant B, locked 2026-05-13): subagent-per-iteration, single `evolve.md` SOT with driver-side termination predicates, zero tools, gate-failure amnesia intentional, ~80–100 LOC TS + ~60 lines subagent prompt. Implementation gated by 3 preflight probes. Supersedes the 510 LOC Variant A draft.
- [implementations/pi-callback-extension](../implementations/pi-callback-extension.md) — Proposed Unix-socket callback for bash orchestration

### MetaHarness wiki (research)
- [MATS](../../../../MetaHarness/llm-wiki/proposals/mats.md) — research proposal these extensions implement
- [Deterministic Agent Loops](../../../../MetaHarness/llm-wiki/concepts/deterministic-agent-loops.md) — Pi hooks in the broader landscape
