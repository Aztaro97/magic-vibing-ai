import { getSandbox } from "@acme/agents/utils";
import type { Message } from "@inngest/agent-kit";
import { createState } from "@inngest/agent-kit";
import { inngestClient } from "../client";

import {
  buildCodeAgent,
  buildCodingAgentNetwork,
  getDynamicModel,
} from "@acme/agents";
import { db, desc, eq, fragment, message, project } from "@acme/db";
import { prepareContainerForProject } from "@acme/e2b";
import {
  classifyError,
  ErrorTracker,
  sendCustomErrorNotification,
} from "@acme/error-handler/server";
import {
  triggerAgentStatus,
  triggerStreamEnd,
  triggerStreamError,
  triggerStreamStart,
} from "@acme/pusher";

interface AgentState {
  summary: string;
  files: Record<string, string>;
  sandboxId?: string;
  projectId?: string;
}

/**
 * Helper: notify the client of an error and persist it to the DB message.
 * Swallows internal details — only the user-friendly message is sent to the UI.
 */
async function handleStepError(
  error: unknown,
  opts: {
    projectId: string;
    messageId: string;
    operation: string;
    sandboxId?: string;
  },
): Promise<string> {
  const classified = classifyError(error);

  // Log full details server-side
  console.error(`[code-agent] ${opts.operation} failed:`, error);

  // Track for analytics
  ErrorTracker.trackError({
    operation: opts.operation,
    projectId: opts.projectId,
    sandboxId: opts.sandboxId,
    timestamp: new Date().toISOString(),
    errorMessage: classified.message,
    errorStack: error instanceof Error ? error.stack : undefined,
    errorType: classified.code,
  });

  // Notify client via Pusher (real-time toast)
  await sendCustomErrorNotification(
    opts.projectId,
    classified.userMessage,
    "runtime-error",
    "terminal",
  );

  // Update the DB message to ERROR
  await db
    .update(message)
    .set({
      content: classified.userMessage,
      type: "ERROR",
    })
    .where(eq(message.id, opts.messageId));

  // Notify client via stream error
  await triggerStreamError(opts.projectId, {
    messageId: opts.messageId,
    error: classified.userMessage,
    timestamp: Date.now(),
  });

  // Notify status: error
  await triggerAgentStatus(opts.projectId, {
    projectId: opts.projectId,
    status: "error",
    message: classified.userMessage,
    timestamp: Date.now(),
  });

  return classified.userMessage;
}

export const codeAgentFn = inngestClient.createFunction(
  {
    id: "code-agent",
    retries: 1,
  },
  { event: "code-agent/run" },
  async ({ event, step }) => {
    const projectId = event.data.projectId;

    // ── Step 1: Create pending assistant message ──────────────────
    const pendingMessage = await step.run(
      "create-pending-message",
      async () => {
        const [created] = await db
          .insert(message)
          .values({
            projectId,
            content: "",
            role: "ASSISTANT",
            type: "RESULT",
          })
          .returning();

        if (!created) {
          throw new Error("Failed to create pending message");
        }

        await triggerStreamStart(projectId, {
          messageId: created.id,
          projectId,
          timestamp: Date.now(),
        });

        return created;
      },
    );

    // ── Step 2: Notify thinking ──────────────────────────────────
    await step.run("notify-thinking", async () => {
      await triggerAgentStatus(projectId, {
        projectId,
        status: "thinking",
        message: "Analyzing your request...",
        timestamp: Date.now(),
      });
    });

    // ── Step 3: Prepare sandbox (most common failure point) ──────
    let sandboxId: string;
    try {
      sandboxId = await step.run("ensure-expo-sandbox", async () => {
        const container = await prepareContainerForProject(projectId);
        return container.sandboxId;
      });
    } catch (error) {
      const userMsg = await handleStepError(error, {
        projectId,
        messageId: pendingMessage.id,
        operation: "sandbox_creation",
      });
      return {
        url: "",
        title: "Error",
        files: {},
        summary: userMsg,
        messageId: pendingMessage.id,
      };
    }

    // ── Step 4: Notify setup ─────────────────────────────────────
    await step.run("notify-setup", async () => {
      await triggerAgentStatus(projectId, {
        projectId,
        status: "coding",
        message: "Setting up development environment...",
        timestamp: Date.now(),
      });
    });

    // ── Step 5: Load previous messages ───────────────────────────
    const previousMessage = await step.run(
      "get-previous-message",
      async () => {
        const formattedMessages: Message[] = [];
        const messages = await db
          .select()
          .from(message)
          .where(eq(message.projectId, projectId))
          .orderBy(desc(message.createdAt))
          .limit(6);

        const filteredMessages = messages
          .filter((m) => m.id !== pendingMessage.id)
          .slice(0, 5);

        for (const msg of filteredMessages) {
          formattedMessages.push({
            type: "text",
            role: msg.role === "ASSISTANT" ? "assistant" : "user",
            content: msg.content,
          });
        }
        return formattedMessages.reverse();
      },
    );

    const state = createState<AgentState>(
      {
        summary: "",
        files: {},
        sandboxId: undefined,
      },
      {
        messages: previousMessage,
      },
    );

    state.data.sandboxId = sandboxId;
    state.data.projectId = projectId;

    // ── Step 6: Choose model ─────────────────────────────────────
    const [proj] = await db
      .select()
      .from(project)
      .where(eq(project.id, projectId))
      .limit(1);

    const modelName = event.data.model ?? proj?.model ?? "claude-opus-4-0";

    // ── Step 7: Notify coding ────────────────────────────────────
    await step.run("notify-coding", async () => {
      await triggerAgentStatus(projectId, {
        projectId,
        status: "coding",
        message: "Writing code...",
        timestamp: Date.now(),
      });
    });

    // ── Step 8: Run agent network ────────────────────────────────
    let result:
      | Awaited<
          ReturnType<ReturnType<typeof buildCodingAgentNetwork>["run"]>
        >
      | undefined;
    let isError = false;
    let errorMessage = "Something went wrong. Please try again.";

    try {
      const dynamicAgent = buildCodeAgent(getDynamicModel(modelName));
      const network = buildCodingAgentNetwork(dynamicAgent);
      result = await network.run(event.data.value, { state });

      isError =
        !result.state.data.summary ||
        Object.keys(result.state.data.files || {}).length === 0;
    } catch (error) {
      isError = true;
      const classified = classifyError(error);
      errorMessage = classified.userMessage;

      console.error("[code-agent] Agent execution failed:", error);

      ErrorTracker.trackError({
        operation: "agent_execution",
        projectId,
        sandboxId,
        timestamp: new Date().toISOString(),
        errorMessage: classified.message,
        errorStack: error instanceof Error ? error.stack : undefined,
        errorType: classified.code,
      });

      await sendCustomErrorNotification(
        projectId,
        classified.userMessage,
        "runtime-error",
        "terminal",
      );
    }

    // ── Step 9: Notify running ───────────────────────────────────
    await step.run("notify-running", async () => {
      await triggerAgentStatus(projectId, {
        projectId,
        status: "running",
        message: "Running your application...",
        timestamp: Date.now(),
      });
    });

    // ── Step 10: Get sandbox URL ─────────────────────────────────
    let sandboxUrl = "";
    try {
      sandboxUrl = await step.run("get-sandbox-url", async () => {
        const sandbox = await getSandbox(sandboxId);
        const host = sandbox.getHost(8081);
        return `https://${host}`;
      });
    } catch (error) {
      console.error("[code-agent] Failed to get sandbox URL:", error);
      // Non-fatal — we can still save the result without a URL
    }

    // ── Step 11: Save result ─────────────────────────────────────
    await step.run("save-result", async () => {
      if (isError || !result) {
        await db
          .update(message)
          .set({
            content: errorMessage,
            type: "ERROR",
          })
          .where(eq(message.id, pendingMessage.id));

        await triggerStreamError(projectId, {
          messageId: pendingMessage.id,
          error: errorMessage,
          timestamp: Date.now(),
        });

        await triggerAgentStatus(projectId, {
          projectId,
          status: "error",
          message: errorMessage,
          timestamp: Date.now(),
        });

        return;
      }

      return await db.transaction(async (tx) => {
        await tx
          .update(message)
          .set({
            content: result.state.data.summary,
          })
          .where(eq(message.id, pendingMessage.id));

        const [createdFragment] = await tx
          .insert(fragment)
          .values({
            messageId: pendingMessage.id,
            sandboxUrl: sandboxUrl,
            title: "Fragment",
            files: result.state.data.files,
          })
          .returning();

        await triggerStreamEnd(projectId, {
          messageId: pendingMessage.id,
          finalContent: result.state.data.summary,
          fragmentId: createdFragment?.id,
          sandboxUrl: sandboxUrl,
          files: result.state.data.files,
          timestamp: Date.now(),
        });

        await triggerAgentStatus(projectId, {
          projectId,
          status: "completed",
          message: "Done!",
          timestamp: Date.now(),
        });

        return {
          messageId: pendingMessage.id,
          fragmentId: createdFragment?.id,
        };
      });
    });

    return {
      url: sandboxUrl,
      title: "Fragments",
      files: result?.state.data.files ?? {},
      summary: result?.state.data.summary ?? errorMessage,
      messageId: pendingMessage.id,
    };
  },
);
