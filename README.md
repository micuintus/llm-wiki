# @micuintus/llm-wiki

Karpathy's [LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) as a skill. One file. ~4 KB. No dependencies, no CLI, no web server, no Obsidian plugin.

The user curates sources. The LLM does the bookkeeping — summarizing,
cross-linking, flagging contradictions. Knowledge compounds instead of
being re-derived from raw chunks on every query.

## Install

Pi:
```bash
pi install npm:@micuintus/llm-wiki
```

Everyone else:
```bash
# Copy one file. Start ingesting.
curl -L https://raw.githubusercontent.com/micuintus/llm-wiki/main/llm-wiki/SKILL.md \
  > ~/your-agent/skills/llm-wiki.md
```

## What you get

One file: `SKILL.md`. Everything else is lazy-loaded — referenced by
path in the skill text, never loaded until you actually need it.

**Agent session recipes (lazy-loaded):**
- **Pi sessions** — JSONL trees with fork detection
- **Claude Code / opencode / Gemini CLI** — transcripts, SQLite, JSON

**Web chat ingestion** — Claude.ai, ChatGPT, Gemini, Le Chat via CDP.
Ships as a separate subskill (`skills/ingest-web-chat/`).

## Use cases

- **Reading a book** — chapter summaries, character/concept pages, theme threads, all interlinked.
- **Researching a topic across many papers** — concept pages cite multiple sources; contradictions surface instead of getting lost.
- **Mapping an ecosystem** (e.g., the Pi extension landscape) — taxonomies, comparisons, primitive mappings.
- **Documenting your own project** — decisions, architecture, bugs, open questions, all linked through one schema.

## Why this exists

Most wiki implementations ship a CLI, a web server, a static site
generator, and 2,000 tests. That's fine if you want infrastructure.
This is for people who want a **pattern** — a convention the agent
already understands — and nothing else.

Conventions live in the skill text, not in code. The wiki itself is
plain markdown on disk — if you ever switch agents or skills, your
data travels with you unchanged.

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

| Repo | Stars | Contributors | License | Language | Shape | Notes |
|------|-------|-------------|---------|----------|-------|-------|
| [Astro-Han/karpathy-llm-wiki](https://github.com/Astro-Han/karpathy-llm-wiki) | 651 | 1 | MIT | Markdown | Skill | Agent Skills-compatible. Single-file SKILL.md, no session recipes. Closest to a vanilla skill. |
| [toolboxmd/karpathy-wiki](https://github.com/toolboxmd/karpathy-wiki) | 66 | 1 | — | Shell | Skill | Two Claude Code skills: setup + maintenance. Hooks-driven. |
| [balukosuri/llm-wiki-karpathy](https://github.com/balukosuri/llm-wiki-karpathy) | 125 | 1 | — | — | Skill | Article + implementation walkthrough. |
| [lewislulu/llm-wiki-skill](https://github.com/lewislulu/llm-wiki-skill) | 447 | 2 | MIT | TypeScript | Skill + ecosystem | Skill + Obsidian audit plugin + local web viewer + shared TypeScript audit library. For users who want IDE-like tooling. |
| [lucasastorian/llmwiki](https://github.com/lucasastorian/llmwiki) | 808 | — | Apache-2.0 | Python + TypeScript | CLI tool | Upload documents, connect Claude via MCP, agent writes the wiki. MCP-native. |
| [Pratiyush/llm-wiki](https://github.com/Pratiyush/llm-wiki) | 229 | 1 | MIT | Python | CLI tool | `llmwiki` CLI: session ingestion, static site generation, 2,651 tests, 16 lint rules, MCP server, Playwright E2E, AI exports. Most feature-rich; heaviest. |
| [Kausik-A/pi-llm-wiki](https://github.com/Kausik-A/pi-llm-wiki) | 9 | 1 | MIT | TypeScript | Pi-native | Pi package with bundled skill + Pi extension. Enforces guardrails via code rather than convention. |
| [yologdev/karpathy-llm-wiki](https://github.com/yologdev/karpathy-llm-wiki) | 43 | 2 | — | TypeScript | Self-growing | "Yoyo" AI agent grows the wiki from Karpathy's founding prompt. Commits are the agent's work. Includes web viewer. |
| [hsuanguo/llm-wiki](https://github.com/hsuanguo/llm-wiki) | 11 | 2 | MIT | Python | Self-growing | Wiki that "evolves with you" + Python scaffolding. |

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT
