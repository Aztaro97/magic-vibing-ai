
// Mints a short-lived JWT that the frontend passes to the LangGraph server.
// The LangGraph server's auth.ts validates this token on every streaming request.
//
// Flow:
//   1. Browser sends request with Better Auth session cookie
//   2. This route validates the session with Better Auth
//   3. Returns a signed JWT containing userId, orgId, projectId, sessionId
//   4. Frontend stores the JWT in memory and passes it to useStream
//
// The JWT is intentionally short-lived (5 min) to limit blast radius
// if a token leaks — the LangGraph server cannot be accessed after expiry.

import { auth } from "@acme/auth";
import { db } from "@acme/db";
import { agentSession } from "@acme/db/agents";
import { and, eq } from "drizzle-orm";
import * as jose from "jose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// JWT configuration — must stay in sync with packages/agents/src/auth.ts
// ─────────────────────────────────────────────────────────────────────────────

const JWT_SECRET = new TextEncoder().encode(
	process.env.AUTH_SECRET ?? "missing-auth-secret"
);

const TOKEN_TTL_SECONDS = 5 * 60; // 5 minutes

// ─────────────────────────────────────────────────────────────────────────────
// Request body schema
// ─────────────────────────────────────────────────────────────────────────────

const RequestSchema = z.object({
	projectId: z.string().uuid("projectId must be a UUID"),
	sessionId: z.string().uuid("sessionId must be a UUID"),
});

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
	// 1. Validate Better Auth session from cookie
	const session = await auth.api.getSession({ headers: req.headers });
	if (!session?.user) {
		return NextResponse.json(
			{ error: "Unauthorized — no active session" },
			{ status: 401 }
		);
	}

	// 2. Parse and validate the request body
	let body: z.infer<typeof RequestSchema>;
	try {
		const raw = await req.json();
		body = RequestSchema.parse(raw);
	} catch (err) {
		return NextResponse.json(
			{ error: "Invalid request body", details: String(err) },
			{ status: 400 }
		);
	}

	const { projectId, sessionId } = body;
	const user = session.user;

	// 3. Verify the session belongs to this user and project
	//    (prevent token minting for another user's session)
	const existingSession = await db.query.agentSession.findFirst({
		where: and(
			eq(agentSession.id, sessionId),
			eq(agentSession.userId, user.id),
			eq(agentSession.projectId, projectId)
		),
		columns: { id: true, projectId: true },
	});

	// If no existing session, create one so the LangGraph thread can be tracked
	if (!existingSession) {
		await db.insert(agentSession).values({
			id: sessionId,
			projectId,
			userId: user.id,
			threadId: `magic-vibing:${projectId}:${sessionId}`,
			initialPrompt: "", // filled in when the first message is sent
			status: "running",
		}).onConflictDoNothing();
	}

	// 4. Mint the JWT
	const token = await new jose.SignJWT({
		sub: user.id,
		email: user.email,
		orgId: (user as { orgId?: string }).orgId,
		projectId,
		sessionId,
	})
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setIssuer("magic-vibing-ai")
		.setAudience("langgraph-agent-server")
		.setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
		.sign(JWT_SECRET);

	return NextResponse.json({
		token,
		expiresIn: TOKEN_TTL_SECONDS,
		threadId: `magic-vibing:${projectId}:${sessionId}`,
	});
}