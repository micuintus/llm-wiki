---
name: llm-wiki
description: |
  Karpathy's LLM Wiki: LLM-curated personal knowledge base. Trigger on
  "add to wiki", "save this", "file this", "remember this", "ingest this
  paper/article/chat/video", "what do I know about X", "what's in the
  wiki about X", "lint/audit the wiki", or any mention of "LLM wiki",
  "Karpathy wiki", or "knowledge base" — i.e., any accumulation of
  material that should compound rather than scatter.
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

Ingest = **register** + **compile** + **log**. Use these verbs precisely
in `log.md` so wiki state is transparent.

1. **Register.** List the source in `raw-sources/index.md` with a
   stable identifier. If the source is mutable or auth-walled
   (e.g. Google Doc, Confluence), copy it into
   `raw-sources/<bucket>/YYYY-MM-DD-slug.md` (see
   `references/source.template.md`). If the source is already stable
   (in-repo path, public URL), reference it by path/URL without copying.
   New bucket needs user approval + SCHEMA update.

   `raw-sources/index.md` format: one section per bucket. Each entry is
   a table row with `path | slug | topics`. Keep it terse — this is a
   registry, not a summary.

   HTML documentation sites (Sphinx, Doxygen, ReadTheDocs) and auth-
   walled sources (Confluence, Google Docs) may require extraction or
   credentials. Redact credentials from any copied material.

2. **Compile.** Distill the source into pages in `<topic>/`. Merge with
   `str_replace` (don't rewrite); append to `sources:`; bump `updated:`.
   Cascade to other affected pages. Forward references to pages not yet
   compiled are acceptable — they self-resolve as the wiki grows.
   Annotate conflicts inline with attribution. Archive pages
   (`type: synthesis`/`archive`) are never cascade-updated.

3. **Log.** Update `index.md`; append to `log.md`:
   `## [YYYY-MM-DD] ingest | <title>` + `- Updated: <page>` per cascade.
   If only register happened (no compile yet), log as
   `## [YYYY-MM-DD] register | <title>` and note "compile pending".

Frontmatter (mandatory): `title`, `type`, `updated`, `sources`. Types:
`concept`, `decision`, `bug`, `open-question`, `source`, `reference`,
`synthesis`. Depth rules per type — plus useful `concept` variants
(comparison matrix, implementation walkthrough): `references/quality.md`.

Optional but recommended: `tags: [tag1, tag2]` — enables grep-based
discovery when the wiki grows beyond ~20 pages.

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

## Correction pattern

When initial analysis was wrong, document the correction explicitly
rather than silently rewriting:

```markdown
### Correction: [what was wrong]
[Original claim] was incorrect because [reason].
The accurate picture is [correction].
```

This preserves the learning arc. Silent rewrites lose the pedagogical
value of the mistake.

## Lint

Auto-fix: index↔filesystem sync, broken links, See Also
bidirectionality, type validity. Report (don't fix): contradictions,
stale claims, orphans, concept gaps. Append findings to `log.md`.

Relative path verification: for every `](path.md)` link, verify the
file exists at that relative path. Common errors: same-dir links
written as `../dir/file.md`, sibling links written as `dir/file.md`
(looks for subdir, not sibling).

## Schema

LLM proposes; user approves. Triggers: new bucket/topic, type misuse,
systemic lint findings, user request.
