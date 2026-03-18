/**
 * LangGraph State Schemas
 *
 * Defines Zod schemas for agent state management in LangGraph StateGraph.
 * These schemas are used to validate and type-check state transitions.
 *
 * Migration: Phase 3 — Replaces legacy state management with LangGraph
 */

import { z } from "zod";

// ============================================================================
// Base State Schema
// ============================================================================

/**
 * Base agent state shared across all graphs
 * Tracks execution metadata, errors, and progress
 */
export const BaseAgentStateSchema = z.object({
  // Execution metadata
  runId: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),

  // Progress tracking
  currentStep: z.string().default("init"),
  completedSteps: z.array(z.string()).default([]),

  // Error handling
  errorMessage: z.string().optional(),
  errorType: z
    .enum(["validation", "execution", "timeout", "unknown"])
    .optional(),
  errorStep: z.string().optional(),
  errorRecoverable: z.boolean().default(false),

  // Streaming events
  streamEvents: z
    .array(
      z.object({
        type: z.enum([
          "thinking",
          "setup",
          "coding",
          "running",
          "result",
          "error",
        ]),
        message: z.string(),
        timestamp: z.date(),
        metadata: z.record(z.unknown()).optional(),
      }),
    )
    .default([]),

  // LLM configuration
  modelProvider: z.enum(["openai", "anthropic", "gemini"]).default("openai"),
  modelName: z.string().optional(),

  // Sandboxing
  sandboxId: z.string().optional(),
  sandboxUrl: z.string().optional(),
  template: z.enum(["nextjs", "react-native-expo", "expo"]).optional(),
});

export type BaseAgentState = z.infer<typeof BaseAgentStateSchema>;

// ============================================================================
// Message & Context Schemas
// ============================================================================

/**
 * Chat message schema for context
 */
export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  timestamp: z.date().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

/**
 * Fragment result from code execution
 */
export const FragmentResultSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string(),
  sandboxUrl: z.string(),
  files: z.record(z.string()).optional(),
  previewUrl: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type FragmentResult = z.infer<typeof FragmentResultSchema>;

// ============================================================================
// Code Agent State Schema
// ============================================================================

/**
 * Extended state for code agent graph
 * Tracks the full code generation workflow
 */
export const CodeAgentStateSchema = BaseAgentStateSchema.extend({
  // Input
  userPrompt: z.string(),
  messageId: z.string().uuid().optional(),

  // Context (matches what nodes expect)
  messages: z.array(ChatMessageSchema).default([]),
  previousMessages: z.array(ChatMessageSchema).default([]),

  // Agent workflow
  agentIterations: z.number().int().min(0).default(0),
  maxIterations: z.number().int().min(1).default(15),
  summary: z.string().optional(),

  // Tools usage tracking
  toolsUsed: z
    .array(
      z.object({
        name: z.string(),
        input: z.unknown(),
        output: z.unknown().optional(),
        error: z.string().optional(),
        timestamp: z.date(),
      }),
    )
    .default([]),

  // Results
  generatedCode: z.string().optional(),
  files: z.record(z.string()).optional(),
  fragmentResult: FragmentResultSchema.optional(),

  // Streaming control
  isStreaming: z.boolean().default(false),
  streamingChannel: z.string().optional(),
  streamStatus: z
    .enum(["thinking", "setup", "coding", "running", "complete", "error"])
    .optional(),

  // Note: error handling fields inherited from BaseAgentStateSchema

  // Model
  model: z.string().optional(),
});

export type CodeAgentState = z.infer<typeof CodeAgentStateSchema>;

// ============================================================================
// Hello World State Schema
// ============================================================================

/**
 * Simple state for hello world graph
 * Minimal state for testing LangGraph setup
 */
export const HelloWorldStateSchema = BaseAgentStateSchema.extend({
  // Simple greeting workflow
  greeting: z.string().optional(),
  sandboxReady: z.boolean().default(false),
  result: z.string().optional(),
  streamStatus: z
    .enum(["thinking", "setup", "coding", "running", "complete", "error"])
    .optional(),
});

export type HelloWorldState = z.infer<typeof HelloWorldStateSchema>;

// ============================================================================
// Tool Result Schemas
// ============================================================================

/**
 * Terminal tool result
 */
export const TerminalResultSchema = z.object({
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number(),
  duration: z.number(), // milliseconds
});

export type TerminalResult = z.infer<typeof TerminalResultSchema>;

/**
 * File operation result
 */
export const FileOperationResultSchema = z.object({
  success: z.boolean(),
  path: z.string(),
  content: z.string().optional(),
  error: z.string().optional(),
});

export type FileOperationResult = z.infer<typeof FileOperationResultSchema>;

// ============================================================================
// Stream Event Schemas
// ============================================================================

/**
 * Pusher stream event types
 */
export const StreamEventTypeSchema = z.enum([
  "thinking",
  "setup",
  "coding",
  "running",
  "result",
  "error",
]);

export type StreamEventType = z.infer<typeof StreamEventTypeSchema>;

/**
 * Stream event payload
 */
export const StreamEventSchema = z.object({
  type: StreamEventTypeSchema,
  message: z.string(),
  timestamp: z.string(), // ISO string for JSON serialization
  metadata: z.record(z.unknown()).optional(),
});

export type StreamEvent = z.infer<typeof StreamEventSchema>;

// ============================================================================
// Model Configuration Schemas
// ============================================================================

/**
 * Model configuration for agent initialization
 */
export const ModelConfigSchema = z.object({
  provider: z.enum(["openai", "anthropic", "gemini"]),
  model: z.string(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().optional(),
  apiKey: z.string().optional(),
});

export type ModelConfig = z.infer<typeof ModelConfigSchema>;

/**
 * Agent network configuration
 */
export const AgentNetworkConfigSchema = z.object({
  maxIterations: z.number().int().min(1).default(15),
  timeoutMs: z.number().int().positive().default(300000), // 5 minutes
  tools: z.array(z.string()).default([]),
  systemPrompt: z.string().optional(),
});

export type AgentNetworkConfig = z.infer<typeof AgentNetworkConfigSchema>;
