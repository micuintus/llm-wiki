---
title: LLM Wiki skill landscape
type: concept
updated: 2026-04-29
sources:
  - ~/.pi/agent/sessions/--Users-michael.voigt-devel-AI-aiAgentResearch-agents-pi-mono--/2026-04-28T10-08-18-184Z_019dd38f-9f06-704c-a55a-dddf5a2cd9d6.jsonl
  - https://github.com/Astro-Han/karpathy-llm-wiki
  - https://github.com/praneybehl/llm-wiki-plugin
  - https://github.com/aaronoah/llm-wiki-skill
  - https://github.com/iRonin/pi-llm-wiki
  - https://github.com/atomicmemory/llm-wiki-compiler
  - https://github.com/lucasastorian/llmwiki
  - https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
tags: [ecosystem, llm-wiki, skill]
---

# LLM Wiki skill landscape

Community implementations of Karpathy's LLM Wiki pattern (gist 442a6bf). The space is fragmented — no clear winner yet, but several viable options with different trade-offs.

## Key claims

- The gist itself is at 5,000+ stars / 4,400+ forks, but the implementation space is fragmented. Most people share their own adaptations in comments rather than rallying behind one repo.
- **Astro-Han/karpathy-llm-wiki** (~638★) — the most established pure skill. Faithful "thin wrapper" around the gist: three layers, three ops, index + log, templates for raw/article/archive. No bundled scripts, no slash commands, no graph layer. Installable via `npx add-skill`. Works with Claude Code, Cursor, Codex.
- **praneybehl/llm-wiki-plugin** (~12★) — the most engineered. Claude Code plugin with 7 slash commands (`/wiki:init`, `/wiki:ingest`, …), BM25 search, SQLite graph layer, scaling playbook, explicit file-back-into-wiki workflow. Also multi-agent (Claude, Codex, Cursor, Gemini, OpenCode, Pi). Trade-off: low star count → newer, less battle-tested; graph layer goes beyond what the gist asks for (which Karpathy says is fine — "pick what's useful, ignore what isn't").
- **aaronoah/llm-wiki-skill** — lean CLI-first, Python 3.10, three scripts (`data.py`, `ingest.py`, `links.py`). Roadmap honestly flags gaps (self-correction, multimedia, embeddings all absent). For CLI purists who want minimal overhead.
- **claude-obsidian (AgriciDaniel)** (~358★) — Obsidian-tied; ten skills spanning Claude/Gemini/Codex/Cursor. Heavier, more feature-rich for Obsidian users but couples you to Obsidian conventions.
- **iRonin/pi-llm-wiki** — Pi-native package (npm installable). Bundles a Pi extension for deterministic operations + a skill. Four logical layers: raw capture packets, wiki pages, generated JSON metadata (registry, backlinks, events), and schema. Guardrails block direct raw/meta edits. Uses Obsidian wikilinks. Source-page intermediate layer is mandatory (every source becomes a source page before touching canonical knowledge).
- **atomicmemory/llm-wiki-compiler** and **lucasastorian/llmwiki** — surfaced in session references but not deeply analyzed. Part of the "fragmented" landscape.

## Fidelity scorecard (vs Karpathy gist)

| Dimension | Astro-Han | praneybehl | aaronoah | iRonin |
|---|---|---|---|---|
| Three layers | ✅ | ✅ (+graph) | ✅ | ✅ |
| Ingest/Query/Lint | ✅ | ✅ (+extras) | ✅ | ✅ |
| index.md + log.md | ✅ | ✅ | unclear | ✅ (generated) |
| Citations / wikilinks | ✅ | ✅ | unclear | ✅ (source IDs) |
| Query-as-page recompound | unclear | ✅ explicit | ❌ | ✅ |
| Schema co-evolution | implicit | explicit `SCHEMA.md` + `/wiki:upgrade` | implicit | `WIKI_SCHEMA.md` + config.json |
| Optional search engine | ❌ | ✅ BM25 + graph | scripts only | `wiki_search` tool |
| Multi-agent install | ✅ broad | ✅ broadest | ✅ via `npx skills` | Pi-native only |
| Maturity signal | 638★, daily-use claim | 12★, polished docs | small, roadmap-honest | Pi package, CI/CD |
| Departures from gist | none | graph + ontology | thin coverage | extension guardrails, JSON meta |

## Open questions

- Whether the fragmentation is a problem or a feature — the gist explicitly says "your agent will build out the specifics with you," so maybe no winner is needed.
- Whether to publish our own skill (built at `~/.pi/skills/llm-wiki/`) and how to position it vs these community options. Our differentiator: agent-agnostic (not Pi-only), markdown-only metadata (no JSON), first-class agent-session ingestion with tree traversal.
- Whether to adopt praneybehl's BM25/graph layer if our wiki grows past ~150 pages, or stick with index.md + grep.
