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
  triggerAgentStatus,
  triggerStreamEnd,
  triggerStreamError,
  triggerStreamStart,
} from "@acme/pusher";

interface AgentState {
  summary: string;
  files: Record<string, string>;
  sandboxId?: string;
}

export const codeAgentFn = inngestClient.createFunction(
  { id: "code-agent" },
  { event: "code-agent/run" },
  async ({ event, step }) => {
    const projectId = event.data.projectId;

    // Create pending assistant message for real-time display
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

        // Notify clients that streaming has started
        await triggerStreamStart(projectId, {
          messageId: created.id,
          projectId,
          timestamp: Date.now(),
        });

        return created;
      }
    );

    // Notify: Agent is thinking
    await step.run("notify-thinking", async () => {
      await triggerAgentStatus(projectId, {
        projectId,
        status: "thinking",
        message: "Analyzing your request...",
        timestamp: Date.now(),
      });
    });

    const sandboxId = await step.run("ensure-expo-sandbox", async () => {
      const container = await prepareContainerForProject(projectId);
      return container.sandboxId;
    });

    // Notify: Setting up environment
    await step.run("notify-setup", async () => {
      await triggerAgentStatus(projectId, {
        projectId,
        status: "coding",
        message: "Setting up development environment...",
        timestamp: Date.now(),
      });
    });

    const previousMessage = await step.run("get-previous-message", async () => {
      const formattedMessages: Message[] = [];
      const messages = await db
        .select()
        .from(message)
        .where(eq(message.projectId, projectId))
        .orderBy(desc(message.createdAt))
        .limit(6); // Get 6 to exclude the pending message we just created

      // Filter out the pending message and take last 5
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
    });

    const state = createState<AgentState>(
      {
        summary: "",
        files: {},
        sandboxId: undefined,
      },
      {
        messages: previousMessage,
      }
    );

    // Make the created sandbox available to tools in the agent network
    state.data.sandboxId = sandboxId;

    // Choose model dynamically
    const [proj] = await db
      .select()
      .from(project)
      .where(eq(project.id, projectId))
      .limit(1);

    const modelName = event.data.model ?? proj?.model ?? "claude-opus-4-0";

    // Notify: Agent is coding
    await step.run("notify-coding", async () => {
      await triggerAgentStatus(projectId, {
        projectId,
        status: "coding",
        message: "Writing code...",
        timestamp: Date.now(),
      });
    });

    // Run the agent network
    let result: Awaited<ReturnType<ReturnType<typeof buildCodingAgentNetwork>["run"]>> | undefined;
    let isError = false;
    let errorMessage = "Something went wrong. Please try again";

    try {
      const dynamicAgent = buildCodeAgent(getDynamicModel(modelName));
      const network = buildCodingAgentNetwork(dynamicAgent);
      result = await network.run(event.data.value, { state });

      isError =
        !result.state.data.summary ||
        Object.keys(result.state.data.files || {}).length === 0;
    } catch (error) {
      isError = true;
      errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
    }

    // Notify: Running code
    await step.run("notify-running", async () => {
      await triggerAgentStatus(projectId, {
        projectId,
        status: "running",
        message: "Running your application...",
        timestamp: Date.now(),
      });
    });

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      const sandbox = await getSandbox(sandboxId);
      const host = sandbox.getHost(8081);
      return `https://${host}`;
    });

    // Update the message with final content
    await step.run("save-result", async () => {
      if (isError || !result) {
        // Update the pending message with error
        await db
          .update(message)
          .set({
            content: errorMessage,
            type: "ERROR",
          })
          .where(eq(message.id, pendingMessage.id));

        // Notify clients of error
        await triggerStreamError(projectId, {
          messageId: pendingMessage.id,
          error: errorMessage,
          timestamp: Date.now(),
        });

        return;
      }

      // Update message and create fragment in a transaction
      return await db.transaction(async (tx) => {
        // Update the pending message with final content
        await tx
          .update(message)
          .set({
            content: result.state.data.summary,
          })
          .where(eq(message.id, pendingMessage.id));

        // Create the fragment linked to the message
        const [createdFragment] = await tx
          .insert(fragment)
          .values({
            messageId: pendingMessage.id,
            sandboxUrl: sandboxUrl,
            title: "Fragment",
            files: result.state.data.files,
          })
          .returning();

        // Notify clients of completion
        await triggerStreamEnd(projectId, {
          messageId: pendingMessage.id,
          finalContent: result.state.data.summary,
          fragmentId: createdFragment?.id,
          sandboxUrl: sandboxUrl,
          files: result.state.data.files,
          timestamp: Date.now(),
        });

        // Notify: Completed
        await triggerAgentStatus(projectId, {
          projectId,
          status: "completed",
          message: "Done!",
          timestamp: Date.now(),
        });

        return { messageId: pendingMessage.id, fragmentId: createdFragment?.id };
      });
    });

    return {
      url: sandboxUrl,
      title: "Fragments",
      files: result?.state.data.files ?? {},
      summary: result?.state.data.summary ?? errorMessage,
      messageId: pendingMessage.id,
    };
  }
);
