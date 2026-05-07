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
| `stub` | frontmatter + one-paragraph rationale + link to raw source |

Stubs (frontmatter + one paragraph + See Also) are acceptable for
`source` and `reference`, not for `concept`, `decision`, or `bug`.

The `stub` type is for placeholder pages — typically a registered
source whose compilation is pending, or a forward reference to a
concept other pages already link to. Lint flags stubs older than
30 days.

## Source reliability

LLM chat exports, social-media threads, and self-published sources
often mix accurate and fabricated claims. Track this explicitly.

In the source's frontmatter (raw-sources/index.md row, or the
companion `.md` for copied sources):

```yaml
reliability: high      # peer-reviewed, primary, or verified by user
reliability: mixed     # partially correct; per-claim attribution required
reliability: unverified # not yet checked; treat all claims as provisional
```

When compiling from a `mixed` or `unverified` source into a `concept`
page, attribute claims at the **section** level. Add a
`## Source reliability` section near the bottom of the compiled page:

```markdown
## Source reliability

The compiling source is [a Gemini chat](../raw-sources/...) marked
`mixed`. Its **TM/UTM material is reliable** — matches standard
textbook definitions. Its **BFF material is unreliable**:

- Claim X — fabricated; the paper does not say this.
- Claim Y — appears to be a hallucinated follow-up paper.

Only the reliable sections are cited above.
```

This pattern preserves the audit trail. Lint flags `mixed`/`unverified`
sources that appear in compiled pages without this section.

## Concept variants

When a `concept` page takes a recognizable shape, hold it to the
shape's depth bar:

| Variant | Minimum depth |
|---------|---------------|
| Categorized enumeration / taxonomy | ≥1 large comparison table, ≥1 contender matrix, cites ≥10 sources |
| Implementation walkthrough | ≥1 architecture diagram, ≥1 code block with actual implementation, design decisions table |

These are not separate types — they're `concept` pages with extra
structure. Use them when the content fits; don't force the shape.

## Done checklist

Before marking a page done, verify:

- Frontmatter: `title`, `type`, `updated`, `sources` present
- Body: one-paragraph hook + key claims (cited) + open questions
- Depth passes the table above
- See Also: bidirectional links to related pages
- Index: page appears in `index.md` with one-line summary
- For `mixed`/`unverified` sources: `## Source reliability` section present
