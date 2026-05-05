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

Other implementations of Karpathy's LLM Wiki pattern, each with different
trade-offs:

- **[Astro-Han/karpathy-llm-wiki](https://github.com/Astro-Han/karpathy-llm-wiki)**
  — the most widely used pure-markdown skill. Agent Skills-compatible
  for Claude Code, Cursor, and Codex. Good starting point if you want
  a single-file skill without session recipes.
- **[lewislulu/llm-wiki-skill](https://github.com/lewislulu/llm-wiki-skill)**
  — skill plus Obsidian plugin, web viewer, and audit plugin. Heavier
  but richer ecosystem if you live in Obsidian.
- **[Pratiyush/llm-wiki](https://github.com/Pratiyush/llm-wiki)** — a
  Python CLI tool (`llmwiki`) that ingests sessions and generates a
  static site. Stdlib-only, exports `llms.txt` / `llms-full.txt`.
  Different shape (tool vs skill) but same pattern.
- **[toolboxmd/karpathy-wiki](https://github.com/toolboxmd/karpathy-wiki)**
  — two Claude Code skills (setup + maintain). Hooks-driven, simple.
- **[Kausik-A/pi-llm-wiki](https://github.com/Kausik-A/pi-llm-wiki)** /
  **[iRonin/pi-llm-wiki](https://github.com/iRonin/pi-llm-wiki)** —
  Pi-native packages with a bundled skill *and* a Pi extension for
  deterministic operations, guardrails, and generated metadata.
  Convention vs enforcement trade-off: they enforce via code; this
  skill enforces via convention.
- **[yologdev/karpathy-llm-wiki](https://github.com/yologdev/karpathy-llm-wiki)**
  — self-growing wiki via AI agent "yoyo". Includes a web viewer.

## License

MIT
