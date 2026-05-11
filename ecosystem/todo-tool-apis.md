# TODO Tool APIs Across Agent Systems

Comparison of the LLM-facing TODO tool surface across Claude Code, GitHub Copilot, opencode, and Pi (`tintinweb/pi-manage-todo-list`). All four share the same conceptual model — replace the entire list on every write, finite status enum — but differ in tool shape and field names.

*Updated: 2026-05-11*

## Side-by-side

| System | Tools | Item fields | Status values | Notes |
|---|---|---|---|---|
| **Claude Code** | `TodoWrite` only (read is implicit — list is rendered in UI) | `content` (imperative), `activeForm` (present continuous), `status` | `pending` / `in_progress` / `completed` | No `id`. The pair of `content` + `activeForm` is unique to Claude Code — drives the live status line ("Running tests…"). |
| **GitHub Copilot** | `manage_todo_list` (single tool, `operation: "read" | "write"`) | `id` (sequential int), `title` (3-7 words), `description`, `status` | `not-started` / `in-progress` / `completed` | Operation discriminator inside one tool. `description` field was briefly missing from the schema in late 2025 (microsoft/vscode#291253) but restored. |
| **opencode** | `todowrite` + `todoread` (two separate tools) | `id` (string), `content`, `status` (+ optional `priority` in some forks) | `pending` / `in_progress` / `completed` | Schema lives in `packages/opencode/src/session/todo.ts`; tool wrappers in `packages/opencode/src/tool/todo.ts`. Permission-gated (`permission.todowrite`). Disabled for subagents by default. |
| **tintinweb/pi-manage-todo-list** | `manage_todo_list` (single tool, `operation: "read" | "write"`) | `id` (int), `title`, `description`, `status` | `not-started` / `in-progress` / `completed` | **Replicates Copilot's shape verbatim** (file header: "replicates GitHub Copilot's manage_todo_list"). Tool description text is Copilot's, near-verbatim. |

## Common ground

All four systems share:

- **Full-list replacement on write.** No partial updates, no individual `addItem` / `markDone` / `delete`. The LLM passes the entire array on every mutation. This is the load-bearing design choice — it forces the LLM to re-render its full plan every time, which is what makes the list legible as a working memory.
- **Three-state finite status enum.** Always some shape of `not-started → in-progress → completed`. Nothing fancier (no `blocked`, no `cancelled` — Copilot/tintinweb explicitly note "no blockers" as part of completed).
- **Session-scoped state.** Each system stores the list per-session. None of the built-ins persist across sessions by default.

## Where they diverge

### Tool surface

- **Claude Code & opencode** lean toward Unix-style: one verb per tool (`TodoWrite`, `todowrite`/`todoread`).
- **Copilot & tintinweb** use one tool with an `operation` discriminator. Fewer tools in the LLM's tool list, but one extra hop ("which operation?") per call.

### Item shape

- **Claude Code**: `content` + `activeForm` pair. Optimized for live UI rendering (the agent shows "Running tests" while a task is in-progress). No `id` — items are positional.
- **Everyone else**: `id` + `title` (or `content`) + status. opencode is the most minimal; Copilot/tintinweb add a `description` field for context that wouldn't fit in a 3-7-word title.

### Status naming

- **Claude Code & opencode**: snake_case (`pending`, `in_progress`, `completed`).
- **Copilot & tintinweb**: kebab-case (`not-started`, `in-progress`, `completed`).

Trivially translatable — but an adapter targeting multiple backends must normalize.

## Adapter implications for DACMICU

`@pi-dacmicu/todo` currently hardcodes tintinweb's shape (Copilot-equivalent). If we ever add a `TodoSource` adapter layer (see [dacmicu/concept.md](../dacmicu/concept.md#pluggable-backends--decided-not-to-2026-05-11)), the normalization shape would be tintinweb's: `{ id, title, description, status: "not-started" | "in-progress" | "completed" }`. Adapters for Claude Code-style or opencode-style backends would need to:

- Synthesize `id` from array position (Claude Code has none)
- Synthesize `description` from `content`/`activeForm` (Claude Code) or leave empty (opencode)
- Map snake_case status values to kebab-case

None of this is hard — but it's worth noting that "TODO API" is not as standardized as the surface similarity suggests. The four systems converged on the same idea independently, then diverged on details.

## Sources

- **Claude Code**: Anthropic's tool reference (`TodoWrite`); also documented in vtrivedy.com/posts/claudecode-tools-reference/.
- **GitHub Copilot**: tool schema described in microsoft/vscode#291253, #269055; replicated verbatim in tintinweb's package header.
- **opencode**: `packages/opencode/src/tool/todo.ts` and `packages/opencode/src/session/todo.ts` in sst/opencode (verified via Kilo-Org mirror at commit `c3d4309d`).
- **tintinweb**: `node_modules/pi-manage-todo-list/src/tool.ts` (v0.3.0); first line of file comment: "replicates GitHub Copilot's manage_todo_list."
