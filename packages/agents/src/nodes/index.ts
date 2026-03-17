import { db, eq, fragment, message } from "@acme/db";
import {
	createExpoSandbox,
	getSandbox,
	prepareContainerForProject,
} from "@acme/e2b";
import { triggerAgentStatus } from "@acme/pusher/server";
import type { CodeAgentState, HelloWorldState } from "@acme/validators";

/**
 * Database Nodes
 */

export async function initializeMessageNode(state: CodeAgentState) {
	const [newMessage] = await db
		.insert(message)
		.values({
			projectId: state.projectId,
			role: "ASSISTANT",
			type: "RESULT",
			content: "",
		})
		.returning();

	if (!newMessage) {
		throw new Error("Failed to create message");
	}

	return {
		messages: [...state.messages, { role: "assistant" as const, content: "" }],
		messageId: newMessage.id,
		currentStep: "message_initialized",
	};
}

export async function getPreviousMessagesNode(state: CodeAgentState) {
	const messages = await db.query.message.findMany({
		where: eq(message.projectId, state.projectId),
		orderBy: (m, { asc }) => [asc(m.createdAt)],
	});

	return {
		previousMessages: messages.map((m) => ({
			role: m.role.toLowerCase() as "user" | "assistant" | "system",
			content: m.content,
		})),
		currentStep: "history_loaded",
	};
}

export async function saveResultNode(state: CodeAgentState) {
	if (!state.messageId) {
		throw new Error("No messageId in state");
	}

	// Update message with summary
	await db
		.update(message)
		.set({
			content: state.summary ?? "Task completed",
		})
		.where(eq(message.id, state.messageId));

	// Create fragment if sandbox URL exists
	if (state.sandboxUrl) {
		await db.insert(fragment).values({
			messageId: state.messageId,
			title: "Code Generation Result",
			sandboxUrl: state.sandboxUrl,
			files: state.files,
		});
	}

	return {
		completedAt: new Date().toISOString(),
		currentStep: "result_saved",
		streamStatus: "complete" as const,
	};
}

export async function saveErrorNode(state: CodeAgentState) {
	if (!state.messageId) {
		// Create error message if no message exists
		const [newMessage] = await db
			.insert(message)
			.values({
				projectId: state.projectId,
				role: "ASSISTANT",
				type: "ERROR",
				content: state.errorMessage ?? "Unknown error",
			})
			.returning();

		if (!newMessage) {
			throw new Error("Failed to create error message");
		}

		return {
			messageId: newMessage.id,
			currentStep: "error_saved",
			streamStatus: "error" as const,
		};
	}

	await db
		.update(message)
		.set({
			content: state.errorMessage ?? "Unknown error",
		})
		.where(eq(message.id, state.messageId));

	return {
		currentStep: "error_saved",
		streamStatus: "error" as const,
	};
}

/**
 * Sandbox Nodes
 */

export async function setupSandboxNode(state: CodeAgentState) {
	const container = await prepareContainerForProject(state.projectId);

	return {
		sandboxId: container.sandboxId,
		currentStep: "sandbox_ready",
	};
}

export async function getSandboxUrlNode(state: CodeAgentState) {
	if (!state.sandboxId) {
		throw new Error("No sandboxId in state");
	}

	const sandbox = await getSandbox(state.sandboxId);

	// Get the sandbox URL (expo or web preview)
	const url = `https://${sandbox.getHost(8081)}`;

	return {
		sandboxUrl: url,
		currentStep: "url_retrieved",
	};
}

/**
 * Hello World specific nodes
 */

export async function createExpoSandboxNode(state: HelloWorldState) {
	const sandbox = await createExpoSandbox("create", {
		projectName: `hello-world-${state.projectId}`,
	});

	return {
		sandboxId: sandbox.sandboxId,
		currentStep: "sandbox_created",
	};
}

export async function getHelloWorldUrlNode(state: HelloWorldState) {
	if (!state.sandboxId) {
		throw new Error("No sandboxId in state");
	}

	const sandbox = await getSandbox(state.sandboxId);
	const url = `https://${sandbox.getHost(8081)}`;

	return {
		sandboxUrl: url,
		result: `Hello World! Sandbox URL: ${url}`,
		currentStep: "complete",
	};
}

/**
 * Streaming Nodes
 */

export function notifyStatusNode(status: string) {
	return async function (state: CodeAgentState | HelloWorldState) {
		await triggerAgentStatus(state.projectId, {
			projectId: state.projectId,
			status: status as
				| "thinking"
				| "coding"
				| "running"
				| "completed"
				| "error",
			message: state.currentStep,
			timestamp: Date.now(),
		});

		if ("streamStatus" in state) {
			return { streamStatus: status };
		}

		return {};
	};
}

export async function notifyErrorNode(state: CodeAgentState) {
	await triggerAgentStatus(state.projectId, {
		projectId: state.projectId,
		status: "error",
		message: `${state.currentStep}: ${state.errorMessage}`,
		timestamp: Date.now(),
	});

	return { streamStatus: "error" as const };
}

/**
 * Model Selection Node
 */

export async function chooseModelNode(state: CodeAgentState) {
	// Default to Claude if no model specified
	const model = state.model ?? "claude-3-5-sonnet-20241022";

	return {
		model,
		currentStep: "model_selected",
	};
}

/**
 * Error Handling Node
 */

export async function handleErrorNode(state: CodeAgentState) {
	// Classify error type
	let errorType = state.errorType ?? "UNKNOWN";

	if (!errorType || errorType === "UNKNOWN") {
		const errorMsg = (state.errorMessage ?? "").toLowerCase();

		if (
			errorMsg.includes("auth") ||
			errorMsg.includes("unauthorized") ||
			errorMsg.includes("api key")
		) {
			errorType = "AUTH";
		} else if (
			errorMsg.includes("network") ||
			errorMsg.includes("timeout") ||
			errorMsg.includes("connection")
		) {
			errorType = "NETWORK";
		} else if (
			errorMsg.includes("sandbox") ||
			errorMsg.includes("container") ||
			errorMsg.includes("runtime")
		) {
			errorType = "RUNTIME";
		} else if (
			errorMsg.includes("validation") ||
			errorMsg.includes("invalid")
		) {
			errorType = "VALIDATION";
		}
	}

	return {
		errorType,
		currentStep: `error_${state.currentStep}`,
	};
}
