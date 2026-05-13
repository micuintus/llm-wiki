---
title: DACMICU — spirit vs opencode implementation
type: synthesis
updated: 2026-05-10
sources:
  - "README.md"
  - "../architecture/pi-print-rpc-vs-oc-check.md"
  - "../architecture/subprocess-rpc-rendering.md"
  - "../implementations/pi-callback-extension.md"
  - "../implementations/pi-evolve-extension.md"
  - "../concepts/deterministic-agent-control-mechanisms.md"
  - "../raw-sources/conversations/2026-05-07-pi-session-dacmicu-umbrella-fabric-rpc-callback.md"
  - https://github.com/anomalyco/opencode/pull/20074
tags: [dacmicu, synthesis, comparison, ralph, spirit]
see_also:
  - "README.md"
  - "log.md"
  - "../implementations/pi-callback-extension.md"
  - "../implementations/pi-evolve-extension.md"
  - "../architecture/pi-print-rpc-vs-oc-check.md"
  - "../concepts/deterministic-agent-control-mechanisms.md"
---

# DACMICU — spirit vs opencode implementation

Synthesis page: separates the **load-bearing ideas** of opencode PR #20074
from its bash-callback substrate, then maps the local pi-mono DACMICU stack
against each idea. Companion to [README](README.md) (what DACMICU is and
how it's built).

We are interested in the **spirit** of these mechanisms, not the specific
opencode implementation.

## TL;DR

The opencode bash-callback substrate is one valid realization of DACMICU's
spirit, not the spirit itself. Pi's event-driven runtime gives us a
*different* substrate that matches the spirit on most axes — and is
strictly stronger on visibility, persistence, and single-context guarantee
— but currently falls short on two axes: **uniformity of primitive** (we
are fragmenting into per-use-case tools) and **mid-step recursive
judgment** (our loop commits then yields; opencode lets judgment happen
synchronously inside a deterministic step). The latter is the real gap and
is closed by the [pi-callback extension](../implementations/pi-callback-extension.md).

FABRIC composition is an *independent* capability, not a DACMICU
prerequisite (see [README § two architectural variants](README.md)).

## DACMICU as umbrella

DACMICU is intended as the umbrella primitive that unifies four downstream
concerns:

1. **Ralph Loop** — both subagent and in-agent loops, dispatched per task.
2. **FABRIC-style composition** — agent as a stage in a Unix pipeline.
3. **TODO system base** — structured TODO list as the loop's natural state
   machine.
4. **`micu pi evolve` foundation** — code-evolution loop on git branches;
   design revised 2026-05-13 to Variant B (subagent-per-iteration, single
   `evolve.md` SOT with driver-side termination predicates, zero tools,
   ~80–100 LOC target). Earlier `examples/extensions/pi-evolve.ts` draft
   (~510 LOC, Variant A) superseded.
   See [pi-evolve-extension](../implementations/pi-evolve-extension.md).

The four are not separate features; they are specializations of one loop
primitive with different termination predicates and execution modes.

## The four load-bearing properties of opencode DACMICU

Stripped of `oc`-CLI specifics, PR #20074 stands on:

| # | Property | What it means |
|---|----------|---------------|
| 1 | Judgment ↔ control-flow split | LLMs handle reasoning; a deterministic substrate handles loops, conditionals, iteration. |
| 2 | LLM commits via inspectable structure | Control flow becomes an artifact (script, predicate, pipeline) rather than a re-prompt. |
| 3 | One uniform primitive | Manus / Split / Ralph / Fabric all served by the same callback mechanism. |
| 4 | Recursive self-reach | Agent can synchronously poll itself for judgment from inside a deterministic step, without surrendering its turn. |

The `oc` CLI, the HTTP server, the bash substrate are *one valid
implementation* of these properties — not the properties themselves.

## Mapping the local stack against each property

| Property | opencode realization | Local pi-mono realization | Spirit match |
|----------|----------------------|---------------------------|:------------:|
| (1) Judgment ↔ control-flow split | LLM writes bash; bash drives | LLM calls `dacmicu_loop({condition, prompt, max})`; extension drives `agent_end` → `triggerTurn` | **Yes** — different substrate, same separation |
| (2) LLM commits via inspectable structure | Bash script the user can read | Structured tool call + `selection.md` ledger (in pi-evolve) + session JSONL | **Yes** — arguably stronger; structure is typed and persisted, not stringly shell |
| (3) One uniform primitive | One `oc` CLI, four pillars | Several specialized tools (`dacmicu_loop`, `todo`, evolve tools, planned subagent driver) | **Weaker** — fragmenting into tools instead of generalizing |
| (4) Recursive self-reach | `oc check "…?"` synchronously asks the same agent for a verdict mid-bash | Not yet. `dacmicu_loop` commits then yields; LLM cannot synchronously consult itself from inside a deterministic step | **Missing — closed by [pi-callback](../implementations/pi-callback-extension.md)** |
| Visibility of inner work | Inline bash output (sometimes collapses inner tool calls) | Inline native rendering of every tool call, thinking block, message | **Stronger** in our case |
| Composability with non-agent contexts | Full — `cat | oc agent | … | make …` | None today (no `pi` CLI) — the FABRIC gap, M20 in our taxonomy | **Missing** — independent track |

## Where each version wins on spirit

### Local pi-mono wins on

- **Judgment-control split executed cleanly.** Events + structured tool
  calls are a less leaky abstraction than shelling out. State branches
  with the session tree; compaction stays honest.
- **Visibility.** Every inner call renders natively in the same TUI, no
  RPC re-rendering, no log scraping.
- **Single-context guarantee.** Structurally enforced by running
  iterations in the same session. opencode's bash form sometimes spawns
  child sessions and loses this.
- **Persistence and forkability.** `selection.md` + git branches +
  session JSONL give a richer audit trail than shell history.

### Opencode DACMICU wins on

- **Uniformity.** One mechanism (callback CLI) covers Manus, Split,
  Ralph, Fabric. We are heading toward N specialized tools. That is a
  real loss of conceptual economy.
- **Recursive self-reach mid-step.** The LLM-as-pseudo-user pattern
  (`oc check` from inside a bash conditional) is fundamentally different
  from "LLM commits to a loop and re-enters on each iteration." Ours
  requires the agent to *finish its turn* before judgment runs again.
  Theirs lets judgment be synchronous inside a deterministic step.
  Matters for: per-line code review, validate-then-write, conditional
  tool dispatch.
- **Pedagogical transparency.** The LLM literally writes a shell script
  you can read, copy, paste, modify, version-control. Our typed tool
  call is more robust but less inspectable as a human artifact.
- **External composability.** FABRIC and Manus depend on `pi` being
  callable from anywhere (Makefile, CI, cron, ad-hoc shell). We have no
  answer here.

## The honest gap: mid-step recursive judgment

Our DACMICU model is:

```
LLM commits → step → LLM resumes → step → …
```

opencode's is:

```
LLM commits → bash runs →
  ├── deterministic action
  ├── synchronous self-poll: "is this correct?" ← LLM answers without owning the turn
  └── deterministic action
→ LLM resumes
```

The second shape is strictly more expressive. To reach it in spirit (not
implementation):

- A `pi.askAgent(prompt) → verdict` synchronous primitive callable from
  inside extension code (cheap inference, possibly different/smaller
  model), **or**
- The Unix-socket callback path so that the LLM-emitted *body* — whatever
  runs between `dacmicu_loop` boundaries — can call back into the agent
  for judgment.

The second is what
[pi-callback](../implementations/pi-callback-extension.md) implements.
The first remains an open option for cases where bash is the wrong
substrate (e.g. hot-path inside an extension).

## The honest non-gap: FABRIC is not a prerequisite

The bash + `pi` CLI + Unix socket infrastructure is **not required** to
honor the DACMICU spirit. It is required to honor the FABRIC spirit,
which is a separate idea. Pi's event model gives us Ralph and
Deterministic-Split natively, in a way that is arguably *more* aligned
with the "judgment vs control-flow split" thesis than opencode's bash
form. Stop framing the missing CLI as a DACMICU prerequisite — it is a
FABRIC prerequisite.

See [README § two architectural variants](README.md) for the current framing.

## What to take forward

1. **Share the mechanism via a library, not a single tool.** The earlier
   plan to subsume todo, evolve tools, and `signal_loop_success` under one
   `dacmicu_loop` tool with mode dispatch is dropped. Each consumer
   registers its own LLM-facing tools; they all share one in-process
   runtime via `@pi-dacmicu/base`'s exported `attachLoopDriver()` helper.
   This recovers opencode's uniformity at the implementation layer
   without forcing all consumers through one over-parameterized tool. See
   [README § build status](README.md).
2. **Mid-step recursive judgment gap.** opencode's `oc check` primitive is
   not yet matched in Pi. A [pi-callback](../implementations/pi-callback-extension.md)
   socket path was explored but is **deferred** — not in the current tree.
   The gap remains open for now; the TODO loop works around it by
   reassessing in the prompt text rather than via an external check.
3. **Document the divergence honestly.** Our DACMICU is opencode-DACMICU's
   *event-substrate cousin*, not a port. Stronger on visibility,
   persistence, single-context; weaker on uniformity (recovered via the
   shared library, not via one tool) and mid-step recursive judgment
   (still open).

## See also

- [README](README.md) — single-page living docs for the current DACMICU design
- [log](log.md) — chronological design-decision history
- [pi-callback-extension](../implementations/pi-callback-extension.md) —
  closes the recursive self-reach gap
- [pi-evolve-extension](../implementations/pi-evolve-extension.md) —
  current MATS-style consumer; should collapse onto `@pi-dacmicu/evolve` once
  built
- [pi-print-rpc-vs-oc-check](../architecture/pi-print-rpc-vs-oc-check.md)
  — substrate comparison
- [deterministic-agent-control-mechanisms](../concepts/deterministic-agent-control-mechanisms.md)
  — full mechanism taxonomy; see M20 (FABRIC) and the four pillars
