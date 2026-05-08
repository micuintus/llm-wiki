---
title: Web Search Provider Strategy — Brave vs Exa vs Both
type: decision
updated: 2026-05-04
sources:
  - session:2026-05-04-web-search-research
see_also:
  - [Web Search Providers](../ecosystem/web-search-providers.md)
  - [Web Search Extensions](../ecosystem/web-search-extensions.md)
---

# Web Search Provider Strategy — Brave vs Exa vs Both

**Question:** Should Pi's web search support Brave Search API, keep Exa, or run both? Will having multiple providers confuse the model?

## Decision

**Keep both. Add Brave Search API alongside Exa.** Do not drop Exa.

The model will not be confused if the integration is designed correctly (see Mitigations below).

## Evidence

### What the competition does

| Product | Search Backends | Model Sees |
|---------|----------------|------------|
| Claude.ai / Claude Code | Brave Search | One `WebSearch` tool |
| ChatGPT | Bing + OAI index + others | One search capability |
| Gemini | Google Search | One grounding tool |
| LeChat | Brave Search | One web search tool |

**None of them expose multiple search tools to the model.** They all expose a single search capability and handle provider selection internally.

### Exa vs Brave — different jobs

| | Exa | Brave Search API |
|---|---|---|
| **Search model** | Neural / embeddings-based semantic | Traditional keyword index |
| **Built for** | LLMs and coding agents | General web search |
| **Coding agents** | Powers "most of the largest coding agent companies"; dedicated `WebCode` evals | Solid but generic |
| **Index** | No traditional web index | 40B+ independent pages |
| **Strength** | Technical docs, APIs, code patterns | News, current events, broad web |
| **AN Score** | 8.7 | 7.1 |

Exa is genuinely better for code. Dropping it would degrade coding-agent search quality.

Brave is better for general web search and has a free tier, which matters for accessibility.

## Why the Model Won't Get Confused

The fear — "the model sees multiple providers and gets confused" — is valid only if the implementation is wrong. Here's how to avoid it:

### The Right Way: One Tool, Internal Routing

The model sees **one `web_search` tool**, not multiple.

```typescript
// The model calls this:
web_search({ query: "rust async runtime" })

// Implementation picks the provider:
// - Exa for code/technical queries
// - Brave for general web/news
// - Perplexity for research/synthesis
// - Gemini as fallback
```

This is exactly how Claude Code, ChatGPT, and Gemini work. The model doesn't know or care which search index is used.

### The Wrong Way: Multiple Tools

```typescript
// DON'T do this — this WOULD confuse the model:
brave_search({ query: "..." })   // Which one?
exa_search({ query: "..." })     // When do I use which?
perplexity_search({ query: "..." }) // Ahh!
```

**Never expose multiple search tools.** Always route internally.

### Implementation Pattern

```typescript
// Tool definition — single tool, optional provider override
{
  name: "web_search",
  parameters: {
    query: string,
    provider: "auto" | "exa" | "brave" | "perplexity" | "gemini",
    // ... other params
  }
}

// Auto-selection logic (invisible to model)
function resolveProvider(query: string, config: Config): Provider {
  if (config.provider !== "auto") return config.provider;
  if (looksLikeCodeQuery(query)) return "exa";
  if (looksLikeNewsQuery(query)) return "brave";
  if (config.perplexityKey) return "perplexity";
  return "gemini"; // fallback
}
```

### The Model's Perspective

The model's system prompt / tool description should say:

> `web_search`: Search the web for current information. The tool automatically selects the best search provider based on your query. Use this when you need information beyond your knowledge cutoff.

That's it. The model doesn't need to know about Exa, Brave, or Perplexity.

## Alternatives Considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Drop Exa, use only Brave** | Simpler; matches Claude.ai/LeChat; free tier | Worse code search quality; lose Exa's neural retrieval | **Rejected** — Exa is materially better for coding agents |
| **Drop Brave, use only Exa** | Best code search; already integrated | Weak general web/news coverage; no free tier; doesn't match industry standard | **Rejected** — Brave fills a different need |
| **Use both with internal routing** | Best of both; matches how Claude/ChatGPT work; free tier available; code search stays strong | Slightly more complex implementation | **Adopted** |
| **Expose both as separate tools** | Explicit control | Model confusion; wrong abstraction | **Rejected** — never do this |

## Current Reality (2026-05-04)

The `web_search` tool on this machine comes from the **`pi-web-access` extension** (installed via `npm:pi-web-access`), not pi-mono core. Pi-mono core has no built-in web search.

`pi-web-access` providers are hardcoded:
```typescript
export type SearchProvider = "auto" | "perplexity" | "gemini" | "exa";
```

**Brave is NOT supported by `pi-web-access`.** Adding it requires either:
- Forking `nicobailon/pi-web-access` and patching the provider enum + adding `brave.ts` (mirror Exa's pattern)
- Building a separate small Brave-only extension that registers a `brave_search` tool
- Using the standalone `brave-search` skill from `badlogic/pi-skills`

Modifying the installed npm package directly is not sustainable — it gets overwritten on `pi update`.

## Brave Setup (Standalone Skill)

The `brave-search` skill is now installed and working on this machine:

- Skill: `~/.pi/agent/skills/brave-search/` (copied from `badlogic/pi-skills`, deps installed)
- API key: `BRAVE_API_KEY` exported in `~/.zprofile`
- Verified: returns Brave search results headlessly via API

This unblocks Brave usage today, separate from `pi-web-access`.

## Migration Path (if/when adding Brave to a unified `web_search` tool)

1. Add Brave Search API as a provider option in the chosen extension
2. Implement auto-selection heuristic (code → Exa, general → Brave)
3. Keep `provider` override parameter for explicit control
4. Update tool description to NOT mention specific providers (model only sees one tool)
5. Add `BRAVE_API_KEY` to credential detection

## Open Questions

- **Auto-selection accuracy:** How well can we detect "code query" vs "general query"? Start with simple heuristics (domain keywords, query patterns) and iterate.
- **Cost at scale:** Users with both API keys may incur double costs if auto-selection is wrong. Add metrics/logging to track provider choice accuracy.
- **Free-tier routing:** Should Brave free tier be preferred when no API keys are configured? Yes — this improves out-of-box experience.
