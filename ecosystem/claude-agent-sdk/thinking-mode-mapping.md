---
title: Pi thinking-mode mapping and Opus 4.7 adaptive thinking
type: concept
updated: 2026-05-04
sources:
  - ~/.pi/agent/sessions/--Users-michael-voigt-devel-AI-aiAgentResearch-agents-pi-mono--/2026-04-21T12-18-51-580Z_019daffa-a23b-74f3-96dd-3cb02b5e7661.jsonl
  - ~/.pi/agent/settings.json
  - https://github.com/badlogic/pi-mono/pull/3286
  - https://github.com/badlogic/pi-mono/issues/3299
  - https://allthings.how/claude-opus-4-7-adaptive-thinking-explained/
tags: [config, claude-agent-sdk, thinking, troubleshooting]
---

# Pi thinking-mode mapping and Opus 4.7 adaptive thinking

Pi exposes generic thinking modes (`think:high`, etc.) that are mapped per-model in the SDK adapter. Opus 4.7 broke the legacy mapping because it uses adaptive thinking — without an explicit `display: "summarized"` setting, the SDK emits no thinking blocks even though the model is reasoning normally.

## Key claims

- Pi's thinking config is generic by design: a single `think:<level>` is mapped to the model-specific parameter at the SDK boundary. Goal is portability; failure mode is silent breakage on new model behaviors.
- `~/.pi/agent/settings.json` carries `hideThinkingBlock` (toggleable with Ctrl+R by default) — independent of the mapping; this only hides display, doesn't disable generation.
- Symptom: Opus 4.7 with `think:high` showed *no* thinking in `claude-agent-sdk-pi`. Sonnet 4.6 worked. OpenCode Go (Zen provider) showed thinking on Opus 4.7 — confirming model-side was fine and the gap was in the Pi SDK adapter.
- Red herring eliminated: `inputTimeoutMs` was investigated and ruled out.
- Root cause: Opus 4.6/4.7 and Sonnet 4.6 drop the legacy max-tokens-style thinking config and require **adaptive** with `display: "summarized"`. Without `display`, the SDK streams thinking events the wrapper drops.
- Fix landed in two places:
  1. [pi-mono PR #3286](https://github.com/badlogic/pi-mono/pull/3286) — model-specific thinking-mode mapping.
  2. Voigt's `fix/opus-4-7-adaptive-thinking` branch on `micuintus/claude-agent-sdk-pi` — the SDK-side companion.
- Live verification: after the patch, Opus 4.7 produced visible thinking blocks ("NOW IT WORKED!" — handshake-count proof in transcript).

## Opus 4.7 xhigh vs max — deliberate decision, not a bug

[PR #3286 review thread](https://github.com/badlogic/pi-mono/pull/3286) debated whether pi-`xhigh` on Opus 4.7 should map to provider `max` (like Opus 4.6 does) or provider `xhigh`.

**The chart:** Anthropic's internal evaluation shows Opus 4.7 `xhigh` at ~71% / ~104k tokens, `max` at ~74% / ~210k tokens. ~2× tokens for ~3 percentage points.

**The call:** mitsuhiko (collaborator) decided `xhigh` should **not** map to `max` given the graph — the gap is too large to silently collapse. markusylisiurunen (PR author) agreed and updated the mapping.

**Why the asymmetry with Opus 4.6?** Opus 4.6 has no native `xhigh` rung — only `low/medium/high/max`. So pi-`xhigh → max` is the only way to reach the model's ceiling. Opus 4.7 has **both** `xhigh` and `max` natively, so pi-`xhigh` maps to provider-`xhigh`, leaving provider-`max` unreachable. This is intentional cost/quality separation, not a data inconsistency.

**Generated data:** `packages/ai/scripts/generate-models.ts:128-133` has two adjacent hardcoded branches:
```ts
if (model.id.includes("opus-4-6")) mergeThinkingLevelMap(model, { xhigh: "max" });
if (model.id.includes("opus-4-7")) mergeThinkingLevelMap(model, { xhigh: "xhigh" });
```

**#3299** ("Add `max` thinking level") proposed a 6th pi rung to expose provider-`max`. Auto-closed; no maintainer reopened.

## Open questions (answered)

- ~~Whether Mario's mapping logic catches Opus 4.6 *and* 4.7 generically or hardcodes both~~ — **Hardcoded both, deliberately differently**, per PR #3286 review.
- ~~Long-term: should the mapping live in the SDK adapter or upstream in pi-mono?~~ — **Upstream in pi-mono** via `thinkingLevelMap` (#3208). The SDK adapter consumes it; no duplication.
- ~~What happens for the *next* model with a different thinking-config shape~~ — **Per-model `thinkingLevelMap` is the extensibility mechanism.** Each model declares its own ceiling and provider-value mappings.
