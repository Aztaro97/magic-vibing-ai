import { agentRouter } from "./router/agent";
import { authRouter } from "./router/auth";
import { llmRouter } from "./router/llms";
import { messageRouter } from "./router/message";
import { projectRouter } from "./router/projects";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  messages: messageRouter,
  projects: projectRouter,
  llms: llmRouter,
  agent: agentRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
