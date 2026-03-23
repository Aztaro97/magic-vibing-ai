import { auth } from "@acme/auth";
import { Client } from "@langchain/langgraph-sdk";
import * as jose from "jose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const JWT_SECRET = new TextEncoder().encode(
	process.env.AUTH_SECRET ?? "missing-auth-secret"
);
const TOKEN_TTL_SECONDS = 5 * 60;
const LANGGRAPH_SERVER_URL =
	process.env.LANGGRAPH_SERVER_URL ?? "http://localhost:2024";

const RequestSchema = z.object({
	projectId: z.string().uuid(),
	sessionId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
	const session = await auth.api.getSession({ headers: req.headers });
	if (!session?.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: z.infer<typeof RequestSchema>;
	try {
		body = RequestSchema.parse(await req.json());
	} catch (err) {
		return NextResponse.json({ error: "Invalid body", details: String(err) }, { status: 400 });
	}

	const { projectId, sessionId } = body;
	const user = session.user;

	// Mint JWT
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

	// Safety-net thread creation — idempotent
	try {
		const lgClient = new Client({
			apiUrl: LANGGRAPH_SERVER_URL,
			defaultHeaders: { Authorization: `Bearer ${token}` },
		});
		await lgClient.threads.create({
			threadId: projectId,
			metadata: {
				projectId,
				owner: user.id,
				userId: user.id,
			},
		});
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		if (!msg.includes("already exists") && !msg.includes("409")) {
			console.warn("[agent/token] Safety-net thread create failed:", msg);
		}
		// Always continue — thread likely already exists from projects.create
	}

	return NextResponse.json({
		token,
		expiresIn: TOKEN_TTL_SECONDS,
		threadId: projectId, // always = projectId
	});
}