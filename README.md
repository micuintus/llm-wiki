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

The Karpathy gist has spawned a diverse ecosystem. Implementations
fall into four shapes: **skills** (agent reads a markdown file),
**skill + ecosystem** (skill plus companion tools), **CLI tools**
(standalone programs), and **self-growing** (agent-driven automation).

### Skills — agent reads SKILL.md, no runtime code

| Repo | Stars | Contrib | License | Lang | Notes |
|------|-------|---------|---------|------|-------|
| [Astro-Han/karpathy-llm-wiki](https://github.com/Astro-Han/karpathy-llm-wiki) | 651 | 1 | MIT | Markdown | Agent Skills-compatible for Claude Code, Cursor, Codex. Single-file SKILL.md, no session recipes. Closest to a vanilla skill. |
| [toolboxmd/karpathy-wiki](https://github.com/toolboxmd/karpathy-wiki) | 66 | 1 | — | Shell | Two Claude Code skills: one for setup, one for maintenance. Hooks-driven. |
| [balukosuri/llm-wiki-karpathy](https://github.com/balukosuri/llm-wiki-karpathy) | 125 | 1 | — | — | Article + implementation walkthrough. |

### Skill + ecosystem — skill plus companion tools

| Repo | Stars | Contrib | License | Lang | Notes |
|------|-------|---------|---------|------|-------|
| [lewislulu/llm-wiki-skill](https://github.com/lewislulu/llm-wiki-skill) | 447 | 2 | MIT | TypeScript | Skill + Obsidian audit plugin + local web viewer + shared TypeScript audit library. For users who want IDE-like tooling around the wiki. |

### CLI tools — standalone programs

| Repo | Stars | Contrib | License | Lang | Notes |
|------|-------|---------|---------|------|-------|
| [lucasastorian/llmwiki](https://github.com/lucasastorian/llmwiki) | 808 | — | Apache-2.0 | Python + TypeScript | Upload documents, connect Claude via MCP, agent writes the wiki. MCP-native. |
| [Pratiyush/llm-wiki](https://github.com/Pratiyush/llm-wiki) | 229 | 1 | MIT | Python | `llmwiki` CLI: session ingestion, static site generation, 2,651 tests, 16 lint rules, MCP server, Playwright E2E, AI exports (`llms.txt`, JSON-LD, RSS). Most feature-rich; heaviest. Stdlib-first runtime. |

### Pi-native — code enforcement, not just convention

| Repo | Stars | Contrib | License | Lang | Notes |
|------|-------|---------|---------|------|-------|
| [Kausik-A/pi-llm-wiki](https://github.com/Kausik-A/pi-llm-wiki) | 9 | 1 | MIT | TypeScript | Pi package with bundled skill + Pi extension. Enforces guardrails via code rather than convention. [iRonin/pi-llm-wiki](https://github.com/iRonin/pi-llm-wiki) is a fork with additional changes. |

### Self-growing — agent-driven automation

| Repo | Stars | Contrib | License | Lang | Notes |
|------|-------|---------|---------|------|-------|
| [yologdev/karpathy-llm-wiki](https://github.com/yologdev/karpathy-llm-wiki) | 43 | 2 | — | TypeScript | "Yoyo" AI agent grows the wiki from Karpathy's founding prompt. Commits are the agent's work. Includes web viewer. |
| [hsuanguo/llm-wiki](https://github.com/hsuanguo/llm-wiki) | 11 | 2 | MIT | Python | Two-part repo: wiki that "evolves with you" + Python scaffolding. |

### How to choose

- **Want a single markdown file you paste into any agent?** → A skill
  (Astro-Han, toolboxmd, or this repo).
- **Want IDE integration (Obsidian, web viewer, audit)?** → lewislulu's
  ecosystem.
- **Want a program that runs in your shell and generates a site?** →
  Pratiyush's CLI or lucasastorian's MCP tool.
- **Want the agent to enforce rules via code, not just convention?** →
  Kausik-A's Pi extension.
- **Want the wiki to grow itself with minimal human input?** →
  yologdev's self-growing approach.

All share the same Karpathy foundation: raw sources → compiled wiki →
schema, with the LLM doing the bookkeeping.

## Changelog

### 1.1.5

- Ingest vocabulary tightened: `register` vs `compile` vs `ingest` with
  log conventions.
- `raw-sources/index.md` format specified (`path | slug | topics`).
- Forward references to uncompiled pages explicitly allowed.
- HTML docs and auth-walled sources acknowledged in Register step.

## License

MIT
