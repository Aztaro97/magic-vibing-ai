```markdown
# magic-vibing-ai Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the `magic-vibing-ai` TypeScript codebase. You'll learn how to structure files, write imports/exports, follow commit message standards, and understand the project's approach to testing. This guide is ideal for contributors aiming for consistency and code quality.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `magicVibeEngine.ts`, `userSessionManager.ts`

### Import Style
- Use **relative imports** for modules.
  - Example:
    ```typescript
    import { calculateVibe } from './vibeCalculator';
    ```

### Export Style
- Use **named exports** (not default).
  - Example:
    ```typescript
    // In vibeCalculator.ts
    export function calculateVibe(input: string): number { ... }
    ```

### Commit Messages
- Follow **Conventional Commits** with the `fix` prefix for bug fixes.
  - Example:
    ```
    fix: resolve null pointer in vibe calculation logic
    ```
- Average commit message length is about 84 characters.

## Workflows

### Code Update Workflow
**Trigger:** When making changes or adding new features to the codebase  
**Command:** `/update-code`

1. Create or update files using camelCase naming.
2. Use relative imports and named exports in your TypeScript files.
3. Write clear, conventional commit messages (e.g., `fix: ...`).
4. If applicable, add or update corresponding test files (`*.test.*`).
5. Push your changes to the repository.

### Testing Workflow
**Trigger:** When writing or updating tests  
**Command:** `/run-tests`

1. Create test files matching the pattern `*.test.*` (e.g., `vibeCalculator.test.ts`).
2. Write tests for your modules and functions.
3. Run the test suite using the project's test runner (framework unknown; check project scripts).
4. Ensure all tests pass before merging changes.

## Testing Patterns

- Test files are named with the pattern `*.test.*` (e.g., `vibeCalculator.test.ts`).
- The specific testing framework is not detected; check the repository for test runner details.
- Place tests alongside or near the modules they test for clarity.

  ```typescript
  // vibeCalculator.test.ts
  import { calculateVibe } from './vibeCalculator';

  test('calculates positive vibe', () => {
    expect(calculateVibe('happy')).toBeGreaterThan(0);
  });
  ```

## Commands
| Command        | Purpose                                             |
|----------------|-----------------------------------------------------|
| /update-code   | Follow the code update workflow for new changes     |
| /run-tests     | Run the test suite on all `*.test.*` files          |
```
