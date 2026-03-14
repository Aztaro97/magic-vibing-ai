/**
 * Expo / React Native error patterns for detection in sandbox logs.
 */
export const EXPO_ERROR_PATTERNS: RegExp[] = [
  // React Native runtime errors
  /Uncaught Error:/i,
  /TypeError: (?:Cannot read|null is not|undefined is not)/i,
  /ReferenceError: (\w+) is not defined/i,
  /SyntaxError: (?:Unexpected token|Invalid or unexpected)/i,
  /RangeError:/i,

  // Metro bundler errors
  /error: (?:Unable to resolve module|SyntaxError in)/i,
  /Metro has encountered an error/i,
  /Compiling .*? failed/i,
  /Unable to resolve module/i,
  /Module not found/i,

  // Expo-specific errors
  /Error: (?:Invariant Violation|Element type is invalid)/i,
  /Invariant Violation:/i,
  /ExpoModulesCore/i,
  /expo-modules-core.*?Error/i,

  // Component render errors
  /Render Error/i,
  /Maximum update depth exceeded/i,
  /Too many re-renders/i,
  /Cannot update a component.*?while rendering/i,

  // Import/export issues
  /Cannot use import statement outside a module/i,
  /Unexpected token 'export'/i,
  /does not provide an export named/i,

  // Network / fetch errors
  /Network request failed/i,
  /Failed to fetch/i,

  // Expo error page (shown in web preview)
  /A runtime error has occurred/i,
  /Unhandled Runtime Error/i,
];

/**
 * Sensitive data patterns to filter before sending error notifications.
 * Matches common secret/credential formats.
 */
export const SENSITIVE_PATTERNS: RegExp[] = [
  // API keys
  /(?:api[_-]?key|apikey)\s*[:=]\s*["']?[\w-]{20,}["']?/gi,
  // Secrets
  /(?:secret|password|passwd|pwd)\s*[:=]\s*["']?[^\s"']{8,}["']?/gi,
  // Tokens
  /(?:token|bearer|auth)\s*[:=]\s*["']?[\w.-]{20,}["']?/gi,
  // AWS keys
  /(?:AKIA|ASIA)[A-Z0-9]{16}/g,
  // Private keys
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g,
  // Connection strings
  /(?:mongodb|postgres|mysql|redis):\/\/[^\s]+/gi,
];

/**
 * Replace sensitive data in a string with [REDACTED].
 */
export function filterSensitiveData(input: string): string {
  let filtered = input;
  for (const pattern of SENSITIVE_PATTERNS) {
    filtered = filtered.replace(pattern, "[REDACTED]");
  }
  return filtered;
}

/**
 * Check if a log line matches any Expo error pattern.
 */
export function matchesExpoError(logLine: string): boolean {
  return EXPO_ERROR_PATTERNS.some((pattern) => pattern.test(logLine));
}
