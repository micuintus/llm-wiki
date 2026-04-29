---
name: llm-wiki
description: |
  Build and maintain an LLM-curated personal knowledge base in a project.
  Implements Karpathy's LLM Wiki pattern (gist 442a6bf555914893e9891c11519de94f).
  Optimized for: book and paper research with discussions, agent session
  preservation, AI model development (code, checkpoints, datasets), and
  software porting documentation. Trigger on "ingest into the wiki", "what does the wiki
  say about X", "lint the wiki", or any accumulation of material that
  should compound rather than scatter.
---

# LLM Wiki

LLM-curated knowledge base. The user curates sources and asks questions;
the LLM does the bookkeeping — summarizing, cross-linking, flagging
contradictions. Knowledge compounds in the wiki rather than being
re-derived from raw chunks on every query.

## When to use

Trigger on:
- "ingest <thing> into the wiki" / "add this to my llm-wiki"
- "what does the wiki say about X" / "summarize my wiki"
- "lint the wiki"
- General accumulation: papers, sessions, screenshots, code, audio that
  should be organized rather than scattered.

Everything here is default and modular — SCHEMA.md overrides anything
that doesn't fit the domain.

If no `llm-wiki/` exists, run **Initialize** first. Otherwise read
`llm-wiki/SCHEMA.md` before anything else — it overrides defaults here.

## Architecture

Three layers:

- **Raw sources** — `llm-wiki/raw-sources/`. Immutable. Either *copies*
  (no canonical location → `raw-sources/<bucket>/`) or *references*
  (stable location → just an entry in `raw-sources/index.md`).
- **Wiki** — `llm-wiki/<topic>/<page>.md`, compiled by the LLM. Plus
  `index.md` (catalog) and `log.md` (op log) at top level.
- **Schema** — `llm-wiki/SCHEMA.md`. Per-project conventions. LLM
  proposes, user approves. Co-evolves.

Three operations: **ingest**, **query**, **lint**.

## Project layout

```
<project-root>/llm-wiki/
├── SCHEMA.md            # read FIRST
├── index.md             # catalog of compiled pages
├── log.md               # op log
├── raw-sources/
│   ├── index.md         # registry of every source (copy or reference)
│   └── <bucket>/        # COPIES only
└── <topic>/             # compiled pages
```

Buckets organize sources by *kind* (papers, conversations, figures);
topics organize compiled pages by *subject*. One source can contribute
to multiple pages.

## Initialize

Run inline as Step 0 of first ingest:

1. Confirm with user. Create `llm-wiki/`, `llm-wiki/raw-sources/`, and
   four stubs: `SCHEMA.md` (from `references/SCHEMA.template.md`),
   `index.md` (`# Wiki Index`), `log.md` (`# Wiki Log`),
   `raw-sources/index.md` (`# Raw Sources`).
2. Propose SCHEMA values (domain, taxonomy, buckets, types) from what's
   at hand; user approves or revises.
3. Propose adding `llm-wiki/` to `.gitignore` (churns while schema
   settles); user decides per-project.

Continue into Ingest step 1. If user runs Query/Lint before any ingest,
tell them to ingest first; do not auto-create.

## Ingest

Two stages: register, then compile. Never one without the other.

### 1. Register the source

**Reference vs copy:**
- Stable location (in-project file, external file, URL) → **reference**.
  In-project paths relative; out-of-project absolute.
- No canonical location (pasted text, ad-hoc transcript) → **copy** to
  `raw-sources/<bucket>/YYYY-MM-DD-slug.md` using
  `references/source.template.md`. Verbatim text, formatting noise
  stripped, opinions preserved.

Slug rules (copies): kebab-case, ≤60 chars. `YYYY-MM-DD-` prefix when
publication date known; otherwise omit and set `published: Unknown`.

Append to `raw-sources/index.md` under `## <bucket>`. New buckets need
user approval + SCHEMA update. Format:

    ## papers
    - **Title** — URL_or_path — collected YYYY-MM-DD → [page](../topic/page.md)

The `→` arrow lists pages this source contributed to (filled at end of
ingest; one source can yield multiple links).

### 2. Read and discuss

Chunk-read long material. Surface key takeaways with the user before
writing pages.

### 3. Compile into wiki pages

- **Same thesis as existing page** → merge: append source to
  `sources:`, str_replace targeted changes only (no rewrites), bump
  `updated:`.
- **New concept** → new page in most relevant topic. Name file after the
  concept, not the source slug. New topic? Confirm; update SCHEMA.
- **Spans topics** → primary page where it fits best; See Also cross-refs
  elsewhere.
- **Conflicts** → annotate inline with attribution; both sources in
  frontmatter.

Pages per source = distinct theses present. No quota; don't pad with
fragments. Cluster theses around one core idea into one page when
natural.

**Done means** — before finishing compile, verify:
- Frontmatter: `title`, `type`, `updated`, `sources` all present
- Body: one-paragraph hook + Key claims (cited) + Open questions
- See Also: if this page mentions a concept that has its own page, link
  it here; if you add a See Also to page A pointing to page B, ensure
  B links back to A
- Index: page appears in `index.md` with one-line summary

### 4. Cascade

Scan for ripple effects: same-topic pages first, then others via
`index.md`. str_replace only; never rewrite whole sections. Bump
`updated:` on each. Never cascade-update archive pages. If a page
references another page in its body but lacks a See Also link, add it.

### 5. Update indexes and log

- `index.md`: link + one-line summary + `Updated: YYYY-MM-DD` for every
  touched page.
- `raw-sources/index.md`: backfill `→` links on the source.
- `log.md`: append

  ```
  ## [YYYY-MM-DD] ingest | <source title>
  - Updated: <cascade-page>
  ```

  Omit `- Updated:` when no cascade.

### 6. Summarize

Tell the user: pages changed, where to look first, follow-ups worth
filing.

### Special source types

**Sessions.** Pi sessions are JSONL trees — see
`references/pi-session-recipe.md`. **CRITICAL:** Sessions are NOT
chronological streams. They have forks (resumed conversations, subagent
spawns), custom events (fetch failures, rate limits, errors), and
tool-call branches where the assistant produced artifacts with no text
reply. You MUST run tree analysis (Step 0 in the recipe) before reading
any content. For Claude Code (`~/.claude/projects/<sanitized-cwd>/*.jsonl`),
Gemini CLI (`~/.gemini/tmp/<project>/chats/*.json`), and opencode
(`~/.local/share/opencode/opencode.db` SQLite), see
`references/agent-session-recipe.md` — load it only when actually scanning
one of these tools' transcripts, not on general skill load. Extract every
cited source as its own ingestion; prefer underlying source over session.

**Figures / screenshots / audio / MIDI / checkpoints.** Same pattern:
bucket per kind (`figures/`, `audio/`, etc.), reference if stable, copy
if ephemeral. Always pair with a companion `.md` description (verbatim
text + 1–3 sentences) — this is the searchable handle. Cite the `.md`,
not the binary.

**Source summary pages.** For significant sources, first write a
`type: source` page summarizing what the source claims, its reliability,
and which concepts it touches. Then merge into canonical pages. Example:
`raw-sources/papers/2026-04-29-attention.md` →
`wiki/sources/attention-is-all-you-need.md` (source page) → updates to
`wiki/concepts/transformers.md`.

## Query

Read `index.md`, find candidates, read pages, synthesize with citations.
Prefer wiki over training; say so if coverage is missing. Don't write
unless asked.

**Archive** (on request): synthesis page with `type: synthesis` or
`archive`, `sources:` listing cited wiki pages, update `index.md` with
`[Archived]`, append to `log.md`.

## Lint

Fix deterministic issues automatically: index/filesystem sync, broken
links, See Also bidirectionality, raw reference validity. Report
heuristic issues to the user: contradictions, stale claims, concept
gaps, orphans, index bloat. Post all findings to `log.md`.

## Rules

- Never edit `raw-sources/` after registration. Append-only registry.
- Never edit archive pages after creation.
- A weak or speculative source gets explicitly flagged as such; don't
  give it equal weight against stronger sources.
- For significant sources, write a source summary page first, then
  merge into canonical pages.

## Conventions

- **Paths.** Wiki-relative inside files; project-root-relative in chat.
- **Dates.** ISO `YYYY-MM-DD`. `updated:` bumped on material change.
- **Frontmatter** (mandatory): `title`, `type`, `updated`, `sources`.
  Optional: `see_also`, `tags`.
- **Links.** Standard markdown.
