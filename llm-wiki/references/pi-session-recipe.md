# Pi session recipe

How to traverse and ingest Pi agent sessions. Lazy-loaded reference for the
Sessions step of the LLM Wiki ingest workflow.

## Directory layout

Pi stores sessions at `~/.pi/agent/sessions/--<encoded-cwd>--/`, where
`<encoded-cwd>` is the absolute working directory with `/` replaced by `-`.
Multiple JSONL files in one directory = resumed sessions for the same project.

## Step 0: Fork detection (MANDATORY)

Before reading any content, check for forks. A fork means resumed sessions,
subagent spawns, or repeated user messages — each branch may contain distinct
topic content.

```bash
SESSION="$HOME/.pi/agent/sessions/--<encoded-cwd>--/<file>.jsonl"

# 1. Forks (parents with >1 child) — NEVER skip
jq -r 'select(.type=="message") | .parentId' "$SESSION" | sort | uniq -c | awk '$1>1 {print}'

# 2. User messages with timestamps — detect multi-day sessions
jq -r 'select(.type=="message" and .message.role=="user") |
       "\(.timestamp[0:19]): \((.message.content | if type=="string" then . else (map(.text) | join("")) end) | .[0:100])"' "$SESSION"
```

**If forks exist, read branch by branch.** Do not sort by timestamp and read
linearly. Extract ALL assistant messages with `parentId` metadata.

## Step 1: Extract substantive content

```bash
# All assistant text and thinking blocks (across ALL branches)
jq -r 'select(.type=="message" and .message.role=="assistant") |
       "\n--- parent=\(.parentId) ts=\(.timestamp) ---\n" +
       (.message.content | if type=="string" then . else
         (map(select(.type=="text" or .type=="thinking") | "[\(.type)] \(.text)") | join("\n")) end)' "$SESSION"
```

**Key rule:** If `assistant` messages contain only `thinking: null` and no
`text`, the assistant produced artifacts via `write`/`edit` tool calls. Check
`custom` events (Step 2) for what was produced.

## Step 2: Extract failures and notable events from custom events

```bash
# Fetch failures
echo "=== Fetch failures ==="
jq -r 'select(.type=="custom" and .data.type=="fetch_content" and .data.error) |
       "FAIL \(.data.urls[0]): \(.data.error)"' "$SESSION"

# Rate limits / errors
echo "=== Errors ==="
jq -r 'select(.type=="custom" and (.data.type=="error" or .data.type=="rate_limit")) |
       "\(.data.type): \(.data | tostring)"' "$SESSION"

# Tool usage histogram
echo "=== Tools ==="
jq -r 'select(.type=="custom" and .data.type=="tool_execution_end") | .data.toolName' "$SESSION" | sort | uniq -c | sort -rn

# Artifacts produced via write/edit
echo "=== Artifacts ==="
jq -r 'select(.type=="custom" and .data.type=="tool_execution_end" and
       (.data.toolName=="write" or .data.toolName=="edit")) |
       "\(.data.toolName): \(.data.result // .data.args // \"unknown\")"' "$SESSION"
```

**Document these in the session page:**
- Failed fetches (auth, 429, sign-in walls)
- Rate limits or interruptions
- Artifacts produced via tool calls

## Step 3: Extract cited sources

```bash
# URLs from web_search + fetch_content
jq -r 'select(.type=="custom" and .data.type=="web_search") | .data.queries[]?' "$SESSION"
jq -r 'select(.type=="custom" and .data.type=="fetch_content") |
       (.data.urls[]?, .data.queries[]?)' "$SESSION" | sort -u

# Files touched
jq -r '.. | strings' "$SESSION" |
  grep -oE '[a-zA-Z_./~-]+\.(py|cu|md|txt|pdf|h|cc|json|jsonl|ts|js)' | sort -u
```

## Session page template

```markdown
---
title: "Session YYYY-MM-DD: <topic>"
type: session
updated: YYYY-MM-DD
sources:
  - /absolute/path/to/session.jsonl
see_also: []
---

## Hook
One-line summary.

## Structure
Linear / forked (N branches). Multi-day? Rate limit hit?

## Key content
- User asked X → assistant responded with Y

## Notable events
- Rate limit at TS: "..."
- Fetch failure: URL, reason
- Artifacts produced: file paths
```

## Mistakes to avoid

1. **❌ Linear timestamp scan** — misses resumed sessions and forked branches.
2. **❌ Skipping custom events** — misses fetch failures, rate limits, errors.
3. **❌ Treating tool-call branches as empty** — assistant may have produced a
   40KB file via `write`/`edit` with no text reply.
