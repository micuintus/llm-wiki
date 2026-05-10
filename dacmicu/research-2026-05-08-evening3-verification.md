---
title: Research 2026-05-08 evening 3 — Verification pass; corrections to earlier claims
type: research
updated: 2026-05-08
sources:
  - https://api.github.com/repos/tintinweb/pi-subagents
  - https://api.github.com/repos/Hopsken/pi-subagents
  - https://api.github.com/repos/HazAT/pi-interactive-subagents
  - https://api.github.com/repos/tintinweb/pi-manage-todo-list
  - https://api.github.com/repos/popododo0720/pi-stuff
  - https://api.github.com/repos/cmf/pi-subagent
  - https://api.github.com/repos/nicobailon/pi-subagents
  - https://api.github.com/repos/tuansondinh/pi-fast-subagent
  - https://registry.npmjs.org/@tintinweb/pi-subagents
  - https://registry.npmjs.org/@earendil-works/pi-coding-agent
  - https://registry.npmjs.org/@mariozechner/pi-coding-agent
  - https://code.claude.com/docs/en/tools-reference
  - https://www.mintlify.com/VineeTagarwaL-code/claude-code/reference/tools/agent
tags: [verification, corrections, dacmicu, ecosystem, idiomatic-api, pi-rebrand]
see_also:
  - "research-2026-05-08-subagent-and-todo.md"
  - "research-2026-05-08-evening2-simplification.md"
  - "concept.md"
  - "../ecosystem/subagents.md"
  - "../ecosystem/todo-visualizations.md"
---

# Research 2026-05-08 evening 3 — Verification pass

User asked to verify in depth all the claims accumulated across the morning, evening 1, and evening 2 sessions. This doc captures **what was checked, what held, what was wrong, and what's been corrected**.

## Verification methodology

For each load-bearing claim I:
1. Re-read the source file end-to-end (not just grep snippets) where claim relied on code structure
2. Hit the live GitHub API (not search-engine cache) for project health stats
3. Hit the live npm registry for package existence and version info
4. Cross-checked tool-name claims against authoritative Claude Code docs

## Confirmed (held up under verification)

### 1. Hopsken IS tintinweb

Re-confirmed. `Hopsken/pi-subagents@main/package.json` line 2 says `"name": "@tintinweb/pi-subagents"`, line 8-9 lists tintinweb's repo URL. The local Hopsken clone is **v0.5.2**, but canonical npm `@tintinweb/pi-subagents` is at **v0.7.1** (released 2026-05-07). Hopsken is a stale snapshot, not a fork — and the github.com/Hopsken/pi-subagents repo has 0 stars/0 forks confirming this.

### 2. tintinweb exposes Claude Code-named tools

Verified by reading `src/index.ts` lines 554, 972, 1046:
- `Agent` tool at line 554 (with parameters `prompt`, `description`, `subagent_type` plus extensions)
- `get_subagent_result` at line 972
- `steer_subagent` at line 1046

Schema match against Claude Code's `Agent` tool: **core 3 fields `prompt`/`description`/`subagent_type` match exactly**. tintinweb adds optional extensions: `model`, `thinking`, `max_turns`, `run_in_background`, `resume`, `isolated`, `inherit_context`, `isolation`. None conflict.

### 3. ConversationViewer 500-char truncation

Verified at **lines 209 and 221** of `src/ui/conversation-viewer.ts`:
```ts
const truncated = text.length > 500 ? text.slice(0, 500) + "... (truncated)" : text;
// ...
const out = bash.output.length > 500 ? bash.output.slice(0, 500) + "... (truncated)" : bash.output;
```

### 4. HazAT multiplexer pattern

Verified in `pi-extension/subagents/cmux.ts`:
- Multiplexer detection: `MuxBackend = "cmux" | "tmux" | "zellij" | "wezterm"` (line 9)
- Detection via env var presence (`CMUX_SOCKET_PATH`, `TMUX`, `ZELLIJ`, `WEZTERM_UNIX_SOCKET`) + `hasCommand()` (lines 51-63)
- Pane creation via `spawnSync` (line 1)

### 5. HazAT activity-snapshot pattern

Verified in `pi-extension/subagents/activity.ts`:
```ts
export type SubagentActivityPhase = "starting" | "active" | "waiting" | "done";
```

### 6. popododo state-machine + transition guards

Verified in `workflow-extension/src/tools/`:
- 7 handlers: `approve-plan`, `compound-done`, `draft-plan`, `impl-done`, `replan`, `set-todos`, `skip-verification`
- `transition.ts` is the executor; delegates to handlers
- `before_agent_start` deferred compaction confirmed in `index.ts:146` and `compact.ts:3,8`

### 7. Pi SDK exports (`createAgentSession` etc.)

Verified in `/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/dist/index.d.ts`. All claimed exports present: `createAgentSession`, `AgentSession`, `AgentSessionEvent`, `SessionManager`, `SettingsManager`, `ModelRegistry`, `RpcClient`, all SDK helpers from `core/sdk.js`.

### 8. LOC numbers (against Hopsken@v0.5.2 snapshot)

| Module | Claimed | Verified | Match |
|---|---|---|---|
| Hopsken total | 5,159 | 5,159 | ✅ (same snapshot) |
| `index.ts` | 1,671 | 1,671 | ✅ |
| `agent-widget.ts` | 488 | 488 | ✅ |
| `conversation-viewer.ts` | 243 | 243 | ✅ |
| `cross-extension-rpc.ts` | 95 | 95 | ✅ |
| `tintinweb/pi-manage-todo-list` total | 506 | 506 | ✅ |
| HazAT total | 8,227 | 8,227 | ✅ |

Note: tintinweb@v0.7.1 is larger than v0.5.2 — npm reports unpackedSize=570KB. The 5,159 LOC is **a snapshot, not the current state**. Order-of-magnitude claims hold; precise numbers should be re-verified against v0.7.1 if tighter accuracy is needed.

## Wrong or imprecise (now corrected)

### Correction 1: Claude Code's tool name is `Agent`, not `Task`

**Earlier claim**: "tintinweb uses Claude Code's `Task` tool name verbatim."

**Truth**: Per `code.claude.com/docs/en/tools-reference`, the canonical tool name is **`Agent`**. The Mintlify mirror docs at `code.claude.com/reference/tools/agent` use the heading "Task (Agent tool)" — `Task` is a **doc-only alias**, not the tool name in the schema.

tintinweb uses `Agent` — the **canonical** name. The wiki's "Claude Code Task" framing should say "Claude Code `Agent` tool" or "Claude Code's `Agent` (sometimes called `Task` in docs)".

### Correction 2: tintinweb's TODO shape ≈ Copilot's, ≠ Claude Code's `TodoWrite`

**Earlier claim**: "tintinweb/pi-manage-todo-list mirrors VSCode Copilot's `manage_todo_list` shape ≈ Claude Code's `TodoWrite`".

**Truth**: tintinweb mirrors **Copilot only**, not Claude Code. Schema diff:

| Field | Claude Code `TodoWrite` | tintinweb `manage_todo_list` |
|---|---|---|
| Tool name | `TodoWrite` | `manage_todo_list` |
| Wrapper key | `todos` | `todoList` |
| Item label | `content` | `title` |
| Active form | `activeForm` (required) | (none) |
| Status values | `pending` / `in_progress` / `completed` | `not-started` / `in-progress` / `completed` |
| Operation flag | (none — single tool) | `operation: "read"\|"write"` |
| Item id | (implicit by index) | `id: number` |

Both are LLM-training-known, but **different idioms**. Strong reuse argument still holds: it's a known idiom (Copilot's), zero prompt-token cost. But if the model is biased toward Claude Code semantics from training distribution, the mismatch may cost a small number of in-context-learning tokens.

### Correction 3: `cmf/pi-subagent` is NOT a "production-grade infrastructure library"

**Earlier claim**: "cmf/pi-subagent (1,331 LOC) is a production-grade infrastructure library designed to be embedded."

**Truth**: 
- 0 stars / 0 forks / 0 issues
- 1 commit total ("Update README with correct API signatures and examples", 2026-01-08)
- **Never published to npm** (`npm view @cmf/pi-subagent` → 404)
- Public but unused since 2026-01-08 (4+ months stale at survey date)

It's a **single-author experiment**, not a production library. The 1,331-LOC code itself is real and the architectural pattern (recursive step composition) is genuinely interesting, but **nobody depends on it** and it has not been validated by real use. The previous wiki should not have ranked it alongside the production-grade options.

### Correction 4: HazAT activity phases — 4, not 5

**Earlier claim**: HazAT exposes phases `starting`/`active`/`waiting`/`stalled`/`running`.

**Truth**: 4 phases only — `starting`/`active`/`waiting`/`done`. There is no `stalled` or `running` phase in HazAT. Previous wiki overstated.

### Correction 5: ConversationViewer truncation line numbers

**Earlier claim**: lines 175, 191.

**Truth**: lines **209, 221** (in current Hopsken snapshot). Functionality unchanged; just different line numbers.

### Correction 6: Star counts — slightly stale in earlier wiki

Live GitHub API as of 2026-05-08 evening 3:

| Repo | Earlier wiki | Live API |
|---|---|---|
| `tintinweb/pi-subagents` | 271 | **274** |
| `HazAT/pi-interactive-subagents` | 394 | **442** |
| `tintinweb/pi-manage-todo-list` | 16 | **23** |
| `popododo0720/pi-stuff` | 15 | **16** |
| `nicobailon/pi-subagents` | 1,289 | **1,296** |

Numbers shift continuously. Take any star count as approximate — the relative ordering and active-vs-stale assessment is what matters and is unchanged.

## New finding: pi-mono npm scope rebrand

**This is a load-bearing fact not previously captured in the wiki.**

Recent commits in pi-mono itself:
```
551385e4 chore: migrate packages to earendil works scope
3e5ad67e chore: migrate pi packages to earendil works scope
5e1e4c3c feat(coding-agent): support renamed self-update package
dacb7eaa fix(coding-agent): detect renamed npm self updates
de8c9475 fix(coding-agent): route remaining hardcoded pi branding through APP_NAME
6d2d03dc fix(coding-agent): add earendil startup announcement
```

Pi was renamed to **earendil** — `@mariozechner/pi-coding-agent` is being deprecated in favor of `@earendil-works/pi-coding-agent`. Both scopes are currently published:
- `@mariozechner/pi-coding-agent`: 270 versions, latest 0.73.1 (legacy alias still active)
- `@earendil-works/pi-coding-agent`: 1 version, 0.74.0 (created 2026-05-07)

**Implication for tintinweb and other ecosystem packages**:

tintinweb's `package.json` (HEAD on master, v0.7.1) still pins `@mariozechner/pi-ai`/`@mariozechner/pi-coding-agent`/`@mariozechner/pi-tui` at `>=0.70.5`:

```json
"peerDependencies": {
  "@mariozechner/pi-ai": ">=0.70.5",
  "@mariozechner/pi-coding-agent": ">=0.70.5",
  "@mariozechner/pi-tui": ">=0.70.5"
}
```

Both scopes work today (legacy alias still publishes). When `@mariozechner/*` is fully retired, tintinweb breaks unless it issues a release pinning the new scope.

**Implication for DACMICU**:

- `@pi-dacmicu/*` packages should peer-depend on `@earendil-works/pi-coding-agent` (the canonical scope), not `@mariozechner/*` (the legacy alias).
- Soft-deps on tintinweb need to be aware of the dual-scope phase. If we depend on tintinweb v0.7.1, we transitively pull in `@mariozechner/*` peer warnings.
- Plan: monitor tintinweb for a release that switches peer-deps; until then, install both scopes side-by-side at the user's `~/.pi/agent/` to satisfy peer requirements.

This is **the most actionable finding from this verification pass** — neither the morning nor the evening 1/2 sessions caught the rebrand. Should be noted in the implementation plan.

## Open questions remaining after verification

- Whether tintinweb's authors are aware of the rebrand and have a plan; check tintinweb's GitHub issues/PRs for relevant discussion.
- Whether the legacy alias `@mariozechner/pi-coding-agent` will be auto-mirrored by upstream long-term, or whether it's only a transitional grace period.
- HazAT and tintinweb both depend on `@mariozechner/*`; both at risk of the same break.
- Whether `manage_todo_list` survives `/fork` and `/compact` correctly — still untested. The state-manager rebuilds from session entries on `session_start`/`session_tree`/`turn_end`, so should work, but verify by writing a real test before relying on it for long deterministic loops.

## Wiki updates from this verification

| File | Action |
|---|---|
| `dacmicu/research-2026-05-08-evening3-verification.md` | New (this doc) |
| `dacmicu/concept.md` | Add npm-scope-rebrand note to package #6 (already-corrected by evening 2) framing |
| `ecosystem/subagents.md` | Update truncation line numbers; correct cmf claim; correct activity phase list; live-API star numbers; Claude Code tool naming |
| `ecosystem/todo-visualizations.md` | Correct \"≈ Claude Code TodoWrite\" claim — Copilot shape ≠ Claude Code TodoWrite |
| `index.md` | Link to this verification doc |
| `log.md` | Verification entry |
