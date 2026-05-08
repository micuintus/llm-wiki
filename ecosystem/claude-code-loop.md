---
title: Claude Code /loop — Cron-Scheduled Task Repetition
type: concept
updated: 2026-05-06
sources:
  - https://code.claude.com/docs/en/scheduled-tasks
  - https://code.claude.com/docs/en/agent-sdk/agent-loop
  - https://docs.anthropic.com/en/docs/claude-code/slash-commands
  - https://docs.bswen.com/blog/2026-03-31-claude-code-loop-schedule/
  - https://contextstudios.ai/blog/claude-code-loop-autonomous-agent
  - https://claude-world.com/articles/claude-code-auto-memory-loop/
tags: [claude-code, loop, cron, comparison]
---

# Claude Code `/loop` — Cron-Scheduled Task Repetition

`/loop` in Claude Code is **not** a tight tool-calling loop like Pi's Ralph extensions. It is a **session-scoped cron scheduler**. Different problem space, different mechanics.

## What it actually does

`/loop` is a [bundled skill](https://docs.anthropic.com/en/docs/claude-code/slash-commands) (prompt-based, not hardcoded logic) that schedules a prompt to re-run on an interval while the session stays open.

| Invocation | Behavior |
|------------|----------|
| `/loop 5m check the deploy` | Runs prompt every 5 minutes (cron `*/5 * * * *`) |
| `/loop check the deploy` | Claude **picks** the interval (1m–1h) dynamically each iteration based on what it observed |
| `/loop` | Runs the **built-in maintenance prompt** at a dynamic interval, OR the contents of `loop.md` if it exists |
| `/loop 20m /review-pr 1234` | Re-runs another packaged slash command on a schedule |

Implemented under the hood via three tools:

- `CronCreate` — schedule a task (5-field cron expression + prompt + recurring/one-shot)
- `CronList` — list scheduled tasks
- `CronDelete` — cancel by 8-char ID

You can also ask in natural language: *"remind me at 3pm to push the release branch"* → one-shot. *"every weekday at 9am, summarize new PRs"* → recurring.

## How tasks fire

- Scheduler checks every second for due tasks; enqueues them at low priority.
- A scheduled prompt fires **between turns**, never mid-response. If Claude is busy, prompt waits until idle.
- All times in local timezone.
- **Jitter**: recurring tasks fire up to 30 minutes after scheduled time (deterministic offset from task ID); one-shot tasks at `:00`/`:30` fire up to 90s early.
- **7-day expiry**: recurring tasks auto-expire 7 days after creation. One final fire then auto-delete.
- **No catch-up**: if Claude is busy past a scheduled time, fires once when idle, not once per missed interval.
- Session-scoped; restored on `claude --resume`/`--continue` if not yet expired.

## `loop.md` — customizing the bare-`/loop` prompt

When you run bare `/loop`, Claude looks for:

| Path | Scope |
|------|-------|
| `.claude/loop.md` | Project (takes precedence) |
| `~/.claude/loop.md` | User (default in any project) |

If neither exists, falls back to a **built-in maintenance prompt**:

> 1. continue any unfinished work from the conversation
> 2. tend to the current branch's pull request: review comments, failed CI, merge conflicts
> 3. run cleanup passes (bug hunts, simplification) when nothing else pending
>
> Claude does not start new initiatives outside that scope; irreversible actions (push, delete) only proceed when continuing something already authorized in the transcript.

`loop.md` is plain Markdown, max 25KB. Edits take effect on the next iteration — you can refine instructions while a loop runs.

## Stopping

- `Esc` while waiting → clears pending wakeup, loop ends.
- Tasks scheduled by asking Claude directly (not via `/loop`) require explicit `CronDelete`.
- `CLAUDE_CODE_DISABLE_CRON=1` disables the scheduler entirely.

## Comparison with cloud / desktop alternatives

| | Cloud Routines | Desktop scheduled tasks | `/loop` |
|---|---|---|---|
| Runs on | Anthropic cloud | Your machine | Your machine |
| Requires machine on | No | Yes | Yes |
| Requires open session | No | No | Yes |
| Persistent across restarts | Yes | Yes | Restored on `--resume` if unexpired |
| Access to local files | No (fresh clone) | Yes | Yes |
| MCP servers | Connectors per task | Config files + connectors | Inherits from session |
| Permission prompts | None (autonomous) | Per-task | Inherits |
| Min interval | 1 hour | 1 minute | 1 minute |

For automation that survives session close: **Routines**, **Desktop scheduled tasks**, or **GitHub Actions**.

## How `/loop` differs from Pi Ralph extensions

This is the critical comparison for porting decisions.

| Aspect | Claude Code `/loop` | Pi Ralph extensions |
|--------|---------------------|---------------------|
| **Trigger** | Cron (timed) | Event (`agent_end`) |
| **Cadence** | Minutes/hours | Immediate, back-to-back |
| **Use case** | Polling: deployment status, PR babysitting, periodic checks | Tight iteration: build → test → fix → repeat |
| **Concurrent loops** | Up to 50 per session | One per extension instance (typically) |
| **Built-in?** | Yes (bundled skill) | No (extension) |
| **State persistence** | Cron tasks restored on resume | Session entries / external files |
| **Mid-iteration steering** | N/A (waits for next interval) | Yes (`steer()` queue) in some variants |
| **Determinism** | Cron-deterministic | LLM-deterministic (one call → next call) |

**They solve different problems.** Pi's Ralph is for autonomous coding campaigns (DACMICU, MATS-style work). Claude Code's `/loop` is for monitoring and reactive task scheduling.

## Could Pi implement `/loop`-style scheduling?

Yes, as an extension, but not yet built:

- Pi has `pi.on("agent_end", ...)` but no built-in cron primitive.
- A `pi-cron` extension could use `setInterval` / `node-cron`, register `/cron-create`, `/cron-list`, `/cron-delete` commands, and call `pi.sendUserMessage(prompt)` on cron tick (only when `ctx.isIdle()`).
- Persistence across restart would need `pi.appendEntry` for cron state in the session JSONL.
- Jitter/expiry/missed-fire semantics would have to be re-implemented.

This would complement (not replace) Pi's tight-loop Ralph extensions.

## How `/loop` interacts with Claude Code's agent loop

Claude Code's underlying agent loop (per [How the agent loop works](https://code.claude.com/docs/en/agent-sdk/agent-loop)):

> 1. Receive prompt → 2. Choose tool → 3. Receive results → 4. Repeat. Each full cycle is one turn. Claude continues calling tools until task complete.

`/loop` lives **above** that — at the session level. Each scheduled fire is a fresh user message → fresh agent loop → completion. Then the cron waits for the next interval.

So Claude Code's stack is:

```
cron task (every N minutes)
  └─ session.send(prompt)
       └─ agent loop (turns until done)
            └─ tool calls within turns
```

Pi's Ralph extensions are:

```
agent loop completes (any reason)
  └─ extension fires sendUserMessage(prompt)
       └─ next agent loop (turns until done)
            └─ extension fires again on agent_end
            └─ ... until breakout
```

The two layers (timed vs immediate) are **complementary**, not equivalent.

## Cross-references

### pi-mono wiki
- [ecosystem/loop-extensions](loop-extensions.md) — Pi's Ralph and until-done extensions (immediate/event-driven)
- [comparisons/loop-architectures](../comparisons/loop-architectures.md) — pi-mono vs opencode2 vs Claude Code agent loops
- [architecture/loop-internals](../architecture/loop-internals.md) — Pi's loop mechanics
- [dacmicu/concept](../dacmicu/concept.md) — DACMICU primitive (the immediate-loop problem)
- [dacmicu/pi-port](../dacmicu/pi-port.md) — porting DACMICU to Pi
