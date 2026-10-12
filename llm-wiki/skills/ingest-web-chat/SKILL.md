---
name: ingest-web-chat
description: |
  Ingest a single web LLM chat (ChatGPT, Claude.ai, Gemini, or any other
  chat URL) into a wiki's raw-sources/conversations/. Drives a real Chrome
  over CDP so enterprise SSO and Cloudflare checks work. Trigger on "ingest
  this chat", "import this ChatGPT/Claude/Gemini conversation", "grab that
  chat URL", or any chat URL the user wants captured.
---

# ingest-web-chat

Grab a conversation from a provider that sits behind SSO or a bot check.
Writes role-segmented markdown, then the parent `llm-wiki` skill compiles it
into wiki pages.

## Usage

Run from this skill directory. `node_modules` is not installed for you, so on
a fresh clone run `npm install --ignore-scripts` here once.

```bash
./node_modules/.bin/tsx ingest.ts "<chat-url>" --out <project-with-llm-wiki>
```

`--out` must point at a project containing `llm-wiki/`. The script walks
upward to find `llm-wiki/SCHEMA.md`, then writes
`raw-sources/conversations/YYYY-MM-DD-<provider>-<slug>.md`, registers it in
`raw-sources/index.md`, and appends to `log.md`. It prints the written path on
stdout.

Override the CDP endpoint with `LLM_WIKI_CDP` (default `http://localhost:9222`)
and the Chrome binary with `LLM_WIKI_CHROME`.

## First run

Nothing to set up. The script launches its own Chrome on port 9222 with the
profile `~/.chrome-llm-wiki` and waits for it. Sign in to the chat provider
once in that window, the session persists. It only auto-launches for the
default `localhost:9222` endpoint; a custom `LLM_WIKI_CDP` means someone else
owns that browser.

To start that Chrome by hand:

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.chrome-llm-wiki"
```

`--user-data-dir` is required and is not a workaround: since Chrome 136
`--remote-debugging-port` is ignored on the default profile. To reuse your
everyday Chrome login instead, open `chrome://inspect/#remote-debugging` there
and point `LLM_WIKI_CDP` at the port it opens.

## Providers

| Host | Module | Status |
|---|---|---|
| `claude.ai` | `providers/claude.ts` | role-segmented |
| `gemini.google.com` | `providers/gemini.ts` | role-segmented |
| `chatgpt.com` | `providers/chatgpt.ts` | role-segmented |
| anything else | `_fallback.ts` | bulk body, app shell stripped |

Selectors lifted from MIT-licensed `revivalstack/ai-chat-exporter`.

## When it refuses to write

The script exits non-zero and writes nothing. Read the last two lines, they
name the fix, then re-run. A Cloudflare checkbox needs a human click in the
CDP Chrome; after that the clearance cookie keeps working.

Two guards stand between a page and a wiki entry, and both used to let junk
through:

- **Bot checks.** `providers/gate.ts` rejects Cloudflare challenge pages and
  sign-in walls before extraction. A challenge page is still a page, so a bulk
  extractor turns it into a "chat". Detection is structural (a password field
  with no conversation node), not string sniffing: signed-in Gemini pages carry
  `accounts.google.com/ServiceLogin` in a serialized account-menu blob and read
  as a wall if you match on the URL.
- **Thin pages.** `ingest.ts` refuses to write below `MIN_TEXT_CHARS` of
  readable text. A sign-in redirect, an empty conversation and an app shell
  all land here.

## Adding a provider

Copy `providers/claude.ts`, swap the selectors, wire the host into
`pickProvider()` in `ingest.ts`.

**No functions inside a `page.evaluate` callback.** tsx transpiles with esbuild
`keepNames`, which wraps them in a `__name` shim, and Playwright ships
`fn.toString()` into the page where `__name` does not exist. The run dies with
`ReferenceError: __name is not defined`. A local `type` alias is fine; a
`const f = () => {}`, a `function f() {}` or a typed helper arrow inside the
callback is not. Keep the callback body to plain loops.

## Why CDP and not Playwright-launched Chromium

Cloudflare Turnstile (Claude.ai's gate) blocks Playwright's bundled
Chromium *and* `channel: "chrome"` *and* stealth-patched
`rebrowser-playwright`. Connecting to a user-launched real Chrome via
`--remote-debugging-port` is the only path that reliably gets through
and preserves enterprise SSO/device-trust.

## See also

`llm-wiki` for turning the captured markdown into wiki pages.
