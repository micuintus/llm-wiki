---
title: LLM Wiki skill
type: concept
updated: 2026-04-29
sources:
  - ~/.pi/agent/sessions/--Users-michael.voigt-devel-AI-aiAgentResearch-agents-pi-mono--/2026-04-28T10-08-18-184Z_019dd38f-9f06-704c-a55a-dddf5a2cd9d6.jsonl
  - ~/.pi/skills/llm-wiki/
  - https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
tags: [skill, llm-wiki]
---

# LLM Wiki skill

Locally-built minimal implementation of Karpathy's LLM Wiki pattern as a reusable, agent-agnostic skill at `~/.pi/skills/llm-wiki/`.

## Key claims

- Three layers (`raw-sources/` + LLM-owned `<topic>/` pages + per-project `SCHEMA.md`) and three operations (ingest, query, lint), per Karpathy's [gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).
- Reference-vs-copy rule: in-project paths and URLs are referenced in `raw-sources/index.md`; only ad-hoc material with no canonical location is copied into `raw-sources/<bucket>/`.
- Pi-specific session-ingestion recipe lives in `references/pi-session-recipe.md` (lazy-loaded), keeping the main `SKILL.md` slim.
- Frontmatter (`title`, `type`, `updated`, `sources`) is mandatory because lint depends on it; standard markdown links are used (not Obsidian wikilinks) for portability.

## Open questions

- Publish as `pi-llm-wiki` or plain `llm-wiki` — defer to after MamBRAVE/DACMICU shake-down.
- v0.3 lint still needs explicit `~`-path expansion in source-resolution checks.
