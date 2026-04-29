import { auth } from "@acme/auth";
import { and, db, eq, project } from "@acme/db";
import { E2BSandboxBackend } from "@acme/sandboxes";
import { setupNgrokWithFallback } from "@acme/sandboxes/utils/ngrok";
import {
	getProjectSandboxState,
	updateProjectSandboxState,
} from "@acme/sandboxes/lifecycle";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const PostSchema = z.object({
	projectId: z.string().uuid(),
});

/**
 * POST /api/sandbox/ngrok
 *
 * (Re)starts the ngrok tunnel for a project's E2B sandbox.
 * Tries the deterministic custom domain first ({projectId}.ngrok.dev),
 * then falls back to a random ngrok preview URL if that fails.
 *
 * Returns: { ngrokUrl: string | null }
 */
export async function POST(req: NextRequest) {
	const session = await auth.api.getSession({ headers: req.headers });
	if (!session?.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	let body: z.infer<typeof PostSchema>;
	try {
		body = PostSchema.parse(await req.json());
	} catch (err) {
		return NextResponse.json(
			{ error: "Invalid body", details: String(err) },
			{ status: 400 },
		);
	}

	const { projectId } = body;
	const ngrokAuthToken = process.env.NGROK_AUTHTOKEN;
	if (!ngrokAuthToken) {
		return NextResponse.json(
			{ error: "NGROK_AUTHTOKEN is not configured on the server" },
			{ status: 503 },
		);
	}

	// Verify the project belongs to the current user and get its sandbox ID
	const [row] = await db
		.select({ sandboxId: project.sandboxId, sandboxProvider: project.sandboxProvider })
		.from(project)
		.where(and(eq(project.id, projectId), eq(project.userId, session.user.id)))
		.limit(1);

	if (!row) {
		return NextResponse.json({ error: "Project not found" }, { status: 404 });
	}

	if (!row.sandboxId) {
		return NextResponse.json(
			{ error: "Project has no active sandbox — start the agent first" },
			{ status: 409 },
		);
	}

	if (row.sandboxProvider !== "e2b") {
		return NextResponse.json(
			{ error: "ngrok tunnels are only supported for E2B sandboxes" },
			{ status: 422 },
		);
	}

	// Connect to the running E2B sandbox
	let sandbox: E2BSandboxBackend;
	try {
		sandbox = await E2BSandboxBackend.connect(row.sandboxId);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return NextResponse.json(
			{ error: `Sandbox not available: ${msg}` },
			{ status: 503 },
		);
	}

	const ngrokDomain = `${projectId}.ngrok.dev`;
	const tag = `[ngrok-api:${projectId.slice(0, 8)}]`;

	// Start/restart the tunnel — tries custom domain, falls back to random URL
	const ngrokUrl = await setupNgrokWithFallback(sandbox, {
		authtoken: ngrokAuthToken,
		domain: ngrokDomain,
		port: 8081,
		tag,
	});

	// Persist the URL (or null on total failure) to the project row
	await updateProjectSandboxState(projectId, { ngrokUrl });

	return NextResponse.json({ ngrokUrl });
}

/**
 * GET /api/sandbox/ngrok?projectId={id}
 *
 * Returns the current persisted ngrok URL for a project without starting anything.
 */
export async function GET(req: NextRequest) {
	const session = await auth.api.getSession({ headers: req.headers });
	if (!session?.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const projectId = req.nextUrl.searchParams.get("projectId");
	if (!projectId) {
		return NextResponse.json({ error: "projectId query param required" }, { status: 400 });
	}

	const [row] = await db
		.select({ ngrokUrl: project.ngrokUrl, sandboxStatus: project.sandboxStatus })
		.from(project)
		.where(and(eq(project.id, projectId), eq(project.userId, session.user.id)))
		.limit(1);

	if (!row) {
		return NextResponse.json({ error: "Project not found" }, { status: 404 });
	}

	return NextResponse.json({
		ngrokUrl: row.ngrokUrl,
		sandboxStatus: row.sandboxStatus,
	});
}
