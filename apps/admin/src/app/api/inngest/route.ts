import { serve } from "inngest/next";

import { inngestClient } from "@acme/jobs";
import { codeAgentFn, helloWordFn } from "@acme/jobs/functions";
import { env } from "~/env";

export const runtime = "nodejs";

export const { GET, POST, PUT } = serve({
	client: inngestClient,
	functions: [helloWordFn, codeAgentFn],
	signingKey: env.INNGEST_SIGNING_KEY,
});
