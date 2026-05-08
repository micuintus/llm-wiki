---
title: Local Pi Setup — Extensions, Skills, Web Search Config
type: reference
updated: 2026-05-04
sources:
  - session:2026-05-04-web-search-research
see_also:
  - [Web Search Provider Strategy](../decisions/web-search-provider-strategy.md)
  - [Web Search Extensions](../ecosystem/web-search-extensions.md)
---

# Local Pi Setup — Extensions, Skills, Web Search Config

Snapshot of how Pi is wired on this machine (as of 2026-05-04).

## Installed Packages

From `~/.pi/agent/settings.json`:

```json
{
  "packages": [
    "npm:pi-web-access",
    "git:github.com/netresearch/jira-skill",
    "git:github.com/micuintus/claude-agent-sdk-pi@fix/native-message-format-minimal",
    "npm:pi-powerline-footer",
    "npm:pi-tool-display",
    "https://github.com/micuintus/llm-wiki"
  ],
  "defaultProvider": "opencode-go",
  "defaultModel": "kimi-k2.6"
}
```

## Web Search Tool — Where it Comes From

Pi-mono core has **no built-in `web_search` tool.** The `web_search` tool comes from the `pi-web-access` extension.

**`pi-web-access` providers** (from `gemini-search.ts:10`):
```typescript
export type SearchProvider = "auto" | "perplexity" | "gemini" | "exa";
```

**Brave is NOT supported by `pi-web-access`.** To use Brave, either:
- Use the standalone `brave-search` skill (see below)
- Fork `pi-web-access` and add Brave as a provider

## Brave Search Skill Setup

The `brave-search` skill from `badlogic/pi-skills` provides headless Brave Search via API. Setup:

```bash
# 1. Get API key from https://api-dashboard.search.brave.com/app/keys
# 2. Add to ~/.zprofile:
export BRAVE_API_KEY="your-key-here"

# 3. Install the skill:
git clone --depth 1 https://github.com/badlogic/pi-skills.git /tmp/pi-skills
cp -r /tmp/pi-skills/brave-search ~/.pi/agent/skills/
cd ~/.pi/agent/skills/brave-search && npm install

# 4. Test:
source ~/.zprofile
node search.js "your query" -n 5
```

The skill uses `@mozilla/readability`, `jsdom`, `turndown` for content extraction.

## Repo-Local Pi Extensions (pi-mono `.pi/extensions/`)

These ship with the **pi-mono repo itself**, committed by Mario Zechner (badlogic). They auto-load when Pi runs from this directory:

| File | What It Does |
|---|---|
| `prompt-url-widget.ts` | Detects GitHub PR/issue URLs in prompts; calls `gh` CLI for metadata; shows widget with title/author/URL; auto-sets session name |
| `redraws.ts` | Adds `/tui` command that shows TUI redraw count (debug helper) |
| `tps.ts` | Tokens-per-second display (untracked details, see file) |

These are **not user-installed** — they're part of pi-mono's repo. They've been loading silently any time Pi runs from this directory.

## Config Files

| Path | Purpose |
|---|---|
| `~/.pi/agent/settings.json` | Pi global config: packages, default model/provider, theme |
| `~/.pi/web-search.json` | `pi-web-access` config: `searchProvider`, `searchModel`, `workflow` |
| `~/.zprofile` | Shell env vars (BRAVE_API_KEY, EXA_API_KEY, etc.) |
| `<repo>/.pi/extensions/*.ts` | Repo-local extensions, auto-loaded when Pi runs in that repo |
| `<repo>/.pi/settings.json` | Repo-local Pi config overrides (if present) |

## Session Storage

- `~/.pi/agent/sessions/<sanitized-cwd>/*.jsonl` — Pi session transcripts (one JSONL per session)
- One file per session, append-only event log with forks for resumed conversations and subagent spawns
