# Domain Docs

How the engineering skills should consume domain documentation when exploring this codebase.

## Before exploring, read these — in order

1. **`../CONTEXT.md`** (workspace root) — the canonical ubiquitous-language glossary for Frontera. This is the source of truth for domain vocabulary across both repos.
2. **`./CONTEXT.md`** (backend repo root) — stack-specific addenda only (NestJS conventions, AWS serverless, Drizzle/Supabase, repository pattern). Defers to the workspace version on disagreement.
3. **`../docs/adr/`** (workspace) — project-level architecture decisions that bind both repos.
4. **`./docs/adr/`** (backend repo) — backend-only decisions (to be written as they land).

If any of these files don't exist yet, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The producer skill (`/grill-with-docs`) creates and updates them lazily when terms or decisions actually get resolved.

## File structure

```
workspace root (one level up from this repo)
├── CONTEXT.md                       ← canonical glossary
├── AGENTS.md                        ← workspace orientation
├── docs/adr/                        ← project-level ADRs
└── frontera/                        ← this repo
    ├── CONTEXT.md                   ← stack addenda
    ├── CLAUDE.md                    ← stack conventions, feedback loops, deploy
    ├── docs/adr/                    ← backend-only ADRs
    └── src/                         ← Nest modules
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `../CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids (see its anti-vocabulary table).

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap. Note it for `/grill-with-docs`. New domain terms land in the **workspace** `CONTEXT.md`, not this repo's `CONTEXT.md`.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0001 (…) — but worth reopening because…_

When citing ADRs, qualify the source: "workspace ADR-0002" vs "backend ADR-0001" — both numbering sequences exist.
