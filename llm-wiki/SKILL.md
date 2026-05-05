---
name: llm-wiki
description: |
  Karpathy's LLM Wiki: LLM-curated personal knowledge base. Trigger on
  "ingest into the wiki", "what does the wiki say about X", "lint the
  wiki", or any accumulation of material that should compound rather
  than scatter.
---

# LLM Wiki

The user curates sources; the LLM does the bookkeeping. Knowledge
compounds in markdown rather than being re-derived per query.

## Layout

```
<project>/llm-wiki/
├── SCHEMA.md            # per-project conventions — read FIRST
├── index.md             # catalog of compiled pages
├── log.md               # append-only op log
├── raw-sources/         # immutable; append-only
│   ├── index.md         # registry of every source
│   └── <bucket>/        # copies of ad-hoc sources only
└── <topic>/             # compiled pages
```

`SCHEMA.md` overrides everything below. If `llm-wiki/` doesn't exist,
create the four stubs (using `references/SCHEMA.template.md`) and
propose schema values before the first ingest.

## Ingest

1. **Register.** Stable URL/path → reference in `raw-sources/index.md`.
   Ad-hoc/pasted → copy to `raw-sources/<bucket>/YYYY-MM-DD-slug.md`
   (see `references/source.template.md`). New bucket needs user
   approval + SCHEMA update.

2. **Compile.** Each distinct thesis becomes or updates a page in
   `<topic>/`. Merge with `str_replace` (don't rewrite); append to
   `sources:`; bump `updated:`. Cascade to other affected pages.
   Annotate conflicts inline with attribution. Archive pages
   (`type: synthesis`/`archive`) are never cascade-updated.

3. **Log.** Update `index.md`; append to `log.md`:
   `## [YYYY-MM-DD] ingest | <title>` + `- Updated: <page>` per cascade.

Frontmatter (mandatory): `title`, `type`, `updated`, `sources`. Types:
`concept`, `decision`, `bug`, `open-question`, `source`, `reference`,
`synthesis`. Depth rules per type: `references/quality.md`.

### Special sources

- **Agent sessions** — Pi (JSONL trees with forks): see
  `references/pi-session-recipe.md`. Claude Code, Gemini CLI, opencode:
  see `references/agent-session-recipe.md`. Lazy-load.
- **Web LLM chats** — `skills/ingest-web-chat/` (URL → markdown via CDP,
  enterprise-SSO-safe).
- **Binaries** (figures, audio, checkpoints) — bucket per kind, always
  pair with a companion `.md`; cite the `.md`, not the binary.

## Query

Read `index.md`, follow links, synthesize with citations. Prefer wiki
over training; say so if coverage is missing. If the answer connects
≥2 pages, offer to file as `type: synthesis`.

## Lint

Auto-fix: index↔filesystem sync, broken links, See Also
bidirectionality, type validity. Report (don't fix): contradictions,
stale claims, orphans, concept gaps. Append findings to `log.md`.

## Schema

LLM proposes; user approves. Triggers: new bucket/topic, type misuse,
systemic lint findings, user request.
