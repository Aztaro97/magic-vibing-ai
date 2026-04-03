---
name: add-new-feature-package-or-template
description: Workflow command scaffold for add-new-feature-package-or-template in magic-vibing-ai.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /add-new-feature-package-or-template

Use this workflow when working on **add-new-feature-package-or-template** in `magic-vibing-ai`.

## Goal

Adds a new feature package or template, including scaffolding, configuration, and initial implementation files.

## Common Files

- `packages/<new-package>/*`
- `sandbox-templates/<new-template>/*`
- `package.json`
- `pnpm-lock.yaml`
- `turbo.json`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create new directory structure for the package or template.
- Add initial configuration files (e.g., package.json, tsconfig.json, .gitignore, Dockerfile).
- Add implementation files (e.g., source code, assets, scripts).
- Update root-level or related configuration files (e.g., pnpm-lock.yaml, turbo.json, root package.json).

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.