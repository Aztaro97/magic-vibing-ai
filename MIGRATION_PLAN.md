You are a senior AI systems architect working inside a Turborepo monorepo called `vibe-coding-app`.
Your mission is to plan and execute a full migration from **Inngest** (packages/jobs) to
**LangGraph with a code interpreter** for all background job orchestration and AI agent workflows.

## REPO CONTEXT

- Monorepo: pnpm workspaces + Turborepo
- Apps: Next.js 15 admin (apps/admin), React Native Expo 53 (apps/mobile)
- Stack: tRPC v11, Drizzle ORM, PostgreSQL (Supabase), Better Auth
- AI: Custom agents package (packages/agents) with Claude/OpenAI + E2B sandboxes
- Current jobs: packages/jobs (Inngest)
- Target: LangGraph with code interpreter replacing Inngest workflows

## SKILLS TO LOAD BEFORE STARTING

Before writing any code, read these skill files in order:

1. Read `./.agents/skills/langgraph/SKILL.md` — LangGraph architecture patterns
2. Read `./.agents/skills/inngest/SKILL.md` — understand what we're migrating FROM
3. Read `./.agents/skills/multi-agent-patterns/SKILL.md` — agent orchestration design
4. Read `./.agents/skills/agent-orchestration-improve-agent/SKILL.md` — agent improvement patterns
5. Read `./.agents/skills/typescript-expert/SKILL.md` — TypeScript best practices
6. Read `./.agents/skills/monorepo-architect/SKILL.md` — monorepo structure decisions
7. Read `./.agents/skills/drizzle-orm-expert/SKILL.md` — DB schema changes
8. Read `./.agents/skills/nextjs-app-router-patterns/SKILL.md` — API route integration
9. Read `./.agents/skills/e2e-testing/SKILL.md` — testing the migration
10. Read `./.agents/skills/code-refactoring-refactor-clean/SKILL.md` — clean refactor approach

## PHASE 1 — AUDIT (Do this first, produce a written plan)

1. **Inventory all Inngest functions** in `packages/jobs/src/`:

   - List every function name, trigger type (event/scheduled/webhook), and what it does
   - Map each to the DB tables it reads/writes (`packages/db/src/schema.ts`)
   - Identify which functions call the AI agents package
   - Note any E2B sandbox calls

2. **Audit `packages/agents/src/`**:

   - List all existing agent definitions
   - Identify Claude vs OpenAI usage
   - Identify which agents produce/consume code fragments

3. **Map the data flow**:

   - tRPC router → Inngest trigger → Agent → E2B → DB fragment
   - Document this as a Mermaid diagram

4. Output the full audit as `MIGRATION_PLAN.md` in the repo root before writing any code.

## PHASE 2 — ARCHITECTURE DESIGN

Design the LangGraph replacement with these constraints:

- **LangGraph StateGraph** must replace each Inngest function as a named graph
- **Code Interpreter node** must wrap all E2B sandbox calls — treat E2B as the
  execution backend, LangGraph as the orchestration layer
- Each graph must be a self-contained module in `packages/agents/src/graphs/`
- State schema must be defined with Zod and shared via `packages/validators/`
- Persistence/checkpointing must use the existing Drizzle/PostgreSQL setup
  (add a `langgraph_checkpoints` table if needed)
- tRPC routes in `packages/api/` must be updated to invoke graphs instead of
  dispatching Inngest events
- Streaming graph output to the Next.js admin UI via tRPC subscriptions

Architecture decisions to document:

- Human-in-the-loop pause/resume pattern (replaces Inngest's sleep/waitForEvent)
- Error retry strategy (replaces Inngest's built-in retries)
- Scheduled jobs replacement (LangGraph + cron trigger via Next.js route handler)
- Multi-agent subgraph pattern for complex coding tasks

## PHASE 3 — EXECUTION ORDER

Migrate in this sequence (safest to most complex):

1. **Setup**: Add LangGraph deps to `packages/agents`, create `src/graphs/` directory,
   add Zod state schemas to `packages/validators/`
2. **DB**: Add checkpoint/execution tables via Drizzle schema + `pnpm db:push`
3. **Migrate simplest Inngest function first** (pick a scheduled or single-step job)
4. **Wire tRPC**: Update one API route to call the new graph, keep Inngest fallback
5. **Code Interpreter graph**: Build the main coding agent graph with E2B integration
6. **Streaming**: Connect graph execution to tRPC subscriptions for real-time UI updates
7. **Remove Inngest**: Only after all graphs are tested and verified
8. **Cleanup**: Remove `packages/jobs`, update Turborepo pipeline in `turbo.json`

## PHASE 4 — TESTING

For each migrated graph:

- Unit test each LangGraph node in isolation
- Integration test the full graph with mock E2B responses
- E2E test the tRPC → graph → DB → UI flow
- Verify mobile app (React Native) receives correct streaming updates

## CONSTRAINTS & RULES

- Never delete Inngest code until the LangGraph replacement is fully tested
- All new code must be TypeScript with strict mode
- Use pnpm workspaces — never install packages at root unless they're dev tooling
- Run `pnpm typecheck` and `pnpm lint` after every phase
- Commit after each phase with a descriptive message
- If a decision requires clarification, write it to `MIGRATION_QUESTIONS.md`
  and continue with the safest assumption

## START COMMAND

Begin by running:
