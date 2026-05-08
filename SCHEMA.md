# SCHEMA — Pi Mono Wiki

## Domain
Pi coding agent codebase: architecture, design decisions, bug investigations,
package interactions, and development patterns. Secondary: agent framework
design, LLM provider integrations, TUI patterns, extension ecosystem,
deterministic agent control, and evolutionary code optimization.

## Taxonomy

### Topics (directories)
- `architecture/` — System design, package structure, data flow, component interaction
- `bugs/` — Bug reports, investigations, fixes
- `comparisons/` — Cross-system or cross-product comparisons
- `concepts/` — Cross-cutting ideas (agent loops, streaming, tool execution, deterministic control)
- `config/` — Configuration guides and troubleshooting
- `dacmicu/` — Deterministic Agent Control Mechanism in Context of Unix (DACMICU) and MATS
- `decisions/` — Design choices with alternatives and evidence
- `ecosystem/` — Extension landscape, tool comparisons, third-party integrations
- `implementations/` — Concrete extension implementations with code walkthroughs
- `install/` — Installation and setup guides
- `references/` — Commands, configs, API docs, local setup snapshots
- `skills/` — Skill notes and documentation

### Types (frontmatter `type:`)
- `concept` — Cross-cutting idea, pattern, or design principle
- `decision` — Why X was chosen over Y
- `bug` / `bugfix` — What was wrong and how fixed
- `open-question` — Known unknown with monitor/trigger/defer pattern
- `source` — Session or document summary
- `reference` — Lookup table or command list
- `synthesis` — Multi-source synthesis or comparison
- `taxonomy` — Categorized enumeration of mechanisms, systems, or primitives
- `implementation` — Concrete code implementation with walkthrough

### Buckets (raw-sources)
- `sessions/` — Pi session JSONL files
- `conversations/` — Summarized session content
- `articles/` — Blog posts, documentation, external references

## Conventions

### Frontmatter
All compiled pages MUST have:
```yaml
---
title: Human-readable title
type: <from Types above>
updated: YYYY-MM-DD
sources:
  - "../../path/to/source.ts"   # relative file references
  - https://github.com/...       # URLs
  - "session:timestamp"         # session citations
tags: [tag1, tag2, tag3]       # optional but recommended for discoverability
---
```

### Cross-references
- Use **relative Markdown links** that resolve from the file's directory.
- **See Also links must be bidirectional.** If page A links to page B, page B must link back to page A.
- Same-directory links: `[Title](other-file.md)`
- Parent/sibling links: `[Title](../sibling/file.md)`
- MetaHarness links from `llm-wiki/X/`: `[Title](../../../../MetaHarness/llm-wiki/...)`
- Always verify relative paths against the actual directory structure.

### Tags
- `extension` — Pi extension topics
- `evolve` / `evolutionary` / `mats` — MATS-style evolutionary systems
- `dacmicu` — Deterministic agent control / loop mechanisms
- `ralph` / `agent-loop` / `deterministic-loops` — Loop extension patterns
- `architecture` — System design
- `comparison` — Comparative analysis
- `implementation` — Concrete code walkthrough
- `rpc` / `subagent` / `bash` — Specific mechanism tags

### Content patterns
- **TL;DR** at the top for long pages (>200 lines)
- **Comparison tables** with concrete metrics (stars, LOC, latency, dates)
- **Architecture diagrams** using ASCII art for component relationships
- **Code sketches** for proposed implementations (not just prose descriptions)
- **Correction sections** when initial analysis was wrong — document the correction explicitly, don't silently rewrite
- **Bidirectional mappings** — both directions: systems→primitives AND primitives→systems

### Citation
- Cite by `file:line` or `session:timestamp` where possible.
- Dates: ISO `YYYY-MM-DD`.
- GitHub sources: prefer permalinks with commit hash for stability.
