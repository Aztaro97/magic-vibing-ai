import { inngestClient } from "@acme/jobs";
import { helloWordFn } from "@acme/jobs/functions";
import { serve } from "inngest/next";

export const runtime = "nodejs";

export const { GET, POST, PUT } = serve({
	client: inngestClient,
	functions: [helloWordFn],
});