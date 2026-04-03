```markdown
# magic-vibing-ai Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the core development patterns and conventions used in the `magic-vibing-ai` TypeScript codebase. You'll learn about file naming, import/export styles, commit message conventions, and how to write and run tests. This guide is ideal for contributors seeking to maintain consistency and quality in their work.

## Coding Conventions

### File Naming
- Use **camelCase** for all file names.
  - Example: `magicVibeGenerator.ts`

### Import Style
- Always use **relative imports**.
  - Example:
    ```typescript
    import { getVibe } from './vibeUtils';
    ```

### Export Style
- Use **named exports** exclusively.
  - Example:
    ```typescript
    // In magicVibeGenerator.ts
    export function generateVibe(input: string): string {
      // implementation
    }
    ```

### Commit Messages
- Follow the **Conventional Commits** standard.
- Use prefixes like `refactor`.
- Example:
  ```
  refactor: improve performance of vibe calculation algorithm
  ```

## Workflows

### Refactoring Code
**Trigger:** When improving code structure or performance without changing external behavior  
**Command:** `/refactor`

1. Identify code that can be improved for readability, maintainability, or performance.
2. Make changes while ensuring no breaking changes to the API.
3. Use named exports and relative imports as per conventions.
4. Write or update relevant tests.
5. Commit your changes using the conventional commit format:
   ```
   refactor: [short description of the change]
   ```
6. Open a pull request for review.

## Testing Patterns

- Test files use the `*.test.*` naming pattern.
  - Example: `vibeUtils.test.ts`
- The specific testing framework is not detected; check existing test files for framework clues.
- Place tests alongside or near the files they test.
- Example test file:
  ```typescript
  import { generateVibe } from './magicVibeGenerator';

  describe('generateVibe', () => {
    it('should return a valid vibe string', () => {
      expect(generateVibe('happy')).toContain('vibe');
    });
  });
  ```

## Commands
| Command    | Purpose                                   |
|------------|-------------------------------------------|
| /refactor  | Start a code refactor workflow            |
```
