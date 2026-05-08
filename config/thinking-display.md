---
title: Thinking-block display in claude-agent-sdk-pi
type: concept
updated: 2026-04-29
sources:
  - ~/.pi/agent/sessions/--Users-michael.voigt-devel-AI-aiAgentResearch-agents-pi-mono--/2026-04-21T12-18-51-580Z_019daffa-a23b-74f3-96dd-3cb02b5e7661.jsonl
  - ~/.pi/agent/settings.json
tags: [config, troubleshooting, claude-agent-sdk-pi]
---

# Thinking-block display in claude-agent-sdk-pi

Thinking blocks are gated by the `hideThinkingBlock` setting and behave differently across models.

## Key claims

- `~/.pi/agent/settings.json` has a `hideThinkingBlock` setting controlling display.
- Default keybind to toggle is Ctrl+R.
- Sonnet 4.6 displays thinking; Opus 4.7 with `think:high` did not show thinking in claude-agent-sdk-pi at the time of debugging.
- OpenCode Go (Zen provider) shows thinking — confirms it's a claude-agent-sdk-pi-specific gap, not a model-side issue.

## Open questions

- Is the Opus-4.7 + `think:high` non-display a fork bug, an upstream-Pi issue, or expected behavior given streaming format differences?
