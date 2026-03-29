# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

Turborepo monorepo (pnpm workspaces) with a Next.js 15 admin dashboard and React Native Expo 53 mobile app. Built on the T3 stack with LangGraph-based AI agent orchestration, dual sandbox execution (E2B + Daytona), and real-time streaming via Pusher.

### Package Structure
```
apps/
  admin/              # Next.js 15 (App Router) admin dashboard
  mobile/             # React Native Expo 53 (Expo Router, i18n: en/ar)
packages/
  deep-agents/        # LangGraph supervisor + 5 sub-agents (replaces old agents/)
  sandboxes/          # Dual sandbox router: E2B (fast) + Daytona (stateful)
  pusher/             # Real-time streaming (server + client)
  error-handler/      # Centralized error handling with Pusher notifications
  api/                # tRPC v11 routers (agent, auth, llms, message, projects)
  auth/               # Better Auth v1.1.15-beta.7 with OAuth
  db/                 # Drizzle ORM + PostgreSQL schema
  e2b/                # E2B sandbox integration (legacy, see sandboxes/)
  jobs/               # Background job processing (Inngest)
  ui/                 # Shared shadcn/ui + Tailwind CSS v4 components
  validators/         # Zod validation schemas (includes agent-states)
tooling/              # Shared ESLint, Prettier, Tailwind, TypeScript configs
```

### Data Flow
1. Admin UI sends requests via tRPC (`packages/api/src/router/agent.ts`)
2. Agent router invokes `createMagicVibingAgent()` from `@acme/deep-agents`
3. Supervisor dispatches to sub-agents (code, debug, doc, review, test)
4. Sub-agents execute code in sandboxes via `@acme/sandboxes` router
5. Streaming responses flow back through Pusher (`@acme/pusher`) to the UI
6. Agent events/todos persist to DB via `agentSession`, `agentEvent`, `agentTodo` tables

## Essential Commands

```bash
# Development
pnpm dev                              # All apps (turbo watch)
pnpm dev:next                         # Next.js admin only
pnpm -F @acme/deep-agents dev         # LangGraph dev server on port 2024
pnpm -F @acme/mobile dev              # Mobile app

# Database (Drizzle ORM)
pnpm db:push                          # Push schema to PostgreSQL
pnpm db:generate                      # Generate migrations
pnpm db:studio                        # Open Drizzle Studio

# Quality
pnpm lint                             # ESLint all packages
pnpm lint:fix                         # Auto-fix lint issues
pnpm format                           # Prettier check
pnpm format:fix                       # Prettier write
pnpm typecheck                        # TypeScript check all packages

# Build
pnpm build                            # Build all packages/apps

# Testing (mobile)
pnpm -F @acme/mobile test             # Unit tests
pnpm -F @acme/mobile e2e-test         # E2E with Playwright
pnpm -F @acme/mobile test -- --testNamePattern="Login"  # Single test

# UI components
pnpm ui-add                           # Add shadcn/ui component

# E2B sandbox templates
pnpm template:build:nextjs            # Build Next.js sandbox template
pnpm template:build:expo              # Build Expo sandbox template
```

## Deep Agents System (`packages/deep-agents/`)

LangGraph-based supervisor architecture with 5 specialized sub-agents:

| Sub-agent | Purpose |
|-----------|---------|
| `codeAgent` | Code generation and modification |
| `debugAgent` | Debugging and error analysis |
| `docAgent` | Documentation generation |
| `reviewAgent` | Code review and analysis |
| `testAgent` | Test generation and validation |

**Key exports** (from `@acme/deep-agents`):
- `createMagicVibingAgent()` - Creates the supervisor graph
- `transformAgentStream` - Transforms LangGraph stream for Pusher delivery
- Memory utilities: `getCheckpointer`, `getStore`, `buildThreadId`, `buildStoreNamespace`
- Sub-exports: `/supervisor`, `/subagents`, `/middleware`, `/memory`, `/prompts`, `/constants`, `/types`

**LLM providers**: Anthropic (default: `claude-opus-4-0`), OpenAI, Gemini, Ollama (local)

**LangGraph config** (`langgraph.json` at root): Maps `deep-agents` graph to `./packages/deep-agents/src/index.ts:graph`

## Sandbox System (`packages/sandboxes/`)

Dual provider router that classifies tasks by complexity:
- **E2B** (primary): Fast, stateless code execution via `@e2b/code-interpreter`
- **Daytona** (secondary): Git operations, Docker builds, long-running sessions via `@daytonaio/sdk`

Sub-exports: `/e2b`, `/daytona`, `/router`, `/pool`, `/labels`, `/types`

## Database Schema

Schema files split across `packages/db/src/`:
- `schema.ts` - User, session, account, verification, organization, member, invitation, subscription, jwks
- `agents.ts` - agentSession, agentEvent, agentTodo (with relations)
- `message.ts` - Messages with role enum (USER/ASSISTANT) and type enum
- `project.ts` - User projects
- `fragment.ts` - Code fragments with sandbox URLs
- `llm-key.ts` - User API keys for LLM providers

## Admin App API Routes (`apps/admin/src/app/api/`)

- `agent/` - Agent execution endpoints
- `langgraph/` - LangGraph integration
- `pusher/` - Real-time event auth/streaming
- `auth/` - Better Auth endpoints
- `inngest/` - Background job webhooks
- `trpc/` - tRPC handler

## Environment Variables

Required (see `turbo.json` globalEnv):
- `POSTGRES_URL` - Supabase PostgreSQL
- `AUTH_SECRET` - Auth session signing
- `E2B_API_KEY`, `DAYTONA_API_KEY` - Sandbox providers
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` - LLM providers
- `LANGCHAIN_API_KEY` - LangSmith tracing
- Pusher: `PUSHER_APP_ID`, `PUSHER_SECRET`, `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`

## Requirements

- Node >= 22.14.0
- pnpm >= 9.6.0 (packageManager: pnpm@10.6.3)

## gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

Available skills: `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/retro`, `/investigate`, `/document-release`, `/codex`, `/cso`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`.

If gstack skills aren't working, run `cd .claude/skills/gstack && ./setup` to build the binary and register skills.
