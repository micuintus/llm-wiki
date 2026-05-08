---
title: "Best web search extension for pi coding agent"
type: source
source_kind: web-chat
provider: claude
url: https://claude.ai/chat/08520c19-385d-4ff0-ad33-2bf3eb048d2f
conv_id: 08520c19-385d-4ff0-ad33-2bf3eb048d2f
collected: 2026-05-05
published: Unknown
---

# Best web search extension for pi coding agent

> Imported from https://claude.ai/chat/08520c19-385d-4ff0-ad33-2bf3eb048d2f on 2026-05-05.

## User

What is the best web search extension for the pi coding agent?

## Assistant

There are several web search extensions for the Pi coding agent, and the most popular/recommended one is **pi-web-access** by nicobailon. Here's a rundown of the main options:

**pi-web-access** (nicobailon) — the most feature-rich and widely referenced option. It provides web search, content extraction, and video understanding with zero config if you have a supported Chromium-based browser, or you can bring your own API keys. Key strengths: [GitHub](https://github.com/nicobailon/pi-web-access)

-   Smart fallback chains — search tries Exa, then Perplexity, then Gemini API, then Gemini Web. Blocked pages retry through Jina Reader and Gemini extraction, so something always works. [GitHub](https://github.com/nicobailon/pi-web-access)
-   It includes a bundled "librarian" research workflow that combines GitHub cloning, web search, and git operations to produce evidence-backed answers with permalinks. [GitHub](https://github.com/nicobailon/pi-web-access)
-   It also has a search curator UI that lets you review and select results before sending them back to the agent. [GitHub](https://github.com/nicobailon/pi-web-access)

**pi-web-utils** (shantanugoel) — a solid alternative focused on configurability. It supports multiple search engines (SearXNG, DuckDuckGo, Google, custom engines) with a configurable fallback order, plus GitHub repo cloning and local search via ripgrep. Great if you want to self-host your search backend with SearXNG. [GitHub](https://github.com/shantanugoel/pi-web-utils)

**pi-perplexity** (ivanrvpereira) — leverages your Perplexity Pro or Max subscription for real-time web search. Simple and focused, but worth noting that it reverse-engineers an undocumented internal endpoint, which likely violates Perplexity's Terms of Service. [GitHub](https://github.com/ivanrvpereira/pi-perplexity)[GitHub](https://github.com/ivanrvpereira/pi-perplexity)

**pi-extension-minimax-coding-plan-mcp** (imsus) — provides AI-powered web search and image understanding via the MiniMax MCP API, implemented as native Pi tools. Useful if you also want image analysis capabilities. [GitHub](https://github.com/imsus/pi-extension-minimax-coding-plan-mcp)

For most people, **pi-web-access** is the best starting point — it works out of the box, has the most robust fallback chains, and covers the widest range of use cases (web search, content fetching, YouTube, PDFs, GitHub). You can install it with:

```
pi install npm:pi-web-access
```

## User

Which is the best one?

## Assistant

Based on what I found, **pi-web-access** is the clear best choice for most users. Here's why it stands out:

It requires the least setup — it works out of the box with Exa MCP (no API key needed), or you can just sign into Google in Chrome, Arc, Helium, or Chromium for Gemini Web search. The other extensions all require API keys or paid subscriptions upfront. [GitHub](https://github.com/nicobailon/pi-web-access)

Its fallback system is the real differentiator. Every capability has a fallback chain, so if one provider fails or is rate-limited, it automatically tries the next one. With pi-web-utils, for example, you have to configure each engine yourself. With pi-web-access, it just works. [GitHub](https://github.com/nicobailon/pi-web-access)

It also does more than just search. You can point it at a YouTube video or local screen recording and ask questions about what's on screen, with full transcripts, visual descriptions, and frame extraction at exact timestamps. PDF URLs are extracted as text and saved as markdown, and GitHub URLs are cloned locally instead of scraped. [GitHub](https://github.com/nicobailon/pi-web-access)[GitHub](https://github.com/nicobailon/pi-web-access)

The one scenario where you might pick a different extension is if you want full control over your search infrastructure (pi-web-utils with a self-hosted SearXNG instance), or if you're already paying for Perplexity and want a lightweight single-provider setup (pi-perplexity). But for the "just works and covers everything" experience, pi-web-access is the one to go with.

## User

-   which one does Mario Zechner use / recommend?
-   which one has the most stars on github?

## Assistant

Good questions — let me look into both.

Now let me check GitHub stars for the main web search extensions:

Here's what I found on both questions:

**What Mario Zechner uses/recommends:** Mario maintains his own **brave-search** skill in his [pi-skills](https://github.com/badlogic/pi-skills) repo. It's a lightweight web search and content extraction tool via the Brave Search API — no browser required. His agent-tools repo also explicitly states: "Use brave-search unless you specifically need Google results." So Mario's pick is Brave Search — which aligns with Pi's philosophy of minimal, CLI-based tools with clear documentation (skills), rather than feature-heavy extensions. The pi-skills repo has 1.2k stars and 130 forks. [GitHub + 2](https://github.com/badlogic/pi-skills/blob/main/brave-search/SKILL.md)

**Most GitHub stars:** pi-web-access has about 301 stars and 35 forks, making it the most-starred dedicated web search _extension_. The other options (pi-web-utils, pi-perplexity, pi-web-providers) are significantly lower — none appeared to break 100 stars. [GitHub](https://github.com/nicobailon/pi-web-access/issues)

**So there's an interesting split:** Mario himself favors the simple, skill-based approach (brave-search — just a bash script wrapping the Brave API), while the community's most popular choice is pi-web-access with its full extension approach and fallback chains. It comes down to Pi's core philosophy tension: minimal tools vs. batteries-included. If you want to stay aligned with how Pi's creator works, go with brave-search from pi-skills. If you want the most robust community solution, go with pi-web-access.

## User

and brave search requires an API key?

## Assistant

Yes, but it's free. It requires a Brave Search API account with a free subscription. A credit card is required to create the free subscription, though you won't be charged. You can sign up at api-dashboard.search.brave.com/register. [GitHub](https://github.com/badlogic/pi-skills/blob/main/brave-search/SKILL.md)

So the tradeoff is: Brave Search needs a quick signup with a credit card on file (but costs nothing), while pi-web-access works with zero config out of the box if you're signed into Google in Chrome.

## User

pi-web-access is a bit overwhelming for me, is there a simple exa extension?

## Assistant

There are a couple of good simple Exa options:

**@joemccann/pi-exa** — this is a straightforward Exa AI semantic search, similarity discovery, and content extraction extension for Pi. Just set your `EXA_API_KEY` environment variable and you're good. It gives you search, similar-page discovery, and content extraction. Install with `pi install npm:@joemccann/pi-exa`. [npm](https://www.npmjs.com/package/@joemccann/pi-exa)

**najibninaba/pi-exa-search** — another focused Exa package that registers an `exa_search` tool, an `/exasearch` command, and an exa-web-research skill. Also TypeScript, no build step needed. Install with `pi install npm:pi-exa-search`. [GitHub](https://github.com/najibninaba/pi-exa-search/blob/main/AGENTS.md)

**@coctostan/pi-exa-gh-web-tools** — Exa-powered web search plus GitHub repo cloning and content extraction, designed to keep Pi's context small by returning short summaries by default and writing raw content to temp files instead of flooding context. A nice middle ground if you also want GitHub and page fetching alongside Exa search. [Libraries.io](https://libraries.io/npm/pi-web-tools)

If you just want "search the web, get results" with minimal fuss, **@joemccann/pi-exa** looks like the simplest of the three. You just need an Exa API key (they have a free tier) and it does one thing well.

## User

How do I set up pi-web-access?

## Assistant

Setup is pretty straightforward. Here's the step-by-step:

**1\. Install it:**

```
pi install npm:pi-web-access
```

**2\. That might be it.** If you're on macOS and signed into Google in Chrome, the extension reads your Chrome cookies to access Gemini directly — no API keys needed. It may trigger a macOS Keychain prompt the first time.

**3\. If you're not on macOS, or don't use Chrome,** add API keys to `~/.pi/web-search.json`:

json

```json
{
  "perplexityApiKey": "pplx-...",
  "geminiApiKey": "AIza..."
}
```

You can configure one or both. You can also set these as environment variables (`GEMINI_API_KEY`, `PERPLEXITY_API_KEY`) which take precedence over the config file.

**4\. Optional — for video frame extraction:**

```
brew install ffmpeg
brew install yt-dlp
```

These are only needed if you want to extract individual frames from videos. Transcripts and video analysis work without them.

**That's it.** The extension registers `web_search` and `fetch_content` tools automatically. Just ask Pi to search for something and it'll use them. You can also verify it's working by checking `/web-status` after loading.

One thing to be aware of: the zero-config Chrome cookie path is macOS-only. On Linux it uses `secret-tool` when available, and on Windows you'll need API keys. The extension requires Pi v0.37.3 or later.

## User

after installation it says Error: inputSchema must be a Zod schema or raw shape, received an unrecognized object

## Assistant

That error suggests a version mismatch. Pi uses TypeBox (`@sinclair/typebox`) for tool parameter schemas, and pi-web-access is built with TypeBox too. The error about "Zod schema or raw shape" typically means you're running something that expects Zod instead of TypeBox.

A few things to check:

**1\. Are you running standard Pi or a fork like oh-my-pi?** oh-my-pi (omp) is a popular fork that may have switched to Zod. If so, pi-web-access won't be compatible out of the box.

**2\. Check your Pi version:**

```
pi --version
```

pi-web-access requires v0.37.3+. If you're on a much newer version, there could be a breaking change.

**3\. Try updating both Pi and the extension:**

```
pi update
pi remove npm:pi-web-access
pi install npm:pi-web-access
```

**4\. Try installing from GitHub instead of npm** (to get the absolute latest):

```
pi install git:github.com/nicobailon/pi-web-access
```

If none of that works, this is worth reporting as an issue on the [pi-web-access GitHub repo](https://github.com/nicobailon/pi-web-access/issues) with your Pi version number. The extension is actively maintained and Nico is responsive.

Alternatively, if you just want web search working today while you sort this out, Mario's brave-search skill avoids this problem entirely since it's a skill (just a SKILL.md + bash scripts), not an extension with TypeBox/Zod schemas.

## User

pi --version 0.67.2

## Assistant

That's a recent version, and Pi 0.67.x still uses TypeBox for tool schemas (the changelog mentions TypeBox fixes). The error message about "Zod schema or raw shape" is unusual for standard Pi.

A few questions and things to try:

**Are you sure you're running standard Pi and not oh-my-pi (omp)?** Check with:

```
which pi
```

If the path points to an `omp` or `oh-my-pi` installation, that's the problem — omp may expect Zod schemas while pi-web-access uses TypeBox.

**The npm version of pi-web-access may be stale.** The latest npm release is v0.7.3 from February 2026, which is quite old relative to Pi 0.67.2. Try installing from the GitHub repo to get the latest code:

```
pi remove npm:pi-web-access
pi install git:github.com/nicobailon/pi-web-access
```

**Check if another extension is conflicting.** If you have other extensions that register a `web_search` tool, they could clash. You can check with:

```
pi list
```

If none of that works, I'd suggest opening an issue on the [pi-web-access repo](https://github.com/nicobailon/pi-web-access/issues) with your Pi version — or hopping into the [Pi Discord](https://discord.gg/piagent) where Nico and others are active. This kind of version compatibility issue gets resolved quickly there.

In the meantime, Mario's **brave-search** skill will just work since it's a skill (plain SKILL.md + scripts), not an extension with schema dependencies:

```
git clone https://github.com/badlogic/pi-skills ~/.pi/agent/skills/pi-skills
```

Then just use `/skill:brave-search` in Pi.

## User

Could it be that pi-web-access conflicts with Marios skills?

## Assistant

Probably not for that specific error. Mario's skills (including brave-search) are just SKILL.md files plus bash scripts — they don't register tools with schemas at all. The agent reads the SKILL.md and then uses built-in tools like `bash` to run the scripts. So there's no TypeBox/Zod schema involved, and no tool registration that could clash at the loading level.

The "inputSchema must be a Zod schema or raw shape" error happens during extension loading when Pi tries to register a tool with `pi.registerTool()`. That's purely an extension-level issue, not something a skill could trigger.

**That said**, having both _could_ cause a different kind of problem — semantic confusion. If you have brave-search loaded as a skill AND pi-web-access registering a `web_search` tool, the agent might get confused about which web search method to use. But that would show up as the agent making weird choices, not as a schema loading error.

For your actual error, the most likely culprits are:

1.  Another **extension** (not skill) that also registers a tool and has a Zod/TypeBox mismatch
2.  A stale npm version of pi-web-access that's incompatible with Pi 0.67.2
3.  A dependency resolution issue where Pi's bundled TypeBox version doesn't match what pi-web-access expects

I'd try `pi install git:github.com/nicobailon/pi-web-access` first to rule out a stale npm package, and if that doesn't work, check what other **extensions** you have loaded with `pi list`.

## User

Also with npm:pi-exa-search

Error: inputSchema must be a Zod schema or raw shape, received an unrecognized object

## Assistant

OK, same error with two completely different extensions by different authors — that confirms the problem is on the Pi side, not the extensions.

Both pi-web-access and pi-exa-search use TypeBox (`@sinclair/typebox`) for their tool schemas, which is what standard Pi expects. The fact that your Pi is asking for a "Zod schema or raw shape" means **your Pi installation isn't standard Pi**.

Can you check what you're actually running?

bash

```bash
which pi
```

and

bash

```bash
pi --help | head -5
```

I'm fairly confident you're running **oh-my-pi** (omp), not standard Pi. omp is a fork of pi-mono by Mario Zechner that adds a batteries-included coding workflow, and it has diverged from the upstream codebase — including, it seems, switching tool schema validation to expect Zod instead of TypeBox. [GitHub](https://github.com/can1357/oh-my-pi)

If that's the case, your options are:

1.  **Use skills instead of extensions** — skills don't register tools with schemas, so they bypass this entirely. Mario's brave-search skill will work regardless of omp vs standard Pi.
2.  **Look for omp-compatible extensions** — omp has its own ecosystem and some extensions may be adapted for it.
3.  **Switch to standard Pi** — `npm install -g @mariozechner/pi-coding-agent` — if you want access to the full TypeBox-based extension ecosystem.
4.  **Ask in the omp community** — there may be a Zod-compatible web search extension, or a compatibility shim.

## User

which pi

/opt/homebrew/bin/pi

pi --help | head -5 󱙺 FORGE ~6.8k  claude-opus-4-6 pi - AI coding assistant with read, bash, edit, write tools Usage: pi \[options\] \[@files...\] \[messages...\]

## Assistant

That looks like standard Pi from Homebrew. So it's possible Pi very recently switched from TypeBox to Zod in a version close to 0.67.x and most community extensions haven't caught up yet. The Pi issue tracker is also currently closed (reopens April 20, 2026) so you can't file a bug right now.

At this point, the fastest way to get web search working is to just use the **brave-search skill**:

bash

```bash
git clone https://github.com/badlogic/pi-skills ~/.pi/agent/skills/pi-skills
cd ~/.pi/agent/skills/pi-skills/brave-search && npm install
```

Then set your Brave API key (free tier, sign up at api-dashboard.search.brave.com):

bash

```bash
export BRAVE_API_KEY="your-key-here"
```

Add that export to your `~/.zshrc` so it persists. Then in Pi you can either let it detect the skill automatically, or invoke it explicitly with `/skill:brave-search`.

No TypeBox, no Zod, no schema registration — it's just a SKILL.md that tells the agent to run a bash script. It'll work on any version of Pi.

Once the Pi issue tracker reopens on the 20th, it'd be worth asking there whether 0.67.x intentionally moved to Zod, so extension authors know to update.
