# Synthesis and archive pages

Lazy-loaded. Read when the user explicitly asks to file/save/archive
a query answer.

## Two derived-knowledge types

| Type | When | Cascade-updates? |
|------|------|------------------|
| `synthesis` | Connects ≥2 wiki pages with a new conclusion | Yes — refresh as cited pages change |
| `archive` | Point-in-time snapshot of a query answer | No — frozen by design |

## Filing procedure

1. **Always create a new page.** Never merge a synthesised answer
   into an existing concept page — that conflates source-derived
   knowledge with derived knowledge.
2. **Place** in the most relevant topic directory; **name** after
   the query topic, not the conversation that prompted it.
3. **`sources:`** lists the wiki pages cited (not the raw sources
   directly — those are already cited transitively).
4. **`index.md`**: prefix the summary with `[Synthesis]` or
   `[Archive]` so readers know it's derived rather than primary.
5. **`log.md`**: append `## [YYYY-MM-DD] archive | <page title>`.

## Why archive pages don't cascade-update

Archive pages capture the answer **as it was understood on date X**.
If a cited page changes, the archive becomes a useful artifact of
the old understanding — not a bug. Lint may flag substantial drift
(see deterministic lint rules) but never auto-rewrites the archive.

If the drift is enough to matter, file a **new** archive (or
promote to `synthesis`) rather than editing the old one.

## Synthesis vs. concept — when to choose which

- **`concept`** — the topic itself is real, the page distills it
  from sources. Cascade-updates as sources change.
- **`synthesis`** — the *connection* is the contribution; the
  underlying concepts already have their own pages. Cascade-updates
  preserve the connection's accuracy.
- **`archive`** — neither of the above; it's a transcript of one
  reasoning event. Frozen.

When in doubt: if the page's value disappears when its citations
change, it's `synthesis`. If it survives independent of its
citations (it's a record), it's `archive`.
