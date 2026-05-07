# Wiki Schema

Per-project conventions. LLM proposes changes; user approves. Co-evolves
with the wiki.

## Domain

<!-- One paragraph: what is this wiki about, what's in scope, what's out. -->

## Source buckets

By kind of source. Suggested defaults — keep, remove, or add as needed:

- `papers/` — academic papers, preprints
- `articles/` — blog posts, web clippings
- `books/` — long-form, `books/<slug>/<chapter>.md`
- `transcripts/` — talks, podcasts, videos
- `conversations/` — chat dumps, agent sessions
- `notes/` — pasted text, ad-hoc
- `code-references/` — in-repo code (referenced)
- `figures/` — screenshots, diagrams (with companion `.md`)
- `external/` — audio, MIDI, datasets, checkpoints (with companion `.md`)

## Topic taxonomy

By subject, not by kind. New topics need user approval.

- `<topic>/` — <description>

## Page types

- `concept`, `decision`, `bug`, `open-question`, `source`, `reference`, `synthesis` — see SKILL.md.
- Concept variants (taxonomy, implementation walkthrough) — see `quality.md`. Not new types; just shapes a `concept` may take.

## Lint rules

- Stale-claim threshold: 30 days.
- Required tags: list canonical set if used.
- Relative path verification: every `](*.md)` link must resolve from the file's directory.
- Bidirectional links: if page A links to page B, page B must link back.
- Tag presence: warn if `tags:` is missing on pages >100 lines.

## Notes

<!-- Domain quirks, term glossary, in-flight reorganizations. -->
