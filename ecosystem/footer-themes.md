---
title: Footer themes and working-state visualization
type: concept
updated: 2026-05-05
sources:
  - ~/.pi/agent/sessions/--Users-michael.voigt-devel-AI-aiAgentResearch-agents-pi-mono--/2026-04-17T13-29-34-211Z_019d9ba1-ef03-7425-ab23-be00d42dde15.jsonl
  - https://github.com/nicobailon/pi-powerline-footer
  - https://github.com/can1357/oh-my-pi
tags: [extension, footer]
---

# Footer themes and working-state visualization

Pi's footer/working-state line is customized via community extensions; `pi-powerline-footer` (nicobailon / nicopreme on npm) is the leading option in the ecosystem, with a `/vibe` command for themed working messages — Pi's analogue to Claude Code's verb-shuffling.

## Key claims

- `pi-powerline-footer` is the dominant footer extension: 201 GitHub stars, ~2,900 weekly npm downloads, 39 releases, 0 dependencies.
- `/vibe [theme]` switches the working-message theme; provides a Claude-Code-"whimsical" feel native to Pi.
- `workingVibeMode` is the underlying setting:
  - `file` — picks from a curated set of working-state strings (more than 4 entries despite first impression).
  - `ai` — one small LLM call per `/vibe` change generates themed messages dynamically.
- `ai` mode initially failed with `Error: Failed to generate vibes: No API key for provider: openai-codex`; resolved by binding the vibe LLM call to the currently-selected Pi model rather than a separate provider.
- `oh-my-pi` (can1357, 3,946 stars) is a full pi-mono fork with its own hashline and UI philosophy, not an extension. Both `pi-hashline-edit` and `pi-hashline-readmap` credit it as the origin of the hashline concept.

## Open questions

- Whether `file`-mode entries are user-extensible without forking.
- Cost ceiling of `ai` mode under heavy `/vibe` use.
- Relationship between `oh-my-pi` native hashline and standalone hashline extensions (pi-hashline-edit, pi-hashline-readmap).

## Related Wiki Pages

- [Pi Hashline Edit Tools](pi-hashline-edit-tools.md) — Comparative reference for hashline-style edit extensions
- [Pi Footer, Powerline & Hashline Extension Landscape](pi-footer-hashline-extensions.md) — Full survey of all footer, powerline, and hashline extensions
