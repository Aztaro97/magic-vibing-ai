// ─────────────────────────────────────────
// Shared tools available to multiple agents
// ─────────────────────────────────────────

import type { SubAgent } from "deepagents";
import { tool } from "langchain";
import { z } from "zod";

import {
	CODE_AGENT_PROMPT,
	DEBUG_AGENT_PROMPT,
	DOC_AGENT_PROMPT,
	REVIEW_AGENT_PROMPT,
	TEST_AGENT_PROMPT,
} from "../prompts";

const searchCodeTool = tool(
	async ({ pattern, directory }: { pattern: string; directory?: string }) => {
		// In production this delegates to the sandbox's grep via execute()
		// Returned as a hint — the FilesystemMiddleware grep tool handles actual execution
		return JSON.stringify({
			pattern,
			directory: directory ?? ".",
			note: "Use the grep tool",
		});
	},
	{
		name: "search_code",
		description:
			"Search for a pattern in the codebase. Use this to find where a symbol is used before editing it.",
		schema: z.object({
			pattern: z.string().describe("Regex or literal string to search for"),
			directory: z
				.string()
				.optional()
				.describe("Directory to search in (defaults to repo root)"),
		}),
	},
);

const runCommandTool = tool(
	async ({ command }: { command: string }) => {
		// Placeholder — the FilesystemMiddleware execute() tool handles real execution
		return `Will run: ${command} — use the execute tool directly`;
	},
	{
		name: "run_command",
		description:
			"Hint to run a shell command. Prefer using the execute tool from FilesystemMiddleware directly.",
		schema: z.object({
			command: z.string().describe("Shell command to execute in the sandbox"),
		}),
	},
);

// ─────────────────────────────────────────
// Code Agent
// ─────────────────────────────────────────

export const codeAgent: SubAgent = {
	name: "code-agent",
	description:
		"Specialist TypeScript/React engineer. Use for writing new files, editing existing code, " +
		"and running code inside the sandbox to verify it compiles and executes correctly. " +
		"Always use this agent when the task requires touching source files.",
	systemPrompt: CODE_AGENT_PROMPT,
	tools: [searchCodeTool, runCommandTool],
	// Inherits FilesystemMiddleware + sandbox execute tool from createDeepAgent defaults
};

// ─────────────────────────────────────────
// Debug Agent
// ─────────────────────────────────────────

export const debugAgent: SubAgent = {
	name: "debug-agent",
	description:
		"Debugging specialist. Use when you have a specific error message, stack trace, or failing test. " +
		"Pass the full error output and the file path. Returns a root-cause diagnosis and a verified fix.",
	systemPrompt: DEBUG_AGENT_PROMPT,
	tools: [searchCodeTool, runCommandTool],
};

// ─────────────────────────────────────────
// Test Agent
// ─────────────────────────────────────────

export const testAgent: SubAgent = {
	name: "test-agent",
	description:
		"Test engineer. Use to generate unit/integration tests with Vitest or E2E tests with Playwright, " +
		"run the test suite, and report pass/fail results with coverage. " +
		"Always run tests after code-agent makes significant changes.",
	systemPrompt: TEST_AGENT_PROMPT,
	tools: [searchCodeTool, runCommandTool],
};

// ─────────────────────────────────────────
// Doc Agent
// ─────────────────────────────────────────

export const docAgent: SubAgent = {
	name: "doc-agent",
	description:
		"Technical writer. Use to generate JSDoc for exported functions, write README sections, " +
		"or produce API reference documentation. Provide the source file paths as context.",
	systemPrompt: DOC_AGENT_PROMPT,
	tools: [searchCodeTool],
};

// ─────────────────────────────────────────
// Review Agent  (HITL gate is on the supervisor, not here)
// ─────────────────────────────────────────

export const reviewAgent: SubAgent = {
	name: "review-agent",
	description:
		"Security & quality reviewer. Use after code-agent completes a significant feature or fix. " +
		"Returns a structured findings report (Critical / High / Medium / Low) and a final verdict " +
		"(APPROVE / REQUEST CHANGES / BLOCK). Always run before merging or deploying.",
	systemPrompt: REVIEW_AGENT_PROMPT,
	tools: [searchCodeTool],
};

// ─────────────────────────────────────────
// Exported collection
// ─────────────────────────────────────────

export const ALL_SUBAGENTS: SubAgent[] = [
	codeAgent,
	debugAgent,
	testAgent,
	docAgent,
	reviewAgent,
];
