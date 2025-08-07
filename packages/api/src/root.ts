import { authRouter } from "./router/auth";
import { messageRouter } from "./router/message";
import { projectRouter } from "./router/projects";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  message: messageRouter,
  projects: projectRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
