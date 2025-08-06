# Database Schema Documentation

This document outlines the database schema structure converted from Prisma to Drizzle ORM following best practices.

## Schema Structure

### Files Organization

```
packages/db/src/
├── client.ts          # Database client configuration
├── index.ts           # Main exports
├── schema.ts          # Auth tables and relations
├── llm-key.ts         # LLM key table
├── project.ts         # Project table
├── message.ts         # Message table with enums
├── fragment.ts        # Fragment table
└── types.ts           # TypeScript type definitions
```

## Tables

### Authentication Tables (Better Auth)

- `user` - User authentication data
- `session` - User sessions
- `account` - OAuth accounts
- `verification` - Email verification
- `jwks` - JSON Web Key Set

### Application Tables

#### 1. User (Extended)

```sql
CREATE TABLE user (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN NOT NULL,
  image TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

#### 2. LLM Key

```sql
CREATE TABLE llm_key (
  id TEXT PRIMARY KEY,           -- UUID
  llm TEXT NOT NULL,             -- LLM provider name
  key TEXT NOT NULL,             -- API key
  model TEXT NOT NULL,           -- Model name
  in_use BOOLEAN NOT NULL DEFAULT FALSE,
  user_id TEXT NOT NULL,         -- FK to user.id
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

#### 3. Project

```sql
CREATE TABLE project (
  id TEXT PRIMARY KEY,           -- UUID
  name TEXT NOT NULL,
  user_id TEXT NOT NULL,         -- FK to user.id
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

#### 4. Message

```sql
CREATE TYPE message_role AS ENUM ('USER', 'ASSISTANT');
CREATE TYPE message_type AS ENUM ('RESULT', 'ERROR');

CREATE TABLE message (
  id TEXT PRIMARY KEY,           -- UUID
  content TEXT NOT NULL,
  role message_role NOT NULL,
  type message_type NOT NULL,
  project_id TEXT NOT NULL,      -- FK to project.id
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

#### 5. Fragment

```sql
CREATE TABLE fragment (
  id TEXT PRIMARY KEY,           -- UUID
  message_id TEXT UNIQUE NOT NULL, -- FK to message.id
  sandbox_url TEXT NOT NULL,
  title TEXT NOT NULL,
  files JSON NOT NULL,           -- JSON object for file data
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## Relationships

### One-to-Many

- `User` → `LlmKey` (one user has many LLM keys)
- `User` → `Project` (one user has many projects)
- `Project` → `Message` (one project has many messages)

### One-to-One

- `Message` → `Fragment` (one message has at most one fragment)

## TypeScript Types

The schema exports comprehensive TypeScript types:

```typescript
// Select types (for reading)
export type User = InferSelectModel<typeof user>;
export type LlmKey = InferSelectModel<typeof llmKey>;
export type Project = InferSelectModel<typeof project>;
export type Message = InferSelectModel<typeof message>;
export type Fragment = InferSelectModel<typeof fragment>;

// Insert types (for creating)
export type NewUser = InferInsertModel<typeof user>;
export type NewLlmKey = InferInsertModel<typeof llmKey>;
// ... etc

// Enum types
export type MessageRole = "USER" | "ASSISTANT";
export type MessageType = "RESULT" | "ERROR";

// Relation types
export type UserWithRelations = User & {
  llmKeys?: LlmKey[];
  projects?: Project[];
};
```

## Usage Examples

### Basic Queries

```typescript
import { eq } from "drizzle-orm";

import { db, message, project, user } from "@acme/db";

// Find user by email
const foundUser = await db
  .select()
  .from(user)
  .where(eq(user.email, "user@example.com"));

// Create a new project
const newProject = await db
  .insert(project)
  .values({
    name: "My Project",
    userId: "user-id",
  })
  .returning();

// Get all messages for a project
const messages = await db
  .select()
  .from(message)
  .where(eq(message.projectId, "project-id"));
```

### Queries with Relations

```typescript
// Get user with all their projects
const userWithProjects = await db.query.user.findFirst({
  where: eq(user.id, "user-id"),
  with: {
    projects: true,
    llmKeys: true,
  },
});

// Get project with messages and fragments
const projectWithData = await db.query.project.findFirst({
  where: eq(project.id, "project-id"),
  with: {
    messages: {
      with: {
        fragment: true,
      },
    },
  },
});
```

## Migration

To apply this schema to your database:

1. Generate migration:

   ```bash
   pnpm db:generate
   ```

2. Push to database:

   ```bash
   pnpm db:push
   ```

3. Run Drizzle Studio (optional):
   ```bash
   pnpm db:studio
   ```

## Features

✅ **Type Safety**: Full TypeScript support with inferred types  
✅ **Relations**: Proper foreign key relationships  
✅ **Enums**: PostgreSQL enums for message roles and types  
✅ **JSON Support**: Files stored as JSON in fragments  
✅ **Timestamps**: Auto-updating created_at and updated_at  
✅ **UUID Generation**: Automatic UUID generation for primary keys  
✅ **Cascade Deletes**: Proper cleanup when parent records are deleted  
✅ **No Circular Imports**: Clean file structure without import cycles

This schema maintains the same functionality as the original Prisma schema while leveraging Drizzle ORM's type-safe query builder and better performance characteristics.
