---
title: "The __https://shittycodingage..."
type: source
source_kind: web-chat
provider: claude
url: https://claude.ai/chat/a23658e7-48e3-4e5b-bc12-0ef10adc3383
conv_id: a23658e7-48e3-4e5b-bc12-0ef10adc3383
collected: 2026-05-05
published: Unknown
---

# The __https://shittycodingage...

> Imported from https://claude.ai/chat/a23658e7-48e3-4e5b-bc12-0ef10adc3383 on 2026-05-05.

## User

The pi coding agent [https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent),

What is the most favorite theme by users (github stars, web sentiment)?

## Assistant

Based on my research, here's what I found about the most popular themes for the pi coding agent.

**The short answer: Catppuccin appears to be the overall favorite**, though Dracula and Tokyo Night are close behind.

Here's the evidence:

**Pi's built-in themes** are minimal — just `dark` and `light`, with auto-detection of your terminal background on first run. The real action is in community-created theme packages. [GitHub](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/themes.md)

**Theme ecosystem signals:**

The themes that appear in _every_ major third-party pi package tell the story. The agent-pi extension suite ships with 11 themes including Catppuccin, Dracula, Nord, Synthwave, and Tokyo Night. The oh-my-pi fork bundles 65+ built-in themes, leading with Catppuccin, Dracula, Nord, Gruvbox, Tokyo Night, and Poimandres. The @ifi/oh-pi-themes npm package covers cyberpunk, nord, gruvbox, tokyo-night, and catppuccin. The pi-ansi-themes package specifically addresses how pi's built-in hex colors clash with popular terminal themes like Tokyo Night, Catppuccin, Dracula, Nord, Gruvbox, and Solarized. [GitHub + 3](https://github.com/ruizrica/agent-pi)

Notice that Catppuccin, Dracula, and Tokyo Night appear in virtually every single theme collection — they're the "must-haves" that every theme pack ships first.

**Broader developer sentiment** further supports this. Catppuccin has 361 repositories on GitHub across all tools, dwarfing most competitors. Dracula has a massive established ecosystem and its own site calls it "the most famous theme" for Pi Coding Agent — though with only 1 GitHub star on its pi-specific repo, that's more brand confidence than pi-specific data. Rosé Pine and Nord also have dedicated pi packages but less buzz. [GitHub](https://github.com/catppuccin)[Dracula Theme](https://draculatheme.com/pi-coding-agent)

**Why Catppuccin edges ahead:** It has the largest community-driven porting effort across developer tools, its pastel palette resonates with users who find Dracula too saturated and Nord too muted, and it consistently appears _first_ in most pi theme pack listings. The broader trend in the terminal/editor theming world over the last couple of years has been a strong shift toward Catppuccin as the default community choice.

That said, "favorite" is deeply personal — many developers on dark terminals still default to Dracula or Tokyo Night, and plenty of pi users simply stick with the built-in `dark` theme and never change it.

## User

Mario is super against MCP, what is the best lazy loading MCP extension for pi?

## Assistant

You're right that Mario has a clear stance on this. Pi's philosophy is explicitly "No MCP" — instead, the project recommends building CLI tools with READMEs (via Skills). As he puts it, the reasoning is that CLI tools with documentation are simpler and more transparent than the MCP protocol. [Shittycodingagent](https://shittycodingagent.ai/)

But the beauty of pi's extensibility model is that the community can build what pi deliberately skips. Let me search for what's out there.

The clear winner is **[pi-mcp-adapter](https://github.com/nicobailon/pi-mcp-adapter)** by Nico Bailon. It's essentially _the_ MCP extension for pi, and lazy loading is its core design philosophy — built specifically to address the context window bloat problem that Mario (and others) criticize about MCP.

Here's why it fits what you're looking for:

**Lazy by default.** Servers won't connect until you actually call one of their tools. The adapter caches tool metadata so search and describe work without live connections. Idle servers disconnect after 10 minutes (configurable) and reconnect automatically on next use. [GitHub](https://github.com/nicobailon/pi-mcp-adapter)[npm](https://www.npmjs.com/package/pi-mcp-adapter)

**Tiny context footprint.** It exposes just one proxy tool (~200 tokens) instead of loading hundreds of tool definitions up front. The agent discovers what it needs on-demand. This directly addresses Mario's concern about MCP tools polluting the context window at session start. [npm](https://www.npmjs.com/package/pi-mcp-adapter)

**Install is one line:**

```
pi install npm:pi-mcp-adapter
```

Then create `~/.pi/agent/mcp.json` with your servers. Each server supports a `lifecycle` setting — `lazy`, `eager`, or `keep-alive` — so you control exactly when things spin up. [GitHub](https://gist.github.com/schpet/85531b6a05a5d8119e859bdec6b0e0b8)

**Other nice touches:** You can promote specific high-use tools from the proxy to first-class Pi tools via `directTools` config, so the LLM sees them directly without having to search. It also has an interactive `/mcp` panel for managing servers, and can import configs from Cursor, Claude Code, VS Code, and others. [GitHub](https://github.com/nicobailon/pi-mcp-adapter)

It's worth noting what Armin Ronacher (of Flask fame) wrote about pi's MCP stance: there's also **mcporter** by Peter Steinberger, which wraps MCP servers as CLI tools — a more "pi-native" approach that turns MCP servers into the kind of CLI-with-README tools that Mario actually endorses. But if you want proper MCP protocol support with lazy loading, pi-mcp-adapter is what the community has converged on. [Armin Ronacher](https://lucumr.pocoo.org/2026/1/31/pi/)

## User

How would I integrate mcporter into Pi? What would you recommend?

## Assistant

Great question. There are actually **two approaches** here, and which you pick depends on how "pi-native" you want to be. Let me lay out both.

* * *

### Approach 1: `generate-cli` → Pi Skills (the "Mario-approved" way)

This is the most philosophically aligned with how pi works. You use mcporter to **compile MCP servers into standalone CLI tools**, then expose them to pi as Skills with READMEs. The agent reads the README on demand (progressive disclosure) and invokes the tool via bash.

As Peter Steinberger himself put it: "Convert chrome-devtools (or really any) MCP to compiled cli with this one weird trick… Store somewhere + add a one-liner to agents file. It will call help menu and learn as needed. Progressive disclosure, no context pollution." [X](https://x.com/steipete/status/1986968745504334300)

**Step by step:**

**1\. Generate a CLI from any MCP server:**

bash

```bash
# From an HTTP MCP server
npx mcporter generate-cli https://mcp.linear.app/mcp --compile

# From a stdio MCP server  
npx mcporter generate-cli "npx -y chrome-devtools-mcp" --compile

# Only include the tools you actually use
npx mcporter generate-cli "npx -y chrome-devtools-mcp" \
  --include-tools take_screenshot,navigate --compile
```

`--compile` emits a Bun-compiled binary. You can also use `--include-tools` or `--exclude-tools` to generate a CLI for just a subset of tools. [GitHub](https://github.com/steipete/mcporter)

**2\. Put the binary somewhere on your PATH:**

bash

```bash
mv chrome-devtools-cli ~/agent-tools/chrome-devtools
chmod +x ~/agent-tools/chrome-devtools
```

**3\. Create a Pi Skill so the agent knows about it:**

bash

```bash
mkdir -p ~/.pi/agent/skills/chrome-devtools
```

Then write a `SKILL.md`:

markdown

```markdown
# Chrome DevTools

Browser automation via Chrome DevTools Protocol.

## Usage

Run `chrome-devtools --help` to see all available commands.

### Common commands

- `chrome-devtools take-screenshot --format png`
- `chrome-devtools navigate --url "https://example.com"`

## Prerequisites

Chrome must be running with remote debugging:
`google-chrome --remote-debugging-port=9222`
```

Now the agent discovers this skill on demand, reads the README only when relevant, and calls the tool through bash — exactly how Mario intended.

**4\. Alternatively, use `mcp-to-pi-tools` for automation:**

There's a dedicated bridge tool called `mcp-to-pi-tools` (by the same Nico Bailon who wrote the MCP adapter) that automates this whole pipeline. It generates simple, self-documenting CLI tools with short symlinks agents can reliably invoke. [npm](https://www.npmjs.com/package/mcp-to-pi-tools)

bash

```bash
# One command does it all
npx mcp-to-pi-tools chrome-devtools-mcp

# Then just use the short symlink
chrome-snapshot --format png
```

The output goes to `~/agent-tools/<name>/` with ready-to-use CLI tools, a package.json, a README, and an install script. [GitHub](https://github.com/nicobailon/mcp-to-pi-tools)

* * *

### Approach 2: Direct `mcporter call` via bash (quick and dirty)

If you don't want to pre-generate CLIs, pi's agent can just call mcporter directly via bash. This is simpler but a bit noisier in terms of token usage per invocation:

bash

```bash
# List available servers and tools
npx mcporter list

# Call a specific tool
npx mcporter call linear create_issue \
  title:"Fix the login bug" teamId:"TEAM-123"
```

mcporter auto-discovers MCP servers already configured in Cursor, Claude Code/Desktop, Codex, and others, so you can try it immediately with npx — no installation required. [GitHub](https://github.com/steipete/mcporter)

You'd add a line to your `AGENTS.md` like:

markdown

```markdown
MCP tools are available via `npx mcporter`. Run `npx mcporter list` 
to discover servers, `npx mcporter list <server>` for tool signatures,
and `npx mcporter call <server> <tool> args` to invoke.
```

* * *

### My recommendation

**Go with Approach 1** (`generate-cli` + Skills) for MCP servers you use regularly. It's the cleanest integration because:

-   Zero startup cost — compiled binaries, no MCP server spin-up until invoked
-   Truly progressive disclosure — the agent only reads the skill README when it needs the tool
-   Composable — you can pipe outputs through `jq` or chain with other bash commands (as Peter notes, your agent can filter output with jq, using far less tokens) [X](https://x.com/steipete/status/1989853716921434227)
-   This is exactly Mario's philosophy: CLI tools with README files, where the agent reads the README when it needs the tool and pays the token cost only when necessary [Mariozechner](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/)

Use Approach 2 (`mcporter call`) for one-off exploration or MCP servers you're trying out before committing to a generated CLI.

## User

What does the community say about generate-cli vs pi-mcp-adapter

## Assistant

This is a genuinely active debate in the pi community, and interestingly both tools were built by the same person (Nico Bailon), which tells you something about how unsettled the question is. Here's what the community signals say:

* * *

### The case **for generate-cli / CLI tools** (the purist camp)

**Mario's own position is unambiguous.** Pi does not and will not support MCP. Popular MCP servers like Playwright MCP (21 tools, 13.7k tokens) or Chrome DevTools MCP (26 tools, 18k tokens) dump their entire tool descriptions into your context on every session. The alternative is simple: build CLI tools with README files. The agent reads the README when it needs the tool, pays the token cost only when necessary, and can use bash to invoke the tool. This approach is composable, easy to extend, and token-efficient. [Mariozechner](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/)

**The broader "CLI vs MCP" discourse backs this up hard.** One benchmark comparing CLI and MCP for browser automation found CLI completed tasks with 33% better token efficiency. Scalekit's benchmark found MCP costs 4 to 32x more tokens — at 10,000 monthly operations, CLI costs about $3.20 vs MCP about $55.20. [Jannikreinhard](https://jannikreinhard.com/2026/02/22/why-cli-tools-are-beating-mcp-for-ai-agents/)[Firecrawl](https://www.firecrawl.dev/blog/mcp-vs-cli)

**But raw mcporter commands are a pain point.** This is the key criticism that led Nico to build `mcp-to-pi-tools` on top of mcporter. The mcp-to-pi-tools README is blunt: "Agents struggle to use mcporter-converted MCP tools reliably. Even useful MCP tools go underutilized because the CLI interface creates too much friction." The problem is unreliable execution — agents frequently fumble the long CLI syntax, requiring multiple retry loops — and poor ergonomics, since abstract commands feel clunky vs. purpose-built scripts. [npm](https://www.npmjs.com/package/mcp-to-pi-tools)

The solution was to generate short symlinks:

```
# Before: 100+ char command agents struggle with
npx mcporter call --stdio "npx -y chrome-devtools-mcp" chrome-devtools.take_snapshot format:"png"

# After: short symlink agents nail every time  
chrome-snapshot --format png
```

**Armin Ronacher (OpenClaw) leans CLI too**, but pragmatically. He notes you can use mcporter to expose MCP calls via a CLI interface or TypeScript bindings. But he emphasizes pi's philosophy is about the agent extending itself — having pi build its own tools rather than downloading extensions. [Armin Ronacher](https://lucumr.pocoo.org/2026/1/31/pi/)

* * *

### The case **for pi-mcp-adapter** (the pragmatist camp)

**The adapter's README makes the most honest pitch.** It acknowledges Mario's take directly — "skip MCP entirely, write simple CLI tools instead" — then counters: "But the MCP ecosystem has useful stuff — databases, browsers, APIs. This adapter gives you access without the bloat." [GitHub](https://github.com/nicobailon/pi-mcp-adapter)

**The key advantage is zero setup per server.** With generate-cli, you need to compile a binary, place it somewhere, write a skill README, and maintain it when the MCP server updates. With the adapter, you add three lines of JSON and it works. For someone connecting 5-10 MCP servers, the maintenance burden of the CLI approach is real.

**The adapter also solved the context problem differently.** One proxy tool (~200 tokens) in context instead of hundreds. The LLM discovers tools via search, and specific high-use tools can be promoted to direct tools via `directTools` config. Each direct tool costs ~150-300 tokens. For servers with 75+ tools, stick with the proxy. This hybrid proxy/direct approach is arguably more sophisticated than either pure MCP or pure CLI. [GitHub](https://github.com/nicobailon/pi-mcp-adapter)

**OAuth and stateful servers favor the adapter.** MCP servers that need OAuth (Linear, Figma, Vercel) are messy to wrap as CLIs. The adapter handles autoAuth — it will automatically run OAuth when needed and retry once. The generate-cli approach struggles here because you'd need to manage auth tokens yourself. [npm](https://www.npmjs.com/package/pi-mcp-adapter)

* * *

### The wider industry is converging on "both"

CircleCI's analysis puts it well: the main criticisms of MCP are context window cost and implementation quality. But a common production pattern is CLI for local tasks and MCP for CI/CD coordination. The two approaches work well together. [CircleCI](https://circleci.com/blog/mcp-vs-cli/)

The emerging view is that the MCP token problem isn't fundamental to the protocol — it's an implementation problem being fixed. Both approaches converge on the same insight: agents shouldn't load what they don't need. Whether that's `--help` on a CLI or `search()` on a proxy, the principle is identical. [Firecrawl](https://www.firecrawl.dev/blog/mcp-vs-cli)

* * *

### The practical community consensus

If I had to distill the sentiment into a decision tree:

**Use generate-cli / mcp-to-pi-tools when** you have a small number of MCP servers you use daily, those servers don't need OAuth, and you want maximum token efficiency and composability (piping through `jq`, chaining with other bash commands). This is the "pi way."

**Use pi-mcp-adapter when** you connect to many MCP servers, some require OAuth, you don't want to maintain compiled binaries, or you're migrating from Cursor/Claude Code and want to reuse your existing `mcp.json` configs. This is the pragmatic path.

**Use both** — which is what a lot of power users actually do. Generate CLIs for your 2-3 most-used tools (where the agent needs zero-friction invocation), and use the adapter as a discovery/fallback layer for the long tail of servers you touch occasionally.

## User

Is there a CLI tool for accesing JIRA?

## Assistant

Yes, there are two strong options — one community-built and one official from Atlassian:

* * *

**1\. `jira-cli` by Ankit Pokhrel** (the community favorite)

This is the one most developers actually use day-to-day. It's a feature-rich interactive command line tool for Atlassian Jira, available as a downloadable binary for Linux, macOS, and Windows. It's written in Go, so it's a single binary with no runtime dependencies — ideal for the pi Skills approach. [GitHub](https://github.com/ankitpokhrel/jira-cli)

It supports interactive mode plus standard POSIX-compliant flags for scripting. You can search with natural filters like `jira issue list -yHigh -s"In Progress" --created month -lbackend`, and it renders ticket details as markdown on the terminal. It also handles sprint navigation, ticket creation from templates, cloning, linking, transitions, and comments. [Medium](https://medium.com/@ankitpokhrel/introducing-jira-cli-the-missing-command-line-tool-for-atlassian-jira-fe44982cc1de)

Install: `brew install ankitpokhrel/jira-cli/jira-cli` (or grab the binary from GitHub releases)

Setup: `jira init` → select Cloud or Local → provide your API token

Example commands an agent would use:

bash

```bash
jira issue list --assignee me -s"In Progress"
jira issue create -tBug -s"Login broken" -b"Steps to reproduce..."
jira issue view PROJ-123
jira sprint list --current
jira issue move PROJ-123 "In Review"
```

GitHub: [ankitpokhrel/jira-cli](https://github.com/ankitpokhrel/jira-cli) — ~4k stars, actively maintained.

* * *

**2\. Atlassian ACLI** (the official one)

Atlassian launched their own CLI (ACLI) for all Jira Cloud plans. It enables admins and technical users to manage Jira tasks by executing text-based commands and scripts from their terminal. [Atlassian](https://www.atlassian.com/blog/jira/atlassian-command-line-interface)

It's engineered as a native CLI that handles authentication, performance optimization, error management, and other API complexities. It supports processing high-volume workloads across multiple sites in parallel. [Atlassian Community](https://community.atlassian.com/forums/Jira-articles/Atlassian-Command-Line-Interface-ACLI-for-Jira-is-now-generally/ba-p/3028362)

That said, community feedback has been mixed — some users complained about poor documentation, particularly around JSON input formats for custom fields. It's newer and less battle-tested than `jira-cli`. [Atlassian Community](https://community.atlassian.com/forums/Jira-articles/Atlassian-Command-Line-Interface-ACLI-for-Jira-is-now-generally/ba-p/3028362)

* * *

**For pi integration**, I'd recommend **`jira-cli`** (option 1). It's a single Go binary (no Node/Python deps), has excellent `--help` output the agent can read, supports both interactive and scriptable modes, and has been around long enough that LLMs have trained on it extensively — meaning the model already knows the command syntax without needing a detailed skill README. You could set it up as a pi Skill with a very minimal `SKILL.md` that just says "use `jira` CLI for Jira operations, run `jira --help` for available commands" and the agent would take it from there.

## User

Is there a premade skill for JIRA in Pi already?

## Assistant

Yes! There's **[netresearch/jira-skill](https://github.com/netresearch/jira-skill)** — and it's built exactly the pi/CLI way.

It follows the Agent Skills open standard (the same spec pi implements), provides comprehensive Jira integration through two specialized skills (`jira-communication` and `jira-syntax`), and works with zero MCP overhead — scripts are invoked via Bash with no tool descriptions loaded into context. [GitHub](https://github.com/netresearch/jira-skill)

**What it covers:**

All common Jira operations — search issues, get issue details, add worklogs, create issues, update fields — and it works with both Jira Server/DC and Cloud. Example usage: [GitHub](https://github.com/netresearch/jira-skill)

bash

```bash
# Search issues
uv run scripts/core/jira-search.py query "project = PROJ AND status = 'In Progress'"

# Get issue details
uv run scripts/core/jira-issue.py get PROJ-123

# Log time
uv run scripts/core/jira-worklog.py add PROJ-123 "2h 30m" -c "Code review"

# Create issue
uv run scripts/workflow/jira-create.py issue PROJ "Fix bug" --type Bug --priority High
```

**Installing in pi:**

Since it follows the Agent Skills standard, you can just clone it into your skills directory:

bash

```bash
git clone https://github.com/netresearch/jira-skill.git ~/.pi/agent/skills/jira-skill
```

Or at the project level:

bash

```bash
git clone https://github.com/netresearch/jira-skill.git .pi/skills/jira-skill
```

Each skill has its own SKILL.md with trigger conditions and usage instructions, so pi auto-discovers and activates them based on context. The scripts use Python (via `uv run`), so you'll need `uv` installed. [GitHub](https://github.com/netresearch/jira-skill)

Note that Mario's official [pi-skills](https://github.com/badlogic/pi-skills) repo doesn't include a Jira skill — it ships with brave-search, browser-tools, gccli, gdcli, gmcli, subagent, transcribe, vscode, and youtube-transcript — so this community one is your best bet without rolling your own. [GitHub](https://github.com/badlogic/pi-skills)

## User

So the community JIRA skill uses the community CLI?

## Assistant

No, actually — they're completely independent. The netresearch/jira-skill doesn't use `jira-cli` (the Go tool by Ankit Pokhrel) at all. It has its own Python scripts that hit the Jira REST API directly — things like `jira-search.py`, `jira-issue.py`, `jira-worklog.py`, and `jira-create.py`, all run via `uv run`. [GitHub](https://github.com/netresearch/jira-skill)

So you have three separate approaches to Jira in pi, none of which depend on each other:

**1\. `jira-cli`** (Go binary) — the standalone community CLI tool. You'd write your own small `SKILL.md` wrapper pointing the agent to it. The agent already knows the command syntax from training data. Lightest setup, no Python needed.

**2\. `netresearch/jira-skill`** (Python scripts) — a premade Agent Skills-compatible package with its own scripts. More structured, covers worklogs and wiki markup syntax, but requires Python and `uv`.

**3\. Jira MCP server via pi-mcp-adapter or mcporter** — if you're already in the MCP ecosystem.

It's a bit of a missed opportunity that the skill didn't just wrap `jira-cli` — it would have been a thinner layer and wouldn't need a Python runtime. But to be fair, using Python scripts gives the skill author full control over output formatting and exactly what gets returned to the agent, which matters for token efficiency. A raw `jira-cli` output might include formatting the agent doesn't need, whereas a custom script can return exactly the JSON or markdown the agent wants.

## User

Search for the best PI JIRA extention available

## Assistant

Based on my search, the pickings are slim — there's no single dominant "best" Jira extension for pi. Here's everything I found:

* * *

**1\. [netresearch/jira-skill](https://github.com/netresearch/jira-skill)** — the most complete

This is the only dedicated, full-featured Jira skill following the Agent Skills standard. It provides two specialized skills (`jira-communication` and `jira-syntax`), covers search, issue CRUD, worklogs, attachments, sprints, and wiki markup. Works with both Jira Server/DC and Cloud. Zero MCP overhead — all Python scripts invoked via bash. The downside is it requires Python and `uv`. [GitHub](https://github.com/netresearch/jira-skill)

* * *

**2\. [PSPDFKit-labs/pi-skills](https://github.com/PSPDFKit-labs/pi-skills)** (Nutrient) — real-world but narrow

This is a production pi skills package from Nutrient (formerly PSPDFKit) that includes `nutrient-bug` — a lightweight read-only Zendesk + Jira issue context workflow with `/bug`, `/bug-view`, and `nutrient_bug_get_context`. It's not a general-purpose Jira integration though — it's specifically a bug triage workflow that pulls Jira issue context alongside Zendesk tickets. Interesting as a real-world example of how a team actually uses Jira within pi, but you can't use it to create or update issues. [GitHub](https://github.com/PSPDFKit-labs/pi-skills)

* * *

**3\. Jira MCP via pi-mcp-adapter** — if you go the MCP route

There's `@vjain419/mcp-atlassian`, an npm wrapper that runs the MCP Atlassian server covering both Jira and Confluence. You'd use this through pi-mcp-adapter rather than as a native skill. It supports both Cloud and Server, OAuth, and has filtering options. But this is the approach Mario would frown at. [npm](https://www.npmjs.com/package/@vjain419/mcp-atlassian)

* * *

**4\. Nothing in the official repos**

Mario's own [badlogic/pi-skills](https://github.com/badlogic/pi-skills) and the [awesome-pi-agent](https://github.com/qualisero/awesome-pi-agent) curated list don't include a Jira skill. The awesome list covers extensions like agent-stuff (which has GitHub, Sentry, and more) but no dedicated Jira entry. [GitHub](https://github.com/qualisero/awesome-pi-agent)

* * *

**Honest assessment:** The **netresearch/jira-skill** is your best bet if you want something premade. But honestly, this is exactly the kind of thing where the pi philosophy shines — you'd probably be better off just installing `jira-cli` (the Go binary) and either writing a 10-line `SKILL.md` yourself, or simply telling pi "I have `jira` CLI installed, use it for Jira operations" in your `AGENTS.md`. The model already knows `jira-cli`'s syntax from training data, and you skip the Python dependency entirely.

The Jira-for-pi space is clearly underdeveloped compared to things like GitHub or browser automation, which have multiple competing approaches.

## User

Which one has the best community sentiments? Stars at github etc.

BTW in the pi extension search it shows me statistics 1,138/mo <- what does that mean?

## Assistant

Two answers:

* * *

### The "1,138/mo" stat

That's **npm monthly downloads**. The pi packages page at shittycodingagent.ai/packages pulls data directly from the npm registry, and that number shows how many times the package was downloaded from npm in the last month. This includes `pi install npm:...` commands, CI pipelines, and any other npm fetch.

Worth noting though — npm download counts have a loose relationship with actual users. They include CI runs, bots, mirror syncs, and duplicate installs. A project with frequent CI runs can have more downloads than one with many real users. So take the number as a rough popularity signal, not a user count. [DEV Community](https://dev.to/andyrichardsonn/how-i-exploited-npm-downloads-and-why-you-shouldn-t-trust-them-4bme)

* * *

### Community sentiment for the Jira options

Here's where things stand by the numbers:

**netresearch/jira-skill** — 40 stars, 12 forks on GitHub. Actively maintained with regular releases (v3.8.0 as of April 2026). Recent commits include new features like cross-cutting worklog queries and improved skill descriptions for more reliable activation. This is by far the most starred and most actively developed Jira integration for any Agent Skills-compatible platform. It's also listed on multiple skill directories like SkillsForge and skills.rest. The parent org (Netresearch) also maintains a whole curated marketplace of agentic skills covering TYPO3, PHP, Go, Docker, Jira, security, and documentation — so it's not a one-off hobby project. [GitHub + 4](https://github.com/netresearch/jira-skill/releases)

**PSPDFKit-labs/pi-skills** (nutrient-bug) — no separate star count since the Jira bit is just one extension inside a larger package. It's a real production tool used internally at Nutrient but too narrow for general use (read-only bug triage only).

**jira-cli** (the standalone Go CLI, not a pi skill) — ~4k stars. By far the most popular Jira CLI tool, but it's a general-purpose tool, not a pi skill. You'd need to write your own `SKILL.md` wrapper.

* * *

**Bottom line:** The **netresearch/jira-skill** wins on every metric that matters for this question — it's the only option with meaningful stars (40), active development, proper releases, cross-platform Agent Skills compatibility, and a maintained org behind it. It's not a blockbuster by GitHub standards, but in the niche of "Jira skills for AI coding agents," it's the clear leader with no real competition.

## User

netresearch/jira-skill is not a PI extension

Is there a JIRA pi extension?

## Assistant

You're right — that's a Claude Code skill, not a pi extension. Let me search specifically for native pi extensions/packages for Jira.

No. There isn't one.

I searched npm for pi packages with `pi-package` keyword + Jira, the awesome-pi-agent list, the pi Discord channels, the official pi-skills repo, and community package collections like ben-vargas/pi-packages. None of them include a Jira extension.

(The `@atlassianlabs/jira-pi-client` packages that show up on npm are Atlassian's own internal libraries — the "pi" in their name is unrelated to the pi coding agent.)

So your real options are:

**Build one.** This is genuinely what pi's philosophy encourages. You could tell pi itself: "Build me an extension that wraps `jira-cli` and registers tools for searching, creating, and transitioning issues." Pi can write its own extensions — that's the whole point. It would be a TypeScript file using `pi.registerTool()` and shelling out to `jira` under the hood.

**Use `jira-cli` with just an AGENTS.md line.** No extension needed. Just add something like `"For Jira operations, use the jira CLI (already installed)"` to your AGENTS.md. The model knows the tool.

**Use pi-mcp-adapter + Atlassian MCP server.** The MCP route, if you're okay with that trade-off.

The gap is real — Jira is one of the most widely used tools in software teams, and nobody's shipped a native pi package for it yet. Could be an opportunity if you're inclined to publish one.

## User

But netresearch/jira-skill can be used in Pi?

## Assistant

Yes, it can! I was wrong to frame it as purely a Claude Code thing.

Pi implements the same **Agent Skills standard** — it discovers `SKILL.md` files in skills directories, reads the YAML frontmatter for name and description, and loads them on demand. That's exactly what netresearch/jira-skill provides. The skills follow the Agent Skills open standard originally developed by Anthropic and released for cross-platform use, and they list support for "other skills-compatible AI agents." [GitHub](https://github.com/netresearch/jira-skill)

You'd install it the same way you'd install any git-based skill in pi:

bash

```bash
# Global (all projects)
git clone https://github.com/netresearch/jira-skill.git ~/.pi/agent/skills/jira-skill

# Or project-level
git clone https://github.com/netresearch/jira-skill.git .pi/skills/jira-skill
```

Pi discovers skills as recursive `SKILL.md` files under subdirectories in the skills path. Since jira-skill has two skills (`jira-communication/SKILL.md` and `jira-syntax/SKILL.md`), pi should pick up both automatically. [Hochej](https://hochej.github.io/pi-mono/coding-agent/skills/)

The scripts underneath are just Python files invoked via `uv run` through bash — which is exactly how pi's skill model works. The agent reads the SKILL.md, learns the commands, and calls them through its bash tool.

So to correct myself: it's not a native pi _extension_ (TypeScript using `ExtensionAPI` with `pi.registerTool()`), but it **is** a valid pi _skill_ that works out of the box. And given that it's the most complete and actively maintained Jira integration following the Agent Skills standard — 40 stars, regular releases, proper CI — it's your best option for Jira in pi today.

## User

is there a github extension / skill for PI?

## Assistant

Yes — and it's in Mario's own official skills repo.

**badlogic/pi-skills** includes `gccli` — which requires Node.js and is installed globally with `npm install -g @mariozechner/gccli`. That's Mario's custom GitHub CLI wrapper, built specifically as a pi skill. It's part of the official first-party skill collection alongside brave-search, browser-tools, gdcli (Google Drive), gmcli (Gmail), subagent, transcribe, vscode, and youtube-transcript. [GitHub](https://github.com/badlogic/pi-skills)

Install:

bash

```bash
git clone https://github.com/badlogic/pi-skills ~/.pi/agent/skills/pi-skills
npm install -g @mariozechner/gccli
```

Beyond that, the awesome-pi-agent list also mentions **agent-stuff** (by mitsuhiko/Armin Ronacher) — skills and extensions for pi covering commit, changelog, **GitHub**, web browser, tmux, Sentry, and more. That's Armin Ronacher (Flask creator, OpenClaw/Sentry) sharing his personal pi setup, which includes GitHub workflows. [GitHub](https://github.com/qualisero/awesome-pi-agent)

And of course, the model already knows `gh` (GitHub's official CLI) natively — most pi users just use `gh` directly through bash without any skill at all, since it's one of those tools LLMs have trained on extensively. But `gccli` is there if you want the skill-based approach with progressive disclosure.

## User

That is for Google Calendar

## Assistant

You're right, I apologize. Looking at the pattern — **g**ccli (Google **C**alendar), **g**dcli (Google **D**rive), **g**mcli (G**m**ail) — it's clearly Mario's Google suite of CLI tools, not GitHub.

So the honest answer is: **no**, there's no dedicated GitHub skill or extension in pi's ecosystem either. Same story as Jira.

The reason is probably that it's unnecessary. The `gh` CLI is so well-known to LLMs and so widely installed on developer machines that nobody's felt the need to wrap it in a skill. You just say "create a PR" and the agent runs `gh pr create` through bash. No SKILL.md, no progressive disclosure needed — the model already knows every `gh` subcommand from training data.

That said, agent-stuff by mitsuhiko (Armin Ronacher) does include GitHub-related skills and extensions for pi — covering commits, changelogs, and GitHub workflows — but that's more of a personal workflow toolkit than a general-purpose GitHub integration. [GitHub](https://github.com/qualisero/awesome-pi-agent)
