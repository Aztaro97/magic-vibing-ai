
// //
// // CHANGED: Accepts two JWT types:
// //   1. User JWT (sub = userId)  — from /api/agent/token, used by useStream
// //   2. Service JWT (sub = "service") — from tRPC router, used only for thread creation
// //
// // Service tokens are 60s, minted by projects.create, only used to pre-create threads.

// import { Auth } from "@langchain/langgraph-sdk/auth";
// import * as jose from "jose";

// export const auth = new Auth();

// const JWT_SECRET = new TextEncoder().encode(
// 	process.env.AUTH_SECRET ?? "missing-auth-secret"
// );

// interface UserPayload extends jose.JWTPayload {
// 	sub: string;
// 	email: string;
// 	orgId?: string;
// 	projectId: string;
// 	sessionId: string;
// }

// interface ServicePayload extends jose.JWTPayload {
// 	sub: "service";
// 	projectId: string;
// 	userId: string;
// }

// type TokenPayload = UserPayload | ServicePayload;

// async function verifyToken(raw: string): Promise<TokenPayload> {
// 	const { payload } = await jose.jwtVerify(raw, JWT_SECRET, {
// 		issuer: "magic-vibing-ai",
// 		audience: "langgraph-agent-server",
// 	});
// 	return payload as TokenPayload;
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // @auth.authenticate
// // ─────────────────────────────────────────────────────────────────────────────

// auth.authenticate(async (request: Request) => {
// 	const authHeader = request.headers.get("authorization") ?? "";
// 	const [scheme, token] = authHeader.split(" ");

// 	if (!token || scheme?.toLowerCase() !== "bearer") {
// 		throw auth.HTTPException(401, "Missing or malformed Authorization header");
// 	}

// 	let payload: TokenPayload;
// 	try {
// 		payload = await verifyToken(token);
// 	} catch {
// 		throw auth.HTTPException(401, "Invalid or expired token");
// 	}

// 	// Service-to-service token (from tRPC router, 60s TTL)
// 	if (payload.sub === "service") {
// 		const svc = payload as ServicePayload;
// 		return {
// 			identity: svc.userId,    // owner = real userId so auth.on filter works
// 			projectId: svc.projectId,
// 			isService: true,
// 		};
// 	}

// 	// Regular user token
// 	const user = payload as UserPayload;
// 	return {
// 		identity: user.sub,
// 		email: user.email,
// 		orgId: user.orgId,
// 		projectId: user.projectId,
// 		sessionId: user.sessionId,
// 	};
// });

// // ─────────────────────────────────────────────────────────────────────────────
// // @auth.on — restrict thread/run reads to the owning user
// // ─────────────────────────────────────────────────────────────────────────────

// auth.on("*", async ({
// 	user,
// 	value,
// }: {
// 	user: Record<string, unknown>;
// 	value: Record<string, unknown>;
// }) => {
// 	// LangSmith Studio users bypass the filter during development
// 	if (user?.is_studio_user) return {};

// 	const owner = user.identity as string;
// 	const metadata = (value.metadata ?? {}) as Record<string, unknown>;
// 	metadata.owner = owner;
// 	value.metadata = metadata;

// 	return { owner };
// });