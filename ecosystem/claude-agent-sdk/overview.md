---
title: claude-agent-sdk-pi — fork landscape and install
type: concept
updated: 2026-04-29
sources:
  - ~/.pi/agent/sessions/--Users-michael.voigt-devel-AI-aiAgentResearch-agents-pi-mono--/2026-04-17T13-29-34-211Z_019d9ba1-ef03-7425-ab23-be00d42dde15.jsonl
  - ~/.pi/agent/sessions/--Users-michael.voigt-devel-AI-aiAgentResearch-agents-pi-mono--/2026-04-21T12-18-51-580Z_019daffa-a23b-74f3-96dd-3cb02b5e7661.jsonl
  - https://github.com/prateekmedia/claude-agent-sdk-pi/pull/8
  - https://github.com/prateekmedia/claude-agent-sdk-pi/pull/10
tags: [extension, claude-agent-sdk, install]
---

# claude-agent-sdk-pi — fork landscape and install

`claude-agent-sdk-pi` is the bridge between Pi and Anthropic's `@anthropic-ai/claude-agent-sdk`. Multi-fork landscape; npm and master can diverge; idiomatic install is via Pi's extension path, not bare `npm install`.

## Key claims

- Fork chain: upstream Anthropic SDK → `prateekmedia/claude-agent-sdk-pi` (community-maintained Pi adapter) → `micuintus/claude-agent-sdk-pi` (Voigt's own fork for in-flight fixes).
- The npm-published version of `prateekmedia/claude-agent-sdk-pi` can be ahead of the GitHub master branch — checking only one is unreliable; both must be inspected.
- Idiomatic Pi install is via `pi`'s extension install path; registration verified by extension/skill appearing in `pi` listing under `[Extensions]`/`[Skills]`. Bare `npm install -g` does not always register.
- [PR #8 (prateekmedia)](https://github.com/prateekmedia/claude-agent-sdk-pi/pull/8) — adds `settingSources` and `strictMcpConfig` working alongside `appendSystemPrompt`. The trigger for the original fork-install investigation.
- [PR #10 (prateekmedia)](https://github.com/prateekmedia/claude-agent-sdk-pi/pull/10) — separate hallucinated-USER-responses fix for Opus 4.7 (see `troubleshooting/opus-4-7-hallucination` once written, or this page until then).
- Voigt's `micuintus/claude-agent-sdk-pi` carries a `dev` branch with both fixes applied so the local Pi can live on a stable composite while upstream PRs are pending.

## Open questions

- Upstream merge timeline for PR #8 and PR #10.
- Whether the multi-fork pattern indicates a maintenance gap that warrants taking over the Pi adapter or whether prateekmedia's cadence is sufficient.
- Cleanest way to keep the `dev` branch rebased without manual intervention each time master moves.
