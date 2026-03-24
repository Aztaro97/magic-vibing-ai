---
name: magic-vibing-ai-conventions
description: Development conventions and patterns for magic-vibing-ai. TypeScript project with conventional commits.
---

# Magic Vibing Ai Conventions

> Generated from [Aztaro97/magic-vibing-ai](https://github.com/Aztaro97/magic-vibing-ai) on 2026-03-24

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

Follow these commit message conventions based on 74 analyzed commits.

### Commit Style: Conventional Commits

### Prefixes Used

- `feat`
- `chore`
- `refactor`
- `docs`

### Message Guidelines

- Average message length: ~104 characters
- Keep first line concise and descriptive
- Use imperative mood ("Add feature" not "Added feature")


*Commit message example*

```text
feat: Add Moonshot, Gemini, and OpenAI model integrations, introducing a configurable `MODEL_PROVIDER` environment variable for selection
```

*Commit message example*

```text
refactor: Use typed `env` for `E2B_API_KEY` in deep-agents, mark `E2B_API_KEY` as optional, and rename E2B Expo template to `expo-web-app`
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
feat: Integrate E2B sandbox for agent code execution and update default LLM models to qwen3.5
```

*Commit message example*

```text
Merge pull request #10 from Aztaro97/ecc-tools/magic-vibing-ai-1774265769715
```

*Commit message example*

```text
feat: add magic-vibing-ai ECC bundle (.claude/commands/refactoring.md)
```

*Commit message example*

```text
feat: add magic-vibing-ai ECC bundle (.claude/commands/feature-development.md)
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

**Frequency**: ~4 times per month

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

**Frequency**: ~19 times per month

**Steps**:
1. Add feature implementation
2. Add tests for feature
3. Update documentation

**Files typically involved**:
- `apps/admin/src/app/api/inngest/*`
- `apps/admin/src/app/api/pusher/auth/*`
- `apps/admin/src/components/projects/messages-container/*`
- `**/*.test.*`
- `**/api/**`

**Example commit sequence**:
```
feat: Implement real-time streaming for agent output using Pusher and configure the Inngest signing key
Merge pull request #3 from Aztaro97/feature/config-push
feat: Implement Gemini LLM integration, including new models, environment variables, and dependency updates
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

### Add Llm Provider Integration

Integrate a new LLM provider (e.g., Gemini, Moonshot, OpenAI) into the agent system, making it selectable via environment variables and updating dependencies.

**Frequency**: ~2 times per month

**Steps**:
1. Add or update environment variable in .env.example
2. Update or create provider-specific model file in packages/deep-agents/src/models/
3. Update packages/deep-agents/env.ts to handle new env vars
4. Update packages/deep-agents/package.json for dependencies
5. Update subagents/supervisor logic to support new model
6. Update pnpm-lock.yaml and turbo.json for dependency tracking

**Files typically involved**:
- `.env.example`
- `packages/deep-agents/env.ts`
- `packages/deep-agents/package.json`
- `packages/deep-agents/src/models/*.ts`
- `packages/deep-agents/src/subagents/index.ts`
- `packages/deep-agents/src/supervisor/index.ts`
- `pnpm-lock.yaml`
- `turbo.json`

**Example commit sequence**:
```
Add or update environment variable in .env.example
Update or create provider-specific model file in packages/deep-agents/src/models/
Update packages/deep-agents/env.ts to handle new env vars
Update packages/deep-agents/package.json for dependencies
Update subagents/supervisor logic to support new model
Update pnpm-lock.yaml and turbo.json for dependency tracking
```

### Ecc Bundle Skill Or Command

Add a new ECC (Extended Cognitive Component) bundle, skill, or command for the magic-vibing-ai agent, including documentation, YAML config, and command definitions.

**Frequency**: ~2 times per month

**Steps**:
1. Add or update command markdown in .claude/commands/
2. Add or update skill markdown in .agents/skills/magic-vibing-ai/ or .claude/skills/
3. Add or update YAML config in .agents/skills/magic-vibing-ai/agents/ or .claude/homunculus/instincts/inherited/
4. Update .claude/ecc-tools.json or .codex/config.toml as needed
5. Update .codex/agents/*.toml and .codex/AGENTS.md as needed

**Files typically involved**:
- `.claude/commands/*.md`
- `.claude/skills/magic-vibing-ai/SKILL.md`
- `.agents/skills/magic-vibing-ai/SKILL.md`
- `.agents/skills/magic-vibing-ai/agents/*.yaml`
- `.claude/homunculus/instincts/inherited/*.yaml`
- `.claude/ecc-tools.json`
- `.claude/identity.json`
- `.codex/agents/*.toml`
- `.codex/AGENTS.md`
- `.codex/config.toml`

**Example commit sequence**:
```
Add or update command markdown in .claude/commands/
Add or update skill markdown in .agents/skills/magic-vibing-ai/ or .claude/skills/
Add or update YAML config in .agents/skills/magic-vibing-ai/agents/ or .claude/homunculus/instincts/inherited/
Update .claude/ecc-tools.json or .codex/config.toml as needed
Update .codex/agents/*.toml and .codex/AGENTS.md as needed
```

### Feature Development Ui Api Db

Develop a new feature spanning UI, API, and database, including schema changes, new UI components, and API routes.

**Frequency**: ~2 times per month

**Steps**:
1. Add or update UI components and pages in apps/admin/src/
2. Add or update API routes in packages/api/src/router/
3. Add or update database schema and migration files in packages/db/
4. Update env files and package.json as needed
5. Update pnpm-lock.yaml and turbo.json for dependencies

**Files typically involved**:
- `apps/admin/src/app/(dashboard)/**/*.tsx`
- `apps/admin/src/components/**/*.tsx`
- `apps/admin/src/hooks/**/*.ts`
- `packages/api/src/router/**/*.ts`
- `packages/db/drizzle/**/*.sql`
- `packages/db/drizzle/meta/*.json`
- `packages/db/src/schema.ts`
- `packages/deep-agents/env.ts`
- `packages/deep-agents/package.json`
- `pnpm-lock.yaml`
- `turbo.json`

**Example commit sequence**:
```
Add or update UI components and pages in apps/admin/src/
Add or update API routes in packages/api/src/router/
Add or update database schema and migration files in packages/db/
Update env files and package.json as needed
Update pnpm-lock.yaml and turbo.json for dependencies
```

### Add Error Handler Package

Introduce or update a centralized error-handler package and integrate it into UI and backend for consistent error display and tracking.

**Frequency**: ~2 times per month

**Steps**:
1. Create or update packages/error-handler/ with client/server/shared code
2. Integrate error notification UI in apps/admin/src/components/projects/
3. Update package.json and pnpm-lock.yaml for dependencies
4. Update or add usage in backend (e.g., packages/api/src/router/)

**Files typically involved**:
- `packages/error-handler/**`
- `apps/admin/src/components/projects/error-notification-container.tsx`
- `apps/admin/src/components/projects/project-view/index.tsx`
- `packages/api/src/router/message.ts`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`

**Example commit sequence**:
```
Create or update packages/error-handler/ with client/server/shared code
Integrate error notification UI in apps/admin/src/components/projects/
Update package.json and pnpm-lock.yaml for dependencies
Update or add usage in backend (e.g., packages/api/src/router/)
```

### Add Realtime Streaming With Pusher

Add or update real-time streaming for agent output using Pusher, including backend integration, frontend hooks, and environment/config updates.

**Frequency**: ~2 times per month

**Steps**:
1. Add or update Pusher client/server code in packages/pusher/
2. Update or add streaming hooks and UI in apps/admin/src/hooks/ and apps/admin/src/components/projects/messages-container/
3. Update API and jobs logic to emit events
4. Add or update environment variables in .env.example
5. Update package.json and pnpm-lock.yaml for dependencies

**Files typically involved**:
- `packages/pusher/**`
- `apps/admin/src/hooks/use-streaming-message.ts`
- `apps/admin/src/components/projects/messages-container/streaming-message.tsx`
- `apps/admin/src/components/projects/messages-container/index.tsx`
- `packages/api/package.json`
- `packages/jobs/src/functions/code-agent-fn.ts`
- `.env.example`
- `pnpm-lock.yaml`

**Example commit sequence**:
```
Add or update Pusher client/server code in packages/pusher/
Update or add streaming hooks and UI in apps/admin/src/hooks/ and apps/admin/src/components/projects/messages-container/
Update API and jobs logic to emit events
Add or update environment variables in .env.example
Update package.json and pnpm-lock.yaml for dependencies
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
