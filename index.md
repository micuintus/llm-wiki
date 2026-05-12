# Wiki Index

Catalog of compiled pages for the pi-mono project.

## Architecture
- [Agent Loop, Modes & Architecture](architecture/agent-loop.md) — High-level architecture: turns vs loops, `packages/ai`, modes. *Updated: 2026-05-06*
- [Pi --print vs --mode rpc vs opencode `oc check`](architecture/pi-print-rpc-vs-oc-check.md) — Headless deterministic control: single-shot, JSON-RPC, and bash callback compared. *Updated: 2026-05-07*
- [Loop Internals](architecture/loop-internals.md) — Line-precise walkthrough from `pi <prompt>` to inner-most while-loop. *Updated: 2026-05-06*
- [Turn and Loop Nomenclature](architecture/turn-and-loop-nomenclature.md) — Reconciling Karpathy "turn" vs Pi "turn". *Updated: 2026-04-29*
- [Component Interaction — Keystroke to Agent Loop and Back](architecture/component-flow.md) — Package boundary diagram and component responsibilities. *Updated: 2026-05-06*
- [Subprocess + RPC + Custom Rendering](architecture/subprocess-rpc-rendering.md) — How `pi --mode rpc` + custom render preserves visibility for nested loops/subagents. *Updated: 2026-05-06*
- [Steering vs Follow-up](architecture/steering-vs-followup.md) — Practical semantics: when each is polled, default keybindings, worked example. *Updated: 2026-05-06*
- [Pi Session Architecture](architecture/pi-session-architecture.md) — Append-only log, `getBranch()` vs `buildSessionContext()`, cross-extension state sharing, compaction behavior. The Pi-side primitive most extensions need to understand. *Updated: 2026-05-12*

## Bugs
- [Extension load error: TypeBox/Zod schema](bugs/typebox-zod-schema-error.md) — `inputSchema must be a Zod schema` blocks pi-web-access on Pi 0.67.2. *Updated: 2026-05-05*

## Comparisons
- [Loop Architectures Compared](comparisons/loop-architectures.md) — pi-mono vs opencode2 vs Claude Code. *Updated: 2026-05-01*

## Config
- [Thinking Display](config/thinking-display.md) — How thinking blocks render across providers. *Updated: 2026-04-29*

## DACMICU

**Start here**: [DACMICU Concept](dacmicu/concept.md) — what it is, two loop variants, umbrella framing. Then [Implementation Plan](dacmicu/implementation-plan.md) for build sequence.

### Canonical docs
- [Concept](dacmicu/concept.md) — Umbrella primitive: Ralph + FABRIC + TODO + evolve, loop variants, subagent reuse decision. *Updated: 2026-05-10*
- [Implementation Plan](dacmicu/implementation-plan.md) — Build sequence: 5 packages, dependency order, reference implementations, open issues. *Updated: 2026-05-10*
- [Modular Architecture](dacmicu/modular-architecture.md) — Package layout, dep DAG, module-isolation constraint, delivery strategies, verified primitives. *Updated: 2026-05-10*
- [Pi Port](dacmicu/pi-port.md) — In-session driver as THE port; why bash + `pi --print` is anti-pattern; subprocess + RPC for subagents. *Updated: 2026-05-10*
- [Spirit vs Opencode](dacmicu/spirit-vs-opencode.md) — Load-bearing ideas from opencode PR #20074 mapped to Pi; gaps and wins. *Updated: 2026-05-10*
- [Runtime Walkthrough](dacmicu/runtime-walkthrough.md) — Turn-by-turn detail of how tintinweb, `@pi-dacmicu/todo`, and `@pi-dacmicu/base` interact; single-method `LoopDriver` API; exit paths; compaction behavior. *Updated: 2026-05-12*

### Archive — research history
Full decision trail, verification passes, corrections, scale-down explorations, critical reviews:
- **[Session-as-SOT Audit (2026-05-12)](dacmicu/archive/research-2026-05-12-session-as-sot.md)** — Deep audit triggered by pushback on session-scanning. Concluded: append-only log + `getBranch()` is the canonical Pi cross-extension state primitive. Compaction-summary machinery was solving a non-problem. Dropped `compactionSummary` + lifecycle hooks; merged `shouldContinue`+`buildIterationPrompt` into single `iterate()`. Re-affirmed tintinweb dependency.
- **[Deep Implementation Review (2026-05-10)](dacmicu/archive/research-2026-05-10-deep-implementation-review.md)** — Primary-source verification of every load-bearing implementation claim. **2 CRITICAL findings**: pi-callback `wait:true` deadlocks by design; TODO state lost on compaction (now known to be wrong — see 2026-05-12 audit). 6 HIGH findings: nonexistent `pi.wrapTool`, `subagents:rpc:spawn` returns ID-not-result, single-driver invariant unenforced, etc.
- [Critical Plan Review (2026-05-10)](dacmicu/archive/research-2026-05-10-critical-plan-review.md) — Hostile reading of the plan structure. 11 assumptions challenged. User overrode scope reduction (evolve + fabric stay).
- [Verification Audit (2026-05-10)](dacmicu/archive/research-2026-05-10-comprehensive-verification-audit.md) — 70 claims checked, 17 false. pi-evolve provenance correction.
- [archive/](dacmicu/archive/) — All sessions (evening 2–6) and prior audits.

## Concepts
- [Deterministic Agent Control Mechanisms](concepts/deterministic-agent-control-mechanisms.md) — Taxonomy of 20 mechanisms with contender matrix (Pi, opencode, Claude Code, Aider). *Updated: 2026-05-07*
- [Pi Extension Primitive Mapping](concepts/pi-extension-primitive-mapping.md) — Bidirectional system↔hook mapping: every extension and every primitive, cross-referenced. *Updated: 2026-05-07*

## Decisions
- [Web Search Provider Strategy](decisions/web-search-provider-strategy.md) — Brave vs Exa vs both; model confusion mitigations. *Updated: 2026-05-04*

## Ecosystem
- [Evolve Systems](ecosystem/evolve-systems.md) — Full survey of evolutionary code-optimization systems as Pi extensions and in research. *Updated: 2026-05-07*
- [Claude Agent SDK Pi](ecosystem/claude-agent-sdk/overview.md) — Overview and install notes. *Updated: 2026-04-29*
- [Thinking Mode Mapping](ecosystem/claude-agent-sdk/thinking-mode-mapping.md) — How thinking levels map across models. *Updated: 2026-04-29*
- [Footer Themes](ecosystem/footer-themes.md) — Powerline footer customization. *Updated: 2026-04-29*
- [Pi Hashline Edit Tools](ecosystem/pi-hashline-edit-tools.md) — Comparative reference: pi-hashline-edit, pi-hashline-readmap, oh-my-pi. *Updated: 2026-05-05*
- [Pi Footer, Powerline & Hashline Extension Landscape](ecosystem/pi-footer-hashline-extensions.md) — Full survey of footer, powerline, and hashline extensions. *Updated: 2026-05-05*
- [Google Workspace](ecosystem/google-workspace.md) — Official `gws` CLI install, OAuth flow, IAM/API gotchas, validated end-to-end. *Updated: 2026-05-05*
- [Anthropic Subscription Auth](ecosystem/anthropic-subscription-auth.md) — Why pi `/login` lands on extra-usage, not main budget; how oh-my-pi works around it. *Updated: 2026-05-05*
- [LLM Chat Ingestion](ecosystem/llm-chat-ingestion.md) — Ingesting web LLM chats (Claude.ai, ChatGPT, Gemini, Le Chat) into the wiki via CDP-against-real-Chrome. *Updated: 2026-05-05*
- [LLM Wiki Skills](ecosystem/llm-wiki-skills.md) — Skill comparison and review. *Updated: 2026-04-29*
- [Subagents](ecosystem/subagents.md) — **Comprehensive 12+-extension survey across four architectural patterns** (subprocess+JSON, subprocess+RPC, in-process via `createAgentSession`, **multiplexer-pane-per-subagent**); HazAT/pi-interactive-subagents is the only opencode-Cmd+↓-equivalent UX in Pi (and beats opencode for parallel inspection); ConversationViewer truncates at 500 chars. **Correction (evening 2): Hopsken IS tintinweb (private mirror, same package).** Project health table added. *Updated: 2026-05-08 evening 2*
- [Todo List Extensions](ecosystem/todo-visualizations.md) — Survey + the four-layer widget stack + **edxeth/pi-tasks assessment** (strongest full task system in Pi, but NOT the DACMICU base — dependency DAG conflicts with deterministic loop). *Updated: 2026-05-10*
- [TODO Tool APIs Across Agent Systems](ecosystem/todo-tool-apis.md) — Claude Code TodoWrite vs Copilot manage_todo_list vs opencode todowrite/todoread vs tintinweb compared. tintinweb replicates Copilot verbatim. *Updated: 2026-05-11*
- [Loop Extensions](ecosystem/loop-extensions.md) — 14-project comparative survey across 7 architectural variants. Source-path corrections for mitsuhiko, tmustier, lnilluv. *Updated: 2026-05-08*
- [Claude Code /loop](ecosystem/claude-code-loop.md) — Cron-scheduled task repetition; comparison vs Pi's immediate Ralph loops. *Updated: 2026-05-06*
- [Tool Rendering](ecosystem/tool-rendering.md) — How tool calls display in the TUI. *Updated: 2026-04-29*
- [Web / Mobile Access](ecosystem/web-mobile-access.md) — Web UI and mobile options. *Updated: 2026-04-29*
- [Web Search Extensions](ecosystem/web-search-extensions.md) — Comparison of all Pi web search extensions. *Updated: 2026-05-05*
- [Web Search Providers](ecosystem/web-search-providers.md) — What major AI products use for web search. *Updated: 2026-05-04*

## Install
- [Claude Agent SDK Pi](install/claude-agent-sdk-pi.md) — Installation and troubleshooting. *Updated: 2026-04-29*

## References
- [Local Pi Setup](references/local-pi-setup.md) — Installed packages, web search config, repo-local extensions. *Updated: 2026-05-04*

## Skills
- [LLM Wiki](skills/llm-wiki.md) — LLM Wiki skill notes. *Updated: 2026-04-29*

## Implementations
- [pi-evolve Extension](implementations/pi-evolve-extension.md) — Design sketch for `@pi-dacmicu/evolve` (510 LOC draft, untracked, unverified). *Updated: 2026-05-10*
- [pi-callback Extension](implementations/pi-callback-extension.md) — Design for `@pi-dacmicu/fabric`: lightweight bash callback via Unix socket (~200 LOC). Closes the mid-step recursive judgment gap. *Updated: 2026-05-08*

## Raw Sources
- [Session Registry](raw-sources/index.md)

## Cross-wiki links
- [MetaHarness wiki](../../../MetaHarness/llm-wiki/index.md) — Research: MATS proposal, evolutionary agent coding systems, selection policies, deterministic agent loops
