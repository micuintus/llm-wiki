# @micuintus/llm-wiki

Karpathy's [LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) as a **minimal, razor-sharp skill** for Pi and other agents.

The user curates sources. The LLM does the bookkeeping — summarizing,
cross-linking, flagging contradictions. Knowledge compounds in the wiki
rather than being re-derived from raw chunks on every query.

## Design philosophy

**Minimal.** No dependencies, no JSON metadata, no enforced extensions.
Standard markdown, standard links, standard frontmatter. Convention-based
guardrails, not code-based ones.

**Razor-sharp.** Every line in `SKILL.md` serves the pattern. No bloat, no
abstractions that don't pay for themselves.

**Karpathy's gist is authoritative.** The skill implements his three-layer
architecture (raw sources → wiki → schema) and three operations (ingest,
query, lint) faithfully. Where we diverge, we diverge minimally and
document why.

**Agent session ingestion is first-class.** Pi JSONL trees (with fork
detection), Claude Code JSONL, opencode SQLite, and Gemini CLI JSON are
all supported. Session recipes are **lazy-loaded** — referenced by path
in `SKILL.md`, not inlined. They only load when you actually scan
sessions, never on general skill load.

**Web LLM chats are first-class.** The `ingest-web-chat` subskill imports
single chats from Claude.ai, ChatGPT, Gemini, and Le Chat by URL via
CDP against a real Chrome — the only reliable path past Cloudflare
Turnstile and enterprise SSO.

## Install

### Pi (npm — recommended)
```bash
pi install npm:@micuintus/llm-wiki
```

### Pi (git)
```bash
pi install https://github.com/micuintus/llm-wiki
```

### Claude Code / Codex / other agents
Copy `llm-wiki/SKILL.md` and `llm-wiki/references/` into your agent's
skills directory.

## What it's for

- **Book and paper research** — ingest chapters, papers, figures; build
  interlinked concept pages as you read
- **Agent session preservation** — Pi JSONL sessions with tree traversal
  and custom event extraction; Claude Code / opencode / Gemini CLI
  transcripts with subagent support
- **AI model development** — code, checkpoints, datasets, audio/MIDI with
  companion descriptions
- **Software porting documentation** — track architecture research, design
  decisions, and porting progress

## Structure

```
llm-wiki/
├── SKILL.md              # skill instructions (~4 KB, minimal)
├── references/
│   ├── source.template.md    # raw source copy template
│   ├── SCHEMA.template.md    # per-project schema skeleton
│   ├── quality.md            # depth rules per page type
│   ├── pi-session-recipe.md  # Pi JSONL fork detection + extraction
│   └── agent-session-recipe.md  # Claude Code, opencode, Gemini CLI
└── skills/
    └── ingest-web-chat/      # CDP-driven web chat ingestion
```

## What's in SKILL.md

- **Page types** — 7 canonical types (`concept`, `decision`, `bug`,
  `open-question`, `source`, `reference`, `synthesis`)
- **Page quality heuristics** — minimum depth per type so pages don't
  stay stubs (lazy-loaded from `references/quality.md`)
- **Query filing** — syntheses that connect ≥2 pages get offered as
  `type: synthesis` so good answers don't disappear into chat history
- **Lint rules** — deterministic fixes (broken links, orphans, type
  consistency) + heuristic reports (stale claims, thin pages, concept gaps)
- **Schema co-evolution** — triggers that prompt SCHEMA.md updates

## Session recipes (lazy-loaded)

`SKILL.md` references two recipe files by path. They are **not loaded on
general skill load** — only when you actually need to scan agent
sessions.

- **`references/pi-session-recipe.md`** — Pi JSONL tree traversal. Fork
detection (mandatory), custom event extraction (fetch failures, rate
limits, tool artifacts), branch-by-branch reading.
- **`references/agent-session-recipe.md`** — Claude Code JSONL, Gemini CLI
JSON, opencode SQLite (dual schema variants). Inventory, triage, extraction
patterns. One-line table for quick tool→location mapping.

## Related work

The Karpathy gist has spawned a diverse ecosystem. Every implementation
below shares the same three-layer foundation (raw sources → compiled
wiki → schema); they differ in **shape** (how the agent consumes the
pattern) and **weight** (how much tooling ships alongside the skill).

**What makes `@micuintus/llm-wiki` different:** it is a **pure skill**
— a single `SKILL.md` (~4 KB) plus lazy-loaded reference files that
any agent (Pi, Claude Code, Codex, Cursor) can read directly. No
runtime dependencies, no generated code, no CLI to install, no web
server to run, no Obsidian plugin to manage. Conventions are enforced
by the skill text itself, not by code. If you want the lightest
possible commitment to the pattern — copy one file, start ingesting —
this is it. Other implementations add value in exchange for weight:
IDE plugins, static-site generators, code-based guardrails, or
self-driving agents. Pick the shape that matches your workflow.

| Repo | Stars | Number of contributors | License | Language | Shape | Notes |
|------|-------|------------------------|---------|----------|-------|-------|
| [Astro-Han/karpathy-llm-wiki](https://github.com/Astro-Han/karpathy-llm-wiki) | 651 | 1 | MIT | Markdown | Skill | Agent Skills-compatible for Claude Code, Cursor, Codex. Single-file SKILL.md, no session recipes. Closest to a vanilla skill. |
| [toolboxmd/karpathy-wiki](https://github.com/toolboxmd/karpathy-wiki) | 66 | 1 | — | Shell | Skill | Two Claude Code skills: one for setup, one for maintenance. Hooks-driven. |
| [balukosuri/llm-wiki-karpathy](https://github.com/balukosuri/llm-wiki-karpathy) | 125 | 1 | — | — | Skill | Article + implementation walkthrough. |
| [lewislulu/llm-wiki-skill](https://github.com/lewislulu/llm-wiki-skill) | 447 | 2 | MIT | TypeScript | Skill + ecosystem | Skill + Obsidian audit plugin + local web viewer + shared TypeScript audit library. For users who want IDE-like tooling around the wiki. |
| [lucasastorian/llmwiki](https://github.com/lucasastorian/llmwiki) | 808 | — | Apache-2.0 | Python + TypeScript | CLI tool | Upload documents, connect Claude via MCP, agent writes the wiki. MCP-native. |
| [Pratiyush/llm-wiki](https://github.com/Pratiyush/llm-wiki) | 229 | 1 | MIT | Python | CLI tool | `llmwiki` CLI: session ingestion, static site generation, 2,651 tests, 16 lint rules, MCP server, Playwright E2E, AI exports (`llms.txt`, JSON-LD, RSS). Most feature-rich; heaviest. Stdlib-first runtime. |
| [Kausik-A/pi-llm-wiki](https://github.com/Kausik-A/pi-llm-wiki) | 9 | 1 | MIT | TypeScript | Pi-native | Pi package with bundled skill + Pi extension. Enforces guardrails via code rather than convention. [iRonin/pi-llm-wiki](https://github.com/iRonin/pi-llm-wiki) is a fork with additional changes. |
| [yologdev/karpathy-llm-wiki](https://github.com/yologdev/karpathy-llm-wiki) | 43 | 2 | — | TypeScript | Self-growing | "Yoyo" AI agent grows the wiki from Karpathy's founding prompt. Commits are the agent's work. Includes web viewer. |
| [hsuanguo/llm-wiki](https://github.com/hsuanguo/llm-wiki) | 11 | 2 | MIT | Python | Self-growing | Two-part repo: wiki that "evolves with you" + Python scaffolding. |

## Changelog

### 1.1.5

- Ingest vocabulary tightened: `register` vs `compile` vs `ingest` with
  log conventions.
- `raw-sources/index.md` format specified (`path | slug | topics`).
- Forward references to uncompiled pages explicitly allowed.
- HTML docs and auth-walled sources acknowledged in Register step.

## License

MIT
