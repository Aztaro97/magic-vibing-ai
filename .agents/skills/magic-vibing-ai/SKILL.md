---
name: magic-vibing-ai-conventions
description: Development conventions and patterns for magic-vibing-ai. TypeScript project with conventional commits.
---

# Magic Vibing Ai Conventions

> Generated from [Aztaro97/magic-vibing-ai](https://github.com/Aztaro97/magic-vibing-ai) on 2026-03-23

## Overview

This skill teaches Claude the development patterns and conventions used in magic-vibing-ai.

## Tech Stack

- **Primary Language**: TypeScript
- **Architecture**: type-based module organization
- **Test Location**: mixed
- **Test Framework**: jest

## When to Use This Skill

Activate this skill when:
- Making changes to this repository
- Adding new features following established patterns
- Writing tests that match project conventions
- Creating commits with proper message format

## Commit Conventions

Follow these commit message conventions based on 71 analyzed commits.

### Commit Style: Conventional Commits

### Prefixes Used

- `feat`
- `chore`
- `refactor`
- `docs`

### Message Guidelines

- Average message length: ~102 characters
- Keep first line concise and descriptive
- Use imperative mood ("Add feature" not "Added feature")


*Commit message example*

```text
feat: add magic-vibing-ai ECC bundle (.claude/commands/refactoring.md)
```

*Commit message example*

```text
refactor: remove redundant file path comments and reformat sandbox cleanup job functions
```

*Commit message example*

```text
docs: update architecture overview, package structure, data flow, agent system, sandbox system, and commands in CLAUDE.md
```

*Commit message example*

```text
chore: Remove the `agents` package and update `pnpm-lock.yaml` and `langgraph.json`
```

*Commit message example*

```text
Merge pull request #9 from Aztaro97/feature/implement-deep-agents
```

*Commit message example*

```text
Merge pull request #10 from Aztaro97/ecc-tools/magic-vibing-ai-1774265769715
```

*Commit message example*

```text
feat: add magic-vibing-ai ECC bundle (.claude/commands/feature-development.md)
```

*Commit message example*

```text
feat: add magic-vibing-ai ECC bundle (.claude/commands/database-migration.md)
```

## Architecture

### Project Structure: Turborepo

This project uses **type-based** module organization.

### Configuration Files

- `.github/workflows/ci.yml`
- `apps/admin/eslint.config.js`
- `apps/admin/next.config.js`
- `apps/admin/package.json`
- `apps/admin/tsconfig.json`
- `apps/mobile/cli/package.json`
- `apps/mobile/docs/package.json`
- `apps/mobile/docs/tsconfig.json`
- `apps/mobile/jest.config.js`
- `apps/mobile/package.json`
- `apps/mobile/tailwind.config.ts`
- `apps/mobile/tsconfig.json`
- `package.json`
- `packages/api/eslint.config.js`
- `packages/api/package.json`
- `packages/api/tsconfig.json`
- `packages/auth/eslint.config.js`
- `packages/auth/package.json`
- `packages/auth/tsconfig.json`
- `packages/db/drizzle.config.ts`
- `packages/db/eslint.config.js`
- `packages/db/package.json`
- `packages/db/tsconfig.json`
- `packages/deep-agents/eslint.config.js`
- `packages/deep-agents/package.json`
- `packages/deep-agents/tsconfig.json`
- `packages/e2b/eslint.config.js`
- `packages/e2b/package.json`
- `packages/e2b/tsconfig.json`
- `packages/error-handler/eslint.config.js`
- `packages/error-handler/package.json`
- `packages/error-handler/tsconfig.json`
- `packages/jobs/eslint.config.js`
- `packages/jobs/package.json`
- `packages/jobs/tsconfig.json`
- `packages/pusher/eslint.config.js`
- `packages/pusher/package.json`
- `packages/pusher/tsconfig.json`
- `packages/sandboxes/eslint.config.js`
- `packages/sandboxes/package.json`
- `packages/sandboxes/tsconfig.json`
- `packages/ui/eslint.config.js`
- `packages/ui/package.json`
- `packages/ui/tsconfig.json`
- `packages/validators/eslint.config.js`
- `packages/validators/package.json`
- `packages/validators/tsconfig.json`
- `sandbox-templates/react-native-expo/jest.config.js`
- `sandbox-templates/react-native-expo/package.json`
- `tooling/eslint/package.json`
- `tooling/eslint/tsconfig.json`
- `tooling/github/package.json`
- `tooling/prettier/package.json`
- `tooling/prettier/tsconfig.json`
- `tooling/tailwind/eslint.config.js`
- `tooling/tailwind/package.json`
- `tooling/tailwind/tsconfig.json`
- `tooling/typescript/package.json`

### Guidelines

- Group code by type (components, services, utils)
- Keep related functionality in the same type folder
- Avoid circular dependencies between type folders

## Code Style

### Language: TypeScript

### Naming Conventions

| Element | Convention |
|---------|------------|
| Files | camelCase |
| Functions | camelCase |
| Classes | PascalCase |
| Constants | SCREAMING_SNAKE_CASE |

### Import Style: Path Aliases (@/, ~/)

### Export Style: Default Exports


*Preferred import style*

```typescript
// Use path aliases for imports
import { Button } from '@/components/Button'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
```

*Preferred export style*

```typescript
// Use default exports for main component/function
export default function UserProfile() { ... }
```

## Testing

### Test Framework: jest

### File Pattern: `*.test.tsx`

### Test Types

- **Unit tests**: Test individual functions and components in isolation
- **Integration tests**: Test interactions between multiple components/services

### Mocking: jest.mock


*Test file structure*

```typescript
import { describe, it, expect } from 'jest'

describe('MyFunction', () => {
  it('should return expected result', () => {
    const result = myFunction(input)
    expect(result).toBe(expected)
  })
})
```

## Error Handling

### Error Handling Style: Error Boundaries

React **Error Boundaries** are used for graceful UI error handling.


## Common Workflows

These workflows were detected from analyzing commit patterns.

### Database Migration

Database schema changes with migration files

**Frequency**: ~5 times per month

**Steps**:
1. Create migration file
2. Update schema definitions
3. Generate/update types

**Files typically involved**:
- `**/schema.*`
- `**/types.ts`
- `migrations/*`

**Example commit sequence**:
```
feat(agents): Implement LangGraph migration Phase 3 - checkpointing and graph compilation
feat: Migrate agent infrastructure from Inngest to LangGraph and remove the jobs package
feat: Implement `@t3-oss/env-nextjs` for environment variable management and standardize module import paths
```

### Feature Development

Standard feature implementation workflow

**Frequency**: ~18 times per month

**Steps**:
1. Add feature implementation
2. Add tests for feature
3. Update documentation

**Files typically involved**:
- `/*`
- `apps/admin/src/app/api/inngest/*`
- `apps/admin/src/app/api/pusher/auth/*`
- `**/*.test.*`
- `**/api/**`

**Example commit sequence**:
```
chore: configure commit linting, Git hooks, lint-staged, and add project contributing guidelines and templates
chore: Update GitHub funding username in FUNDING.yml
chore: remove husky and its prepare script from mobile app
```

### Refactoring

Code refactoring and cleanup workflow

**Frequency**: ~5 times per month

**Steps**:
1. Ensure tests pass before refactor
2. Refactor code structure
3. Verify tests still pass

**Files typically involved**:
- `src/**/*`

**Example commit sequence**:
```
refactor: consolidate Tailwind CSS configuration and update agent state schemas
docs: Remove migration plan and architecture design documents
Merge pull request #7 from Aztaro97/feature/migrate-to-langraph
```

### Ecc Bundle Update

Adds or updates the ECC (Extensible Command and Configuration) bundle for the magic-vibing-ai agent, including skills, commands, agent definitions, and configuration files.

**Frequency**: ~2 times per month

**Steps**:
1. Add or update .claude/commands/*.md files (e.g., database-migration.md, feature-development.md, refactoring.md)
2. Add or update .claude/homunculus/instincts/inherited/*.yaml
3. Add or update .claude/identity.json
4. Add or update .claude/skills/magic-vibing-ai/SKILL.md
5. Add or update .claude/ecc-tools.json
6. Add or update .codex/AGENTS.md
7. Add or update .codex/agents/*.toml
8. Add or update .codex/config.toml
9. Add or update .agents/skills/magic-vibing-ai/SKILL.md
10. Add or update .agents/skills/magic-vibing-ai/agents/openai.yaml

**Files typically involved**:
- `.claude/commands/database-migration.md`
- `.claude/commands/feature-development.md`
- `.claude/commands/refactoring.md`
- `.claude/homunculus/instincts/inherited/magic-vibing-ai-instincts.yaml`
- `.claude/identity.json`
- `.claude/skills/magic-vibing-ai/SKILL.md`
- `.claude/ecc-tools.json`
- `.codex/AGENTS.md`
- `.codex/agents/docs-researcher.toml`
- `.codex/agents/explorer.toml`
- `.codex/agents/reviewer.toml`
- `.codex/config.toml`
- `.agents/skills/magic-vibing-ai/SKILL.md`
- `.agents/skills/magic-vibing-ai/agents/openai.yaml`

**Example commit sequence**:
```
Add or update .claude/commands/*.md files (e.g., database-migration.md, feature-development.md, refactoring.md)
Add or update .claude/homunculus/instincts/inherited/*.yaml
Add or update .claude/identity.json
Add or update .claude/skills/magic-vibing-ai/SKILL.md
Add or update .claude/ecc-tools.json
Add or update .codex/AGENTS.md
Add or update .codex/agents/*.toml
Add or update .codex/config.toml
Add or update .agents/skills/magic-vibing-ai/SKILL.md
Add or update .agents/skills/magic-vibing-ai/agents/openai.yaml
```

### Feature Development With Database Schema Change

Implements a new feature that requires changes to the database schema, including migration files, schema updates, and corresponding application logic.

**Frequency**: ~2 times per month

**Steps**:
1. Modify or add files in packages/db/src/ (e.g., schema.ts, agents.ts, project.ts, message.ts, fragment.ts, llm-key.ts)
2. Add or update migration SQL files in packages/db/drizzle/*.sql
3. Update migration metadata in packages/db/drizzle/meta/*.json and _journal.json
4. Update application logic to use new/changed schema (e.g., packages/api/src/router/*.ts, apps/admin/src/components/forms/project-form.tsx)
5. Update pnpm-lock.yaml if dependencies or packages are affected

**Files typically involved**:
- `packages/db/src/schema.ts`
- `packages/db/src/agents.ts`
- `packages/db/src/project.ts`
- `packages/db/src/message.ts`
- `packages/db/src/fragment.ts`
- `packages/db/src/llm-key.ts`
- `packages/db/drizzle/*.sql`
- `packages/db/drizzle/meta/*.json`
- `packages/db/drizzle/meta/_journal.json`
- `packages/api/src/router/projects.ts`
- `apps/admin/src/components/forms/project-form.tsx`
- `pnpm-lock.yaml`

**Example commit sequence**:
```
Modify or add files in packages/db/src/ (e.g., schema.ts, agents.ts, project.ts, message.ts, fragment.ts, llm-key.ts)
Add or update migration SQL files in packages/db/drizzle/*.sql
Update migration metadata in packages/db/drizzle/meta/*.json and _journal.json
Update application logic to use new/changed schema (e.g., packages/api/src/router/*.ts, apps/admin/src/components/forms/project-form.tsx)
Update pnpm-lock.yaml if dependencies or packages are affected
```

### Feature Development With Ui And Api

Implements a new feature that involves both frontend UI components and backend API/router changes, often for agent or project management.

**Frequency**: ~2 times per month

**Steps**:
1. Add or update React components in apps/admin/src/components/ (e.g., project-view, messages-container, agent-panel)
2. Modify or add API router files in packages/api/src/router/*.ts
3. Update hooks in apps/admin/src/hooks/
4. Update or add supporting files in packages/deep-agents/src/ or packages/agents/src/
5. Update package.json and pnpm-lock.yaml if dependencies or packages are affected

**Files typically involved**:
- `apps/admin/src/components/projects/project-view/index.tsx`
- `apps/admin/src/components/projects/messages-container/index.tsx`
- `apps/admin/src/components/projects/messages-container/message-form.tsx`
- `apps/admin/src/components/projects/messages-container/user-message.tsx`
- `apps/admin/src/components/agent-panel/index.tsx`
- `apps/admin/src/components/forms/project-form.tsx`
- `apps/admin/src/hooks/use-agent-stream.ts`
- `apps/admin/src/hooks/use-streaming-message.ts`
- `packages/api/src/router/agent.ts`
- `packages/api/src/router/message.ts`
- `packages/api/src/router/projects.ts`
- `packages/deep-agents/src/auth.ts`
- `packages/deep-agents/src/supervisor/index.ts`
- `pnpm-lock.yaml`

**Example commit sequence**:
```
Add or update React components in apps/admin/src/components/ (e.g., project-view, messages-container, agent-panel)
Modify or add API router files in packages/api/src/router/*.ts
Update hooks in apps/admin/src/hooks/
Update or add supporting files in packages/deep-agents/src/ or packages/agents/src/
Update package.json and pnpm-lock.yaml if dependencies or packages are affected
```

### Refactor Across App And Packages

Performs codebase-wide refactoring, such as improving code structure, consolidating logic, or migrating constants and models between packages.

**Frequency**: ~2 times per month

**Steps**:
1. Modify files across multiple packages (e.g., packages/agents, packages/deep-agents, packages/api, apps/admin/src/)
2. Update import paths and references to reflect new structure
3. Update package.json and pnpm-lock.yaml if dependencies or packages are affected

**Files typically involved**:
- `packages/agents/src/*`
- `packages/deep-agents/src/*`
- `packages/api/src/router/*`
- `apps/admin/src/components/*`
- `apps/admin/src/hooks/*`
- `pnpm-lock.yaml`

**Example commit sequence**:
```
Modify files across multiple packages (e.g., packages/agents, packages/deep-agents, packages/api, apps/admin/src/)
Update import paths and references to reflect new structure
Update package.json and pnpm-lock.yaml if dependencies or packages are affected
```


## Best Practices

Based on analysis of the codebase, follow these practices:

### Do

- Use conventional commit format (feat:, fix:, etc.)
- Write tests using jest
- Follow *.test.tsx naming pattern
- Use camelCase for file names
- Prefer default exports

### Don't

- Don't use long relative imports (use aliases)
- Don't write vague commit messages
- Don't skip tests for new features
- Don't deviate from established patterns without discussion

---

*This skill was auto-generated by [ECC Tools](https://ecc.tools). Review and customize as needed for your team.*
