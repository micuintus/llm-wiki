# LLM Wiki Skill Feedback — Session 2026-05-07

## New page types discovered

- **`taxonomy`** — Categorized enumeration of mechanisms, systems, or primitives (20-mechanism matrix, extension primitive mapping). Needs ≥1 large comparison table, ≥1 contender matrix, cites ≥10 sources.
- **`implementation`** — Concrete code implementation with walkthrough (510 LOC extension, 200 LOC design sketch). Needs ≥1 architecture diagram, ≥1 code block with actual implementation, design decisions table.

## Frontmatter additions

- **`tags`** — Optional but strongly recommended for discoverability. Especially important when a wiki grows beyond ~20 pages. Tags enable grep-based discovery (`grep "^tags:"` finds all extension pages).

## Cross-reference conventions (learned the hard way)

### Relative path verification
Markdown links in nested wikis break silently. Verify with this mental model:

```
repo-root/
  llm-wiki/
    topic-a/
      page.md        → ../topic-b/page.md  (sibling dir)
      page.md        → ./sibling.md        (same dir)
    topic-b/
      page.md
  sibling-project/
    llm-wiki/
      page.md        → ../../../../sibling-project/llm-wiki/page.md
```

Common errors found:
- Same-dir links written as `../dir/file.md` (wrong — drops out of current dir)
- Sibling links written as `dir/file.md` (wrong — looks for subdir, not sibling)
- Cross-project links missing one `../` level

### Bidirectional link verification method
To check if page A's link to page B is reciprocated:

```bash
# From repo root
grep -l "page-a.md" llm-wiki/**/*.md  # should include page-b.md
grep -l "page-b.md" llm-wiki/**/*.md  # should include page-a.md
```

If either grep returns empty, the link is unidirectional.

## Content patterns that proved load-bearing

### 1. Correction sections
When initial analysis was wrong (e.g., "bash can't call pi" → "bash CAN call pi but it's subprocess spawning, not callback"), document the correction explicitly:

```markdown
### Correction: [what was wrong]

[Original claim] was incorrect because [reason]. The accurate picture is [correction].
```

This preserves the learning arc for future readers. Silent rewrites lose the pedagogical value of the mistake.

### 2. Bidirectional mappings
Two tables are better than one:
- Table A: systems → primitives (which hooks each extension uses)
- Table B: primitives → systems (which extensions use each hook)

This catches gaps: if a primitive has zero consumers, it's either unused or the mapping is incomplete.

### 3. Concrete metrics in comparison tables
Abstract comparisons ("faster", "simpler") are useless. Required columns:
- Stars / downloads (for extensions)
- LOC / file count
- Latency (ms)
- Last push date
- Contributor count

### 4. Code sketches for proposed implementations
A 200-line design sketch with actual TypeScript is more valuable than 500 lines of prose about "how it could work." Include:
- Protocol spec (JSON line format)
- Extension hook sketch
- Standalone CLI sketch
- Usage example

## Sources list scaling

Taxonomy pages can have 50+ source files. The `sources:` frontmatter field handles this fine, but the quality heuristic should acknowledge that `taxonomy` pages legitimately cite many more sources than `concept` pages.

## Cross-wiki links

When linking to a sibling project's wiki (e.g., pi-mono → MetaHarness), the relative path is `../../../../sibling-project/llm-wiki/page.md` from `llm-wiki/topic/`. Verify by counting directory levels from the file's location to repo root, then into the sibling.

## Lint rules to add

1. **Path verification**: For every `](path.md)` link, verify the file exists at that relative path.
2. **Tag presence**: Warn if `tags:` is missing on pages >100 lines.
3. **Source count**: Warn if `taxonomy` pages have <5 sources or `implementation` pages have <2 sources.
4. **Stale frontmatter type**: `type: comparison` isn't in the canonical type list — should be `synthesis` or propose `comparison` as a new type.
