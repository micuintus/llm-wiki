---
title: Anthropic subscription auth in pi (and why third-party tools can't reach the main budget)
type: concept
updated: 2026-05-05
sources:
  - ../raw-sources/conversations/2026-05-05-claude-using-claude-pro-max-team-with-pi.md
  - https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/providers.md
  - https://github.com/badlogic/pi-mono/issues/2751
  - https://github.com/badlogic/pi-mono/discussions/2950
  - https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/CHANGELOG.md
  - https://github.com/can1357/oh-my-pi
  - https://mlq.ai/news/anthropic-ends-paid-access-for-claude-in-third-party-tools-like-openclaw/
tags: [ecosystem, auth, anthropic, oauth, billing]
---

# Anthropic subscription auth in pi

Three routes to send requests to Anthropic from pi, with very different
billing implications.

## Routes

1. **`/login` → Anthropic OAuth (subscription).** Browser OAuth flow,
   tokens in `~/.pi/agent/auth.json`, auto-refreshed. As of April 2026
   this routes to your Claude **extra-usage** add-on bundle, not the
   main Pro/Max/Team budget. Pi's interactive mode now warns about
   this explicitly (per-token billing on top of the base
   subscription).
2. **`ANTHROPIC_API_KEY`.** Pay-as-you-go via the Anthropic Console.
   Pi prefers the env var over OAuth tokens if both are set — unset
   it before `/login` if you want subscription auth.
3. **Foundry (enterprise).** `CLAUDE_CODE_USE_FOUNDRY=1`,
   `FOUNDRY_BASE_URL`, `ANTHROPIC_FOUNDRY_API_KEY`. Anthropic's
   enterprise inference path, documented in oh-my-pi's changelog.

## Why third-party tools can't reach the main subscription budget

On 2026-04-03 Anthropic terminated third-party access to the main
Claude subscription budget. Their announcement: "Starting tomorrow at
12pm PT, Claude subscriptions will no longer cover usage on
third-party tools like OpenClaw. You can still use these tools with
your Claude login via extra usage bundles (now available at a
discount), or with a Claude API key."

Pre-April-2026, tools like opencode, OpenClaw, and oh-my-pi could
reverse-engineer the Claude Code OAuth flow and route requests through
the main budget at ~5–10× lower effective cost than pay-as-you-go API.
Anthropic patched the gateway and now issues clear errors to
unauthorized clients.

## Detection mechanism

Not header-based. Not TLS-fingerprint-based. Anthropic pattern-matches
the **system prompt content** against Claude Code's known prompts.
Sending Claude Code's exact system prompt → routed to main budget;
sending a custom prompt → blocked or routed to extra-usage.

This is why the user-agent and `anthropic-beta` header tricks don't
work on their own, and why @badlogic merged the user-agent fix
(removing the `(external, cli)` suffix, see PR #1677) but pi requests
still land on extra-usage. The user-agent change is necessary but not
sufficient.

## What oh-my-pi appears to do differently

Inferred from oh-my-pi's repo structure (source not directly
inspectable from outside the org); confirmation should come from
reading `packages/ai/src/providers/claude.ts` in that fork.

- Has a separate `./claude` provider module alongside `./anthropic`.
  Strong signal that it wraps the **Claude Code SDK** (`query()` /
  `claude -p` subprocess) rather than calling `api.anthropic.com`
  directly with an OAuth token. From Anthropic's perspective, that
  *is* Claude Code, so the main-budget path is legitimately open.
- Bundled Claude Code version kept current (vs base pi's stale 2.1.2
  at the time the chat was researched).
- System prompt compatible with Claude Code's pattern (not directly
  verified — this is the most load-bearing claim and the one to
  re-confirm before relying on it).

## Practical answer

| Goal | Route |
|---|---|
| Use main Pro/Max/Team budget in pi | Not possible in base pi today. Use Claude Code directly, or a fork like oh-my-pi that wraps the Claude Code SDK. |
| Subscription auth in pi at extra-usage rates | `/login` → Anthropic, accept the warning. Make sure `ANTHROPIC_API_KEY` is unset. |
| Pay-as-you-go API | Set `ANTHROPIC_API_KEY`. |
| Enterprise inference | Foundry env vars. |

## Open questions

- Whether oh-my-pi's main-budget route still works after subsequent
  Anthropic detection updates (the chat itself was speculative on the
  exact mechanism and could not read the source).
- Whether a pi extension (rather than fork) could provide a
  Claude-Code-SDK-based provider without forking. Discussion #2950
  suggests no current path inside base pi.

## See Also

- [Local Pi Setup](../references/local-pi-setup.md) — extension and
  auth state on this machine.
