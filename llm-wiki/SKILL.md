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
   targeted edits (don't rewrite); append to `sources:`; bump `updated:`.
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
`synthesis`, `stub`. Use `stub` for sources registered but not yet
compiled. Optional: `tags: [tag1, tag2]` for grep-based discovery on
wikis >20 pages. Depth rules per type — plus `concept` variants and
the correction pattern — in `references/quality.md`.

### Special sources

- **Code repositories / source trees** — different shape from prose.
  See `references/code-source-recipe.md`.
- **Agent sessions** — Pi (JSONL trees with forks): see
  `references/pi-session-recipe.md`. Claude Code, Gemini CLI, opencode:
  see `references/agent-session-recipe.md`. Lazy-load.
- **Web LLM chats** — `skills/ingest-web-chat/` (URL → markdown via CDP,
  enterprise-SSO-safe).
- **Binaries** (figures, audio, checkpoints) — bucket per kind, always
  pair with a companion `.md`; cite the `.md`, not the binary.
- **PDFs** — extract to text first (`pdftotext -layout` or equivalent),
  register the extracted text path, not the PDF.

For sources whose claims are inconsistent or partially fabricated
(common for LLM chat exports), add `reliability: high|mixed|unverified`
to the source entry's frontmatter and annotate per-claim attribution
in compiled pages. See `references/quality.md` for the pattern.

## Query

Read `index.md`, follow links, synthesize with citations. Prefer wiki
over training; say so if coverage is missing. If the answer connects
≥2 pages, offer to file as `type: synthesis`.

When the user explicitly asks to file/save/archive a query answer,
or to document a correction to prior analysis, see
`references/synthesis-and-archive.md` (also covers the
`### Correction:` pattern in `references/quality.md`).

## Navigation and discoverability

A wiki that only machines can navigate compounds poorly. Apply these
patterns during compile so humans can use it too. None of this applies
to wikis under ~10 pages — for small wikis a flat `index.md` is fine.

### One canonical browse location

Pick `README.md` *or* `index.md` as the place that lists every
compiled page, not both. Two browse lists drift the moment you add a
page. The other file links to it.

The usual split: `README.md` is the GitHub landing (goal-oriented,
small, links into the wiki); `index.md` is the canonical full browse.

### Inline table of contents on long pages

Pages >200 lines get a `## Contents` block immediately after the `h1`,
linking to slugified section anchors:

```markdown
## Contents

- [Section name](#section-name)
```

Line count is the threshold; H2-count alone is not enough (short pages
with many short sections scroll fine). GitHub's slug rules are not
obvious for headings with em-dashes, parens, or slashes — verify
anchors via lint, not by guessing.

### Survey page lede

Survey pages (pages comparing ≥3 entries) open with a 2–3 sentence
"short answer" naming the top picks *before* any taxonomy or variant
breakdown. Readers who just want a recommendation get one without
scrolling.

If you find yourself writing a "What this page is for" or "About this
survey" section, that's a smell — write the answer instead. Defensive
meta-commentary tells the reader the author was unsure; it doesn't
help the reader decide.

### Decision tables on survey pages

Survey pages end with a picking table: "If you want X, use Y" with a
one-line why. Don't make the reader re-synthesize what the survey
already concluded. Topic pages and concept pages don't need this.

### `## See also` on every page

2–4 related links. Reference pages and `index.md` are not exempt. If a
page genuinely has no relations, write the section with an explanation
— the heading itself is the consistency signal.

## Lint

Two categories with different authority levels.

### Deterministic (auto-fix)

- **Index ↔ filesystem sync.** File present but missing from `index.md`
  → add entry with `(no summary)` placeholder. Index entry pointing to
  nonexistent file → mark `[MISSING]`; do not delete.
- **Internal links.** For every `](path.md)` link in compiled pages,
  verify the target exists at that relative path. Common errors:
  same-dir links written as `../dir/file.md`; sibling links written as
  `dir/file.md` (looks for subdir, not sibling). If exactly one file
  with the same basename exists elsewhere, fix the path; otherwise
  report.
- **Anchor links.** For every `](path.md#anchor)` and same-page
  `](#anchor)` link, verify the anchor matches a slugified heading in
  the target. GitHub slugifies by lowercasing, replacing spaces with
  `-`, dropping most punctuation but keeping `-` and `_`, and
  collapsing repeated `-`. Report mismatches.
- **Raw-source references.** Every link from a compiled page into
  `raw-sources/` must resolve. Same fix-or-report rule.
- **See Also bidirectionality.** If A links to B in See Also, B should
  link back. Add the missing direction.
- **Frontmatter type validity.** Reject types not in the canonical list.
- **Stub aging.** `type: stub` pages older than 30 days → flag in log.

### Heuristic (report only)

- Contradictions across pages without attribution.
- Stale claims superseded by newer sources.
- Orphan pages (no inbound links).
- Concepts mentioned ≥3× across the wiki but lacking a dedicated page.
- Sources with `reliability: mixed|unverified` whose claims appear in
  compiled pages without per-claim attribution.
- Archive pages whose cited sources have been substantially updated.

### Post-lint

Append to `log.md`:

```
## [YYYY-MM-DD] lint | <N> issues, <M> auto-fixed
- <issue or fix summary>
```

## Schema

LLM proposes; user approves. Triggers: new bucket/topic, type misuse,
systemic lint findings, user request.
