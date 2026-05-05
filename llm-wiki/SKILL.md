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

## Page types

Use exactly one per page:

- `concept` — what something is
- `decision` — why X was chosen over Y
- `bug` / `bugfix` — what was wrong and how fixed
- `open-question` — known unknown
- `source` — session or document summary
- `reference` — commands, configs, lookup tables
- `synthesis` — filed query answer (cites wiki pages, not raw sources)

Depth/quality rules per type live in `references/quality.md` — read
that when finishing a page.

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

See `references/quality.md` for the done-checklist before finishing.

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

**Pi sessions** — JSONL trees with forks. See
`references/pi-session-recipe.md`; Step 0 (fork detection) is mandatory.

**Other agent sessions** — Claude Code, Gemini CLI, opencode. See
`references/agent-session-recipe.md` (lazy-load when scanning a transcript).

**Web LLM chats** (Claude.ai, ChatGPT, Gemini, Le Chat) — use
`skills/ingest-web-chat/` (CDP-driven, enterprise-SSO-safe). Hand it a
URL; it writes a `type: source` markdown into `raw-sources/conversations/`.

**Figures / screenshots / audio / checkpoints** — bucket per kind,
reference if stable, copy if ephemeral. Always pair binaries with a
companion `.md` (verbatim text + 1–3 sentences) — cite the `.md`.

## Query

Read `index.md`, find candidates, read pages, synthesize with citations.
Prefer wiki over training; say so if coverage is missing.

**Filing:** If the answer synthesizes ≥2 wiki pages or discovers a new
connection not yet documented, offer to file it as a `type: synthesis`
page. Synthesis pages cite their source wiki pages (not raw sources) and
are indexed under a "Synthesis" section. This prevents good answers from
disappearing into chat history.

**Archive** (on request): synthesis page with `type: synthesis` or
`archive`, `sources:` listing cited wiki pages, update `index.md` with
`[Archived]`, append to `log.md`.

## Lint

Fix deterministic issues automatically: index/filesystem sync, broken
links, See Also bidirectionality, raw reference validity, frontmatter
type consistency (types must be from the canonical list).

Report heuristic issues to the user:
- **Contradictions:** grep for antonym pairs across pages on same topic
  (e.g., "adopted" vs "rejected", "works" vs "broken"). Flag with:
  `⚠️ CONTRADICTION: [page A] claims X, but [page B] claims not-X.`
- **Stale claims:** `updated:` older than SCHEMA's stale threshold
  (default 30 days) on pages whose topic has seen recent ingest.
- **Thin pages:** body shorter than the quality heuristic for its type.
- **Orphans:** pages with no inbound links from other content pages.
- **Concept gaps:** concepts mentioned in See Also that lack their own page.
- **Index bloat:** index entries without corresponding files.

Post all findings to `log.md`.

## Schema co-evolution

The schema evolves when any of these trigger:
- New bucket needed (source kind not in SCHEMA buckets list)
- New topic needed (concept doesn't fit existing taxonomy)
- Type misuse pattern (same concept tagged as multiple types)
- Systemic lint finding (e.g., all pages of type X lack Y)
- User request for new convention

Propose changes to SCHEMA.md; user approves or revises.

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

## Optional tooling

See `references/tooling.md` (Obsidian, qmd, Web Clipper, ingest-web-chat).
