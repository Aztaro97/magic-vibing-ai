import type { ErrorStats, SandboxErrorContext } from "../shared/types";

/**
 * In-memory error tracker for analytics and debugging.
 * Stores error contexts and provides query/stats capabilities.
 */
export class ErrorTracker {
  private static errors: SandboxErrorContext[] = [];
  private static readonly MAX_ERRORS = 1000;

  static trackError(context: SandboxErrorContext): void {
    this.errors.push(context);

    // Evict oldest errors when exceeding limit
    if (this.errors.length > this.MAX_ERRORS) {
      this.errors = this.errors.slice(-this.MAX_ERRORS);
    }
  }

  static trackSandboxTermination(
    error: unknown,
    context: Partial<SandboxErrorContext>,
  ): void {
    const details = extractErrorDetails(error);
    this.trackError({
      operation: "sandbox_termination",
      timestamp: new Date().toISOString(),
      errorMessage: details.message,
      errorStack: details.stack,
      errorCode: details.code,
      errorType: details.type,
      ...context,
    } as SandboxErrorContext);
  }

  static getProjectErrors(projectId: string): SandboxErrorContext[] {
    return this.errors.filter((e) => e.projectId === projectId);
  }

  static getSandboxErrors(sandboxId: string): SandboxErrorContext[] {
    return this.errors.filter((e) => e.sandboxId === sandboxId);
  }

  static getAllErrors(): SandboxErrorContext[] {
    return [...this.errors];
  }

  static getErrorStats(): ErrorStats {
    const errorsByType: Record<string, number> = {};
    const errorsByOperation: Record<string, number> = {};

    for (const err of this.errors) {
      const type = err.errorType ?? "unknown";
      errorsByType[type] = (errorsByType[type] ?? 0) + 1;

      const op = err.operation;
      errorsByOperation[op] = (errorsByOperation[op] ?? 0) + 1;
    }

    return {
      totalErrors: this.errors.length,
      errorsByType,
      errorsByOperation,
      recentErrors: this.errors.slice(-10),
    };
  }

  static clearErrors(): void {
    this.errors = [];
  }

  static clearProjectErrors(projectId: string): void {
    this.errors = this.errors.filter((e) => e.projectId !== projectId);
  }

  static clearSandboxErrors(sandboxId: string): void {
    this.errors = this.errors.filter((e) => e.sandboxId !== sandboxId);
  }
}

/**
 * Extract structured error details from any thrown value.
 */
export function extractErrorDetails(error: unknown): {
  type: string;
  message: string;
  stack?: string;
  code?: string;
} {
  if (error instanceof Error) {
    return {
      type: error.constructor.name,
      message: error.message,
      stack: error.stack,
      code: (error as Error & { code?: string }).code,
    };
  }

  if (typeof error === "string") {
    return { type: "StringError", message: error };
  }

  return {
    type: "UnknownError",
    message: String(error),
  };
}
