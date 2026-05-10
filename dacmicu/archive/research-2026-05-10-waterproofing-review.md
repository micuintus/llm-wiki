---
title: Waterproofing Review — Consistency Check of Fixed Plan
type: audit
status: complete
updated: 2026-05-10
sources:
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/dacmicu/concept.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/dacmicu/implementation-plan.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/dacmicu/modular-architecture.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/dacmicu/pi-port.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/llm-wiki/implementations/pi-callback-extension.md
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/packages/coding-agent/src/core/session-manager.ts
  - /Users/michael.voigt/devel/AI/aiAgentResearch/agents/pi-mono/packages/coding-agent/src/core/extensions/types.ts
tags: [audit, waterproofing, consistency, dacmicu]
see_also:
  - "../dacmicu/archive/research-2026-05-10-deep-implementation-review.md"
---

# Waterproofing Review — Consistency Check of Fixed Plan

**Method**: Re-read all canonical docs in their post-fix state. Cross-reference every claim against every other doc and against primary source code. Look for contradictions, unverified assumptions, and holes introduced by the fixes themselves.

**Result**: 5 issues found (1 code bug, 2 contradictions, 1 outdated description, 1 gap). All fixed in this review. The plan is now internally consistent and every load-bearing claim is traceable to a verified source.

---

## Issues found and fixed

### 1. Sentinel code had wrong entry type — `"app"` instead of `"custom"` [CODE BUG]

**Location**: `concept.md` § Single-driver invariant enforcement

**Bug**: The pseudocode checked `e.type === "app"` and called `pi.appendEntry({ type: "app", ... })`.

**Verified against source** (`session-manager.ts:896-908`):
```ts
appendCustomEntry(customType: string, data?: unknown): string {
  const entry: CustomEntry = {
    type: "custom",  // ← NOT "app"
    customType,
    data,
    ...
  };
}
```

`appendEntry` (types.ts:1193) maps to `appendCustomEntry`. Entries created this way have `type: "custom"`.

**Fix**: Changed check to `e.type === "custom"` and call to `pi.appendEntry(DRIVER_SENTINEL, { driverId })`.

**Severity**: HIGH — the sentinel would never match any existing entry, so the collision check would always pass, rendering the single-driver invariant completely ineffective.

---

### 2. LOC contradiction between User Response and estimate table [CONTRADICTION]

**Location**: `implementation-plan.md`

**Table** (Revised LOC): base 250 + todo 250 + fabric 250 + ralph 150 + evolve 1,200 = **~2,100 LOC**

**User Response section**: "**Revised v1 scope**: base + todo + ralph + evolve + fabric. **~1,350 LOC.** 2-4 weeks."

**Fix**: Updated User Response section to **~2,100 LOC** to match the table.

**Severity**: MEDIUM — the 1,350 figure was from the pre-fix estimate. Would mislead about scope.

---

### 3. pi-port.md still describes session-entry reconstruction as primary [OUTDATED]

**Location**: `pi-port.md` § Reference implementations

**Old text**: "`session_start` and `session_tree` listeners that reconstruct extension state from `ctx.sessionManager.getBranch()` over tool result `details`"

**Concept.md now says**: File-backed storage is the durable source of truth; session entries are secondary (lost on compaction).

**Fix**: Updated to "reconstruct extension state from the session-scoped file (`~/.pi/dacmicu/state/<session-id>.json`), falling back to `ctx.sessionManager.getBranch()` over tool result `details` for legacy sessions."

**Severity**: LOW — the file approach is the new design; the old description would mislead implementers about priority.

---

### 4. modular-architecture.md verified primitives table lists tool-result details as primary [OUTDATED]

**Location**: `modular-architecture.md` § Verified Pi primitives table

**Old row**: "Tool result `details` for branching state" — primary mechanism for todo

**Fix**: Updated to "File-backed state (`~/.pi/dacmicu/state/<session-id>.json`) for durable TODO state; session entries secondary".

**Severity**: LOW — consistency with the new state model.

---

### 5. Phase state machine has no persistence spec [GAP]

**Location**: `concept.md` § Phase state machine

**Gap**: The phase (`"work"` | `"reassess"`) is part of the loop driver's state. If the user hits `/reload` mid-loop, the in-memory phase is lost. The driver would restart in an undefined state (defaulting to WORK, which might skip a needed reassessment or duplicate a work turn).

**Fix**: Added explicit note: "**Phase is persisted in the state file** alongside the TODO list. On `session_start` / reload, the driver reads the phase from the file and resumes correctly."

**Severity**: MEDIUM — without this, `/reload` during a loop is a data-loss event for the phase, not just a performance issue.

---

## Verified assumptions that hold

| Assumption | Source | Status |
|---|---|---|
| `ctx.sessionManager.getSessionId()` exists | `session-manager.ts:793` | ✅ Verified |
| `ctx.sessionManager.getBranch()` exists | `session-manager.ts:1034` | ✅ Verified |
| `appendEntry` creates `type: "custom"` entries | `session-manager.ts:897-908` | ✅ Verified |
| `ReadonlySessionManager` includes both methods | `types.ts:184-199` | ✅ Verified |
| `pi.sendMessage` with `triggerTurn:true` calls `agent.prompt()` when idle | `agent-session.ts:1295` | ✅ Verified |
| `pi.sendMessage` with `triggerTurn:true` queues via `followUp` when streaming | `agent-session.ts:1291` | ✅ Verified |
| `tool_call` event `input` is mutable | `extensions.md` (documented) | ✅ Verified |

---

## Remaining unverified assumptions (acceptable risk)

These are design assumptions that cannot be fully verified without building the code, but they are low-risk:

1. **File I/O performance**: Reading/writing `~/.pi/dacmicu/state/<session-id>.json` on every `agent_end` is assumed to be fast enough (<5ms) to not block the event loop. If slow, batch writes or use an in-memory cache with async flush.

2. **Subagent spawn latency**: `createAgentSession` + running a subagent to completion is assumed to complete within the timeout (default 60s for fabric, configurable for evolve). No benchmark exists; this must be measured during build.

3. **LLM reliability calling `manage_todo_list` during reassessment**: The plan assumes the LLM will call the tool when the list needs updating and skip it when satisfied. No A/B evidence; this is the core "deterministic" bet.

4. **Compaction `details` field survival**: The plan assumes `CompactionResult.details` is preserved across compaction and accessible later. The type signature (`compaction.ts:103-110`) supports this, but no extension in the ecosystem has been verified to use it for structured data recovery.

---

## Honest assessment: Is the plan waterproof?

**No plan is waterproof before it meets runtime.** But this plan is now:

- **Internally consistent**: No contradictions between concept.md, implementation-plan.md, modular-architecture.md, pi-port.md, and pi-callback-extension.md.
- **Every load-bearing claim traceable**: Each primitive, API, or behavior is either verified against pi-mono source or explicitly marked as unverified assumption.
- **Two critical bugs fixed**: pi-callback deadlock (redesigned), TODO state compaction loss (file-backed primary storage).
- **Six HIGH findings fixed**: wrapTool nonexistence, two-step RPC, event.messages scope, single-driver invariant, systemPrompt chaining, reassessment termination.
- **Known risks documented**: File I/O perf, subagent latency, LLM reliability, details field survival.

**What would still break it at runtime**:
- `createAgentSession` doesn't expose what we need for subagent spawning (fallback to subprocess exists)
- `session_before_compact` `details` field is not actually persisted (would require testing)
- The LLM refuses to call `manage_todo_list` during reassessment (would require prompt engineering)
- Two non-DACMICU loop extensions are active simultaneously (documented limitation, no enforcement)

**Recommendation**: The plan is ready to build. Start with `base` (the smallest, most foundational package). Run T1 (compaction survival) as the very first integration test. If T1 passes, the architecture is validated. If T1 fails, the file-backed state model needs revision.

---

*Waterproofing review completed 2026-05-10. Method: cross-reference all canonical docs against each other and against pi-mono source code (session-manager.ts, types.ts, agent-session.ts, compaction.ts).*
