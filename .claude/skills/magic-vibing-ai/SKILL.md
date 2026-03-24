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

Follow these commit message conventions based on 71 analyzed commits.

### Commit Style: Conventional Commits

### Prefixes Used

- `feat`
- `chore`
- `refactor`
- `docs`

### Message Guidelines

- Average message length: ~103 characters
- Keep first line concise and descriptive
- Use imperative mood ("Add feature" not "Added feature")


*Commit message example*

```text
feat: Integrate Tavily for research and update agent prompts to align with a React Native/Expo development context
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

### Add Or Update Ecc Bundle

Adds or updates ECC (External Cognitive Component) bundle files for the magic-vibing-ai agent, including commands, skills, instincts, and agent definitions.

**Frequency**: ~2 times per month

**Steps**:
1. Create or update one or more files in .claude/commands/ (e.g., database-migration.md, feature-development.md, refactoring.md)
2. Create or update .claude/homunculus/instincts/inherited/{agent}-instincts.yaml
3. Create or update .claude/skills/{agent}/SKILL.md
4. Create or update .claude/identity.json
5. Create or update .claude/ecc-tools.json
6. Create or update .codex/AGENTS.md and .codex/agents/*.toml
7. Create or update .codex/config.toml
8. Create or update .agents/skills/{agent}/SKILL.md and .agents/skills/{agent}/agents/openai.yaml

**Files typically involved**:
- `.claude/commands/*.md`
- `.claude/homunculus/instincts/inherited/*.yaml`
- `.claude/skills/*/SKILL.md`
- `.claude/identity.json`
- `.claude/ecc-tools.json`
- `.codex/AGENTS.md`
- `.codex/agents/*.toml`
- `.codex/config.toml`
- `.agents/skills/*/SKILL.md`
- `.agents/skills/*/agents/openai.yaml`

**Example commit sequence**:
```
Create or update one or more files in .claude/commands/ (e.g., database-migration.md, feature-development.md, refactoring.md)
Create or update .claude/homunculus/instincts/inherited/{agent}-instincts.yaml
Create or update .claude/skills/{agent}/SKILL.md
Create or update .claude/identity.json
Create or update .claude/ecc-tools.json
Create or update .codex/AGENTS.md and .codex/agents/*.toml
Create or update .codex/config.toml
Create or update .agents/skills/{agent}/SKILL.md and .agents/skills/{agent}/agents/openai.yaml
```

### Add Or Update Llm Provider

Integrates a new LLM provider (e.g., Gemini, Anthropic, Ollama, Qwen) or updates LLM model support, including environment variables, model files, and dependency updates.

**Frequency**: ~2 times per month

**Steps**:
1. Update .env.example to add new environment variables for the provider
2. Update or create provider-specific files in packages/agents/src/models/ or packages/deep-agents/src/models/
3. Update constants in packages/agents/src/constants/index.ts or packages/deep-agents/src/constants/index.ts
4. Update package.json and dependencies (e.g., packages/agents/package.json, packages/deep-agents/package.json)
5. Update pnpm-lock.yaml
6. Optionally update turbo.json or other config files

**Files typically involved**:
- `.env.example`
- `packages/agents/src/models/*.ts`
- `packages/agents/src/constants/index.ts`
- `packages/agents/package.json`
- `packages/deep-agents/src/models/*.ts`
- `packages/deep-agents/src/constants/index.ts`
- `packages/deep-agents/package.json`
- `pnpm-lock.yaml`
- `turbo.json`

**Example commit sequence**:
```
Update .env.example to add new environment variables for the provider
Update or create provider-specific files in packages/agents/src/models/ or packages/deep-agents/src/models/
Update constants in packages/agents/src/constants/index.ts or packages/deep-agents/src/constants/index.ts
Update package.json and dependencies (e.g., packages/agents/package.json, packages/deep-agents/package.json)
Update pnpm-lock.yaml
Optionally update turbo.json or other config files
```

### Implement Or Update Agent Feature

Implements or updates a major agent feature, often involving UI, API, agent logic, and sometimes database changes.

**Frequency**: ~2 times per month

**Steps**:
1. Update or add files in apps/admin/src/components/agent-panel/ and related UI files
2. Update or add API route files in packages/api/src/router/
3. Update or add agent logic in packages/deep-agents/src/ or packages/agents/src/
4. Update package.json and dependencies as needed
5. Update pnpm-lock.yaml
6. Optionally update database schema/migration files if persistent data is needed

**Files typically involved**:
- `apps/admin/src/components/agent-panel/*.tsx`
- `apps/admin/src/components/projects/project-view/*.tsx`
- `apps/admin/src/hooks/use-agent-stream.ts`
- `packages/api/src/router/agent.ts`
- `packages/api/src/router/message.ts`
- `packages/api/src/router/projects.ts`
- `packages/deep-agents/src/**/*.ts`
- `packages/agents/src/**/*.ts`
- `packages/deep-agents/package.json`
- `packages/agents/package.json`
- `pnpm-lock.yaml`
- `packages/db/drizzle/*.sql`
- `packages/db/drizzle/meta/*.json`

**Example commit sequence**:
```
Update or add files in apps/admin/src/components/agent-panel/ and related UI files
Update or add API route files in packages/api/src/router/
Update or add agent logic in packages/deep-agents/src/ or packages/agents/src/
Update package.json and dependencies as needed
Update pnpm-lock.yaml
Optionally update database schema/migration files if persistent data is needed
```

### Implement Or Update Error Handling

Adds or updates a centralized error handling system, including a new package, client/server components, and UI integration.

**Frequency**: ~2 times per month

**Steps**:
1. Create or update packages/error-handler/ with client, server, and shared files
2. Update apps/admin/src/components/projects/error-notification-container.tsx and related UI files
3. Update package.json and dependencies
4. Update pnpm-lock.yaml and pnpm-workspace.yaml
5. Update agent or API files to use new error handler

**Files typically involved**:
- `packages/error-handler/**/*`
- `apps/admin/src/components/projects/error-notification-container.tsx`
- `apps/admin/src/components/projects/project-view/index.tsx`
- `package.json`
- `packages/agents/package.json`
- `packages/jobs/package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`

**Example commit sequence**:
```
Create or update packages/error-handler/ with client, server, and shared files
Update apps/admin/src/components/projects/error-notification-container.tsx and related UI files
Update package.json and dependencies
Update pnpm-lock.yaml and pnpm-workspace.yaml
Update agent or API files to use new error handler
```

### Implement Real Time Streaming

Implements or updates real-time streaming for agent output using Pusher, including environment, API, and UI integration.

**Frequency**: ~2 times per month

**Steps**:
1. Update .env.example and add Pusher-related variables
2. Add or update packages/pusher/ with client, server, and config files
3. Update apps/admin/src/app/api/pusher/auth/route.ts
4. Update apps/admin/src/components/projects/messages-container/streaming-message.tsx and related UI files
5. Update apps/admin/src/hooks/use-streaming-message.ts
6. Update package.json and dependencies
7. Update pnpm-lock.yaml

**Files typically involved**:
- `.env.example`
- `packages/pusher/**/*`
- `apps/admin/src/app/api/pusher/auth/route.ts`
- `apps/admin/src/components/projects/messages-container/streaming-message.tsx`
- `apps/admin/src/hooks/use-streaming-message.ts`
- `package.json`
- `pnpm-lock.yaml`

**Example commit sequence**:
```
Update .env.example and add Pusher-related variables
Add or update packages/pusher/ with client, server, and config files
Update apps/admin/src/app/api/pusher/auth/route.ts
Update apps/admin/src/components/projects/messages-container/streaming-message.tsx and related UI files
Update apps/admin/src/hooks/use-streaming-message.ts
Update package.json and dependencies
Update pnpm-lock.yaml
```

### Update Tailwind Or Ui Theme

Consolidates or updates Tailwind CSS configuration and/or global UI theme styles across the app.

**Frequency**: ~2 times per month

**Steps**:
1. Update tooling/tailwind/*.ts files
2. Update apps/admin/tailwind.config.ts and/or apps/admin/src/app/globals.css
3. Update related UI components to use new theme or style variables

**Files typically involved**:
- `tooling/tailwind/base.ts`
- `tooling/tailwind/native.ts`
- `tooling/tailwind/web.ts`
- `tooling/tailwind/src/styles.css`
- `apps/admin/tailwind.config.ts`
- `apps/admin/src/app/globals.css`

**Example commit sequence**:
```
Update tooling/tailwind/*.ts files
Update apps/admin/tailwind.config.ts and/or apps/admin/src/app/globals.css
Update related UI components to use new theme or style variables
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
