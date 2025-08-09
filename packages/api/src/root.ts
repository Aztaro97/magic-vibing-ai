import { authRouter } from "./router/auth";
import { llmRouter } from "./router/llms";
import { messageRouter } from "./router/message";
import { projectRouter } from "./router/projects";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
	auth: authRouter,
	messages: messageRouter,
	projects: projectRouter,
	llms: llmRouter
});

// export type definition of API
export type AppRouter = typeof appRouter;
