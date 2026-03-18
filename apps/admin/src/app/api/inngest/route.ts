import { serve } from "inngest/next";

import { inngestClient } from "@acme/jobs";
import {
	cleanupSessionSandbox,
	nightlySandboxSweep,
	purgeOrgSandboxes
} from "@acme/jobs/functions";
import { env } from "~/env";

export const runtime = "nodejs";

export const { GET, POST, PUT } = serve({
	client: inngestClient,
	functions: [
		cleanupSessionSandbox,
		nightlySandboxSweep,
		purgeOrgSandboxes
	],
	signingKey: env.INNGEST_SIGNING_KEY,
});