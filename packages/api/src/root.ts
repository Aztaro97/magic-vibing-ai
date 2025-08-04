import { authRouter } from "./router/auth";
import { messageRouter } from "./router/message";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  message: messageRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
