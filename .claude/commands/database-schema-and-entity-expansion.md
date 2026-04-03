---
name: database-schema-and-entity-expansion
description: Workflow command scaffold for database-schema-and-entity-expansion in magic-vibing-ai.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /database-schema-and-entity-expansion

Use this workflow when working on **database-schema-and-entity-expansion** in `magic-vibing-ai`.

## Goal

Expands the database schema by adding new entities or fields, updating migration files, and synchronizing type definitions.

## Common Files

- `packages/db/src/schema.ts`
- `packages/db/drizzle/*.sql`
- `packages/db/drizzle/meta/*.json`
- `packages/db/drizzle/meta/_journal.json`
- `packages/db/src/<entity>.ts`
- `packages/db/src/index.ts`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Edit schema definition file (e.g., schema.ts) to add new entity or field.
- Generate and add new migration SQL file.
- Update migration metadata (e.g., meta/*.json, _journal.json).
- Update entity or model files (e.g., sandbox-event.ts).
- Update database index or entry point (e.g., index.ts).

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.