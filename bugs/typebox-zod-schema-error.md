---
title: "Extension load error: inputSchema must be a Zod schema or raw shape"
type: bug
updated: 2026-05-05
sources:
  - ../raw-sources/conversations/2026-05-05-claude-best-web-search-extension-for-pi-coding-agent.md
tags: [bug, extensions, schema, zod, typebox]
see_also:
  - ../ecosystem/web-search-extensions.md
---

# Extension load error: "inputSchema must be a Zod schema or raw shape"

## Symptom

On `pi install npm:pi-web-access` (and `npm:pi-exa-search`, and likely
any TypeBox-based extension) on Pi v0.67.2:

```
Error: inputSchema must be a Zod schema or raw shape, received an unrecognized object
```

Reproduced with at least two unrelated extensions by different
authors, both built against `@sinclair/typebox`. Confirms the
mismatch is on the Pi side, not the extension side.

## What it indicates

Pi's tool registration path expects a Zod schema (or raw object
shape), but extensions in the wild were built against TypeBox — the
schema library Pi historically used for `pi.registerTool()`. Either:

- Pi 0.67.x switched validators (intentionally or via dependency
  bump), or
- A bundled dependency resolution is pulling a Zod-only validator
  while the extension's TypeBox schema flows through unchanged.

`which pi` returning `/opt/homebrew/bin/pi` rules out the
common-confusion case of accidentally running oh-my-pi.

## Workarounds

Until upstream confirms the intended schema:

1. **Use a skill instead of an extension.** Mario's
   [`brave-search`](https://github.com/badlogic/pi-skills) is a
   SKILL.md plus bash scripts — no `registerTool()`, no schema
   validation, works on any Pi version. Trade: needs a free Brave
   API key.
2. **Pin Pi to a pre-0.67 version** that still accepts TypeBox.
3. **Install the extension from git** (`pi install
   git:github.com/nicobailon/pi-web-access`) on the off chance npm
   is shipping a stale build — did not resolve the error in the
   reported case but worth trying first.

## Status

Open as of 2026-05-05. The Pi issue tracker was reportedly closed
through 2026-04-20; file an issue once it reopens. The relevant data
to include: `pi --version`, `which pi`, exact error, the extension's
`package.json` schema dependency.

## Notes

- Skills bypass this entirely — they don't register tools, they
  expose SKILL.md instructions the agent invokes via `bash`.
- If filing upstream, mention both `pi-web-access` and `pi-exa-search`
  as reproducers; cross-author reproduction is the strongest signal
  the cause is in Pi.
