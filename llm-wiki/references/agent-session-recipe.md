# Agent session recipe (Claude Code, Gemini CLI, opencode)

How to traverse and ingest sessions from Claude Code, Gemini CLI, and
opencode. Lazy-loaded reference for the Sessions step of ingest. Load only
when you actually need to scan one of these tools' transcripts.

For Pi sessions, see `pi-session-recipe.md`. The patterns differ.

## Where each tool stores sessions

### Claude Code

- `~/.claude/projects/<sanitized-cwd>/<session-uuid>.jsonl` — session
  transcript, one JSON event per line. `<sanitized-cwd>` replaces `/` with
  `-` (e.g. `-Users-michael-voigt-devel-AI-MamBRAVE`).
- `~/.claude/projects/<sanitized-cwd>/<session-uuid>/subagents/agent-<id>.jsonl`
  — subagent (Task tool / `@agent`) transcripts, with `.meta.json` siblings.
- `~/.claude/projects/<sanitized-cwd>/<session-uuid>/tool-results/` — large
  tool outputs (web fetches, PDFs).
- `~/.claude/projects/<sanitized-cwd>/memory/` — user-curated cross-session
  memory (read these first; they are pre-condensed).
- `~/.claude/tasks/`, `~/.claude/usage-data/session-meta/` — task state and
  token metadata; usually skip for content ingest.

### Gemini CLI

- `~/.gemini/tmp/<project-hash-or-name>/chats/session-<YYYY-MM-DDTHH-MM>-<id>.json`
  — full session as a single JSON document with messages, thoughts, tool
  calls, tokens.
- `~/.gemini/tmp/<project>/.project_root` — plain text pointing to the
  project's absolute path. Use this to map a project name to its cwd.
- `~/.gemini/tmp/<project>/tool-outputs/session-<id>/` — per-tool-call output
  snapshots (read_file, grep, write_file, replace, run_shell_command).
- `~/.gemini/history/<project>/.project_root` — older history pointers
  (often only contain `.project_root`, no chats).

### opencode

- `~/.local/share/opencode/opencode.db` — SQLite. Tables include `session`,
  `message`, `part`, `event`, `project`, `permission`, `todo`, `account`,
  `workspace`. **This is the only one of the three not stored as plain
  files.**
- `~/.local/share/opencode/opencode-local.db` — local mirror.
- `~/.local/share/opencode/storage/part/msg_<id>` — per-message
  file-content snapshots.
- `~/.local/share/opencode/storage/{session,session_diff,share,todo,project,tool-output}/`
  — auxiliary per-file stores.
- `~/.local/share/opencode/snapshot/<git-sha>/` — bare git repos with
  per-snapshot working-tree captures.
- `~/.local/state/opencode/prompt-history.jsonl` — global cross-project
  prompt stash (NOT project-scoped).

## Step 0: Locate sessions for a given project

```bash
PROJECT_CWD="/Users/me/devel/AI/MamBRAVE"
PROJECT_NAME="$(basename "$PROJECT_CWD")"

# Claude Code: sanitize cwd by replacing / with -
SANITIZED="${PROJECT_CWD//\//-}"
ls "$HOME/.claude/projects/$SANITIZED/"*.jsonl 2>/dev/null

# Gemini CLI: scan all tmp/ directories whose .project_root points to PROJECT_CWD
for d in "$HOME/.gemini/tmp/"*/; do
  [ -f "$d/.project_root" ] && [ "$(cat "$d/.project_root")" = "$PROJECT_CWD" ] && echo "$d"
done

# opencode: filter sessions by directory column
sqlite3 "$HOME/.local/share/opencode/opencode.db" \
  "SELECT id, title, datetime(time_created/1000,'unixepoch') as t
   FROM session WHERE directory LIKE '%${PROJECT_NAME}%' ORDER BY time_created;"
```

## Claude Code (.jsonl)

Each line is one event. Common types: `user`, `assistant`, `tool_use`,
`tool_result`, `ai-title`, `last-prompt`, `queue-operation`. Forks are rare
(no parent-of-many in normal use), but resumed sessions create separate
files.

### Inventory and triage

```bash
# Sort by size — biggest sessions are usually the substantive ones
ls -laS ~/.claude/projects/<sanitized-cwd>/*.jsonl

# AI-generated titles (one per session) — quick topic skim
for f in ~/.claude/projects/<sanitized-cwd>/*.jsonl; do
  echo "=== $(basename "$f") ==="
  grep '"type":"ai-title"' "$f" | head -1
done

# Slug (if Claude Code assigned one — appears on every event)
grep -m1 '"slug":' ~/.claude/projects/<sanitized-cwd>/<uuid>.jsonl
```

Sessions <5 KB are usually trivial / aborted. Skip unless cataloguing.

### Extract substantive content

```bash
SESSION=~/.claude/projects/<sanitized-cwd>/<uuid>.jsonl

# User messages
jq -r 'select(.type=="user" and .message.role=="user") |
  "\n--- USER \(.timestamp) ---\n" +
  (.message.content | if type=="string" then .
   else (map(select(.type=="text") | .text) | join("\n")) end)' "$SESSION"

# Assistant text + thinking
jq -r 'select(.type=="assistant") |
  "\n--- ASSISTANT \(.timestamp) ---\n" +
  (.message.content | map(select(.type=="text" or .type=="thinking") |
    "[\(.type)] \(.text // .thinking)") | join("\n"))' "$SESSION"

# Tool calls
jq -r 'select(.type=="assistant") | .message.content[] |
  select(.type=="tool_use") | "\(.name): \(.input | tostring | .[0:200])"' "$SESSION"
```

### Subagents

```bash
# Pair each subagent's meta with its transcript
for meta in ~/.claude/projects/<sanitized-cwd>/<uuid>/subagents/*.meta.json; do
  echo "=== $(basename "$meta") ==="
  jq -r '"\(.agent_type) :: \(.task_description // .description // "?")"' "$meta"
done
```

## Gemini CLI (.json)

Single JSON object per session. Top-level: `sessionId`, `projectHash`,
`startTime`, `lastUpdated`, `messages` (array). Each message has `id`,
`timestamp`, `type` (`user`/`gemini`), `content`, `thoughts`, `toolCalls`,
`tokens`, `model`.

### Extract substantive content

```bash
SESSION=~/.gemini/tmp/<project>/chats/session-<ts>-<id>.json

# User prompts
jq -r '.messages[] | select(.type=="user") |
  "\n--- USER \(.timestamp) ---\n" +
  (.content | if type=="string" then . else (map(.text) | join("\n")) end)' "$SESSION"

# Gemini text
jq -r '.messages[] | select(.type=="gemini") |
  "\n--- GEMINI \(.timestamp) ---\n\(.content)"' "$SESSION"

# Thoughts (gemini-specific — internal reasoning)
jq -r '.messages[] | select(.thoughts) | .thoughts[] |
  "[\(.subject)] \(.description)"' "$SESSION"

# Tool calls
jq -r '.messages[] | select(.toolCalls) | .toolCalls[] |
  "\(.name)(\(.args | tostring | .[0:120]))"' "$SESSION"

# Token usage summary
jq -r '[.messages[] | select(.tokens) | .tokens.total] | add' "$SESSION"
```

### Tool-output sidecar files

When tool results are large, Gemini writes them to
`tool-outputs/session-<id>/<tool>_<tool>_<ts>_<n>_<rand>.txt`. Filename
encodes the tool. Read selectively — don't dump them all into the wiki.

## opencode (SQLite)

The schema (verified 2026-04-29):

```
session(id, project_id, parent_id, slug, directory, title, version,
        share_url, summary_*, time_created, time_updated, time_compacting,
        time_archived, workspace_id)
message(...) part(...) event(...) project(...) permission(...) todo(...)
```

### Inventory

```bash
DB=~/.local/share/opencode/opencode.db

# Sessions for a project
sqlite3 "$DB" "
  SELECT id, title, datetime(time_created/1000,'unixepoch')
  FROM session WHERE directory LIKE '%MamBRAVE%'
  ORDER BY time_created;"

# Count and date range
sqlite3 "$DB" "
  SELECT COUNT(*),
         MIN(datetime(time_created/1000,'unixepoch')),
         MAX(datetime(time_created/1000,'unixepoch'))
  FROM session WHERE directory LIKE '%MamBRAVE%';"
```

### Extract a session's transcript

Inspect `message` and `part` schemas first — they vary across opencode
versions:

```bash
sqlite3 "$DB" ".schema message"
sqlite3 "$DB" ".schema part"
```

Generic dump (adapt column names to your schema):

```bash
SID="ses_..."
sqlite3 -header -separator $'\t' "$DB" "
  SELECT m.role, datetime(m.time_created/1000,'unixepoch') AS t,
         p.type, p.text
  FROM message m LEFT JOIN part p ON p.message_id = m.id
  WHERE m.session_id = '$SID'
  ORDER BY m.time_created, p.id;"
```

Some `part` rows reference files in `~/.local/share/opencode/storage/part/msg_<id>`
rather than inlining content. Read those files when reconstructing
transcripts.

### Subagent sessions

opencode uses `session.parent_id` to link subagent sessions to their
parent. To pull a parent and all subagents:

```sql
SELECT id, title, parent_id FROM session
WHERE id='ses_PARENT' OR parent_id='ses_PARENT';
```

opencode session titles often include `(@explore subagent)`,
`(@build subagent)`, `(@general subagent)` — useful for triage without
reading bodies.

## Triage heuristics across all three tools

- **Skip files <5 KB** unless cataloguing — these are typically aborted or
  one-shot test prompts.
- **Read memory files first** (Claude Code only). They are user-curated
  summaries and replace the need to read many sessions in detail.
- **Use slugs / AI titles / opencode `title` columns** to cluster sessions
  by topic before deep-reading any.
- **Cross-reference with `git log`.** Session timestamps near commits
  often reveal which session drove which commit.
- **Document tool limitations.** If you can't extract opencode message
  bodies, say so on the session page. Don't fake content.

## Session page template

```markdown
---
title: "<Tool> session YYYY-MM-DD: <topic>"
type: source
updated: YYYY-MM-DD
sources:
  - /absolute/path/to/session.{jsonl,json}  # or sqlite session id
see_also: []
---

## Metadata
Session ID, project (hash or path), start/last-updated, length, model.

## Structure
Linear / forked / resumed. Subagents present? Tool-output sidecar files?

## Key content
- User asked X → assistant responded with Y
- Decisions made, files touched, papers cited

## Notable events
- Rate limits, fetch failures, errors
- Artifacts produced via tool calls

## Reliability
High / mixed / low — and why.
```

## Mistakes to avoid

1. **❌ Treating opencode like Claude Code** — opencode is SQLite, not
   JSONL. Don't try to `cat` the database.
2. **❌ Ingesting every small session** — most ~2 KB JSONLs are noise.
   Catalog them but don't write per-session pages.
3. **❌ Ignoring the `memory/` directory** in Claude Code — it's the
   highest-value content per byte.
4. **❌ Concatenating tool outputs into the wiki** — the sidecar files
   exist for a reason. Reference them, don't paste.
5. **❌ Trusting AI-generated session titles uncritically** — Claude Code
   sometimes produces generic placeholders ("Implement user login
   functionality") for unrelated sessions.
