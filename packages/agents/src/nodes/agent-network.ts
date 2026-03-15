/**
 * Agent Network Node
 *
 * Runs the AI agent network with tools in E2B sandbox.
 * Replaces the codingAgentNetwork from @inngest/agent-kit.
 *
 * Migration: Phase 3 — Core AI execution node
 */

import { ChatAnthropic } from "@langchain/anthropic";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

import type { CodeAgentState } from "@acme/validators";
import { getSandbox } from "@acme/e2b";

import { CODE_AGENT_SYSTEM_PROMPT } from "../promps/code-agent-prompt.js";
import { createFileTool } from "../tools/file-tool.js";
import { createTerminalTool } from "../tools/terminal-tool.js";

/**
 * Run the agent network node
 *
 * This node:
 * 1. Creates an LLM instance based on selected model
 * 2. Sets up tools bound to the E2B sandbox
 * 3. Runs ReAct agent loop with max iterations
 * 4. Tracks tool usage and generates summary
 */
export async function runAgentNetworkNode(
  state: CodeAgentState,
): Promise<Partial<CodeAgentState>> {
  const sandboxId = state.sandboxId;

  if (!sandboxId) {
    throw new Error(
      "No sandboxId in state - sandbox must be set up before running agent",
    );
  }

  // Get sandbox instance
  const sandbox = await getSandbox(sandboxId);

  // Create LLM based on model selection
  const model = createModel(state.model ?? "claude-3-5-sonnet-20241022");

  // Create tools bound to sandbox
  const tools = [
    createTerminalTool(sandboxId, state.projectId),
    createFileTool(sandboxId),
  ];

  // Create ReAct agent
  const agent = createReactAgent({
    llm: model,
    tools,
    messageModifier: CODE_AGENT_SYSTEM_PROMPT,
  });

  // Prepare messages from history
  const messages = [
    new SystemMessage(CODE_AGENT_SYSTEM_PROMPT),
    ...state.previousMessages.map((msg) =>
      msg.role === "user"
        ? new HumanMessage(msg.content)
        : new AIMessage(msg.content),
    ),
    new HumanMessage(state.userPrompt),
  ];

  // Track tool usage
  const toolsUsed: CodeAgentState["toolsUsed"] = [];
  let iterations = 0;
  const maxIterations = state.maxIterations;

  // Run agent with iteration tracking
  try {
    const result = await agent.invoke(
      { messages },
      {
        configurable: {
          thread_id: state.runId,
        },
        recursionLimit: maxIterations + 5, // LangGraph recursion limit
      },
    );

    // Extract final response
    const lastMessage = result.messages[result.messages.length - 1];
    if (!lastMessage) {
      throw new Error("No response received from agent");
    }
    const summary =
      typeof lastMessage.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

    return {
      summary,
      toolsUsed,
      agentIterations: iterations,
      generatedCode: extractCodeFromSummary(summary),
      currentStep: "agent_complete",
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return {
      errorMessage,
      errorType: "execution" as const,
      currentStep: "agent_error",
    };
  }
}

/**
 * Create LLM instance based on model name
 */
function createModel(modelName: string) {
  // Anthropic models
  if (modelName.includes("claude")) {
    return new ChatAnthropic({
      modelName,
      temperature: 0.7,
      maxTokens: 4096,
    });
  }

  // OpenAI models
  return new ChatOpenAI({
    modelName: modelName.includes("gpt") ? modelName : "gpt-4o",
    temperature: 0.7,
    maxTokens: 4096,
  });
}

/**
 * Extract code blocks from summary for file tracking
 */
function extractCodeFromSummary(summary: string): string {
  // Look for code blocks in markdown
  const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
  const matches = [...summary.matchAll(codeBlockRegex)];

  if (matches.length > 0) {
    return matches.map((m) => m[1]).join("\n\n");
  }

  return summary;
}
