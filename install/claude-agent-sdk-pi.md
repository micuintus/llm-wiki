---
title: Installing claude-agent-sdk-pi
type: concept
updated: 2026-04-29
sources:
  - ~/.pi/agent/sessions/--Users-michael.voigt-devel-AI-aiAgentResearch-agents-pi-mono--/2026-04-17T13-29-34-211Z_019d9ba1-ef03-7425-ab23-be00d42dde15.jsonl
  - https://github.com/prateekmedia/claude-agent-sdk-pi/pull/8
tags: [install, extension, claude-agent-sdk-pi]
---

# Installing claude-agent-sdk-pi

The prateekmedia fork's PR #8 was the desired version; install from git the idiomatic pi way, since npm and master can diverge.

## Key claims

- PR #8 of `prateekmedia/claude-agent-sdk-pi` adds a feature not yet upstream ([PR #8](https://github.com/prateekmedia/claude-agent-sdk-pi/pull/8)).
- The npm-published version can be ahead of the GitHub master branch — checking only one is unreliable.
- Idiomatic install from git is via `pi`'s extension install path (not bare `npm install`); registration is verified by the extension/skill appearing in `pi`'s `[Extensions]`/`[Skills]` listing.

## Open questions

- When/whether PR #8 lands upstream.
