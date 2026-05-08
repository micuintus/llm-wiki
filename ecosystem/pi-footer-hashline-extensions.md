---
title: Pi Footer, Powerline & Hashline Extension Landscape
type: reference
updated: 2026-05-05
sources:
  - https://github.com/nicobailon/pi-powerline-footer
  - https://github.com/RimuruW/pi-hashline-edit
  - https://github.com/coctostan/pi-hashline-readmap
  - https://github.com/can1357/oh-my-pi
  - https://github.com/mavam/pi-fancy-footer
  - https://github.com/juanibiapina/pi-powerbar
  - https://github.com/mcowger/pi-vitals
  - https://github.com/tomsej/pi-ext
  - https://github.com/diegopetrucci/pi-extensions
  - https://pi.dev/packages
  - https://github.com/shaftoe/awesome-pi-coding-agent
tags: [extension, footer, powerline, hashline, comparison]
---

# Pi Footer, Powerline & Hashline Extension Landscape

Comprehensive survey of all known pi coding agent extensions that modify the footer/status bar or replace the edit/read workflow with hash-anchored line references. Data current as of 2026-05-05.

---

## Footer / Powerline / Status Bar Extensions

### 1. pi-powerline-footer (nicobailon)

| Metric | Value |
|--------|-------|
| **GitHub** | [nicobailon/pi-powerline-footer](https://github.com/nicobailon/pi-powerline-footer) |
| **Stars** | 201 |
| **Forks** | 41 |
| **Open Issues** | 15 |
| **Releases** | 39 (latest v0.5.1, 2026-05-03) |
| **NPM** | `pi-powerline-footer` |
| **Weekly Downloads** | ~2,900 |
| **Monthly Downloads** | ~9,957 |
| **Versions** | 45 |
| **Dependencies** | 0 |
| **Size** | 332 KB |
| **License** | MIT |
| **Author** | Nico Bailon (npm: nicopreme) |

**Features:**
- Powerline-style status bar (inspired by Powerlevel10k and oh-my-pi)
- 6 presets: default, minimal, compact, full, nerd, ascii
- Welcome overlay with gradient logo and keyboard tips
- Working vibes (AI-generated themed loading messages via `/vibe`)
- Editor stash (`Alt+S`)
- Bash mode with PTY shell session
- Fixed editor mode + mouse scroll toggle
- Git branch/status, model name, thinking level, token usage, cost, context %
- Auto Nerd Font detection with ASCII fallback
- Configurable via `~/.pi/agent/settings.json`

**Code Quality:**
- Single-file `index.ts` (~96 KB) — monolithic but well-organized
- No external dependencies (self-contained)
- Active release cadence (39 releases in ~4 months)
- 4 contributors

**User Sentiment:**
- Dominant market share (~10K monthly downloads)
- Most starred pi footer extension by wide margin
- 15 open issues suggests active usage and some friction points
- Heavily forked (41) — indicates customization demand

---

### 2. pi-fancy-footer (mavam)

| Metric | Value |
|--------|-------|
| **GitHub** | [mavam/pi-fancy-footer](https://github.com/mavam/pi-fancy-footer) |
| **Stars** | 6 |
| **Forks** | 2 |
| **Open Issues** | 1 |
| **Releases** | 10 (latest v0.5.1, 2026-04-15) |
| **NPM** | `pi-fancy-footer` |
| **Weekly Downloads** | ~369 |
| **License** | MIT |
| **Author** | Matthias Vallentin (mavam) |

**Features:**
- Two-line fancy status footer (compact but information-dense)
- Interactive TUI config editor via `/fancy-footer`
- Widget system with 17 built-in widgets + extension widget API
- Context usage bar with compaction reserve tail
- PR number, unresolved review threads, PR CI status
- Git diff stats (added/removed), ahead/behind
- 8 context bar styles: blocks, lines, circles, parallelograms, diamonds, bars, stars, specks
- 4 icon families: nerd, emoji, unicode, ascii
- Per-widget layout controls (row, position, align, fill, min-width, colors)
- Third-party extension widget contribution API

**Code Quality:**
- Modular: `src/api.ts`, `src/config-editor.ts`, `src/render.ts`, `src/git.ts`, `src/ci.ts`, `src/pull-request.ts`
- Has tests (`src/ci.test.ts`, `src/git.test.ts`, `src/shared.test.ts`)
- Structured changelog with manifest.yaml per release
- 2 contributors

**User Sentiment:**
- Niche but well-crafted
- Unique widget API no other footer offers
- Lower adoption (~369/week vs ~2,900/week for pi-powerline-footer)
- Good for users who want deep customization without forking

---

### 3. pi-powerbar (juanibiapina)

| Metric | Value |
|--------|-------|
| **GitHub** | [juanibiapina/pi-powerbar](https://github.com/juanibiapina/pi-powerbar) |
| **Stars** | 22 |
| **Forks** | 2 |
| **Open Issues** | 1 |
| **NPM** | `@juanibiapina/pi-powerbar` |
| **Weekly Downloads** | ~555 |
| **Versions** | 13 |
| **Dependencies** | 1 |
| **Size** | 78.9 KB |
| **License** | MIT |

**Features:**
- Event-driven segment architecture (tmux-like left/right alignment)
- Any extension can emit `powerbar:update` to add segments — no imports needed
- Built-in segments: git-branch, tokens, context-usage, provider, model, subscription usage
- Progress bars with block/continuous styles
- Configurable via `pi-extension-settings` (`/extension-settings`)
- Placement: belowEditor or aboveEditor

**Code Quality:**
- Very modular: `powerbar/`, `powerbar-context/`, `powerbar-git/`, `powerbar-model/`, `powerbar-provider/`, `powerbar-sub/`, `powerbar-tokens/`
- Has tests (`test/powerbar-sub.test.js`)
- Uses `biome.json` for linting
- 3 contributors

**User Sentiment:**
- Praised for clean architecture
- Load order sensitivity is a known friction point
- Good for power users who want to compose their own status bar from multiple extensions
- Moderate adoption

---

### 4. pi-vitals (mcowger)

| Metric | Value |
|--------|-------|
| **GitHub** | [mcowger/pi-vitals](https://github.com/mcowger/pi-vitals) |
| **Stars** | 6 |
| **Forks** | 3 |
| **Open Issues** | 1 |
| **NPM** | `pi-vitals` |
| **Weekly Downloads** | ~48 |
| **License** | MIT |

**Features:**
- Customizable left/right segments
- Git integration (branch, staged, unstaged, untracked)
- Token tracking (input/output/total/cache read/cache write)
- Context awareness (usage %)
- Thinking level indicator
- Nerd Font auto-detection + ASCII fallback
- Live updates
- Config via `~/.pi/agent/powerline.json`

**Code Quality:**
- Small codebase (~8 files, no external dependencies)
- Simple and focused
- 1 contributor

**User Sentiment:**
- Very low adoption (~48/week)
- Functional but overshadowed by pi-powerline-footer
- Good as a lightweight alternative

---

### 5. minimal-footer (diegopetrucci)

| Metric | Value |
|--------|-------|
| **GitHub** | [diegopetrucci/pi-extensions](https://github.com/diegopetrucci/pi-extensions) (part of collection) |
| **Collection Stars** | 6 |
| **NPM** | `@diegopetrucci/pi-minimal-footer` |
| **Weekly Downloads** | ~266 |
| **License** | MIT |

**Features:**
- Minimal two-line layout
- Line 1: `<git-branch> <repo-name>`
- Line 2: `<context-%> <model> • <thinking>`
- Optional "DUMB ZONE" indicator
- OpenAI Codex 5-hour and 7-day usage tracking
- Narrow terminal fallback to one line

**Code Quality:**
- Very small (4.2 KB, 3 files)
- Part of larger `pi-extensions` monorepo

**User Sentiment:**
- Minimalist appeal
- Bundled with other useful extensions (oracle, permission-gate, notify)
- Low individual star count but decent npm downloads as part of collection

---

### 6. custom-footer (tomsej / pi-ext)

| Metric | Value |
|--------|-------|
| **GitHub** | [tomsej/pi-ext](https://github.com/tomsej/pi-ext) (part of collection) |
| **Collection Stars** | 35 |
| **Forks** | 2 |
| **License** | MIT |

**Features:**
- Compact powerline-style single line:
  `~/project (main) │ ↑12k ↓8k $0.42 │ 42%/200k │ ⚡ claude-sonnet-4 • medium`
- Part of `pi-ext` mega-collection (leader-key, tool-pills, review, telescope, session-snap, handoff, permissions, cmux)

**Code Quality:**
- Part of well-organized monorepo with 12+ extensions
- Good documentation
- 1 contributor

**User Sentiment:**
- Collection approach popular (35 stars)
- Not installable standalone from npm as "custom-footer" — must install full `pi-ext` or use package filtering

---

### 7. pi-powerline (unscoped)

| Metric | Value |
|--------|-------|
| **NPM** | `pi-powerline` |
| **Weekly Downloads** | ~242 |
| **Description** | "Powerline-style UI extensions for pi coding agent (custom editor, breadcrumb, footer, header)" |

**Status:**
- Moderate downloads but limited public info
- Appears to be a broader UI overhaul package, not just footer

---

## Hashline / Edit Tool Extensions

### 8. pi-hashline-edit (RimuruW)

| Metric | Value |
|--------|-------|
| **GitHub** | [RimuruW/pi-hashline-edit](https://github.com/RimuruW/pi-hashline-edit) |
| **Stars** | 44 |
| **Forks** | 8 |
| **Open Issues** | 1 |
| **Releases** | 4 (latest v0.5.4, 2026-04-19) |
| **NPM** | `pi-hashline-edit` |
| **Weekly Downloads** | ~225 |
| **Versions** | 6+ (0.6.0 on jsDelivr) |
| **License** | MIT |
| **Author** | RimuruW |

**Features:**
- Replaces built-in `read` and `edit` tools
- Hash-anchored line editing: `LINE#HASH:` prefix on every line
- Custom 16-char alphabet (`ZPMQVRWSNKTXJBYH`) to avoid collisions with code
- xxHash32 for hashing
- 4 edit ops: replace, append, prepend, replace_text
- Stale anchor detection (hash mismatch = file changed, reject edit)
- Chained edits with fresh anchor return
- Diff preview with `+`/`-` markers
- Atomic writes (temp-file-then-rename)
- Symlink/hardlink preservation
- Per-file mutation queue
- Hidden legacy compatibility for old `oldText`/`newText` format

**Code Quality:**
- Very well tested: 20+ test files covering core, extension, integration, tools
- Test categories: compute-affected-range, edit-diff, hashline strict input, hashline apply, hashline parse, hashline recovery, hashline resolve, path-utils, runtime, compatibility notify, edit preview, edit queue, edit replace-text, fs-write, permission errors
- Uses Bun
- 3 contributors

**User Sentiment:**
- Most popular standalone hashline extension
- Inspired by oh-my-pi, credited in README
- Good test coverage inspires confidence
- Low issue count (1 open) suggests stability

---

### 9. pi-hashline-readmap (coctostan)

| Metric | Value |
|--------|-------|
| **GitHub** | [coctostan/pi-hashline-readmap](https://github.com/coctostan/pi-hashline-readmap) |
| **Stars** | 21 |
| **Forks** | 5 |
| **Open Issues** | 1 |
| **NPM** | `pi-hashline-readmap` |
| **Weekly Downloads** | ~756 |
| **Versions** | 8+ (0.8.4 on jsDelivr) |
| **License** | MIT |

**Features:**
- **Unified replacement** for stock `read`, `edit`, `grep`, `ls`, `find`
- Hash-anchored reads and edits (`LINE:HASH|content`)
- Structural file maps (readmap) — 18 language mappers: TS, JS, Python, Rust, Go, Java, Swift, Shell, C/C++, Clojure, SQL, JSON/JSONL, Markdown, YAML, TOML, CSV/TSV
- Symbol-aware navigation (`read symbol: "foo"`)
- `ast_search` via ast-grep
- `write` tool with auto directory creation
- Optional `nu` tool (Nushell structured exploration)
- Bash output compression (RTK: test runners, builds, Git, Docker, linters, package managers, HTTP, transfer tools)
- `replace_symbol` edit op (swap entire function/class by name)
- Syntax regression validator (warn/block/off modes)
- Context hygiene system
- Doom loop detection and suggestions

**Code Quality:**
- Extensive test suite: 60+ test files
- Language-specific mappers in `src/readmap/mappers/`
- RTK (output compression) has 15+ specialized routes
- Well-documented with docs/ folder
- 1 contributor (solo but prolific)

**User Sentiment:**
- Highest weekly downloads among hashline tools (~756 vs ~225)
- "One extension instead of stacking overlapping packages" is a strong value prop
- More complex but more comprehensive
- Good for users who want a complete workflow overhaul

---

### 10. oh-my-pi (can1357)

| Metric | Value |
|--------|-------|
| **GitHub** | [can1357/oh-my-pi](https://github.com/can1357/oh-my-pi) |
| **Stars** | 3,946 |
| **Forks** | 363 |
| **Open Issues** | 126 |
| **License** | MIT |
| **Type** | Full pi-mono fork, not an extension |

**Features:**
- Hash-anchored edits (the original inspiration for all hashline extensions)
- Optimized tool harness
- LSP integration (11 operations, 40+ languages)
- Python tool with IPython kernel
- TTSR (Time Traveling Streamed Rules) — zero-cost context rules
- Interactive code review (`/review`)
- Task/subagent system with 6 bundled agents
- Commit tool with AI-powered conventional commits
- Bash mode
- Browser tool
- Autonomous memory

**Code Quality:**
- Massive monorepo (Rust + TypeScript)
- CI/CD with GitHub Actions
- Issue templates, PR templates, security policy
- 3.9K stars indicates strong community interest

**User Sentiment:**
- By far the most popular pi-related project (3,946 stars)
- But it's a **fork**, not an extension — requires switching from pi-mono entirely
- 126 open issues suggests high activity and some rough edges
- The hashline concept originated here; RimuruW and coctostan both credit it

---

## Summary Comparison Table

### Footer / Powerline Extensions

| Extension | Stars | Forks | Weekly DL | Size | Deps | Tested | Presets | Widget API | Nerd Font |
|-----------|------:|------:|----------:|-----:|-----:|--------|---------|------------|-----------|
| **pi-powerline-footer** | 201 | 41 | ~2,900 | 332 KB | 0 | Partial | 6 | No | Auto |
| **pi-fancy-footer** | 6 | 2 | ~369 | — | — | Yes | 0 (widget-based) | Yes | 4 families |
| **pi-powerbar** | 22 | 2 | ~555 | 79 KB | 1 | Yes | N/A (event-driven) | Event-based | No |
| **pi-vitals** | 6 | 3 | ~48 | — | — | No | Custom JSON | No | Auto |
| **minimal-footer** | 6* | 0 | ~266 | 4 KB | 0 | No | 0 | No | No |
| **custom-footer** | 35* | 2 | — | — | — | No | 0 | No | No |
| **pi-powerline** | — | — | ~242 | — | — | — | — | — | — |

*Collection stars, not individual extension.

### Hashline / Edit Extensions

| Extension | Stars | Forks | Weekly DL | Replaces | Languages | Maps | Tests |
|-----------|------:|------:|----------:|----------|-----------|------|-------|
| **pi-hashline-edit** | 44 | 8 | ~225 | read, edit | — | No | 20+ files |
| **pi-hashline-readmap** | 21 | 5 | ~756 | read, edit, grep, ls, find | 18 | Yes | 60+ files |
| **oh-my-pi** | 3,946 | 363 | N/A (fork) | Entire pi-mono | 40+ (LSP) | Yes | CI only |

---

## Recommendations

### For Footer / Status Bar

1. **Default choice:** `pi-powerline-footer` — highest adoption, most features, zero dependencies, active maintenance. The 201 stars and ~10K monthly downloads make it the de facto standard.

2. **If you want maximum customization:** `pi-fancy-footer` — unique widget API and interactive TUI config editor. Better for users who want to tweak every pixel.

3. **If you want composability:** `pi-powerbar` — event-driven architecture lets multiple extensions contribute segments without knowing about each other. Best for advanced users building a custom stack.

4. **If you want minimalism:** `minimal-footer` from diegopetrucci's collection — two lines, no fuss. Or `pi-vitals` for a simple config-file-based approach.

### For Hashline / Edit Safety

1. **For focused edit safety:** `pi-hashline-edit` — replaces just read/edit, excellent test coverage, stable. Good if you want hashline without changing your whole workflow.

2. **For complete workflow overhaul:** `pi-hashline-readmap` — replaces 5 tools, adds structural maps, AST search, bash compression. Higher complexity but higher reward. Best for large codebase work.

3. **For the full experience:** `oh-my-pi` fork — but this means leaving pi-mono entirely. Only viable if you're willing to switch to a forked ecosystem.

---

## Related Wiki Pages

- [Footer themes and working-state visualization](footer-themes.md)
- [Pi extension ecosystem](../index.md)
