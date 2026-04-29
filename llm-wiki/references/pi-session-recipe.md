# Pi session recipe

How to traverse and ingest Pi agent sessions. Lazy-loaded reference for the
Sessions step of the LLM Wiki ingest workflow.

## Directory layout

Pi stores sessions at `~/.pi/agent/sessions/--<encoded-cwd>--/`, where
`<encoded-cwd>` is the absolute working directory with `/` replaced by `-`.
Example: cwd `/Users/alice/proj` → directory
`~/.pi/agent/sessions/--Users-alice-proj--/`. Multiple JSONL files in one
directory = resumed sessions for the same project; treat each as its own
ingestion (or merge by timestamp).

## JSONL event types

Top-level `type` field:

- `session` — file header (one per file): `{id, version, timestamp, cwd}`.
- `model_change` / `thinking_level_change` — config events; usually ignore.
- `message` — main content. Envelope:
  `{id, parentId, timestamp, message: {role, content, ...}}`. Roles: `user`,
  `assistant`, `toolResult`, `bashExecution`. The `content` field is an
  array of `{type: text|thinking|toolCall, ...}` for assistant messages, or
  text/array form for the others.
- `custom` — telemetry under `data.type`: `tool_execution_end` (every tool
  call's result), `web_search` (`data.queries[]`), `fetch_content`
  (`data.urls[]`).

The conversation tree comes from `parentId`. A fork (typically a subagent
spawn) is any `parentId` that appears as parent of more than one message.
Most Pi sessions are mostly linear with occasional forks at subagent
boundaries.

## Extraction recipes (jq)

```bash
SESSION="$HOME/.pi/agent/sessions/--<encoded-cwd>--/<file>.jsonl"

# All user messages (the human side of the conversation)
jq -r 'select(.type=="message" and .message.role=="user") |
       (.message.content | if type=="string" then . else
         (map(select(.type=="text") | .text) | join("\n")) end)' "$SESSION"

# Tool usage histogram (what the agent did)
jq -r 'select(.type=="custom" and .data.type=="tool_execution_end") |
       .data.toolName' "$SESSION" | sort | uniq -c

# URLs cited (web_search queries + fetch_content URLs).
# Note: web_search events keep query strings in .data.queries[].
# fetch_content events carry URLs in BOTH .data.urls[] and .data.queries[]
# (the runtime mirrors them); read both and de-dupe.
jq -r 'select(.type=="custom" and .data.type=="web_search") |
       .data.queries[]?' "$SESSION"
jq -r 'select(.type=="custom" and .data.type=="fetch_content") |
       (.data.urls[]?, .data.queries[]?)' "$SESSION" | sort -u

# Fallback (catches anything the typed selectors miss; useful when the
# event schema evolves):
jq -r '.. | strings' "$SESSION" | grep -oE 'https?://[^ "<>)]+' | sort -u

# Files touched (extract paths from any string in any event)
jq -r '.. | strings' "$SESSION" |
  grep -oE '[a-zA-Z_./~-]+\.(py|cu|md|txt|pdf|h|cc|json|jsonl)' | sort -u

# Forks (parents with >1 child — subagent spawn points)
jq -r 'select(.type=="message") | .parentId' "$SESSION" |
  sort | uniq -c | awk '$1>1 {print}'
```

## Ingest steps

1. Locate the session(s) by encoding `cwd`. If multiple JSONL files exist,
   confirm with the user — usually ingest all, registered as separate
   conversation entries with timestamps in the title.
2. Register the session in `raw-sources/index.md` under `## conversations`
   (reference, absolute path).
3. Run the recipes above to extract cited URLs, file paths, and web
   searches. Each becomes its own source registration (reference if
   in-project or URL, copy only if it has no canonical location).
4. Read user messages chronologically (sort by `timestamp`) for the
   discussion arc. Tool calls and assistant replies are context — skim,
   don't archive verbatim unless explicitly asked.
5. Compile wiki pages from the synthesis (default 1–2 pages per session).
   Prefer citing underlying sources; cite the session only for
   discussion-driven insights.
