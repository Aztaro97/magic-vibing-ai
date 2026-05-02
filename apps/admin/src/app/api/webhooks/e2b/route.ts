import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { handleE2bWebhook } from "@acme/webhooks/e2b";
import { env } from "@acme/webhooks/env";

export async function POST(request: NextRequest) {
	const rawBody = await request.text();
	const signature = request.headers.get("e2b-signature");

	const result = await handleE2bWebhook(rawBody, signature, env.E2B_WEBHOOK_SECRET);

	if (!result.success) {
		return NextResponse.json(
			{ error: result.error },
			{ status: result.error === "Invalid webhook signature" ? 401 : 400 },
		);
	}

	return NextResponse.json({ received: true, eventId: result.eventId }, { status: 200 });
}
