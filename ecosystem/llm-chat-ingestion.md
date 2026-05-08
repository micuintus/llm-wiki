---
title: Web LLM chat ingestion (Claude.ai, ChatGPT, Gemini, Le Chat)
type: concept
updated: 2026-05-05
sources:
  - https://claude.ai/chat/08520c19-385d-4ff0-ad33-2bf3eb048d2f
  - https://github.com/revivalstack/ai-chat-exporter
  - https://github.com/Trifall/chat-export
  - https://github.com/pionxzh/chatgpt-exporter
  - https://github.com/obsidianmd/obsidian-clipper
  - https://github.com/rebrowser/rebrowser-playwright
  - https://github.com/microsoft/playwright
tags: [ecosystem, llm-wiki, ingestion, browser-automation]
see_also:
  - ../skills/llm-wiki.md
---

# Web LLM chat ingestion

How to import a *single* web LLM conversation (Claude.ai, ChatGPT,
Gemini, Le Chat) into the LLM Wiki when share links are unavailable
(business / enterprise tenants disable public sharing).

## Constraint that shapes the design

Native Instruments' Claude tenant only allows `Privat halten` /
`Jeder in Native Instruments kann anzeigen` — no public share URL.
Same shape applies to ChatGPT Business/Enterprise, Gemini for
Workspace, Le Chat Enterprise. None expose a programmatic "fetch my
chat history" API for consumer products. Anything that ingests a chat
must therefore run **inside an authenticated browser session**.

## Options surveyed

Three families:

1. **User-triggered platform export.** Claude/ChatGPT data export ZIPs,
   Gemini Takeout. Works but slow (email link, hours), full-history
   only, overkill for a single chat.
2. **Browser extension / userscript.** Runs in your auth'd tab, reads
   the rendered DOM, writes a `.md` file. The OSS landscape:

   | Tool | License | Providers | Output | Notes |
   |---|---|---|---|---|
   | obsidianmd/obsidian-clipper | MIT | any (template-driven) | MD + frontmatter | ~4k stars, weekly releases. Universal fallback. |
   | revivalstack/ai-chat-exporter | MIT | ChatGPT, Claude, Copilot, Gemini, Grok | MD with YAML+TOC | userscript. Best multi-provider coverage. |
   | pionxzh/chatgpt-exporter | MIT | ChatGPT only | MD/JSON/HTML | mature, but issue #220 reports it broken on GPT Team workspaces. |
   | Trifall/chat-export | MIT | ChatGPT, Claude | MD/JSON/XML/HTML | extension (not userscript). Bus factor 1. |

3. **Browser automation.** Drive a real authenticated browser
   programmatically. The basis of the `ingest-chat` subskill.

## Why automation over extensions for the wiki

Extensions can't be triggered cleanly from outside the browser — you
end up clicking through a popup. The wiki use case is "give me a URL,
get a markdown file"; that's natively a CLI shape. Automation also
opens the door to batch ingestion of multiple URLs.

## Why CDP-against-real-Chrome over Playwright-managed Chromium

Initially attempted `chromium.launchPersistentContext({channel: "chrome"})`
with both vanilla `playwright-core` and `rebrowser-playwright-core`
(which patches the runtime-detection vectors). **Cloudflare Turnstile
on Claude.ai blocks both** — clicking the "Verify you are human"
checkbox loops back to the same state.

Working approach: user launches a dedicated Chrome with
`--remote-debugging-port=9222 --user-data-dir=~/.chrome-llm-wiki`,
signs in once. The subskill connects via
`chromium.connectOverCDP("http://localhost:9222")`. Real Chrome,
hardware-binding intact, Turnstile passes.

This is also the only path that reliably handles enterprise SSO with
device-trust attestation, since the IdP is checking against a Chrome
install Google itself signed.

## Output shape

One `.md` per chat under the target wiki's
`raw-sources/conversations/`, with frontmatter:

```yaml
title: "<chat title>"
type: source
source_kind: web-chat
provider: claude
url: https://claude.ai/chat/<uuid>
conv_id: <uuid>
collected: YYYY-MM-DD
published: Unknown
```

Body: `## User` / `## Assistant` headings per turn, HTML →
Markdown via Turndown. Claude's "thinking" and artifact blocks are
stripped (matches revivalstack's behavior; can be turned off in
`providers/claude.ts`).

The subskill auto-updates `raw-sources/index.md` (registers under
`## Conversations`) and appends a `## [date] ingest | web-chat: <title>`
entry to `log.md`. Compilation into wiki pages is left to the parent
`llm-wiki` skill — this subskill only handles the
*register* stage of ingestion.

## Subskill location

`~/.pi/agent/git/github.com/micuintus/llm-wiki/llm-wiki/skills/ingest-chat/`

CLI:

```
tsx ingest.ts <chat-url> --out <project-with-llm-wiki>
```

See `ingest-chat/SKILL.md` for setup and limitations.

## Validation

Verified end-to-end on 2026-05-05 by ingesting four Claude.ai chats
into this wiki — see entries in `../raw-sources/index.md` under
`## Conversations`. Selectors handled multi-turn conversations of 16,
22, 26, and 175 turns without breakage.

## Limitations

- DOM selectors rot. revivalstack ships overhauls every few months;
  expect the same here. Each provider module kept small (~50 LOC) so a
  fix is a one-line patch.
- One provider implemented today (Claude); ChatGPT/Gemini/Le Chat fall
  back to a single-blob HTML extraction via Defuddle/Turndown. Add real
  modules when needed.
- The dedicated Chrome window must be running when ingesting. Quitting
  it doesn't lose state — the profile persists in
  `~/.chrome-llm-wiki/`.
