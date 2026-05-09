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

## Bugs
- [Extension load error: TypeBox/Zod schema](bugs/typebox-zod-schema-error.md) — `inputSchema must be a Zod schema` blocks pi-web-access on Pi 0.67.2. *Updated: 2026-05-05*

## Comparisons
- [Loop Architectures Compared](comparisons/loop-architectures.md) — pi-mono vs opencode2 vs Claude Code. *Updated: 2026-05-01*

## Config
- [Thinking Display](config/thinking-display.md) — How thinking blocks render across providers. *Updated: 2026-04-29*

## DACMICU
- [DACMICU Concept](dacmicu/concept.md) — Umbrella primitive (Ralph + FABRIC + TODO + evolve, plus base + subagent infra); FABRIC-not-prereq correction. *Updated: 2026-05-08*
- [DACMICU Modular Architecture](dacmicu/modular-architecture.md) — [Decision] Six-package monorepo, dep DAG, Pi-package module-isolation constraint, three delivery strategies, verified primitives table. *Updated: 2026-05-08*
- [DACMICU Pi Port](dacmicu/pi-port.md) — In-session driver as THE port; bash + `pi --print` is anti-pattern; subprocess + RPC for true subagents. *Updated: 2026-05-08*
- [DACMICU Implementation Plan](dacmicu/implementation-plan.md) — Build sequence against the modular architecture; 6 packages, ~1700 LOC total. *Updated: 2026-05-08*
- [DACMICU Research 2026-05-08 — Subagent reuse, TODO base, Variant A](dacmicu/research-2026-05-08-subagent-and-todo.md) — [Decision] **Per-consumer provider selection**: ralph→Hopsken (in-process modal), evolve→**HazAT** (multiplexer panes — better than opencode for parallel inspection); peer-depend on `tintinweb/pi-manage-todo-list`; Variant A skeleton (~150 LOC). Total custom code ~500 LOC. *Updated: 2026-05-08 evening*
- [DACMICU Spirit vs Opencode](dacmicu/spirit-vs-opencode.md) — [Synthesis] Load-bearing properties of opencode PR #20074 mapped against the local stack; uniformity recovered via shared library; mid-step recursive judgment closed by fabric. *Updated: 2026-05-08*

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
- [Subagents](ecosystem/subagents.md) — **Comprehensive 12+-extension survey across four architectural patterns** (subprocess+JSON, subprocess+RPC, in-process via `createAgentSession`, **multiplexer-pane-per-subagent**); HazAT/pi-interactive-subagents is the only opencode-Cmd+↓-equivalent UX in Pi (and beats opencode for parallel inspection); ConversationViewer truncates at 500 chars. *Updated: 2026-05-08 evening*
- [Todo List Extensions](ecosystem/todo-visualizations.md) — Survey + the four-layer widget stack (renderResult / setWidget-factory / registerMessageRenderer / ui.custom). Closes the Claude-Code-TodoWrite polish gap. *Updated: 2026-05-08*
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
- [pi-evolve Extension](implementations/pi-evolve-extension.md) — Canonical in-tree reference for the in-session DACMICU driver pattern (510 LOC). To be repackaged as `@pi-dacmicu/evolve`. *Updated: 2026-05-08*
- [pi-callback Extension](implementations/pi-callback-extension.md) — Design for `@pi-dacmicu/fabric`: lightweight bash callback via Unix socket (~200 LOC). Closes the mid-step recursive judgment gap; serves shell composition. Independent of the loop primitive. *Updated: 2026-05-08*

## Raw Sources
- [Session Registry](raw-sources/index.md)

## Cross-wiki links
- [MetaHarness wiki](../../../MetaHarness/llm-wiki/index.md) — Research: MATS proposal, evolutionary agent coding systems, selection policies, deterministic agent loops
