import { Inngest } from "inngest";

import { env } from "../env";

export const inngestClient = new Inngest({
  id: "vibe-coding-app",
  eventKey: env.INNGEST_EVENT_KEY,
});
