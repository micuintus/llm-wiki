# Code-source recipe

Lazy-loaded. Read when the source being ingested is a **code repository
or source-tree** (header files, implementation files, build scripts) —
not prose documentation.

## Why code is different

Prose sources are read end-to-end and distilled. Code sources are
**too large to read end-to-end** and **too dense to summarize without
losing precision**. The compile step shifts shape:

| | Prose source | Code source |
|---|---|---|
| Read strategy | Full text, often once | grep + targeted reads, iteratively |
| Citation | Section heading | `path/file.ext:line` |
| Compile depth | Paraphrase + key quotes | Class/function inventory + path:line refs |
| Cascade trigger | New version of source | New commit changing structure |

## Register step

The code source itself is **already stable on disk** — register by
path, do NOT copy into `raw-sources/<bucket>/`. In
`raw-sources/index.md`:

```markdown
| ../src/Engine/         | engine-headers   | engine, audio, voice |
```

The path is relative to `llm-wiki/`. If the source moves or is
deleted, that's a real signal — let the broken path surface.

## Compile step

### 1. Inventory before reading

Before reading any single file deeply, get the shape:

```bash
ls path/to/source/                       # files in scope
wc -l path/to/source/*.{h,cpp}           # size triage
grep -h '^class \|^struct ' path/*.h     # public types
grep -h 'friend class' path/*.h          # coupling map
```

A file inventory + class/struct list is often the first compiled
artifact. Treat it like an index.

### 2. Cite path:line, not paraphrase

For any non-trivial claim about code behaviour:

```markdown
The voice flow starts in `BEngine::renderBlock()`
(`KontaktCore/Engine/bengine.h:2104`) and dispatches to per-program
mixers via the intrusive list at line 2147.
```

Paraphrasing without a line cite is a hallucination risk. If you
can't cite, mark the claim with `[needs verification]` and let lint
flag it.

### 3. One walkthrough per coherent subsystem

Don't compile "the codebase" into one page. Compile **one walkthrough
per cohesive unit** (a class hierarchy, a state machine, a build
target). Cross-link at the boundaries.

Walkthrough page shape (`type: concept`, "implementation walkthrough"
variant per `quality.md`):

- Architecture diagram or ASCII tree at the top.
- Public-API table (function → purpose → cite).
- Friend-class / collaborator inventory if non-trivial coupling.
- Serialization or version-numbered struct table if persistence is
  involved.
- Rationale / non-obvious design decisions, each with a path:line.

### 4. Source-size heuristic

A reasonable starting point: **one compiled page per ~1000 lines of
code, per cohesive subsystem.** Under-mining is the more common
failure than over-mining. If a header file is 4000 lines and you've
produced one page citing 6 lines, you've left value on the table.

## Cascade triggers

Re-visit a code-source-derived page when:

- The cited file's structure changes (rename, split, large refactor).
- A `friend class` is added or removed.
- A serialization-version constant is bumped.
- A documented invariant in the prose layer disagrees with the code.

`git log --oneline -- path/to/file` between visits is a cheap signal.

## Anti-patterns

- ❌ Copying source files into `raw-sources/`. Code is already
  versioned; copying creates a stale fork.
- ❌ Paraphrasing without `path:line` citations.
- ❌ One mega-page covering "the engine". Split by subsystem.
- ❌ Treating headers as authoritative when impl files contradict
  them. Both can be cited; flag the contradiction inline.
- ❌ Compiling code from a checked-out branch without recording the
  commit SHA — claims become unreproducible.

## Recording the commit

Wherever practical, record the commit observed in the page's
frontmatter or in `log.md`:

```yaml
sources:
  - path: ../KontaktCore/Engine/bengine.h
    commit: f8b58de43
```

This makes "what changed" tractable when revisiting.
