```markdown
# magic-vibing-ai Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns, coding conventions, and collaborative workflows used in the `magic-vibing-ai` TypeScript codebase. The repository is organized around modular packages and templates, with a focus on maintainability, clear commit practices, and database-driven features. While no specific framework is detected, the codebase leverages modern TypeScript practices and supports scalable feature development.

## Coding Conventions

### File Naming
- **CamelCase** is used for file names.
  - Example: `sandboxEvent.ts`, `userProfile.ts`

### Import Style
- **Mixed imports** are used, combining both default and named imports as needed.
  - Example:
    ```typescript
    import fs from 'fs';
    import { parse, stringify } from 'querystring';
    ```

### Export Style
- **Named exports** are preferred.
  - Example:
    ```typescript
    export function createUser() { ... }
    export const MAX_USERS = 100;
    ```

### Commit Messages
- **Conventional commit** format is enforced.
  - Prefixes: `feat`, `docs`, `refactor`
  - Example: `feat(db): add sandboxEvent entity and migration`

## Workflows

### Add New Feature Package or Template
**Trigger:** When introducing a new package, template, or major feature module  
**Command:** `/new-template`

1. **Create new directory structure** for the package or template.
   - Example: `packages/myNewFeature/` or `sandbox-templates/coolTemplate/`
2. **Add initial configuration files** such as:
   - `package.json`
   - `tsconfig.json`
   - `.gitignore`
   - `Dockerfile`
3. **Add implementation files** (source code, assets, scripts).
   - Example: `index.ts`, `featureLogic.ts`
4. **Update root-level or related configuration files**:
   - `pnpm-lock.yaml`
   - `turbo.json`
   - Root `package.json`

**Example Directory Structure:**
```
packages/
  myNewFeature/
    package.json
    tsconfig.json
    index.ts
    featureLogic.ts
```

### Database Schema and Entity Expansion
**Trigger:** When adding a new table, entity, or event type to the database  
**Command:** `/new-table`

1. **Edit schema definition file** to add the new entity or field.
   - File: `packages/db/src/schema.ts`
   - Example:
     ```typescript
     export const sandboxEvent = pgTable('sandbox_event', {
       id: serial('id').primaryKey(),
       name: varchar('name', { length: 255 }),
       // new fields here
     });
     ```
2. **Generate and add new migration SQL file** in `packages/db/drizzle/`.
3. **Update migration metadata**:
   - Files: `packages/db/drizzle/meta/*.json`, `packages/db/drizzle/meta/_journal.json`
4. **Update entity or model files** as needed:
   - Example: `packages/db/src/sandboxEvent.ts`
5. **Update database index or entry point**:
   - File: `packages/db/src/index.ts`

**Example Migration File:**
```sql
-- 20230401_add_sandbox_event.sql
CREATE TABLE sandbox_event (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255)
  -- new columns here
);
```

## Testing Patterns

- **Test files** follow the `*.test.*` pattern (e.g., `user.test.ts`).
- **Testing framework** is not explicitly detected; use standard TypeScript test runners (e.g., Jest, Vitest) as appropriate.
- **Example test file:**
  ```typescript
  import { createUser } from './user';

  test('should create a user', () => {
    const user = createUser('Alice');
    expect(user.name).toBe('Alice');
  });
  ```

## Commands

| Command        | Purpose                                                           |
|----------------|-------------------------------------------------------------------|
| /new-template  | Scaffold a new feature package or sandbox template                |
| /new-table     | Add a new database table/entity and update related schema/migrations |
```
