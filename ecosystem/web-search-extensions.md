---
title: Pi Web Search Extensions — Comparison
type: reference
updated: 2026-05-05
sources:
  - session:2026-05-04-web-search-research
  - ../raw-sources/conversations/2026-05-05-claude-best-web-search-extension-for-pi-coding-agent.md
see_also:
  - [Web Search Providers](web-search-providers.md)
  - [Web Search Provider Strategy](../decisions/web-search-provider-strategy.md)
  - [Extension load error](../bugs/typebox-zod-schema-error.md)
---

# Pi Web Search Extensions — Comparison

In-depth comparison of all published Pi web search extensions and skills.

## Overview Table

| Package | Author | Type | Stars | Forks | Open Issues | Weekly npm | Monthly npm |
|---|---|---|---|---|---|---|---|
| **`pi-web-access`** | nicobailon | Extension | 427 | 67 | 34 | **7,408** | **~21,800** |
| **`pi-codex-web-search`** | ayagmar | Extension | 17 | 1 | 0 | 35 | ~150 |
| **`pi-free-web-search`** | Albertobelleiro | Extension | 0 | 0 | 3 | 57 | ~250 |
| **`pi-web-extension`** | NicoAvanzDev | Extension | 1 | 1 | 0 | 28 | ~120 |
| **`@coctostan/pi-exa-gh-web-tools`** | coctostan | Extension | 1 | 2 | 1 | 13 | ~55 |
| **`pi-web-utils`** | shantanugoel | Extension | 2 | 0 | 0 | 14 | ~60 |
| **`@aemonculaba/pi-search`** | eysenfalk | Extension | 3 | 1 | 3 | 24 | ~100 |
| **`brave-search`** | badlogic/pi-skills | **Skill** | — | — | — | N/A | N/A |
| **`@joemccann/pi-exa`** | joemccann | Extension | — | — | — | — | — |
| **`pi-exa-search`** | najibninaba | Extension | — | — | — | — | — |

## Code Quality

| Package | TS Files | Tests | CI | tsconfig | Lint | Verdict |
|---|---|---|---|---|---|---|
| `pi-web-access` | 23 | 2 | No | No | None | Poor: 2300-line monolith, no TS config, no CI, 34 open issues |
| `pi-free-web-search` | 22 | 6 | Yes | Yes | `tsc` | Best structured: modular, health tracking, token-efficient modes, prompts + skills |
| `@coctostan/pi-exa-gh-web-tools` | 41 | 23 | No | Yes | `tsc` | Best tested: caching, batching, dedup, CLI binary, but over-engineered planning artifacts |
| `pi-codex-web-search` | 10 | 3 | Yes | Yes | ESLint + Prettier | Clean: Codex JSONL parsing, budget tracking, retry logic |
| `pi-web-extension` | 3 | 1 | Yes | Yes | oxlint + oxfmt | Minimal but correct: linted, tested, focused |
| `pi-web-utils` | 9 | 0 | No | Yes | `tsc` | Clean architecture, zero tests, no CI |
| `@aemonculaba/pi-search` | 1 + CJS | 1 | Yes | No | None | Basic: single file, CJS build, policy injection |
| `brave-search` (skill) | 2 JS | 0 | No | No | None | Official skill: lightweight, no browser, headless |

## What Each Does

| Package | Search Providers | Fetch | Special Features |
|---|---|---|---|
| **`pi-web-access`** | Exa (MCP/direct), Perplexity, Gemini API, Gemini Web (browser cookies) | Readability+Turndown, Jina fallback | **Video analysis** (YouTube + local), PDF extraction, GitHub cloning, `librarian` skill, curator browser |
| **`pi-free-web-search`** | Yahoo (default), Google, Bing, DDG, Brave, SearXNG | HTTP-first, browser fallback | **Free, no API keys**, browser automation, health tracking, token-efficient modes, prompt templates + skills |
| **`@coctostan/pi-exa-gh-web-tools`** | Exa only | Readability+Turndown, GitHub clone | Research cache, query enhancement, dedup, parallel batch, content offloading, standalone CLI |
| **`pi-codex-web-search`** | Delegates to local `codex` CLI | Defuddle fallback | Codex auth reuse, budget tracking, fast/deep modes, settings persistence |
| **`pi-web-extension`** | Brave (HTML scrape), DDG fallback | Turndown to temp file | Prompt steering (auto-detects URLs/search intent), token-aware |
| **`pi-web-utils`** | Google, DDG, SearXNG, custom (configurable chain) | markdown.new → Readability+Turndown | GitHub clone + local `rg`/`grep` search, highly configurable engines |
| **`@aemonculaba/pi-search`** | OpenAI/Codex native `web_search` only | Readability+Turndown, Playwright fallback | Policy injection (blocks bash curl/wget), auth priority chain |
| **`brave-search` (skill)** | Brave Search API | Readability+Turndown | Official skill, lightweight, headless, requires API key |

## User Sentiment

**`pi-web-access`** — Dominant by usage (~300x nearest competitor). Users love zero-config Exa MCP, video analysis, multi-provider fallbacks. Pain points: Exa MCP timeouts, curator browser opening when disabled, WSL issues, hardcoded paths. High engagement, feature-rich but increasingly buggy.

**Others** — Too low usage to gauge meaningful sentiment. `pi-codex-web-search` has satisfied niche users (Codex CLI delegation). `pi-free-web-search` is early stage.

## Market Structure

The market is a **monopoly with a long tail**. `pi-web-access` has ~7,400 weekly downloads vs. ~50 for the next closest. It wins on features, not engineering quality. There's room for a well-engineered competitor.

## Recommendation for Pi Core

- **Today**: `pi-web-access` is the practical choice for users who need full features
- **For core integration**: Study `pi-free-web-search` (architecture) and `@coctostan/pi-exa-gh-web-tools` (testing, caching). Build something with similar feature coverage but better engineering
- **For simple needs**: `pi-web-extension` (Brave/DDG, no API keys) or the official `brave-search` skill
- **For Exa-only, minimal**: `@joemccann/pi-exa` (single tool, just `EXA_API_KEY`) or `pi-exa-search` (adds an `/exasearch` command + skill). Both bypass `pi-web-access`'s feature surface when all you want is "search the web, get results".

## What Mario uses

Mario Zechner himself ships and recommends the `brave-search` **skill**
in `pi-skills` (1.2k★), not an extension. His agent-tools repo states
"Use brave-search unless you specifically need Google results." This
aligns with pi's "skills > MCP/extensions" philosophy: a SKILL.md +
bash script invoked via the built-in `bash` tool, no schema
registration, no version coupling. Tradeoff: requires a free Brave
Search API key (signup needs a credit card on file but no charges).

## Setup notes — `pi-web-access`

- macOS + Chrome signed into Google: zero-config. Reads Chrome cookies
  for Gemini Web; first run may prompt Keychain.
- Linux: uses `secret-tool` when available; otherwise add API keys.
- Windows / no browser: configure
  `~/.pi/web-search.json` with `perplexityApiKey` and/or
  `geminiApiKey`. `GEMINI_API_KEY` / `PERPLEXITY_API_KEY` env vars
  take precedence.
- Optional video frame extraction: `brew install ffmpeg yt-dlp`.
- Requires Pi v0.37.3+. As of 2026-05-05, fails to load on Pi 0.67.2
  with a TypeBox/Zod schema error — see
  [extension load error](../bugs/typebox-zod-schema-error.md).
