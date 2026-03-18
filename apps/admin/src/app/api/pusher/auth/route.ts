import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "@acme/auth";
import { and, db, eq, project } from "@acme/db";
import { getPusherServer } from "@acme/pusher/server";

export async function POST(req: NextRequest) {
  try {
    // Get session
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const formData = await req.formData();
    const socketId = formData.get("socket_id") as string;
    const channelName = formData.get("channel_name") as string;

    if (!socketId || !channelName) {
      return NextResponse.json(
        { error: "Missing socket_id or channel_name" },
        { status: 400 },
      );
    }

    // Validate channel access
    // Channel format: private-project-{projectId}
    if (channelName.startsWith("private-project-")) {
      const projectId = channelName.replace("private-project-", "");

      // Verify user owns this project
      const userProject = await db
        .select()
        .from(project)
        .where(
          and(eq(project.id, projectId), eq(project.userId, session.user.id)),
        )
        .limit(1);

      if (userProject.length === 0) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Authorize the channel
    const pusher = getPusherServer();
    const authResponse = pusher.authorizeChannel(socketId, channelName);

    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("Pusher auth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
