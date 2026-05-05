---
name: ingest-web-chat
description: |
  Ingest a single web LLM chat (Claude.ai, ChatGPT, Gemini, Le Chat) by
  URL into a wiki's raw-sources/conversations/. Drives a real Chrome via
  CDP so enterprise SSO works. Trigger on "ingest this chat", "import
  this Claude/ChatGPT/Gemini conversation", or any chat URL the user
  wants in the wiki.
---

# ingest-web-chat

URL → role-segmented markdown in `raw-sources/conversations/`. Compile
into wiki pages from there using the parent skill.

## Setup (one-time)

Launch a dedicated Chrome and sign into each provider once:

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.chrome-llm-wiki"
```

Leave it running while ingesting. Profile persists across sessions.

## Usage

```
tsx ingest.ts <chat-url> [--out <project-with-llm-wiki>]
```

`--out` defaults to cwd; the script walks upward to find `llm-wiki/SCHEMA.md`.
Override CDP endpoint via `LLM_WIKI_CDP` (default `http://localhost:9222`).

## Providers

| Host | Module | Status |
|---|---|---|
| `claude.ai` | `providers/claude.ts` | role-segmented |
| `gemini.google.com` | `providers/gemini.ts` | role-segmented |
| anything else | `_fallback.ts` | bulk HTML → Turndown |

Selectors lifted from MIT-licensed `revivalstack/ai-chat-exporter`. To
add a provider: copy `providers/claude.ts`, swap the selectors, wire
into `pickProvider()` in `ingest.ts`.

## Why CDP and not Playwright-launched Chromium

Cloudflare Turnstile (Claude.ai's gate) blocks Playwright's bundled
Chromium *and* `channel: "chrome"` *and* stealth-patched
`rebrowser-playwright`. Connecting to a user-launched real Chrome via
`--remote-debugging-port` is the only path that reliably gets through
and preserves enterprise SSO/device-trust.
