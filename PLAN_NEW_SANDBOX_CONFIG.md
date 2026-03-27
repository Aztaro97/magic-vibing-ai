Plan: Consolidate E2B Utilities into Sandboxes + Project Lifecycle

     Context

     The packages/e2b/ (legacy) has rich sandbox lifecycle utilities — create/resume/connect, ngrok env injection, subdomain management, tiered timeouts, file sync, and project DB
     persistence — that are missing from packages/sandboxes/. The current deep-agents flow writes sandbox IDs only to agentSession, ignoring the project table's sandboxId, sandboxStatus,
     subdomain, and ngrokUrl fields. This plan consolidates the legacy utilities into sandboxes, adds project-level lifecycle management, and wires the agent router to update project
     state.

     ---
     Phase 1: New Utility Modules in packages/sandboxes/src/

     1.1 src/constants/timeouts.ts (new file)

     - Port CONTAINER_TIMEOUTS from packages/e2b/src/constants/index.ts
     - Port getTimeoutForUserTier(tier: "FREE" | "PAID"): number

     1.2 src/constants/sandbox-env.ts (new file)

     - Port Expo/ngrok env var builder from packages/e2b/src/config/index.ts
     - buildSandboxEnvVars(opts: { subdomain: string; provider: SandboxProvider; extraEnv?: Record<string,string> }): Record<string,string>
     - E2B: injects EXPO_TUNNEL_SUBDOMAIN, PORT=8081, EXPO_WEB_PORT=8081, EXPO_NO_INTERACTIVE=1, NGROK_AUTHTOKEN
     - Daytona: injects base vars + any extraEnv (no Expo-specific vars unless hints indicate Expo project)

     1.3 src/utils/subdomain.ts (new file)

     - Port sanitizeSubdomain() and getExpoSubdomain() from packages/e2b/src/config/index.ts

     1.4 src/utils/error-detection.ts (new file)

     - Port isSandboxNotFoundError() from packages/e2b/src/utils/prepare-container.ts

     1.5 src/utils/file-sync.ts (new file)

     - Provider-agnostic syncFilesToSandbox(sandbox: BaseSandbox, files: Record<string,string>): Promise<void>
     - Uses sandbox.uploadFiles() (BaseSandbox method) instead of E2B-specific files.write()

     ---
     Phase 2: E2B Provider Enhancement

     2.1 Add connect() to E2BSandboxBackend (src/providers/e2b.ts)

     static async connect(sandboxId: string, opts?: { timeoutMs?: number; envVars?: Record<string,string> }): Promise<E2BSandboxBackend>
     - Uses Sandbox.connect(sandboxId, { apiKey }) from E2B SDK
     - Sets timeout if provided
     - Enables E2B reconnect/resume (the current code says "can't reconnect" but E2B SDK v2.14 supports Sandbox.connect(id))

     2.2 Update create() to accept and merge env vars

     - Accept envVars from buildSandboxEnvVars() merged with hints.envVars

     ---
     Phase 3: Project Lifecycle Manager

     3.1 src/lifecycle/project-sync.ts (new file)

     Thin DB adapter — reads/writes project sandbox state:
     getProjectSandboxState(projectId: string): Promise<{ sandboxId, sandboxStatus, subdomain, ngrokUrl, name }>
     updateProjectSandboxState(projectId: string, state: Partial<{sandboxId, sandboxStatus, subdomain, ngrokUrl}>): Promise<void>
     - Imports db, eq, project from @acme/db

     3.2 src/lifecycle/manager.ts (new file)

     SandboxLifecycleManager — the main orchestrator:

     resolve(options: LifecycleOptions): Promise<LifecycleResult | null>
     1. Load project state via getProjectSandboxState(projectId)
     2. If sandboxId exists AND sandboxStatus === "active" → try reconnect:
       - E2B: E2BSandboxBackend.connect(sandboxId, { timeoutMs, envVars })
       - Daytona: DaytonaSandboxBackend.reconnect(sandboxId)
       - On "not found" error: clear stale sandboxId from project, fall through to create
     3. If no existing sandbox → delegate to resolveSandbox() (existing router) for classification + provisioning
     4. After acquisition:
       - Compute subdomain via getExpoSubdomain(project.name)
       - Build env vars via buildSandboxEnvVars({ subdomain, provider })
       - For E2B: inject env vars into sandbox (run export commands or use at creation)
       - Update project: { sandboxId, sandboxStatus: "active", subdomain }
       - Compute ngrokUrl as https://${subdomain}.ngrok.app (when NGROK_AUTHTOKEN is set)
       - Update project: { ngrokUrl } if applicable
       - Call incrementActiveCount(orgId) for concurrency tracking

     pause(projectId, sandboxId, provider): Promise<void>
     - Update project: { sandboxStatus: "paused" }
     - For Daytona: call backend.stop()
     - For E2B: call keepAlive() to extend timeout
     - Call decrementActiveCount(orgId)

     destroy(projectId, sandboxId, provider): Promise<void>
     - Close/kill the sandbox
     - Update project: { sandboxId: null, sandboxStatus: "destroyed", ngrokUrl: null }
     - Call decrementActiveCount(orgId)

     3.3 Types (src/types.ts additions)

     export type UserTier = "FREE" | "PAID";

     export interface LifecycleOptions {
       projectId: string;
       sessionId: string;
       orgId?: string;
       provider?: SandboxProvider;
       hints?: TaskHints;
       userTier?: UserTier;
     }

     export interface LifecycleResult extends ResolvedSandbox {
       subdomain?: string;
       ngrokUrl?: string;
     }

     ---
     Phase 4: Router + Concurrency Fix

     4.1 Add resolveProjectSandbox() to src/router.ts

     New export that wraps SandboxLifecycleManager.resolve():
     export async function resolveProjectSandbox(options: LifecycleOptions): Promise<LifecycleResult | null>
     Keep existing resolveSandbox() unchanged for backward compat.

     4.2 Fix concurrency counter

     - In resolveSandbox() (existing): add incrementActiveCount(orgId) after successful provisioning
     - Export a releaseSandbox(orgId) helper that calls decrementActiveCount(orgId) — to be called by the agent router in finally

     ---
     Phase 5: Agent Router Integration

     5.1 Update packages/api/src/router/agent.ts

     - Import resolveProjectSandbox instead of resolveSandbox
     - Import releaseSandbox for cleanup
     - Replace the resolveSandbox() call with resolveProjectSandbox():
     const sandbox = await resolveProjectSandbox({
       projectId, sessionId,
       orgId: ctx.session.user.id,  // or org if available
       hints: { description: userMessage, provider: sandboxProvider },
       userTier: "FREE",  // TODO: derive from subscription
     });
     - Project table is updated inside the lifecycle manager — no extra DB writes needed
     - In finally block:
       - If !streamResult.interrupted && sandbox: call lifecycleManager.destroy()
       - If streamResult.interrupted && sandbox: call lifecycleManager.pause()
       - Always: call releaseSandbox(orgId)

     ---
     Phase 6: Exports & Package Config

     6.1 packages/sandboxes/package.json

     Add dependency: "@acme/db": "workspace:*"
     Add exports:
     "./lifecycle": "./src/lifecycle/manager.ts",
     "./constants": "./src/constants/timeouts.ts"

     6.2 packages/sandboxes/env.ts

     Add: NGROK_AUTHTOKEN: z.string().min(1).optional()

     6.3 packages/sandboxes/src/index.ts

     Add re-exports:
     export { SandboxLifecycleManager, resolveProjectSandbox } from "./lifecycle/manager";
     export { syncFilesToSandbox } from "./utils/file-sync";
     export { getExpoSubdomain } from "./utils/subdomain";
     export { CONTAINER_TIMEOUTS, getTimeoutForUserTier } from "./constants/timeouts";
     export { buildSandboxEnvVars } from "./constants/sandbox-env";
     export { isSandboxNotFoundError } from "./utils/error-detection";
     export type { LifecycleOptions, LifecycleResult, UserTier } from "./types";

     ---
     Files to Create (7 new)

     1. packages/sandboxes/src/constants/timeouts.ts
     2. packages/sandboxes/src/constants/sandbox-env.ts
     3. packages/sandboxes/src/utils/subdomain.ts
     4. packages/sandboxes/src/utils/error-detection.ts
     5. packages/sandboxes/src/utils/file-sync.ts
     6. packages/sandboxes/src/lifecycle/project-sync.ts
     7. packages/sandboxes/src/lifecycle/manager.ts

     Files to Modify (5)

     1. packages/sandboxes/src/providers/e2b.ts — add connect() static method, merge env vars in create()
     2. packages/sandboxes/src/router.ts — add resolveProjectSandbox(), fix concurrency counter
     3. packages/sandboxes/src/types.ts — add LifecycleResult, LifecycleOptions, UserTier
     4. packages/sandboxes/src/index.ts — add new re-exports
     5. packages/sandboxes/package.json — add @acme/db dep, new export paths
     6. packages/sandboxes/env.ts — add NGROK_AUTHTOKEN
     7. packages/api/src/router/agent.ts — switch to resolveProjectSandbox(), lifecycle cleanup

     Key Reuse Points

     - sanitizeSubdomain / getExpoSubdomain from packages/e2b/src/config/index.ts
     - CONTAINER_TIMEOUTS / getTimeoutForUserTier from packages/e2b/src/constants/index.ts
     - isSandboxNotFoundError from packages/e2b/src/utils/prepare-container.ts
     - syncFilesToContainer logic from packages/e2b/src/utils/prepare-container.ts
     - Expo env var pattern from packages/e2b/src/config/index.ts
     - Project lifecycle pattern from packages/e2b/src/utils/prepare-container.ts

     ---
     Verification

     1. TypeScript: pnpm typecheck passes for @acme/sandboxes, @acme/api, @acme/deep-agents
     2. Lint: pnpm lint passes
     3. Unit test: Existing classifier.test.ts still passes
     4. Integration:
       - Start dev: pnpm dev:next
       - Trigger agent run → verify sandbox creates, project table updated with sandboxId, sandboxStatus: "active", subdomain, ngrokUrl
       - On completion → verify project sandboxStatus: "destroyed", sandboxId: null
       - On HITL pause → verify project sandboxStatus: "paused", sandbox still alive
       - Resume HITL → verify reconnect works, project sandboxStatus: "active"
     5. DB Studio: pnpm db:studio → inspect project table for sandbox fields
