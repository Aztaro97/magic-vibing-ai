export interface ErrorNotification {
  message: string;
  timestamp: string;
  projectId: string;
  type?: "runtime-error" | "build-error" | "sandbox-error" | "custom";
  source?: "expo-server" | "metro-bundler" | "terminal" | "custom";
}

export interface SandboxErrorContext {
  sandboxId?: string;
  projectId?: string;
  userId?: string;
  messageId?: string;
  operation: string;
  timestamp: string;
  errorType?: string;
  errorMessage: string;
  errorStack?: string;
  errorCode?: string;
  additionalContext?: Record<string, unknown>;
}

export interface ExtractedErrorDetails {
  type: string;
  message: string;
  stack?: string;
  code?: string;
  details?: unknown;
}

export interface ErrorStats {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByOperation: Record<string, number>;
  recentErrors: SandboxErrorContext[];
}
