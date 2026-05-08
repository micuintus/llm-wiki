---
title: Pi Hashline Edit Tools — Comparative Reference
type: reference
updated: 2026-05-05
sources:
  - https://github.com/RimuruW/pi-hashline-edit
  - https://github.com/coctostan/pi-hashline-readmap
  - https://github.com/can1357/oh-my-pi
  - https://github.com/bruclan/pi-hashline-edit
  - https://github.com/Whamp/pi-read-map
  - https://github.com/kcosr/codemap
  - https://www.npmjs.com/package/pi-hashline-edit
  - https://www.npmjs.com/package/pi-hashline-readmap
  - https://www.npmjs.com/package/pi-read-map
tags: [extension, hashline, edit, tools, comparison]
see_also:
  - pi-footer-hashline-extensions.md
  - footer-themes.md
---

# Pi Hashline Edit Tools — Comparative Reference

Deep-dive comparison of all known hashline-style edit extensions for the pi coding agent. Hashline tools replace the stock `read`/`edit` workflow with content-anchored line references so the agent can detect stale context and reject outdated edits before they corrupt files.

Data current as of 2026-05-05. Source code read directly for this comparison.

---

## 1. pi-hashline-edit (RimuruW)

| Metric | Value |
|--------|-------|
| **GitHub** | [RimuruW/pi-hashline-edit](https://github.com/RimuruW/pi-hashline-edit) |
| **Stars** | 44 |
| **Forks** | 8 |
| **Open Issues** | 1 |
| **Releases** | 4 (latest v0.6.0, 2026-04-22) |
| **NPM** | `pi-hashline-edit` |
| **Weekly Downloads** | ~225 |
| **License** | MIT |
| **Inspiration** | [oh-my-pi](https://github.com/can1357/oh-my-pi) (can1357) |
| **Contributors** | 3 |
| **src/ LOC** | ~3,700 |
| **Test files** | 32 |

**What it replaces:** `read`, `edit`

**Hashline format:** `10#VR:function hello() {` — line number + 2-char content hash from custom 16-char alphabet (`ZPMQVRWSNKTXJBYH`).

**Edit operations:**
- `replace` — single line or inclusive range
- `append` — insert after anchor (or EOF if omitted)
- `prepend` — insert before anchor (or BOF if omitted)
- `replace_text` — exact unique substring match anywhere in file

**Core philosophy: "Fail hard, be predictable"**

Stale anchors **always fail**. No silent relocation to "close enough" lines. The README explicitly states: *"No fallback relocation. Mismatched anchors are never silently relocated to a 'close enough' line. This trades convenience for correctness."*

Error messages are superb:
- `[E_STALE_ANCHOR]` with `>>> LINE#HASH:` ready to copy
- `[E_INVALID_PATCH]` when model accidentally includes display prefixes
- `[E_BAD_REF]` with specific diagnosis for every malformed input (missing hash, wrong separator, invalid characters)
- `[E_EDIT_CONFLICT]` when edits overlap

**Hashing:** xxHash32 (via `xxhashjs`) mapped to custom alphabet. Lines with no alphanumeric chars use line number as seed. The alphabet deliberately excludes hex digits, visually confusable letters (D, G, I, L, O), and common vowels — so `5#MQ` can never be mistaken for code content.

**Key design decisions:**
- Strict patch validation — rejects accidental `LINE#HASH:` prefixes or diff markers in patch content (never silently strips)
- Legacy compatibility mode for `oldText`/`newText` payloads (surfaced to UI so operator knows model isn't using hashline)
- Atomic writes via temp-file-then-rename
- Symlinks resolved, hardlinks preserved, permissions kept
- Per-file mutation queue (serializes concurrent edits through different symlink paths)
- Bottom-up edit application for stable line numbers
- Fuzzy Unicode normalization (smart quotes, hyphens, spaces) but conservative — only for validation, not relocation

**Prompt engineering (`prompts/edit.md`):**
- ~15 lines, concise
- Clear rules: "Do not guess, shift, or construct anchors"
- Explicit error code list
- "For distant follow-ups, or on any error, call `read` again"

**Code quality:**
- `hashline.ts` (1,060 LOC) — meticulously commented, excellent error diagnostics (`diagnoseLineRef` gives specific guidance for every malformed input), clean separation between parsing, validation, and application
- `edit.ts` (1,085 LOC) — clear flow: validate → resolve spans → detect conflicts → apply bottom-up
- Uses Bun (modern runtime)
- Dependencies: `diff`, `file-type`, `xxhashjs`
- Peer deps: `@mariozechner/pi-ai`, `@mariozechner/pi-coding-agent`, `@mariozechner/pi-tui`, `@sinclair/typebox`

**Test coverage:** 32 test files across core, extension, integration, tools.

**User sentiment:** Most popular standalone hashline extension by stars. Low issue count (1 open) suggests stability. Good for users who want hashline safety without changing their entire toolset.

---

## 2. pi-hashline-readmap (coctostan)

| Metric | Value |
|--------|-------|
| **GitHub** | [coctostan/pi-hashline-readmap](https://github.com/coctostan/pi-hashline-readmap) |
| **Stars** | 21 |
| **Forks** | 5 |
| **Open Issues** | 1 |
| **NPM** | `pi-hashline-readmap` |
| **Weekly Downloads** | ~756 (3.4x hashline-edit) |
| **License** | MIT |
| **Inspiration** | [oh-my-pi](https://github.com/can1357/oh-my-pi) (can1357) — header says "Vendored & adapted from oh-my-pi" |
| **Contributors** | 1 (solo but prolific) |
| **src/ LOC** | ~12,200 |
| **Test files** | **281** |

**What it replaces:** `read`, `edit`, `grep`, `ls`, `find` — plus adds `write`, `ast_search`, optional `nu`

**Hashline format:** `45:4bf|export function createDemoDirectory(): UserDirectory {` — line number + 3-char hex hash, pipe-delimited.

**Edit operations:**
- `set_line` — replace single line by anchor
- `replace_lines` — replace range by start/end anchors
- `insert_after` — insert after anchor
- `replace` — fallback global string replacement (no anchors)
- `replace_symbol` — swap entire function/class/method by name (no anchors needed)

**Core philosophy: "Be helpful, recover gracefully"**

`readmap` tries **much harder** to make edits succeed. The README does not advertise this as a deviation — it's just the default behavior.

**Recovery heuristics (all in `hashline.ts`):**
- **Auto-relocation:** searches ±N lines (adaptive window: `max(20, edits.length * 5)`, capped at 100) for matching hash. Relocation noted in warnings.
- **Fuzzy recovery:** if anchor includes content after `|`, scans ±50 lines for token-similar match (>0.8 similarity). Updates anchor hash post-relocation.
- **Merge detection:** `maybeExpandSingleLineMerge` detects when model accidentally merged two continuation lines and restores original form.
- **Echo stripping:** removes accidentally copied anchor lines from edit payload (`stripInsertAnchorEcho`, `stripRangeBoundaryEcho`).
- **Duplicate target warnings:** detects multiple edits to same anchor, keeps last-wins.
- **Restore old wrapped lines:** detects when model split a single original line into multiple lines and restores the original.
- **Confusable hyphen normalization:** replaces unicode hyphens with ASCII `-`.
- **Indent restoration:** `restoreIndentPaired` preserves original indentation.

**Additional features:**
- Structural file maps (readmap) — 18 language mappers: TS, JS, Python, Rust, Go, Java, Swift, Shell, C/C++, Clojure, SQL, JSON/JSONL, Markdown, YAML, TOML, CSV/TSV
- Symbol-aware navigation: `read({ path: "foo.ts", symbol: "createDemoDirectory" })`
- `replace_symbol` — swap entire symbol by name, auto-reindents new body
- AST search via ast-grep: `ast_search({ pattern: "console.log($$$ARGS)", lang: "typescript" })`
- Bash output compression (RTK) — 15+ specialized routes
- Syntax regression validator after writes (warn/block/off modes)
- Context hygiene system + doom loop detection/suggestions
- Optional Nushell integration

**Hashing:** xxHash32 via `xxhash-wasm` (WASM, faster than pure-JS). Hash is computed on whitespace-stripped line content. 3-char hex output.

**Prompt engineering (`prompts/edit.md`):**
- ~200+ lines
- Decision matrix: when to use which of 5 variants
- Detailed input format with examples
- "Prefer anchored variants" guidance
- "replace is the escape hatch"
- Much heavier investment in guiding the LLM

**Code quality:**
- `hashline.ts` — powerful but dense. Relocation, fuzzy recovery, merge detection, and echo stripping are intertwined.
- `edit.ts` — complex, many inline helpers (echo stripping, indent restoration, wrapped line restoration, merge expansion)
- Uses vitest for testing
- Dependencies: `diff`, `xxhash-wasm`, and more

**Test coverage:** **281 test files** — industrial-grade. Covers: bash filters, context hygiene, doom loops, edit gates, find, grep, entry point, binary detection, compact diff, adaptive relocation, and 60+ more categories.

**User sentiment:** Highest weekly downloads among hashline tools. Value prop: "one extension instead of stacking overlapping packages." More complex but more comprehensive. Good for large codebase work.

---

## 3. oh-my-pi (can1357)

| Metric | Value |
|--------|-------|
| **GitHub** | [can1357/oh-my-pi](https://github.com/can1357/oh-my-pi) |
| **Stars** | 3,946 |
| **Forks** | 363 |
| **Open Issues** | 126 |
| **License** | MIT |
| **Type** | **Full fork of pi-mono**, not an extension |

**What it replaces:** Everything — complete pi-mono fork with hashline built in natively.

**Hashline features:**
- Content-anchored line references (the original implementation)
- Both RimuruW and coctostan explicitly credit can1357
- `readmap`'s header: *"Vendored & adapted from oh-my-pi (MIT, github.com/can1357/oh-my-pi). Key additions ported: merge detection, confusable hyphens, restoreOldWrappedLines."*
- `hashline-edit`'s README: *"Inspired by oh-my-pi"*

**Other features:** LSP integration (11 ops, 40+ languages), Python IPython kernel, TTSR (Time Traveling Streamed Rules), interactive code review, task/subagent system, bash mode, AI-powered commit tool.

**User sentiment:** The original source of the hashline concept. 126 open issues indicates high activity. **Critical caveat:** This is a fork, not an extension. Using it means leaving pi-mono.

---

## 4. pi-read-map (Whamp) — *not a hashline tool, but related*

| Metric | Value |
|--------|-------|
| **GitHub** | [Whamp/pi-read-map](https://github.com/Whamp/pi-read-map) |
| **Stars** | 15 |
| **Forks** | 2 |
| **Open Issues** | 0 |
| **NPM** | `pi-read-map` |
| **Weekly Downloads** | ~141 |
| **License** | MIT |
| **Inspiration** | [codemap](https://github.com/kcosr/codemap) (kcosr) |
| **Contributors** | Whamp + ghoseb (Clojure mapper) |
| **Created** | 2026-02-09 |
| **Last push** | 2026-02-21 (~3 months ago — slightly stale) |
| **Total commits** | 67 |

**What it does:** Augments the built-in `read` tool with **structural file maps** for large files (>2,000 lines or >50 KB). Smaller files pass through unchanged. Does **not** replace `edit`, does **not** use hash anchors.

**Key distinction from hashline tools:** Pure AST parsing, no heuristics. Tree-sitter / ts-morph / Python AST / Go AST / ctags / grep fallback. **Fact-based, not assumption-based.**

**Languages supported (17):** TypeScript, JavaScript, Python, Go, Rust, C, C++, Clojure, ClojureScript, SQL, JSON, JSONL, YAML, TOML, CSV, Markdown, EDN.

**Output example:**
```
[Truncated: showing first 2000 lines of 10,247 (50 KB of 412 KB)]
───────────────────────────────────────
File Map: path/to/large-file.ts
10,247 lines │ 412 KB │ TypeScript
───────────────────────────────────────

class ProcessorConfig: [18-32]
class BatchProcessor: [34-890]
  constructor(config: ProcessorConfig): [40-65]
  async run(items: List<Item>): [67-180]
  ...
```

**Budget enforcement:** Progressive detail reduction: 10 KB full → 15 KB compact → 20 KB minimal → 50 KB outline → 100 KB hard cap. In-memory cache by path + mtime.

**Test coverage:** Extensive — unit tests per mapper, integration tests, e2e tests via tmux, benchmarks, pathological fixtures (deep nesting, many symbols, binaries).

**Relationship to other tools:**
- This is **the same structural-map feature** that `pi-hashline-readmap` includes, extracted as a standalone extension.
- Composes cleanly with `pi-hashline-edit` — they touch different concerns (read augmentation vs edit safety).
- Inspired by [codemap](https://github.com/kcosr/codemap), a similar tool for other coding agents.

**Caveat:** Last commit ~3 months ago. Project may be in maintenance mode. 67 commits over ~2 weeks of intense development, then quiet.

**Use case:** Pair with `pi-hashline-edit` if you want hashline edit safety + structural maps without taking on `pi-hashline-readmap`'s heuristic recovery layer.

---

## 5. bruclan/pi-hashline-edit

| Metric | Value |
|--------|-------|
| **GitHub** | [bruclan/pi-hashline-edit](https://github.com/bruclan/pi-hashline-edit) |
| **Type** | Fork/mirror of RimuruW/pi-hashline-edit |
| **Status** | Unmaintained |
| **NPM** | None (not published separately) |

No independent development activity. Listed in awesome-pi-coding-agent directory.

---

## Deep Comparison

### Philosophy Divergence

| | pi-hashline-edit | pi-hashline-readmap |
|---|---|---|
| **Stale anchor handling** | **Fail hard** — always reject, model must re-read | **Recover gracefully** — auto-relocate, fuzzy match |
| **Recovery window** | None | Adaptive: `max(20, edits*5)`, capped at 100 lines |
| **Fuzzy matching** | Whitespace/unicode normalization only | Token similarity scan (±50 lines, >0.8 threshold) |
| **Merge detection** | No | Yes (`maybeExpandSingleLineMerge`) |
| **Echo stripping** | No — strict rejection | Yes — strips accidental anchor copies |
| **Wrapped line restoration** | No | Yes (`restoreOldWrappedLines`) |
| **Approach to oh-my-pi** | "Inspired by" — took concept, stripped heuristics | "Vendored & adapted from" — ported heuristics |

### Code Metrics (read from source)

| | pi-hashline-edit | pi-hashline-readmap |
|---|---|---|
| **src/ LOC** | ~3,700 | ~12,200 |
| **Test files** | 32 | **281** |
| **Test runner** | Bun | Vitest |
| **Hash engine** | `hashline.ts` (1,060 LOC, clean) | `hashline.ts` (dense, many heuristics) |
| **Edit engine** | `edit.ts` (1,085 LOC, clear flow) | `edit.ts` (complex, many inline helpers) |
| **Prompt length** | ~15 lines (concise) | ~200+ lines (decision matrix) |
| **Hash algo** | xxhashjs (pure JS) | xxhash-wasm (WASM) |
| **Hash length** | 2 chars (custom alphabet) | 3 chars (hex) |
| **Runtime deps** | diff, file-type, xxhashjs | diff, xxhash-wasm, more |

### Prompt Engineering for the LLM

| | pi-hashline-edit | pi-hashline-readmap |
|---|---|---|
| **Length** | ~15 lines | ~200+ lines |
| **Style** | Rules + example + error codes | Decision matrix + 5 variants + detailed examples |
| **Key instruction** | "Do not guess, shift, or construct anchors" | "Prefer anchored variants" |
| **Error recovery guidance** | "For distant follow-ups, or on any error, call `read` again" | "Use the updated LINE:HASH references shown below" |

`readmap` invests **heavily** in prompt engineering. This matters because LLM behavior with hashline tools depends critically on prompt guidance.

---

## Comparison Matrix

| Attribute | pi-hashline-edit | pi-hashline-readmap | oh-my-pi |
|-----------|-----------------:|--------------------:|---------:|
| **GitHub Stars** | 44 | 21 | 3,946 |
| **Weekly NPM DL** | ~225 | **~756** | N/A (fork) |
| **Replaces** | read, edit | read, edit, grep, ls, find | Entire pi-mono |
| **Hash format** | `LINE#HASH:` | `LINE:HASH\|content` | Native |
| **Edit ops** | 4 | 5 (incl. `replace_symbol`) | Native |
| **Auto-relocation** | **No** | **Yes** | Yes |
| **Fuzzy recovery** | **No** | **Yes** | Yes |
| **Merge detection** | **No** | **Yes** | Yes |
| **Symbol nav** | No | Yes (18 languages) | Yes (LSP, 40+ langs) |
| **AST search** | No | Yes (ast-grep) | No |
| **Bash compression** | No | Yes (RTK, 15+ routes) | No |
| **Context hygiene** | No | Yes | No |
| **Doom loop guard** | No | Yes | No |
| **Test files** | 32 | **281** | CI only |
| **Bus factor** | **3 contributors** | 1 | 1+ |
| **Dependencies** | 3 runtime | More | Full monorepo |
| **Install** | `pi install npm:pi-hashline-edit` | `pi install npm:pi-hashline-readmap` | Switch to fork |
| **Migration cost** | Low | Medium | High |

---

## Recommendation

| Criterion | Winner | Why |
|-----------|--------|-----|
| **Adoption** | readmap | 3.4x weekly downloads |
| **Code elegance** | hashline-edit | Cleaner, better commented, easier to audit |
| **Test coverage** | readmap | 281 vs 32 test files |
| **Feature richness** | readmap | Symbol nav, AST search, bash compression, syntax validation |
| **Correctness philosophy** | hashline-edit | Strict, predictable, no magic |
| **Recovery / UX** | readmap | Auto-relocation, fuzzy recovery, merge detection |
| **Bus factor** | hashline-edit | 3 contributors vs 1 |
| **Migration safety** | hashline-edit | Replaces 2 tools vs 5 |
| **Prompt quality** | readmap | Much more guidance for the LLM |
| **Closer to oh-my-pi spirit** | readmap | Ports heuristics, auto-relocation, merge detection |

### Use-case guidance

| Use case | Choice |
|----------|--------|
| **Minimal change, strict correctness** | `pi-hashline-edit` — low migration cost, fail-hard, well-tested |
| **Hashline safety + structural maps, fact-based only** | `pi-hashline-edit` + `pi-read-map` — composable, no heuristic recovery |
| **Large codebases, structural nav, accept heuristics** | `pi-hashline-readmap` — symbol maps + AST search + bash compression |
| **Want oh-my-pi-like behavior in pi-mono** | `pi-hashline-readmap` — ports the heuristics |
| **All-in on hashline philosophy** | `oh-my-pi` fork — but commit to leaving pi-mono |
| **Want hashline + footer** | Either hashline tool + `pi-powerline-footer` (orthogonal) |

## Three-way deep comparison: readmap vs edit+read-map vs oh-my-pi

For users weighing the all-in-one vs composed vs fork approaches, on the dimensions that matter when you value fact-based behavior over heuristic recovery.

### Architecture & surface area

| | pi-hashline-readmap | pi-hashline-edit + pi-read-map | oh-my-pi |
|---|---|---|---|
| **Form factor** | 1 extension | 2 composed extensions | Full pi-mono fork |
| **Replaces tools** | read, edit, grep, ls, find + adds write, ast_search, nu | read, edit (hashline) + read augmented (read-map) | Native — no extension model |
| **src/ LOC total** | ~12,200 | ~3,700 + ~2,500 ≈ ~6,200 | Massive monorepo (TS+Rust) |
| **Test files total** | 281 | 32 + extensive (unit+integration+e2e+bench) | CI-only |
| **Distinct authors** | 1 (solo) | 6 (4 + 2) | Many |
| **Auditability** | Hard — dense, intertwined heuristics | Easy — two focused codebases | Impossible — too large |
| **Migration cost** | Medium (5 tools replaced) | Low (2 tools replaced + 1 augmented) | Catastrophic — leave pi-mono |

### Fact-based vs assumption-based

| Behavior | readmap | edit+read-map | oh-my-pi |
|---|---|---|---|
| Stale anchor | Auto-relocates ±N (up to ±100) | **Fails hard** — model re-reads | Auto-relocates (origin) |
| Fuzzy content match | Token similarity >0.8, ±50 lines | None | Yes |
| Merge detection | `maybeExpandSingleLineMerge` | None | Yes |
| Wrapped-line restoration | `restoreOldWrappedLines` | None | Yes |
| Echo stripping | Heuristic | None | Yes |
| Structural map source | Mix heuristics + AST | **Pure AST** with grep last-fallback only | Pure AST (LSP-driven) |
| Confusable hyphen normalization | Auto | None | Yes |
| Indent restoration | `restoreIndentPaired` | None | Yes |
| **Verdict** | High assumption density | **Minimal — facts unless explicitly opted in** | High assumption density |

The composed combo is the only fact-based option. `readmap` and `oh-my-pi` are philosophically aligned: both believe LLM mistakes should be silently corrected. `edit + read-map` believes mistakes should surface and trigger a re-read.

### What you give up with the composed combo

| Feature | readmap | edit+read-map | Cost of absence |
|---|---|---|---|
| Auto-relocation | ✓ | ✗ | More re-reads when files churn |
| Bash output compression (RTK) | ✓ (15+ routes) | ✗ | Verbose test/build output eats tokens |
| `ast_search` | ✓ | ✗ | Falls back to grep for syntax queries |
| `read symbol:"foo"` | ✓ | ✗ (use map+offset) | Two steps instead of one |
| `replace_symbol` op | ✓ | ✗ | Use `replace_lines` for whole-symbol swaps |
| Doom loop detection | ✓ | ✗ | No automatic guard against repeat-fail loops |
| Context hygiene | ✓ | ✗ | No automatic stale-tool-result rehydration |
| Syntax regression validator | ✓ | ✗ | Won't auto-catch parse-breaking edits |
| Optional `nu` (Nushell) | ✓ | ✗ | Nice-to-have for structured data |

### What you give up with oh-my-pi

Everything pi-mono is. Leave `badlogic/pi-mono` upstream, lose all other extensions unless compatible (`pi-powerline-footer`, `pi-tool-display`, `pi-web-access`, `agent-slack`, jira-skill, googleworkspace), inherit 126 open issues. Gain LSP integration, IPython kernel, TTSR, `/review`, subagents, AI commit tool. **Different product, not a choice for active pi-mono contributors.**

### Project health side-by-side

| | readmap | hashline-edit | read-map | oh-my-pi |
|---|---|---|---|---|
| Stars | 21 | 44 | 15 | 3,946 |
| Weekly npm DL | 756 | 225 | 141 | N/A |
| Total commits | ~182 | ~162 | 67 | massive |
| Distinct contributors | 2 | 4 | 2 | many |
| Last commit | 2026-05-02 (3d) | 2026-04-28 (7d) | **2026-02-21 (~3mo)** | recent |
| Open issues | 1 | 1 | 0 | 126 |
| Bus factor | Low | Higher | Low (stale) | Distributed |

The composed combo's weakest link is `pi-read-map` — last push 3 months ago. Works, but if pi-mono ships breaking extension API changes, no one may patch it promptly.

### Token economics

| | Upfront cost | Ongoing benefit |
|---|---|---|
| readmap | Maps 2–10K tokens on large reads | RTK saves 30–60% on noisy bash; pays for itself on big repos |
| edit + read-map | Maps 2–10K tokens on large reads | Pays back on file navigation; bash stays verbose |
| oh-my-pi | Native, integrated; TTSR claims zero-cost rules | Best-optimized in theory |

If you run a lot of `npm test`, `cargo build`, `git log` through bash, readmap's RTK is a real token saver the composed combo doesn't replicate.

### Decision matrix for fact-based-preferring pi-mono contributors

| Approach | Verdict |
|---|---|
| `pi-hashline-readmap` | Powerful, but every recovery heuristic violates the stated preference |
| `pi-hashline-edit` + `pi-read-map` | **Matches stated values exactly.** Trade-off: lose RTK bash compression and `replace_symbol` |
| `oh-my-pi` | Leaves pi-mono — incompatible with the rest of the work |

### Revisit triggers

Switch from composed combo to readmap if:
- Bash output tokens become a real cost ceiling (heavy CI/test usage in-session)
- `pi-read-map` goes fully unmaintained for >6 months
- You start needing `replace_symbol` or `ast_search` regularly

---

### Composition note: `pi-hashline-edit` + `pi-read-map`

These two extensions are **orthogonal and complementary**:
- `pi-hashline-edit` overrides `read` and `edit` for hash-anchored edit safety
- `pi-read-map` augments `read` output with structural maps for large files

**Load order matters.** `pi-read-map` intercepts `read` first; if both are loaded, verify the chain works as expected (the hashline `read` may need to run before the map appendage, or vice versa). Test by reading a >2K-line file and checking that both the hashline anchors AND the structural map appear in output.

This combination gives you most of `pi-hashline-readmap`'s value **without** the auto-relocation, fuzzy recovery, and merge detection heuristics — appealing if you prefer fact-based tools over assumption-based ones.

### For pi-mono specifically

`pi-hashline-edit` is the safer choice. The strict philosophy matters more in a codebase with aggressive test suites and internal tool harnesses — "magic recovery" can mask real problems. The smaller surface area (~3.7K LOC, 2 tools replaced) is also a virtue in a repo where you're already managing complexity.

---

## Related Wiki Pages

- [Pi Footer, Powerline & Hashline Extension Landscape](pi-footer-hashline-extensions.md) — broader survey including footer/powerline tools
- [Footer themes and working-state visualization](footer-themes.md)
