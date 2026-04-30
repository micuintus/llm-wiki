# @micuintus/llm-wiki

Karpathy's [LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) as a **minimal, razor-sharp skill** for Pi and other agents.

The user curates sources. The LLM does the bookkeeping — summarizing, cross-linking, flagging contradictions. Knowledge compounds in the wiki rather than being re-derived from raw chunks on every query.

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
├── SKILL.md              # skill instructions (~12 KB, minimal)
├── references/
│   ├── page.template.md      # wiki page frontmatter
│   ├── source.template.md    # raw source copy template
│   ├── SCHEMA.template.md    # per-project schema skeleton
│   ├── pi-session-recipe.md  # Pi JSONL fork detection + extraction
│   └── agent-session-recipe.md  # Claude Code, opencode, Gemini CLI
```

## What's in SKILL.md

- **Page types** — 7 canonical types with definitions (`concept`, `decision`,
  `bug`, `bugfix`, `open-question`, `source`, `reference`, `synthesis`)
- **Page quality heuristics** — minimum depth per type (tables, code blocks,
  paragraphs) so pages don't stay stubs
- **Query filing** — syntheses that combine ≥2 pages get offered as
  `type: synthesis` so good answers don't disappear into chat history
- **Contradiction detection** — grep antonym pairs, flag with
  `⚠️ CONTRADICTION:` format
- **Lint rules** — deterministic fixes (broken links, orphans, type
  consistency) + heuristic reports (stale claims, thin pages, concept gaps)
- **Schema co-evolution** — 5 triggers that prompt SCHEMA.md updates

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

## Notable other implementations

- [Astro-Han/karpathy-llm-wiki](https://github.com/Astro-Han/karpathy-llm-wiki) — pure skill, most established (~638 stars)
- [praneybehl/llm-wiki-plugin](https://github.com/praneybehl/llm-wiki-plugin) — Claude Code plugin with slash commands, BM25 search, graph layer
- [iRonin/pi-llm-wiki](https://github.com/iRonin/pi-llm-wiki) — Pi-native package with extension guardrails and generated metadata

This skill stays lighter — no extension dependency, no JSON metadata,
no search engine required at small scale. The trade-off is convention
over enforcement.

## License

MIT
