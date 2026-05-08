# Changelog

## [1.4.2] — 2026-05-07

### Fixed
- **`str_replace` → "targeted edits"** in SKILL.md Compile step. Pi's tool is named `edit`; the term `str_replace` is Anthropic-tool-API jargon. When the model reads `str_replace` in the skill text, it may look for a tool that doesn't exist in Pi. Reworded to be tool-agnostic. (Thanks to a friendly reviewer for spotting.)

## [1.4.1] — 2026-05-07

### Added
- **Tagline:** "As minimal as Pi." Added to README subtitle and package.json description.
- **Pi GitHub install:** `pi install github:micuintus/llm-wiki` alongside existing npm install.

### Changed
- **README** — Restructured Install section with three explicit paths: Pi (npm), Pi (GitHub), everyone else (curl).
- **package.json keywords** — Added `"minimal"`.

## [1.4.0] — 2026-05-07

### Added
- **`references/code-source-recipe.md`** — lazy-loaded recipe for ingesting code repositories: register-by-path (don't copy), grep-driven inventory, `path:line` citations, source-size heuristic (~1 page per ~1000 lines per cohesive subsystem), commit-SHA recording. Closes a gap exposed by real-world stress testing on a 6,400-line C++ engine source.
- **`references/synthesis-and-archive.md`** — lazy-loaded recipe for filing query answers: synthesis vs. archive distinction, when each cascade-updates, decision rule ("if value disappears with citation changes, it's synthesis; else archive").
- **PDF guidance** in SKILL.md Special sources: extract to text first, register the extracted text path.
- **Source-size heuristic** in `quality.md`: ~1 page per ~1000 lines is a useful starting point; under-mining is the common failure.

### Changed
- **SKILL.md trimmed** 6,957 → 6,260 bytes by lazy-loading the archive-on-request workflow and the correction pattern. Both are now one-line pointers in the Query section.
- **README byte claim** corrected: "~4 KB" → "~6 KB". The previous figure was stale since 1.2.x growth.
- **Special sources section** in SKILL.md reorganized: code repositories first (most common case), then sessions, web-chat, binaries, PDFs. Reliability paragraph moved into the same section.

### Why
Review after a 49-page real-world ingest (Kontakt knowledge base) found three gaps: code-as-source had no recipe, the README's byte claim was stale, and two SKILL.md subsections (archive workflow, correction pattern) were content that earned their place but didn't earn always-loaded bytes.

## [1.3.0] — 2026-05-07

### Added
- **`type: stub`** for registered-but-not-compiled sources and forward-reference placeholders. Lint flags stubs older than 30 days. Depth rule: frontmatter + one-paragraph rationale + link to raw source.
- **Source reliability protocol.** New `reliability: high|mixed|unverified` field for sources, with documented per-claim attribution pattern in `quality.md` for compiling from `mixed`/`unverified` material (typical of LLM chat exports). Lint flags `mixed`/`unverified` sources cited in compiled pages without a `## Source reliability` section.
- **Archive-on-request workflow** in Query section. Explicit rule: synthesised answers always become new pages (never merged into existing concept pages); index summary prefixed `[Synthesis]` or `[Archive]`; logged as `archive` verb.

### Changed
- **Lint rewritten with deterministic / heuristic split.** Auto-fix list (index-FS sync, internal links, raw refs, See Also bidirectionality, frontmatter validity, stub aging) separated from report-only list (contradictions, stale claims, orphans, concept gaps, unattributed mixed-source claims, archive-page drift). Sharper authority boundary; modeled after Astro-Han/karpathy-llm-wiki's lint structure.

### Fixed
- **`ingest-web-chat`: `## Conversations` casing bug.** Section header detection was case-sensitive and would write a duplicate capital-C section if the existing wiki used lowercase. Now case-insensitive match preserves whatever casing the wiki already uses.


## [1.2.3] — 2026-05-07

### Changed
- **Page types collapsed back to Karpathy's 7.** Removed `taxonomy` and `implementation` from the canonical type list; they're now `concept` variants documented in `quality.md` with their own depth rules. Same depth bar, less type proliferation.
- **Sharpened trigger phrases**: "add to wiki", "save this", "file this", "remember this", "ingest this paper/article/chat/video", "what do I know about X", "knowledge base". Broader and more natural than the old "ingest into the wiki" / "lint the wiki" set.
- **Session recipes are self-correcting**: added Verification preamble to `pi-session-recipe.md` and `agent-session-recipe.md` instructing the LLM to peek at one session file and confirm the schema before applying. If drifted, adapt the recipe and update the preamble — don't silently work around it.

### Removed
- **Cross-wiki links section** from SKILL.md. The lint rule "every `](path.md)` must resolve from the file's directory" already covers it; the worked example was just path arithmetic.

### Fixed
- **Tarball bloat**: nested `.npmignore` excludes `package-lock.json` from the `ingest-web-chat` subskill on publish. Tarball: 59.6kB → 41.7kB.

## [1.2.0] — 2026-05-07

### Added
- **New page types**: `taxonomy` (categorized enumeration with comparison matrix) and `implementation` (concrete code with architecture diagram + design decisions table).
- **Tags frontmatter**: Optional but recommended `tags: [tag1, tag2]` for discoverability on wikis >20 pages.
- **Correction pattern**: Document corrections explicitly rather than silently rewriting — preserves learning arc.
- **Cross-wiki links**: Convention for sibling-project wikis at same repo level (`../../../../sibling/llm-wiki/page.md`).
- **Relative path verification lint rule**: Every `](*.md)` link must resolve from the file's directory.
- **Bidirectional link lint rule**: If page A links to page B, page B must link back.
- **Tag presence lint rule**: Warn if `tags:` is missing on pages >100 lines.
- **Proper CHANGELOG.md**: Generated from full git history (1.0.0 → 1.2.0).

### Changed
- **Depth rules** (`references/quality.md`): Added minimums for `taxonomy` and `implementation`.
- **SCHEMA template** (`references/SCHEMA.template.md`): Added `taxonomy`/`implementation` types, tags convention, lint rules.
- **SKILL.md**: Added new types, tags, correction pattern, cross-wiki links, path verification.
- **README**: Rewritten — cut bloat, replaced with direct opinion. Session recipes and web chat listed as lazy-loaded core features.

## [1.1.5] — 2026-05-05

### Added
- **Ingest vocabulary**: `register` vs `compile` vs `ingest` with precise log conventions.
- **Raw-sources format**: `raw-sources/index.md` registry with `path | slug | topics` table.
- **Forward references**: Links to not-yet-compiled pages are explicitly allowed.
- **HTML/auth source handling**: Acknowledged in Register step.
- **Related work table**: Single table with Shape column and differentiation paragraph.

### Changed
- **README**: Related work consolidated into one table with Shape and Notes columns.

## [1.1.2] — 2026-04-30

### Added
- **ingest-web-chat subskill**: CDP-driven web chat ingestion from Claude.ai, ChatGPT, Gemini, Le Chat.

### Changed
- **SKILL.md slimmed**: 252 → 77 lines. Quality heuristics and tooling lazy-loaded from `references/`.
- **Subskill cleanup**: Dropped dead code, unused deps, orphan refs.

## [1.0.2] — 2026-04-29

### Added
- **Page quality heuristics** (`references/quality.md`): Minimum depth per type so pages don't stay stubs.
- **Query filing**: Syntheses that connect ≥2 pages get offered as `type: synthesis`.
- **Lint rules**: Deterministic fixes (broken links, orphans, type consistency) + heuristic reports (stale claims, thin pages, concept gaps).
- **Schema co-evolution**: Triggers that prompt SCHEMA.md updates.

### Changed
- **README**: Clarified minimal design, lazy-loaded recipes, Karpathy authority.

## [1.0.1] — 2026-04-28

### Added
- **Agent session recipe** (`references/agent-session-recipe.md`): Claude Code JSONL, Gemini CLI JSON, opencode SQLite.
- **Pi session fork traversal** (`references/pi-session-recipe.md`): Fork detection, custom event extraction, branch-by-branch reading.
- **npm install instructions** in README.

### Changed
- **SKILL.md**: Auto-fix deterministic lint, dropped search paragraph.

## [1.0.0] — 2026-04-28

### Added
- Initial release: Karpathy's LLM Wiki pattern as a minimal skill.
- Three operations: ingest, query, lint.
- Three-layer architecture: raw sources → compiled wiki → schema.
- 7 canonical page types: `concept`, `decision`, `bug`, `open-question`, `source`, `reference`, `synthesis`.
- Pi package manifest for `pi install`.
