# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a **Turborepo monorepo** with a Next.js admin app and React Native mobile app, built on the T3 stack with AI agent capabilities.

### Core Architecture
- **Monorepo**: Uses pnpm workspaces with Turborepo for build orchestration
- **Database**: PostgreSQL with Drizzle ORM (edge-compatible)
- **API**: tRPC v11 with type-safe client/server communication
- **Auth**: Better Auth (next-auth v5) with OAuth support
- **UI**: shadcn/ui components with Tailwind CSS
- **AI**: Custom agents package with Claude/OpenAI integration
- **E2B**: Sandbox execution for code fragments

### Package Structure
```
vibe-coding-app/
├── apps/
│   ├── admin/          # Next.js 15 admin dashboard
│   └── mobile/         # React Native Expo 53 app
├── packages/
│   ├── api/            # tRPC API definitions
│   ├── auth/           # Authentication utilities
│   ├── db/             # Database schema & client
│   ├── agents/         # AI agent orchestration
│   ├── jobs/           # Background job processing
│   ├── e2b/            # E2B sandbox integration
│   ├── ui/             # Shared UI components
│   └── validators/     # Zod validation schemas
└── tooling/            # Shared configurations
```

## Essential Commands

### Development
```bash
# Start all apps in dev mode
pnpm dev

# Start specific apps
pnpm dev:next          # Next.js admin only
pnpm -F @acme/mobile dev  # Mobile app only

# Database operations
pnpm db:push          # Push schema changes
pnpm db:studio        # Drizzle Studio
pnpm db:generate      # Generate migrations
```

### Build & Quality
```bash
# Build all packages/apps
pnpm build

# Code quality
pnpm lint             # Lint all packages
pnpm lint:fix         # Auto-fix lint issues
pnpm format           # Format code
pnpm typecheck        # Type checking
```

### Testing
```bash
# Mobile app testing
pnpm -F @acme/mobile test          # Unit tests
pnpm -F @acme/mobile e2e-test      # E2E tests with Playwright

# Run specific test
pnpm -F @acme/mobile test -- --testNamePattern="Login"
```

### AI Agent Development
```bash
# Update agents package
pnpm -F @acme/agents build

# Test agent functionality
pnpm -F @acme/agents dev
```

### E2B Template Management
```bash
# Build sandbox templates
pnpm template:build:nextjs
pnpm template:build:react-native-expo
pnpm template:build:expo

# Publish templates
pnpm template:publish:nextjs
```

## Database Schema

Key tables for AI coding app:
- `user` - User authentication data
- `project` - User projects
- `message` - Chat messages (USER/ASSISTANT roles)
- `fragment` - Code fragments with sandbox URLs
- `llm_key` - API keys for Claude/OpenAI

## Environment Setup

1. **Install dependencies**: `pnpm i`
2. **Configure environment**: Copy `.env.example` to `.env`
3. **Database**: `pnpm db:push`
4. **Development**: `pnpm dev`

## Key Technologies

- **Frontend**: Next.js 15, React 19, Tailwind CSS v4
- **Mobile**: React Native 0.72, Expo SDK 53
- **Backend**: tRPC v11, Drizzle ORM, Supabase PostgreSQL
- **AI**: Claude/OpenAI integration, E2B sandboxes
- **DevOps**: Turborepo, ESLint, Prettier, TypeScript

## Working with Packages

### Adding New UI Components
```bash
pnpm ui-add  # Interactive shadcn/ui CLI
```

### Adding New Packages
```bash
pnpm turbo gen init  # Generate new package
```

### Package-Specific Commands
```bash
# Work on specific package
pnpm -F @acme/api dev
pnpm -F @acme/db push
pnpm -F @acme/agents build
```

## Mobile Development

For mobile app development:
1. Ensure iOS Simulator or Android Emulator is set up
2. Run `pnpm -F @acme/mobile dev`
3. Use platform-specific commands: `pnpm -F @acme/mobile ios` or `android`

## Common Development Tasks

- **Database changes**: Modify schema in `packages/db/src/schema.ts` → `pnpm db:push`
- **API changes**: Add routes in `packages/api/src/router/` → auto-available via tRPC
- **UI components**: Use `pnpm ui-add` or create in `packages/ui/`
- **AI agents**: Update logic in `packages/agents/src/`
- **E2B templates**: Modify in `sandbox-templates/` → rebuild and publish