---
title: Research 2026-05-08 evening 2 — KISS simplification, idiomatic APIs, repo health, Hopsken=tintinweb correction
type: research
updated: 2026-05-08
sources:
  - https://github.com/tintinweb/pi-subagents
  - https://github.com/Hopsken/pi-subagents
  - https://github.com/HazAT/pi-interactive-subagents
  - https://github.com/tintinweb/pi-manage-todo-list
  - https://github.com/popododo0720/pi-stuff
  - https://www.mintlify.com/VineeTagarwaL-code/claude-code/reference/tools/agent
  - https://gist.github.com/johnlindquist/d22c70fd70660b4f6fb4d0b05d0792d2
tags: [dacmicu, simplification, idiomatic-api, repo-health, kiss, correction]
see_also:
  - "research-2026-05-08-subagent-and-todo.md"
  - "concept.md"
  - "../ecosystem/subagents.md"
  - "../ecosystem/todo-visualizations.md"
---

# Research 2026-05-08 evening 2 — KISS simplification

Follow-up to the morning's deep cascade and the first evening's HazAT discovery. User pushed back on growing complexity (multi-mode `delegate()` API, two soft-deps for subagents) and asked four sharp questions. This doc captures the corrections, the simplification, and the final v1 shape.

## Critical correction — Hopsken IS tintinweb

The earlier wiki framing of `Hopsken/pi-subagents` (5,159 LOC) and `tintinweb/pi-subagents` (6,082 LOC, "superset with scheduling") as two distinct packages was **wrong**.

The Hopsken repo's `package.json` says `"name": "@tintinweb/pi-subagents"` and lists tintinweb as the author and repo URL. Hopsken is a **private mirror/snapshot** of the tintinweb upstream, not a sibling implementation.

The earlier "5159 vs 6082, superset" comparison was likely two different versions of the same package surveyed at different times.

**Canonical reference is `tintinweb/pi-subagents`** going forward. All mentions of Hopsken in earlier wiki pages should be read as tintinweb.

## Project health snapshot (gathered 2026-05-08)

| Repo | Stars | Forks | Open issues | Releases | Contributors | Last push | Verdict |
|---|---|---|---|---|---|---|---|
| `nicobailon/pi-subagents` | 1,289 | 181 | 31 | 71 | 20 | 2026-05-03 | Most popular, very active, kitchen-sink |
| **`HazAT/pi-interactive-subagents`** | **394** | 69 | **6** | **22** | **10** | 2026-04-20 | **Healthy, focused, well-maintained** |
| **`tintinweb/pi-subagents`** | 271 | 61 | 17 | 27 | 8 | 2026-05-07 | Healthy, mature, recent |
| `tintinweb/pi-manage-todo-list` | 16 | 4 | 1 | — | small | active | Small but focused, single-author |
| `popododo0720/pi-stuff` | **15** | **0** | **0** | — | **1** | **2026-03-03** | **Single-dev, stale (2 months)**, niche |

popododo's workflow-extension is ruled out as a dependency on health alone.

## Idiomatic LLM-known APIs — strongest reuse argument

LLMs are trained on Claude Code's `Task` tool and `TodoWrite`/`manage_todo_list`. Using those exact shapes costs **zero prompt tokens** to teach the model — it already knows them.

### Subagent: Claude Code `Task` shape

```
Task({
  description: string,    // 3-5 word display label
  prompt: string,         // full task description (subagent has no memory of parent)
  subagent_type: string   // e.g. "Explore", "general-purpose"
})
```

**`tintinweb/pi-subagents` README explicitly states**: "Claude Code look & feel — same tool names, calling conventions, and UI patterns (`Agent`, `get_subagent_result`, `steer_subagent`) — feels native".

### TODO: Copilot `manage_todo_list` (≈ Claude Code `TodoWrite`)

```
manage_todo_list({ operation: "read"|"write", todoList: [...] })
```

**`tintinweb/pi-manage-todo-list` mirrors this exact Copilot shape.** Also LLM-training-known.

### Implication

DACMICU should **not invent its own subagent or TODO tool**. The LLM-facing surface is already provided idiomatically by tintinweb's two packages. DACMICU's responsibility shrinks to:

- Loop primitive (internal, not LLM-facing)
- `signal_loop_success` tool (DACMICU-specific, no idiomatic equivalent)
- Deterministic outer loop on top of `manage_todo_list` state
- FABRIC prompts and helpers

This eliminates the `delegate({ task, mode, ... })` design from earlier — there is no DACMICU-owned subagent tool. The LLM uses tintinweb's `Task` tool directly.

## Q1 — inline + tintinweb only, OR inline + HazAT only?

### Reframing the "context cap" myth

There is no Hopsken/tintinweb-specific *context-window* cap. What hurts evolve is the **500-character truncation in the modal viewer's display of tool results and bash output** (`conversation-viewer.ts:175,191`). That is a *visibility* limit on the in-session inspection UI, not a context-window limit. The subagent's actual model context is full Pi.

So when the user said "context cap was the main reason" — yes, that visibility cap is the only thing that meaningfully hurts evolve. Subagent tasks are not constrained.

### Option A: inline + tintinweb only

| Pros | Cons |
|---|---|
| Works in any terminal, no multiplexer dependency | Evolve users hit 500-char truncation when comparing candidates |
| One soft-dep to manage | No parallel side-by-side; Esc, reopen, scroll on each candidate |
| Lowest friction install | Less differentiated UX |
| ~80 LOC RPC client | |
| Idiomatic API match (Claude Code `Task` tool) | |

### Option B: inline + HazAT only

| Pros | Cons |
|---|---|
| Full transcript inspectability | **Hard dependency on cmux/tmux/zellij/wezterm — hostile to casual users** |
| True parallel inspection (mux split) | Extra setup before first ralph loop runs |
| Slightly better project health (394 vs 271 stars, 6 vs 17 open issues) | Pane lifecycle is the user's problem |
| Async non-blocking by default | ~150 LOC integration shim, no RPC contract documented |
| Each subagent is a real interactive Pi session | Ralph users forced into multiplexer for default workflow |

### Decision: Option A (inline + tintinweb in v1, defer HazAT)

KISS argues for Option A in v1. Reasons:

1. **Casual ralph users get a working setup with no multiplexer.** Most users don't live in cmux/tmux. Forcing it is the opposite of KISS.
2. **Evolve doesn't ship in v1 anyway** (per implementation plan — base + todo + ralph first, evolve later). The truncation problem only bites when evolve lands.
3. **By v1.x when evolve is real**, we have data on whether parallel candidate inspection is needed often or rarely. If JSONL transcript writing is enough, we never bother with HazAT.
4. **tintinweb is the better idiomatic-API match** for the v1 contract — already uses Claude Code tool names that the LLM knows from training.

**Verdict**: drop the multi-mode `delegate()` schema. Drop pane-mode-declared-but-NotImplemented. v1 ships inline + tintinweb only. HazAT is a v1.x decision driven by real evolve usage data.

## Q2 — Should DACMICU build a TODO system at all?

### Re-examined honestly

popododo's `workflow-extension` implements a deterministic outer loop, but:

- It's a **complete, opinionated workflow** (Plan→Verify→Implement→Verify→Compound→Done with mandatory git/worktree gates), not a primitive
- It's **single-dev with 15 stars, stale 2 months**
- It's tightly coupled to its 6-stage philosophy
- Includes a TODO subsystem (`set_todos`, `transition.ts`, `compound-done.ts`) but only as part of the larger workflow

**It's not what we're building.** DACMICU's deterministic loop is *more general*: outer loop reads any TODO list, validates each unchecked item, syncs state, works it. No mandatory plan/verify/compound stages. It's a primitive other workflows compose on top of.

### Decision

TODO **stays in DACMICU as a thin overlay** (~150 LOC) on top of `tintinweb/pi-manage-todo-list`. We don't depend on popododo. The popododo extension is **proof-of-pattern** (state-machine-with-transition-guards works in Pi) but not a dependency.

The narrowness of `@pi-dacmicu/todo` (~150 LOC) is the right size: deterministic outer loop + reassessment step + snapshot renderer, all DACMICU-specific. The state primitive (and its idiomatic Copilot-shape tool) is reused.

## Q3 — Idiomatic agent APIs, training-known shapes

Confirmed both layers have an idiomatic shape LLMs already know:

| Layer | Idiomatic shape (training-known) | Pi package matching it |
|---|---|---|
| Subagent | Claude Code `Task({ description, prompt, subagent_type })` + `get_subagent_result` + `steer_subagent` | **`tintinweb/pi-subagents`** uses these exact tool names |
| TODO | Copilot `manage_todo_list({ operation, todoList })` ≈ Claude Code `TodoWrite({ todos })` | **`tintinweb/pi-manage-todo-list`** mirrors Copilot shape |
| Loop driver | (no idiomatic name; this is custom) | DACMICU owns it |
| FABRIC | bash + `pi --print` (composition primitive, no LLM-tool needed) | DACMICU owns prompts/helpers |

**Strongest reuse argument we have.** Inventing our own shapes burns prompt tokens explaining non-standard APIs. Reusing tintinweb's two packages gives us the LLM-native shape on both axes for free.

## Final v1 architecture (KISS-simplified)

```
@pi-dacmicu/base    (~200 LOC, no soft-deps)
  attachLoopDriver()           — internal, called by todo/ralph
  signal_loop_success tool     — LLM-facing (no idiomatic equivalent)
  session_before_compact hook  — survives /compact

@pi-dacmicu/todo    (~150 LOC, soft-dep on tintinweb/pi-manage-todo-list)
  loop-driver.ts               — outer loop reading manage_todo_list state
  reassessment-step.ts         — re-validate before working next item
  snapshot-renderer.ts         — Layer-3 visualization

@pi-dacmicu/ralph   (~200 LOC, soft-dep on tintinweb/pi-subagents)
  ralph-driver.ts              — RALPH.md drafting + iteration loop
  config: mode="inline"|"subagent"
  fallback: degrades to inline if tintinweb absent
  LLM-facing subagent surface = tintinweb's `Task` tool (no DACMICU subagent tool)

@pi-dacmicu/evolve  (~600 LOC, soft-dep on tintinweb/pi-subagents)
  candidate-orchestration.ts
  jsonl-transcript-writer.ts   — full text inspection workaround for 500-char trunc
  scoring.ts
  v1.x: optional HazAT integration evaluated based on real usage

@pi-dacmicu/fabric  (~250 LOC, independent)
  prompts + helpers for bash empowerment

@pi-dacmicu/all     (meta-package, ~10 LOC)
```

### Custom code budget

| | LOC |
|---|---|
| Total owned (DACMICU monorepo) | **~1,400** |
| LLM-facing tools owned | **just `signal_loop_success`** |
| Soft-deps reused | tintinweb/pi-subagents (~6,082) + tintinweb/pi-manage-todo-list (~506) = ~6,588 LOC |
| Leverage ratio | ~4.7× |

### What changed from earlier evening 1 plan

| Earlier (evening 1) | Now (evening 2) |
|---|---|
| Per-consumer providers: ralph→tintinweb, evolve→HazAT | v1: tintinweb only. HazAT deferred to v1.x. |
| `delegate({ task, mode })` tool with three modes | No DACMICU subagent tool. LLM uses tintinweb's `Task`. |
| ~1,460 LOC owned across packages | ~1,400 LOC owned across packages |
| Two production soft-deps from day 1 | One production soft-dep from day 1 (subagent provider) |
| `pane` mode in schema (NotImplementedYet) | No `pane` mode in schema. Pure additive change in v1.x. |

## Open questions

- Whether tintinweb's `pi.events`-based RPC contract is documented as semver-stable. If yes, depend on a major version range. If no, version-pin and watch for breakage.
- Confirm tintinweb's `Task`-tool description is good enough out-of-the-box, or whether ralph needs to system-reminder-inject additional task-shaping guidance.
- Whether `manage_todo_list` survives `/fork` and `/compact` correctly (state-manager rebuilds from session entries, so should — but verify with a test before relying for long deterministic loops).
- v1.x trigger: how many real evolve users hit the 500-char truncation enough that HazAT integration pays for itself. No way to know without shipping v1.

## Cross-references

- [research-2026-05-08-subagent-and-todo](research-2026-05-08-subagent-and-todo.md) — earlier deep cascade (Q1-Q5)
- [ecosystem/subagents](../ecosystem/subagents.md) — full 12+-extension survey
- [ecosystem/todo-visualizations](../ecosystem/todo-visualizations.md) — TODO ecosystem
- [concept](../concept.md) — top-level DACMICU framing
- [modular-architecture](../modular-architecture.md) — package layout
