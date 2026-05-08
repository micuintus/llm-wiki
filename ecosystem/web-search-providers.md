---
title: Web Search Providers Used by Major AI Products
type: concept
updated: 2026-05-04
sources:
  - session:2026-05-04-web-search-research
see_also:
  - [Web Search Extensions](web-search-extensions.md)
  - [Web Search Provider Strategy](../decisions/web-search-provider-strategy.md)
---

# Web Search Providers Used by Major AI Products

What search backend powers web search in the leading AI chat interfaces.

## Overview

| Product | Backend | Notes |
|---------|---------|-------|
| **Gemini** (gemini.google.com) | **Google Search** | Native "Grounding with Google Search" — same index as google.com |
| **Claude.ai** | **Brave Search** | Confirmed by TechCrunch (Mar 2025) and FedRAMP docs |
| **Claude Code** | **Brave Search** | Same `web_search` server tool on Anthropic infra as claude.ai |
| **ChatGPT** | **Bing** (primary) + **OpenAI OAI-Searchbot index** + undisclosed others | Mix; OpenAI building own index to reduce MS dependency |
| **LeChat** (Mistral) | **Brave Search** | Reverse-engineered before launch; Mistral docs don't disclose |

## Key Patterns

**Brave Search is becoming the de facto standard for AI chat search.**

Why:
- Independent index (no Bing dependency since 2023)
- Clean API designed for LLM/RAG use (`llm-context` mode)
- Privacy-friendly positioning
- Bing Search APIs retiring August 11, 2025 — Brave is the leading replacement
- Powers Claude.ai, LeChat, and most MCP web-search integrations

**Gemini** is the obvious outlier — they own Google Search.

**ChatGPT** is the other outlier — partnered with Bing (Microsoft is an investor) but building their own `OAI-Searchbot` crawler/index to reduce dependency.

## Provider Comparison (for AI Agent Use)

| Provider | Search Model | Strength | Weakness | Cost |
|---|---|---|---|---|
| **Exa** | Neural / embeddings-based semantic search | Best for code/technical docs; powers "most of the largest coding agent companies"; dedicated `WebCode` evals | Does NOT maintain a traditional web index; weaker for news/current events | $0.005–0.01/query |
| **Brave Search API** | Traditional keyword + ranking index | Broad web coverage, news, current events; 40B+ pages; independent index | More generic; less optimized for deep technical retrieval | $0.005/query; free tier (2K/mo) |
| **Perplexity** | Synthesized answers with citations | Great for research/questions requiring synthesis | Returns summary, not raw results — changes the RAG contract | $5/1K queries |
| **Gemini Grounding** | Google Search index | Massive coverage; free if you have Gemini API key or browser cookies | Tied to Google ecosystem; less control over retrieval | Free with API/browser |

## What Google Does NOT Offer

**Google does not provide a general-purpose web search API for AI agents.** This is a key reason Brave is becoming the de facto standard.

| Google Product | Status / Limitation |
|---|---|
| **Custom Search JSON API** | **CLOSED to new customers.** Existing users must transition by Jan 1, 2027. $5/1K queries, only returns metadata (title/snippet/URL), no content extraction |
| **Programmable Search Engine** | Site-restricted; whole-web mode does NOT match Google.com quality |
| **Vertex AI Search / Agent Search** | Enterprise RAG for your own data, not general web search |
| **Gemini "Grounding with Google Search"** | Only works when calling Gemini models via Google's API — not a standalone search API |

With Bing Search APIs retiring **August 11, 2025**, and Google never offering a real replacement, **Brave is the last independent Western web search index with a developer API.**

## Relevance to Pi

Pi's current `web_search` implementation (via `pi-web-access` or built-in tools) supports Exa, Perplexity, and Gemini with auto-selection. Adding Brave would:

- Match the provider choice of Claude.ai and LeChat
- Improve general web search / news coverage
- Provide a free-tier option for users
- Maintain Exa for code-specific queries

The multi-provider pattern is standard — no major AI product relies on a single search backend. The model does not need to "choose" manually; the tool auto-selects based on query type and availability.
