---
name: ingest-web-chat
description: |
  LLM Wiki subskill: ingest a single web LLM chat (Claude.ai, ChatGPT,
  Gemini, Le Chat) by URL into a wiki's raw-sources/conversations/.
  Uses Playwright-managed Chromium with a persistent profile so
  enterprise SSO sessions are reused. Trigger when the user asks to
  "ingest this chat", "import this Claude/ChatGPT/Gemini conversation",
  or hands over a chat URL with intent to add it to the wiki.
---

# ingest-web-chat

Imports a single web LLM chat into the LLM wiki as a copy-style raw
source (since enterprise share links are tenant-restricted and not
durable). Provider-specific DOM extractors produce role-segmented
turns; a Defuddle/Turndown fallback handles any provider without a
dedicated extractor.

## Architecture

- **Driver:** `rebrowser-playwright-core` connecting via CDP to a
  user-launched real Chrome. **Why CDP over Playwright-managed
  Chromium:** Cloudflare Turnstile (Claude.ai's gate) loops forever on
  Playwright's bundled Chromium *and* on `channel: "chrome"` launched
  by Playwright. Connecting to a separately-launched real Chrome via
  `--remote-debugging-port` is the only path that gets through.
- **Profile:** the user's dedicated `--user-data-dir` (e.g.
  `~/.chrome-llm-wiki`). Authentication persists in that profile.
- **Providers:** one module per host in `providers/`. Selectors are
  lifted from MIT-licensed upstreams (currently
  `revivalstack/ai-chat-exporter`) and isolated so a DOM change is a
  ~10-line patch.
- **Output:** one markdown file per chat with YAML frontmatter
  (`title`, `type: source`, `source_kind: web-chat`, `provider`, `url`,
  `conv_id`, `collected`, `published`). Written into the target wiki's
  `raw-sources/conversations/`. The wiki's `raw-sources/index.md` and
  `log.md` are updated automatically. Compilation into wiki pages is
  done by the parent `llm-wiki` skill (this subskill only registers).

## Setup (one-time)

Launch a dedicated Chrome instance for automation. Do this once; leave
it running while you ingest:

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.chrome-llm-wiki"
```

In that window, sign into each provider you want to ingest from
(Claude.ai, ChatGPT, etc.). The profile persists, so you only sign in
once per provider.

## Usage

```
tsx ingest.ts <chat-url> --out <project-with-llm-wiki>
```

Flags:

- `--out <path>` — directory at or below which `llm-wiki/SCHEMA.md`
  exists. Defaults to cwd. The skill walks upward to find the wiki.

Env:

- `LLM_WIKI_CDP` — override the CDP endpoint (default
  `http://localhost:9222`).

## Supported providers

| Host | Module | Status |
|---|---|---|
| `claude.ai` | `providers/claude.ts` | Implemented |
| `chatgpt.com`, `chat.openai.com` | (planned) | Falls back |
| `gemini.google.com` | (planned) | Falls back |
| `chat.mistral.ai` (Le Chat) | (planned) | Falls back |

The fallback returns one bulk "assistant" turn carrying the rendered
HTML — readable but not role-segmented. Add a real provider module
when the friction matters.

## Adding a provider

1. Create `providers/<name>.ts` exporting `<HOST>_HOSTS: string[]` and
   `extract<Name>(page, url): Promise<RawChat>`.
2. Lift selectors from the upstream userscript (revivalstack is the
   easiest source — DOM selectors are top-of-file constants).
3. Wire the host check into `pickProvider()` in `ingest.ts`.

## Limitations

- DOM selectors rot. Expect to update them every few months. Each
  provider module is intentionally small for that reason.
- Cloudflare Turnstile blocks Playwright-launched Chromium even with
  `channel: "chrome"` and stealth patches (`rebrowser-playwright`).
  Hence the user-launched real-Chrome + CDP design.
- Artifacts and "thinking" blocks are stripped from Claude responses
  (matches the upstream's behavior). If you need them preserved, edit
  `providers/claude.ts`.
