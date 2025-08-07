import { serve } from "inngest/next";

import { inngestClient } from "@acme/jobs";
import { codeAgentFn, helloWordFn } from "@acme/jobs/functions";

export const runtime = "nodejs";

export const { GET, POST, PUT } = serve({
	client: inngestClient,
	functions: [helloWordFn, codeAgentFn],
});
