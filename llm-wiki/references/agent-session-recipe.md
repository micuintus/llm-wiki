# Agent session recipe

Minimal extraction patterns for Claude Code, Gemini CLI, opencode, and Pi.
Lazy-loaded: only read this file when actually scanning agent transcripts.

> **Verification.** Last confirmed on 2026-05-07 against current Claude
> Code, Gemini CLI, and opencode storage layouts. Before applying, peek
> at one session file (`head` for JSONL/JSON, `sqlite3 .schema` for
> opencode) and confirm the format still matches. If the schema has
> drifted, adapt the recipe and update this preamble — don't silently
> work around it.

## At a glance

| Tool | Storage | Format | Forks? |
|------|---------|--------|--------|
| **Claude Code** | `~/.claude/projects/<sanitized-cwd>/<uuid>.jsonl` | JSONL stream | Rare (resumed = new file) |
| **Gemini CLI** | `~/.gemini/tmp/<proj>/chats/session-*.json` | Single JSON | No |
| **opencode** | `~/.local/share/opencode/opencode.db` | SQLite | Yes (`parent_id`) |
| **Pi** | `~/.pi/agent/sessions/--<cwd>--/<file>.jsonl` | JSONL **tree** | **Yes (CRITICAL)** |

`<sanitized-cwd>` = replace `/` with `-`. For Pi: `--<cwd>--` = double-dash wrapped.

---

## Pi (JSONL tree) — FORK DETECTION IS MANDATORY

Pi sessions are **not linear**. Every message has a `parentId`. Resumed
conversations, subagent spawns, and repeated user messages create
**forks** (one parent → multiple children).

### Step 0: Detect forks

```bash
SESSION="$HOME/.pi/agent/sessions/--<encoded-cwd>--/<file>.jsonl"

# Parents with >1 child → forked branches
jq -r 'select(.type=="message") | .parentId' "$SESSION" | \
  sort | uniq -c | awk '$1>1 {print}'

# User message timestamps + preview
jq -r 'select(.type=="message" and .message.role=="user") |
  "\(.timestamp[0:19]): \((.message.content | if type=="string" then . else (map(.text) | join("")) end) | .[0:100])"' "$SESSION"
```

**If forks exist, read branch by branch.** Do not sort by timestamp.

### Extract per branch

```bash
# All assistant text/thinking (across ALL branches)
jq -r 'select(.type=="message" and .message.role=="assistant") |
  "\n--- parent=\(.parentId) ts=\(.timestamp) ---\n" +
  (.message.content | if type=="string" then . else
    (map(select(.type=="text" or .type=="thinking") |
      "[\(.type)] \(.text)") | join("\n")) end)' "$SESSION"

# Custom events: failures, artifacts, tools
jq -r 'select(.type=="custom") |
  if .data.type=="fetch_content" and .data.error then "FETCH_FAIL: \(.data.urls[0])"
  elif .data.type=="error" then "ERROR: \(.data | tostring[0:200])"
  elif .data.type=="tool_execution_end" and (.data.toolName=="write" or .data.toolName=="edit")
    then "ARTIFACT: \(.data.toolName) → \(.data.result // .data.args // "?")"
  else empty end' "$SESSION"
```

**Critical:** If assistant messages contain only `thinking: null` and no
`text`, the assistant produced artifacts via `write`/`edit`. Check custom
events for what was produced.

---

## Claude Code (JSONL stream)

```bash
PROJ="$HOME/.claude/projects/-Users-me-devel-ProjName"

# Triage by size + title
ls -laS "$PROJ"/*.jsonl
for f in "$PROJ"/*.jsonl; do echo "$(basename "$f"): $(grep -m1 '"aiTitle":' "$f" | cut -d'"' -f4)"; done

# Skip stubs (<5 KB)

# Extract
jq -r 'select(.type=="user" and .message.role=="user") |
  "\n--- USER \(.timestamp) ---\n" +
  (.message.content | if type=="string" then . else (map(select(.type=="text") | .text) | join("\n")) end)' "$PROJ"/<uuid>.jsonl

jq -r 'select(.type=="assistant") |
  "\n--- ASSIST \(.timestamp) ---\n" +
  (.message.content | map(if .type=="text" then .text elif .type=="thinking" then "[think] "+.thinking elif .type=="tool_use" then "[tool:\(.name)] "+(.input|tostring|.[0:200]) else empty end) | join("\n"))' "$PROJ"/<uuid>.jsonl

# Subagents
for meta in "$PROJ"/<uuid>/subagents/*.meta.json; do
  echo "$(basename "$meta"): $(jq -r '.agent_type + " :: " + (.task_description // .description // "?")' "$meta")"
done
```

**Read `memory/MEMORY.md` first** — pre-condensed ground truth.

---

## Gemini CLI (single JSON)

```bash
PROJ="$HOME/.gemini/tmp/<project-name>"

# Find project by .project_root
for d in "$HOME/.gemini/tmp/"*/; do
  [ -f "$d/.project_root" ] && [ "$(cat "$d/.project_root")" = "$PWD" ] && echo "$d"
done

# Extract
SESSION="$PROJ/chats/session-*.json"
jq -r '.messages[] |
  if .type=="user" then "\n--- USER \(.timestamp) ---\n" + (.content | if type=="string" then . else (map(.text) | join("\n")) end)
  elif .type=="gemini" then "\n--- GEMINI \(.timestamp) ---\n" + .content +
    (if .thoughts then "\n[thoughts]\n" + (.thoughts | map("- [\(.subject)] \(.description)") | join("\n")) else "" end) +
    (if .toolCalls then "\n[tools]\n" + (.toolCalls | map("\(.name)(\(.args | tostring | .[0:160]))") | join("\n")) else "" end)
  else empty end' "$SESSION"

# Token total
jq -r '[.messages[] | select(.tokens) | .tokens.total] | add' "$SESSION"
```

Tool outputs in `tool-outputs/session-<id>/` — read selectively.

---

## opencode (SQLite — two schema variants)

```bash
DB="$HOME/.local/share/opencode/opencode.db"

# Index sessions for project
sqlite3 "$DB" "SELECT id, title, datetime(time_created/1000,'unixepoch') FROM session WHERE directory LIKE '%$(basename "$PWD")%' ORDER BY time_created;"

# Detect schema variant
sqlite3 "$DB" ".schema message" | head -5
```

### Variant A (newer): `message.data` and `part.data` are JSON blobs

```bash
SID="ses_..."
sqlite3 -separator $'\x1f' "$DB" "
  SELECT 'M', m.id, m.time_created, m.data FROM message m WHERE m.session_id='$SID'
  UNION ALL
  SELECT 'P', p.message_id, p.time_created, p.data FROM part p WHERE p.session_id='$SID'
  ORDER BY 3, 1;" | while IFS=$'\x1f' read -r kind mid ts data; do
  if [ "$kind" = "M" ]; then
    echo; echo "--- MSG role=$(echo "$data" | jq -r '.role // "?"') ts=$ts ---"
  else
    echo "$data" | jq -r 'if .type=="text" then .text
      elif .type=="tool" then "[tool:\(.tool // "?")] " + ((.state // {}) | tostring | .[0:300])
      elif .type=="reasoning" then "[think] " + .text
      else "[\(.type)] " + (. | tostring | .[0:200]) end'
  fi
done
```

### Variant B (older): `message` has `role`, `text`; `part` has `type`, `text`

```bash
SID="ses_..."
sqlite3 -header -separator $'\t' "$DB" "
  SELECT m.role, datetime(m.time_created/1000,'unixepoch') AS t, p.type, p.text
  FROM message m LEFT JOIN part p ON p.message_id = m.id
  WHERE m.session_id='$SID' ORDER BY m.time_created, p.id;"
```

**Subagents:** `session.parent_id` links child to parent.

---

## Triage (all tools)

1. **Skip <5 KB** — stubs are noise
2. **Read memory first** (Claude only) — highest value per byte
3. **Use titles/slugs** to cluster by topic before deep-reading
4. **Cross-reference git log** — session timestamps near commits reveal drivers
5. **Document extraction failures** — don't fake content you can't read

## Template

```markdown
---
title: "<Tool> YYYY-MM-DD: <topic>"
type: source
updated: YYYY-MM-DD
sources:
  - /path/to/session.{jsonl,json}  # or sqlite id
---

## Metadata
ID, project, start/updated, length, model.

## Structure
Linear / forked / resumed. Subagents? Sidecar files?

## Key content
User asked X → assistant Y. Files touched, papers cited.

## Notable events
Rate limits, fetch failures, artifacts produced.

## Reliability
High / mixed / low — why.
```
