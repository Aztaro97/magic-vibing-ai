/**
 * User-friendly error classification.
 * Maps raw backend errors to messages safe for UI display.
 */

export class AppError extends Error {
  public readonly userMessage: string;
  public readonly code: string;
  public readonly retryable: boolean;

  constructor(opts: {
    message: string;
    userMessage: string;
    code: string;
    retryable?: boolean;
    cause?: unknown;
  }) {
    super(opts.message, { cause: opts.cause });
    this.name = "AppError";
    this.userMessage = opts.userMessage;
    this.code = opts.code;
    this.retryable = opts.retryable ?? false;
  }
}

/**
 * Classify a raw error into a user-friendly AppError.
 * Returns the original AppError if already classified.
 */
export function classifyError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  const message =
    error instanceof Error ? error.message : String(error);
  const lowerMsg = message.toLowerCase();

  // Rate limit errors (E2B, LLM providers)
  if (
    lowerMsg.includes("rate limit") ||
    lowerMsg.includes("rate_limit") ||
    lowerMsg.includes("too many requests") ||
    lowerMsg.includes("429")
  ) {
    return new AppError({
      message,
      userMessage:
        "Service is temporarily busy. Please wait a moment and try again.",
      code: "RATE_LIMIT",
      retryable: true,
      cause: error,
    });
  }

  // Authentication / API key errors
  if (
    lowerMsg.includes("unauthorized") ||
    lowerMsg.includes("invalid api key") ||
    lowerMsg.includes("authentication") ||
    lowerMsg.includes("401")
  ) {
    return new AppError({
      message,
      userMessage:
        "Authentication failed. Please check your API configuration.",
      code: "AUTH_ERROR",
      retryable: false,
      cause: error,
    });
  }

  // Quota / billing errors
  if (
    lowerMsg.includes("quota") ||
    lowerMsg.includes("billing") ||
    lowerMsg.includes("insufficient") ||
    lowerMsg.includes("exceeded")
  ) {
    return new AppError({
      message,
      userMessage: "Usage limit reached. Please check your plan or try later.",
      code: "QUOTA_EXCEEDED",
      retryable: false,
      cause: error,
    });
  }

  // Network / timeout errors
  if (
    lowerMsg.includes("timeout") ||
    lowerMsg.includes("timed out") ||
    lowerMsg.includes("econnrefused") ||
    lowerMsg.includes("enotfound") ||
    lowerMsg.includes("network") ||
    lowerMsg.includes("fetch failed")
  ) {
    return new AppError({
      message,
      userMessage:
        "Connection issue. Please check your network and try again.",
      code: "NETWORK_ERROR",
      retryable: true,
      cause: error,
    });
  }

  // Sandbox not found (stale sandbox ID)
  if (
    lowerMsg.includes("sandbox not found") ||
    lowerMsg.includes("container not found") ||
    lowerMsg.includes("does not exist")
  ) {
    return new AppError({
      message,
      userMessage:
        "Development environment expired. A new one will be created automatically.",
      code: "SANDBOX_NOT_FOUND",
      retryable: true,
      cause: error,
    });
  }

  // LLM provider errors
  if (
    lowerMsg.includes("overloaded") ||
    lowerMsg.includes("capacity") ||
    lowerMsg.includes("503") ||
    lowerMsg.includes("service unavailable")
  ) {
    return new AppError({
      message,
      userMessage:
        "AI service is temporarily unavailable. Please try again in a moment.",
      code: "SERVICE_UNAVAILABLE",
      retryable: true,
      cause: error,
    });
  }

  // Content filter / safety
  if (
    lowerMsg.includes("content filter") ||
    lowerMsg.includes("safety") ||
    lowerMsg.includes("blocked")
  ) {
    return new AppError({
      message,
      userMessage:
        "Your request was blocked by content safety filters. Please rephrase and try again.",
      code: "CONTENT_FILTERED",
      retryable: false,
      cause: error,
    });
  }

  // Default: unknown error — don't expose internals
  return new AppError({
    message,
    userMessage: "Something went wrong. Please try again.",
    code: "INTERNAL_ERROR",
    retryable: false,
    cause: error,
  });
}
