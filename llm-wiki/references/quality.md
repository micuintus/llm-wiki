# Page quality heuristics

Lazy-loaded. Read when finishing a page or running lint.

## Depth by type

| Type | Minimum depth |
|------|---------------|
| `concept` | ≥1 table, ≥1 code block, ≥3 paragraphs of body |
| `decision` | alternatives-considered table with evidence, ≥3 paragraphs |
| `bug` / `bugfix` | before/after code snippet, impact, regression test ref |
| `open-question` | symptoms, mitigations, trigger conditions, proposed fix |
| `source` | metadata + key content + reliability — can be terse |
| `reference` | lookup table or command list — can be terse |
| `synthesis` | cites ≥2 wiki pages, adds new connection or conclusion |

Stubs (frontmatter + one paragraph + See Also) are acceptable for
`source` and `reference`, not for `concept`, `decision`, or `bug`.

## Done checklist

Before marking a page done, verify:

- Frontmatter: `title`, `type`, `updated`, `sources` present
- Body: one-paragraph hook + key claims (cited) + open questions
- Depth passes the table above
- See Also: bidirectional links to related pages
- Index: page appears in `index.md` with one-line summary
