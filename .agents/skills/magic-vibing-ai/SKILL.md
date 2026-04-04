```markdown
# magic-vibing-ai Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the core development patterns and conventions used in the `magic-vibing-ai` TypeScript codebase. You'll learn about file naming, import/export styles, commit message conventions, and how to structure and run tests. This guide helps ensure consistency and maintainability when contributing to the project.

## Coding Conventions

### File Naming
- **Pattern:** PascalCase
- **Example:**  
  ```plaintext
  MagicComponent.ts
  UserProfileManager.ts
  ```

### Import Style
- **Pattern:** Relative imports
- **Example:**
  ```typescript
  import { MagicHelper } from './MagicHelper';
  import { UserProfile } from '../models/UserProfile';
  ```

### Export Style
- **Pattern:** Named exports
- **Example:**
  ```typescript
  // In MagicHelper.ts
  export function doMagic() { ... }
  export const MAGIC_CONSTANT = 42;
  ```

### Commit Messages
- **Pattern:** Conventional commits
- **Prefix:** `refactor`
- **Example:**
  ```
  refactor: update MagicHelper to improve performance and readability
  ```

## Workflows

### Refactoring Code
**Trigger:** When improving code structure, readability, or performance without changing functionality  
**Command:** `/refactor`

1. Identify the code that needs refactoring.
2. Make improvements while ensuring no change in external behavior.
3. Use relative imports and named exports as per conventions.
4. Update or add tests if necessary.
5. Commit changes using the `refactor:` prefix.
   - Example commit message:  
     ```
     refactor: simplify UserProfileManager logic for clarity
     ```
6. Push your branch and open a pull request.

## Testing Patterns

- **Test File Naming:** Files containing tests use the `*.test.*` pattern.
  - Example: `MagicHelper.test.ts`
- **Testing Framework:** Not explicitly detected; check project dependencies or existing test files for specifics.
- **Test Example:**
  ```typescript
  // MagicHelper.test.ts
  import { doMagic } from './MagicHelper';

  test('doMagic returns expected value', () => {
    expect(doMagic()).toBe(42);
  });
  ```

## Commands
| Command     | Purpose                                             |
|-------------|-----------------------------------------------------|
| /refactor   | Start a code refactoring workflow                   |
```
