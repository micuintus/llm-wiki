---
title: Web TUI and mobile / remote access
type: concept
updated: 2026-04-29
sources:
  - ~/.pi/agent/sessions/--Users-michael.voigt-devel-AI-aiAgentResearch-agents-pi-mono--/2026-04-17T13-29-34-211Z_019d9ba1-ef03-7425-ab23-be00d42dde15.jsonl
  - https://github.com/noahsaso/pi-remote
tags: [extension, web, mobile]
---

# Web TUI and mobile / remote access

Pi's stock surface is a terminal TUI. The session explored ecosystem options for browser-based and mobile/remote access — opencode-style "run from the browser" or phone-accessible Pi.

## Key claims

- Pi's built-in web UI was found to *not* offer opencode-equivalent browser-runtime or phone access — it's lighter than expected.
- `noahsaso/pi-remote` came up as one extension targeting this gap; surveyed alongside others.
- Survey criteria explicitly set during the session: extension code quality, npm download counts, and web sentiment.
- Use cases that pushed the question: opencode-like browser session continuity, phone-accessible Pi for on-the-go agent runs.

## Open questions

- Top-ranked remote/web extension by the session's criteria — name and verdict to be filled on cascade.
- Whether pi-remote (or any extension) actually achieves opencode parity, or whether the gap is structural to Pi's TUI-first design.
- Mobile UX viability — the survey raised the question, no extension was confirmed to nail it.
