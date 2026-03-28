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

Follow these commit message conventions based on 54 analyzed commits.

### Commit Style: Conventional Commits

### Prefixes Used

- `feat`
- `chore`
- `refactor`
- `docs`

### Message Guidelines

- Average message length: ~111 characters
- Keep first line concise and descriptive
- Use imperative mood ("Add feature" not "Added feature")


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
feat: Introduce agent session management with new database tables and UI to support initial prompts and models
```

*Commit message example*

```text
Merge pull request #7 from Aztaro97/feature/migrate-to-langraph
```

*Commit message example*

```text
docs: Remove migration plan and architecture design documents
```

*Commit message example*

```text
refactor: consolidate Tailwind CSS configuration and update agent state schemas
```

*Commit message example*

```text
feat: Migrate agent infrastructure from Inngest to LangGraph and remove the jobs package
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

**Example commit sequence**:
```
setting up authentification
refactor: remove unused sign-in and sign-up pages; update dashboard layout to include session validation and user data; update package dependencies for react-hook-form and Radix UI components
feat: add stripe, organization, invitaion and subscription schema
```

### Feature Development

Standard feature implementation workflow

**Frequency**: ~14 times per month

**Steps**:
1. Add feature implementation
2. Add tests for feature
3. Update documentation

**Files typically involved**:
- `apps/admin/src/app/(dashboard)/*`
- `apps/admin/src/app/api/inngest/*`
- `apps/admin/src/app/*`
- `**/*.test.*`
- `**/api/**`

**Example commit sequence**:
```
chore: add API keys to .env.example, update pnpm-lock.yaml with new workspace dependencies, and modify turbo.json to include new environment variables
chore: refactor hello-word-fn.ts to comment out unused code, update compile_page.sh for Expo server setup, and modify e2b.Dockerfile to install Expo CLI and create Expo app
chore: update package.json with new template build and publish scripts for Next.js and Expo; modify hello-word-fn.ts to change sandbox host port; update e2b configuration to create sandbox with specific app name; remove obsolete compile_page.sh, e2b.Dockerfile, and e2b.toml files
```

### Refactoring

Code refactoring and cleanup workflow

**Frequency**: ~7 times per month

**Steps**:
1. Ensure tests pass before refactor
2. Refactor code structure
3. Verify tests still pass

**Files typically involved**:
- `src/**/*`

**Example commit sequence**:
```
refactor: remove unused sign-in and sign-up pages; update dashboard layout to include session validation and user data; update package dependencies for react-hook-form and Radix UI components
feat: add stripe, organization, invitaion and subscription schema
feat: update project and message routers; add new dependencies for prismjs and react-resizable-panels; enhance page component with error and hydration boundaries
```

### Add Or Modify Database Table

Adds a new table or modifies the schema in the database, including migrations and updating related types and API routers.

**Frequency**: ~2 times per month

**Steps**:
1. Edit or create new migration SQL file in packages/db/drizzle/
2. Update snapshot and journal files in packages/db/drizzle/meta/
3. Modify packages/db/src/schema.ts and related entity files (e.g., project.ts, message.ts, llm-key.ts, fragment.ts, agents.ts)
4. Update API routers in packages/api/src/router/ if needed
5. Update types in packages/db/src/types.ts if needed

**Files typically involved**:
- `packages/db/drizzle/*.sql`
- `packages/db/drizzle/meta/*.json`
- `packages/db/drizzle/meta/_journal.json`
- `packages/db/src/schema.ts`
- `packages/db/src/*.ts`
- `packages/api/src/router/*.ts`
- `packages/db/src/types.ts`

**Example commit sequence**:
```
Edit or create new migration SQL file in packages/db/drizzle/
Update snapshot and journal files in packages/db/drizzle/meta/
Modify packages/db/src/schema.ts and related entity files (e.g., project.ts, message.ts, llm-key.ts, fragment.ts, agents.ts)
Update API routers in packages/api/src/router/ if needed
Update types in packages/db/src/types.ts if needed
```

### Add Or Update Api Endpoint

Adds or updates an API endpoint, including route file creation/modification, updating router index, and writing related tests or types.

**Frequency**: ~2 times per month

**Steps**:
1. Create or modify route file in apps/admin/src/app/api/ or packages/api/src/router/
2. Update router index or root file if necessary
3. Update or create related test files if present
4. Update frontend hooks or components if API shape changes

**Files typically involved**:
- `apps/admin/src/app/api/**/*.ts`
- `packages/api/src/router/*.ts`
- `packages/api/src/root.ts`
- `apps/admin/src/hooks/**/*.ts`
- `apps/admin/src/components/**/*.tsx`

**Example commit sequence**:
```
Create or modify route file in apps/admin/src/app/api/ or packages/api/src/router/
Update router index or root file if necessary
Update or create related test files if present
Update frontend hooks or components if API shape changes
```

### Add New Llm Model Or Provider

Integrates a new LLM model or provider, updating model constants, environment variables, and related package dependencies.

**Frequency**: ~1 times per month

**Steps**:
1. Add or update model in packages/agents/src/models/ or packages/deep-agents/src/models/
2. Update model constants in packages/agents/src/constants/index.ts or packages/deep-agents/src/constants/index.ts
3. Add necessary environment variables in .env.example and env.ts files
4. Update package.json dependencies if new SDKs are needed
5. Update frontend model selection components

**Files typically involved**:
- `.env.example`
- `packages/agents/src/models/*.ts`
- `packages/agents/src/constants/index.ts`
- `packages/deep-agents/src/models/*.ts`
- `packages/deep-agents/src/constants/index.ts`
- `packages/agents/env.ts`
- `packages/deep-agents/env.ts`
- `packages/agents/package.json`
- `packages/deep-agents/package.json`
- `apps/admin/src/components/forms/model-select-form.tsx`
- `apps/admin/src/components/forms/setting-model-select.tsx`

**Example commit sequence**:
```
Add or update model in packages/agents/src/models/ or packages/deep-agents/src/models/
Update model constants in packages/agents/src/constants/index.ts or packages/deep-agents/src/constants/index.ts
Add necessary environment variables in .env.example and env.ts files
Update package.json dependencies if new SDKs are needed
Update frontend model selection components
```

### Feature Development Ui Api Sync

Implements a new feature end-to-end, touching UI components, hooks, API routers, and sometimes database schema, ensuring all layers are updated together.

**Frequency**: ~2 times per month

**Steps**:
1. Create or update UI components in apps/admin/src/components/
2. Update or add hooks in apps/admin/src/hooks/
3. Modify or add API router files in packages/api/src/router/
4. Update or add database schema/migrations if new data is needed
5. Update package.json or pnpm-lock.yaml if dependencies are added

**Files typically involved**:
- `apps/admin/src/components/**/*.tsx`
- `apps/admin/src/hooks/**/*.ts`
- `packages/api/src/router/*.ts`
- `packages/db/drizzle/*.sql`
- `packages/db/drizzle/meta/*.json`
- `packages/db/src/schema.ts`
- `package.json`
- `pnpm-lock.yaml`

**Example commit sequence**:
```
Create or update UI components in apps/admin/src/components/
Update or add hooks in apps/admin/src/hooks/
Modify or add API router files in packages/api/src/router/
Update or add database schema/migrations if new data is needed
Update package.json or pnpm-lock.yaml if dependencies are added
```

### Add Or Update Shared Package

Creates or updates a shared package (e.g., error-handler, validators), including package.json, implementation files, and updating references in other packages.

**Frequency**: ~1 times per month

**Steps**:
1. Create or update package in packages/<name>/
2. Update or add implementation files (src/)
3. Update or add types/config files (tsconfig.json, eslint.config.js)
4. Update package.json for dependencies
5. Update references/imports in other packages or apps

**Files typically involved**:
- `packages/*/package.json`
- `packages/*/src/**/*.ts`
- `packages/*/tsconfig.json`
- `packages/*/eslint.config.js`
- `apps/admin/package.json`
- `apps/admin/src/components/**/*.tsx`

**Example commit sequence**:
```
Create or update package in packages/<name>/
Update or add implementation files (src/)
Update or add types/config files (tsconfig.json, eslint.config.js)
Update package.json for dependencies
Update references/imports in other packages or apps
```

### Update Tailwind Or Ui Theme

Updates Tailwind CSS configuration or global UI theme, including base styles and related config files.

**Frequency**: ~1 times per month

**Steps**:
1. Edit Tailwind config files (tooling/tailwind/*.ts, apps/admin/tailwind.config.ts)
2. Update global CSS (apps/admin/src/app/globals.css, tooling/tailwind/src/styles.css)
3. Update related UI components if needed
4. Update package.json or pnpm-lock.yaml if dependencies change

**Files typically involved**:
- `tooling/tailwind/*.ts`
- `apps/admin/tailwind.config.ts`
- `apps/admin/src/app/globals.css`
- `tooling/tailwind/src/styles.css`
- `packages/ui/src/*.tsx`
- `package.json`
- `pnpm-lock.yaml`

**Example commit sequence**:
```
Edit Tailwind config files (tooling/tailwind/*.ts, apps/admin/tailwind.config.ts)
Update global CSS (apps/admin/src/app/globals.css, tooling/tailwind/src/styles.css)
Update related UI components if needed
Update package.json or pnpm-lock.yaml if dependencies change
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
