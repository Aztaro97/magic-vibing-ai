// // packages/agents/src/auth.ts
// //
// // LangGraph custom authentication handler.
// // Referenced by langgraph.json: { "auth": { "path": "./src/auth.ts:auth" } }
// //
// // Every request to the LangGraph API server passes through this handler.
// // It validates the short-lived JWT minted by the Next.js /api/agent/token route,
// // and returns the user identity + context that gets injected into
// // config.configurable.langgraph_auth_user inside every graph node.
// //
// // Docs: https://docs.langchain.com/langsmith/custom-auth

// import { Auth } from "@langchain/langgraph-sdk/auth";
// import * as jose from "jose";

// // ─────────────────────────────────────────────────────────────────────────────
// // Auth instance — LangGraph reads this export from langgraph.json
// // ─────────────────────────────────────────────────────────────────────────────

// export const auth = new Auth();

// // ─────────────────────────────────────────────────────────────────────────────
// // JWT verification
// // ─────────────────────────────────────────────────────────────────────────────

// const JWT_SECRET = new TextEncoder().encode(
// 	process.env.AUTH_SECRET ?? "missing-auth-secret"
// );

// /**
//  * Payload shape minted by apps/admin/src/app/api/agent/token/route.ts.
//  * Must stay in sync with the minting side.
//  */
// interface AgentTokenPayload extends jose.JWTPayload {
// 	sub: string;   // Better Auth user ID
// 	email: string;
// 	orgId?: string;   // organisation the user belongs to (optional)
// 	projectId: string;   // project ID from the agent run request
// 	sessionId: string;   // agent session ID
// }

// async function verifyToken(raw: string): Promise<AgentTokenPayload> {
// 	const { payload } = await jose.jwtVerify(raw, JWT_SECRET, {
// 		issuer: "magic-vibing-ai",
// 		audience: "langgraph-agent-server",
// 	});
// 	return payload as AgentTokenPayload;
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // @auth.authenticate — called on every request to the LangGraph server
// //
// // The handler must:
// //   1. Extract the token from the Authorization header
// //   2. Validate it
// //   3. Return an object with at minimum { identity: string }
// //      Any additional fields are forwarded into config.configurable.langgraph_auth_user
// // ─────────────────────────────────────────────────────────────────────────────

// auth.authenticate(async (request: Request) => {
// 	const authHeader = request.headers.get("authorization") ?? "";
// 	const [scheme, token] = authHeader.split(" ");

// 	if (!token || scheme?.toLowerCase() !== "bearer") {
// 		throw auth.HTTPException(401, "Missing or malformed Authorization header");
// 	}

// 	let payload: AgentTokenPayload;
// 	try {
// 		payload = await verifyToken(token);
// 	} catch {
// 		throw auth.HTTPException(401, "Invalid or expired agent token");
// 	}

// 	// Return value is injected into config.configurable.langgraph_auth_user
// 	// inside every graph node. Add any per-user context needed by the graph here.
// 	return {
// 		identity: payload.sub,      // required — used by LangGraph for resource scoping
// 		email: payload.email,
// 		orgId: payload.orgId,
// 		projectId: payload.projectId,
// 		sessionId: payload.sessionId,
// 	};
// });

// // ─────────────────────────────────────────────────────────────────────────────
// // @auth.on — restrict resource access by owner
// //
// // Prevents users from reading threads / runs that belong to other users.
// // The filter is applied to all LangGraph API list and get operations.
// // ─────────────────────────────────────────────────────────────────────────────

// auth.on("*", async ({ user, value }: { user: Record<string, unknown>; value: Record<string, unknown> }) => {
// 	// Studio users bypass this filter during development so LangSmith Studio
// 	// can connect without needing a real token.
// 	if (user?.is_studio_user) return {};

// 	const owner = user.identity as string;
// 	const metadata = (value.metadata ?? {}) as Record<string, unknown>;
// 	metadata.owner = owner;
// 	value.metadata = metadata;

// 	return { owner };
// });