---
name: ingest-web-chat
description: |
  Ingest a single web LLM chat (Claude.ai, ChatGPT, Gemini, Le Chat) by
  URL into a wiki's raw-sources/conversations/. Drives a real Chrome via
  CDP so enterprise SSO works. Trigger on "ingest this chat", "import
  this Claude/ChatGPT/Gemini conversation", or any chat URL the user wants
  in the wiki.
---

# ingest-web-chat

URL → role-segmented markdown in `raw-sources/conversations/`. Compile
into wiki pages from there using the parent skill.

## Usage

```
tsx ingest.ts <chat-url> [--out <project-with-llm-wiki>]
```

`--out` defaults to cwd; the script walks upward to find `llm-wiki/SCHEMA.md`.
Override CDP endpoint via `LLM_WIKI_CDP` (default `http://localhost:9222`)
and the Chrome binary via `LLM_WIKI_CHROME`.

On a cold start the script launches the CDP Chrome itself and waits for it.
It only does that for the default `localhost:9222` endpoint; a custom
`LLM_WIKI_CDP` means someone else owns that browser.

## Setup (one-time)

Sign into each provider once inside the CDP Chrome profile. The profile is
`~/.chrome-llm-wiki` and persists across sessions. To start that Chrome by
hand instead of letting the script do it:

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.chrome-llm-wiki"
```

`--user-data-dir` is not optional. Since Chrome 136, `--remote-debugging-port`
is ignored on the default profile, so you cannot debug your everyday Chrome.
Chrome 144 added `chrome://inspect/#remote-debugging` to turn the port on for
the running default-profile Chrome if you would rather reuse that login.

## Providers

| Host | Module | Status |
|---|---|---|
| `claude.ai` | `providers/claude.ts` | role-segmented |
| `gemini.google.com` | `providers/gemini.ts` | role-segmented |
| `chatgpt.com` | `providers/chatgpt.ts` | role-segmented |
| anything else | `_fallback.ts` | bulk body, app shell stripped |

Selectors lifted from MIT-licensed `revivalstack/ai-chat-exporter`.

## Guards

Two things used to produce a wiki entry that looked like a chat and was not:

- **Bot checks.** `providers/gate.ts` rejects Cloudflare challenge pages and
  sign-in walls before extraction, and exits non-zero with the human fix. A
  challenge page is still a page, so a bulk extractor turns it into a "chat".
  Detection is structural (a password field with no conversation node), not
  string sniffing: signed-in Gemini pages carry `accounts.google.com/ServiceLogin`
  in a serialized account-menu blob and read as a wall if you match on the URL.
- **Thin pages.** `ingest.ts` refuses to write below `MIN_TEXT_CHARS` of
  readable text. A sign-in redirect, an empty conversation and an app shell
  all land here.

Neither guard writes a file. Fix the cause and re-run.

## Adding a provider

Copy `providers/claude.ts`, swap the selectors, wire the host into
`pickProvider()` in `ingest.ts`.

**No functions inside a `page.evaluate` callback.** tsx transpiles with esbuild
`keepNames`, which wraps them in a `__name` shim, and Playwright ships
`fn.toString()` into the page where `__name` does not exist. The run dies with
`ReferenceError: __name is not defined`. A local `type` alias is fine; a `const
f = () => {}`, a `function f() {}` or a typed helper arrow inside the callback
is not. Keep the callback body to plain loops.

## Why CDP and not Playwright-launched Chromium

Cloudflare Turnstile (Claude.ai's gate) blocks Playwright's bundled
Chromium *and* `channel: "chrome"` *and* stealth-patched
`rebrowser-playwright`. Connecting to a user-launched real Chrome via
`--remote-debugging-port` is the only path that reliably gets through
and preserves enterprise SSO/device-trust.
