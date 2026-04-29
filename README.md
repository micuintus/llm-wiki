# llm-wiki

Karpathy's [LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) as a minimal, agent-agnostic skill.

The user curates sources. The LLM does the bookkeeping — summarizing, cross-linking, flagging contradictions. Knowledge compounds in the wiki rather than being re-derived from raw chunks on every query.

## Install

### Pi (npm — recommended)
```bash
pi install npm:@micuintus/llm-wiki
```

### Pi (git)
```bash
pi install https://github.com/micuintus/llm-wiki
```

### Claude Code / Codex / other agents
Copy `llm-wiki/SKILL.md` and `references/` into your agent's skills directory.

## What it's for

- **Book and paper research** — ingest chapters, papers, figures; build interlinked concept pages as you read
- **Agent session preservation** — Pi JSONL sessions with tree traversal, or linear transcripts from Claude Code / opencode / web
- **AI model development** — code, checkpoints, datasets, audio/MIDI with companion descriptions
- **Software porting documentation** — track architecture research, design decisions, and porting progress

## Structure

```
llm-wiki/
├── SKILL.md              # skill instructions
├── references/
│   ├── page.template.md      # wiki page frontmatter
│   ├── source.template.md    # raw source copy template
│   ├── SCHEMA.template.md    # per-project schema skeleton
│   └── pi-session-recipe.md  # Pi JSONL session traversal
```

## Notable other implementations

- [Astro-Han/karpathy-llm-wiki](https://github.com/Astro-Han/karpathy-llm-wiki) — pure skill, most established (~638 stars)
- [praneybehl/llm-wiki-plugin](https://github.com/praneybehl/llm-wiki-plugin) — Claude Code plugin with slash commands, BM25 search, graph layer
- [iRonin/pi-llm-wiki](https://github.com/iRonin/pi-llm-wiki) — Pi-native package with extension guardrails and generated metadata

This skill stays lighter — no extension dependency, no JSON metadata, standard markdown links. The trade-off is convention-based guardrails rather than enforced ones.

## License

MIT
