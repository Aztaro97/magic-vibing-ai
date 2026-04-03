//
// Real, typed tools wired to the sandbox's execute() via FilesystemMiddleware.
//
// Design principle: these tools are thin wrappers that format command strings
// and pass them to the sandbox execute() tool provided by FilesystemMiddleware.
// They exist so sub-agents see named, schema-validated tools in their context
// window instead of raw shell strings — which reduces hallucinated commands and
// makes tool calls inspectable in LangSmith traces.

import { tool } from "@langchain/core/tools";
import { TavilySearch } from "@langchain/tavily";
import { z } from "zod";
import { env } from "../../env";


export const bunScript = tool(
	async ({ script, args }: { script: string; args?: string }) => {
		const cmd = `bun run ${script}${args ? ` ${args}` : ""}`;
		return JSON.stringify({ command: cmd, intent: `run ${script}` });
	},
	{
		name: "bun_script",
		description:
			"Run a bun script from the Expo project's package.json. " +
			"The sandbox is a single Expo app — no workspace filter needed. " +
			"Examples: script='typecheck' | script='lint' | script='test'",
		schema: z.object({
			script: z.string().describe(
				"Script name from package.json. Available: 'start', 'lint', 'build', 'build:web', 'typecheck'"
			),
			args: z.string().optional().describe("Extra CLI arguments appended after script name"),
		}),
	}
);

/**
 * Look up where a TypeScript symbol (function, type, variable) is defined
 */
export const findSymbol = tool(
	async ({ symbol, kind }: { symbol: string; kind?: string }) => {
		const exportPattern = `export (${kind ?? "(?:function|const|type|interface|class|enum)"}) ${symbol}\\b`;
		const usePattern = `\\b${symbol}\\b`;
		return JSON.stringify({
			findDefinition: { grep: exportPattern, flags: "-rn --include='*.ts' --include='*.tsx'" },
			findUsages: { grep: usePattern, flags: "-rn --include='*.ts' --include='*.tsx'" },
			note: "Use the grep tool with each pattern to find definition and usages",
		});
	},
	{
		name: "find_symbol",
		description:
			"Find where a TypeScript symbol is exported and where it is imported/used " +
			"across the Expo project. Always call this before editing or renaming any exported symbol.",
		schema: z.object({
			symbol: z.string().describe("The exact name of the symbol to find"),
			kind: z
				.enum(["function", "const", "type", "interface", "class", "enum"])
				.optional()
				.describe("Narrow the definition search to a specific export kind"),
		}),
	}
);

/**
 * Read a file's content and return it with line numbers.
 * Wraps the FilesystemMiddleware read_file tool with a mandatory
 * 'read before edit' convention surfaced as a named tool.
 */
export const readBeforeEdit = tool(
	async ({ path, startLine, endLine }: { path: string; startLine?: number; endLine?: number }) => {
		return JSON.stringify({
			read_file: { path, startLine, endLine },
			note: "Use the read_file tool with these params to fetch the content",
		});
	},
	{
		name: "read_before_edit",
		description:
			"Read a file before editing it. " +
			"ALWAYS call this before calling write_file or edit_file on any existing file. " +
			"Returns structured params for the read_file tool.",
		schema: z.object({
			path: z.string().describe("Absolute or workspace-relative path to the file"),
			startLine: z.number().int().optional().describe("First line to read (1-indexed). Omit to read from start."),
			endLine: z.number().int().optional().describe("Last line to read (inclusive). Omit to read to end."),
		}),
	}
);


// ─────────────────────────────────────────────────────────────────────────────
// Debug-agent specific tools
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a TypeScript / Node.js stack trace and return the structured frames.
 * Turns raw error text into something the model can reason about precisely.
 */
export const parseStackTrace = tool(
	async ({ stackTrace }: { stackTrace: string }) => {
		// Extract file:line:col references from the raw trace
		const framePattern = /at\s+(?:(\S+)\s+)?\(?([^)]+):(\d+):(\d+)\)?/g;
		const frames: Array<{ fn: string; file: string; line: number; col: number }> = [];
		let match: RegExpExecArray | null;

		while ((match = framePattern.exec(stackTrace)) !== null) {
			frames.push({
				fn: match[1] ?? "<anonymous>",
				file: match[2] ?? "",
				line: parseInt(match[3] ?? "0", 10),
				col: parseInt(match[4] ?? "0", 10),
			});
		}

		// Filter out node_modules frames to surface application frames first
		const appFrames = frames.filter((f) => !f.file.includes("node_modules"));
		const nodeFrames = frames.filter((f) => f.file.includes("node_modules"));

		return JSON.stringify({
			errorMessage: stackTrace.split("\n")[0] ?? "Unknown error",
			appFrames: appFrames.slice(0, 10),
			nodeFrames: nodeFrames.slice(0, 3),
			primaryFile: appFrames[0]?.file ?? null,
			primaryLine: appFrames[0]?.line ?? null,
		});
	},
	{
		name: "parse_stack_trace",
		description:
			"Parse a Node.js or TypeScript stack trace into structured frames. " +
			"Call this first when you receive an error. It extracts the exact file and line " +
			"to read, separating application frames from node_modules noise.",
		schema: z.object({
			stackTrace: z.string().describe("The raw error message and stack trace text"),
		}),
	}
);

/**
 * Produce a structured hypothesis about why code is failing.
 * Forces the agent to state its reasoning explicitly before touching files,
 * making the debugging process inspectable in the LangSmith trace.
 */
export const stateHypothesis = tool(
	async ({
		hypothesis,
		evidence,
		affectedFile,
		proposedFix,
	}: {
		hypothesis: string;
		evidence: string[];
		affectedFile: string;
		proposedFix: string;
	}) => {
		return JSON.stringify({
			hypothesis,
			evidence,
			affectedFile,
			proposedFix,
			next: `Read ${affectedFile} with read_file, then apply the fix with edit_file`,
		});
	},
	{
		name: "state_hypothesis",
		description:
			"State your debugging hypothesis before making any code changes. " +
			"REQUIRED: call this before every edit attempt. " +
			"Describe what you believe is wrong, what evidence supports it, and what fix you plan to apply.",
		schema: z.object({
			hypothesis: z.string().describe("One sentence stating the root cause"),
			evidence: z.array(z.string()).describe("List of observations that support this hypothesis"),
			affectedFile: z.string().describe("The primary file that needs to change"),
			proposedFix: z.string().describe("One sentence describing the minimal change to apply"),
		}),
	}
);

// ─────────────────────────────────────────────────────────────────────────────
// Test-agent specific tools
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a structured test plan before writing any test code.
 */
export const planTestSuite = tool(
	async ({
		targetFile,
		exportedSymbols,
		testCases,
	}: {
		targetFile: string;
		exportedSymbols: string[];
		testCases: Array<{ name: string; type: "happy" | "edge" | "error"; description: string }>;
	}) => {
		return JSON.stringify({
			targetFile,
			testFile: targetFile.replace(/\.(ts|tsx)$/, ".test.$1").replace(/src\//, "src/__tests__/"),
			symbols: exportedSymbols,
			totalCases: testCases.length,
			happyPath: testCases.filter((t) => t.type === "happy").length,
			edgeCases: testCases.filter((t) => t.type === "edge").length,
			errorCases: testCases.filter((t) => t.type === "error").length,
			plan: testCases,
			imports: `import { describe, it, expect, vi, beforeEach } from "vitest";`,
		});
	},
	{
		name: "plan_test_suite",
		description:
			"Plan a test suite for a TypeScript file before writing any test code. " +
			"Call this first to establish which symbols to test and which cases to cover. " +
			"Returns the test file path and a structured plan to write against.",
		schema: z.object({
			targetFile: z.string().describe("Path to the source file being tested"),
			exportedSymbols: z.array(z.string()).describe("Names of exported functions/classes/types to test"),
			testCases: z.array(
				z.object({
					name: z.string().describe("Short test name (will become it('...'))"),
					type: z.enum(["happy", "edge", "error"]).describe("Category of test case"),
					description: z.string().describe("What behaviour this test verifies"),
				})
			).describe("All test cases to write, in the order they should appear"),
		}),
	}
);

/**
 * Parse raw Vitest JSON output into a structured test report.
 */
export const parseTestResults = tool(
	async ({ output }: { output: string }) => {
		// Parse the Vitest JSON reporter format
		try {
			const data = JSON.parse(output) as {
				numPassedTests?: number;
				numFailedTests?: number;
				numPendingTests?: number;
				testResults?: Array<{
					testFilePath: string;
					status: string;
					testResults?: Array<{ fullName: string; status: string; failureMessages: string[] }>;
				}>;
			};

			const passing = data.numPassedTests ?? 0;
			const failing = data.numFailedTests ?? 0;
			const pending = data.numPendingTests ?? 0;

			const failures = (data.testResults ?? [])
				.flatMap((f) => (f.testResults ?? []).filter((t) => t.status === "failed"))
				.map((t) => ({ name: t.fullName, messages: t.failureMessages.slice(0, 3) }));

			const total = passing + failing + pending;

			return JSON.stringify({
				passed: passing,
				failed: failing,
				pending,
				total,
				passRate: total > 0 ? `${Math.round((passing / (passing + failing)) * 100)}%` : "N/A",
				failures: failures.slice(0, 20),
				verdict: failing === 0 ? "PASS" : "FAIL",
			});
		} catch {
			// Vitest plain text output fallback
			const passMatch = output.match(/(\d+)\s+passed/);
			const failMatch = output.match(/(\d+)\s+failed/);
			const passed = parseInt(passMatch?.[1] ?? "0", 10);
			const failed = parseInt(failMatch?.[1] ?? "0", 10);
			const total = passed + failed;

			return JSON.stringify({
				passed,
				failed,
				total,
				verdict: failed === 0 ? "PASS" : "FAIL",
				raw: output.slice(0, 2000),
			});
		}
	},
	{
		name: "parse_test_results",
		description:
			"Parse the raw output from 'pnpm test' or 'vitest run' into a structured report. " +
			"Call this immediately after running the test command. " +
			"Returns pass count, fail count, and the names of failing tests.",
		schema: z.object({
			output: z.string().describe("Raw stdout from the test runner command"),
		}),
	}
);

// ─────────────────────────────────────────────────────────────────────────────
// Doc-agent specific tools
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a JSDoc comment skeleton for a TypeScript function signature.
 */
export const scaffoldJsdoc = tool(
	async ({
		functionName,
		params,
		returnType,
		throws,
	}: {
		functionName: string;
		params: Array<{ name: string; type: string; description: string }>;
		returnType: string;
		throws?: string[];
	}) => {
		const paramLines = params
			.map((p) => ` * @param ${p.name} ${p.description}`)
			.join("\n");
		const throwLines = (throws ?? [])
			.map((t) => ` * @throws {${t}}`)
			.join("\n");

		const jsdoc = `/**
 * TODO: write a one-sentence summary of ${functionName}.
 *
 * TODO: write a longer description if the function does something non-obvious.
 *
${paramLines}
 * @returns ${returnType} — TODO: describe what is returned and why.
${throwLines ? throwLines + "\n" : ""} */`.trim();

		return JSON.stringify({ jsdoc, functionName });
	},
	{
		name: "scaffold_jsdoc",
		description:
			"Generate a JSDoc comment skeleton for a TypeScript function. " +
			"Returns a template with all @param and @returns lines pre-populated. " +
			"Fill in the TODO placeholders with accurate descriptions.",
		schema: z.object({
			functionName: z.string().describe("Name of the function being documented"),
			params: z.array(
				z.object({
					name: z.string().describe("Parameter name"),
					type: z.string().describe("TypeScript type (from the function signature)"),
					description: z.string().describe("Short description of what this param controls or represents"),
				})
			),
			returnType: z.string().describe("TypeScript return type of the function"),
			throws: z.array(z.string()).optional().describe("Error types this function may throw"),
		}),
	}
);

// ─────────────────────────────────────────────────────────────────────────────
// Review-agent specific tools
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Record a finding during code review.
 * Forces structured output instead of free-form text, making the review
 * report machine-parseable by the admin UI.
 */
export const recordFinding = tool(
	async ({
		severity,
		file,
		line,
		rule,
		description,
		suggestedFix,
	}: {
		severity: "critical" | "high" | "medium" | "low";
		file: string;
		line?: number;
		rule: string;
		description: string;
		suggestedFix: string;
	}) => {
		const location = line ? `${file}:${line}` : file;
		return JSON.stringify({
			finding: {
				severity: severity.toUpperCase(),
				location,
				rule,
				description,
				suggestedFix,
				formatted: `${severity.toUpperCase()} | ${location} | ${description} | ${suggestedFix}`,
			},
		});
	},
	{
		name: "record_finding",
		description:
			"Record a code review finding. Call this once for every distinct issue found. " +
			"Do NOT batch multiple issues into one call. " +
			"Findings are aggregated into the final review report.",
		schema: z.object({
			severity: z.enum(["critical", "high", "medium", "low"]),
			file: z.string().describe("File path where the issue was found"),
			line: z.number().int().optional().describe("Line number of the issue (omit if spans multiple lines)"),
			rule: z.string().describe("Short rule name, e.g. 'missing-auth-guard' or 'sql-injection'"),
			description: z.string().describe("One sentence describing the issue clearly"),
			suggestedFix: z.string().describe("One sentence describing the minimal fix"),
		}),
	}
);

/**
 * Check whether a tRPC procedure has a valid auth guard.
 */
export const checkAuthGuard = tool(
	async ({ procedureCode }: { procedureCode: string }) => {
		const usesProtected = /protectedProcedure/.test(procedureCode);
		const usesPublic = /publicProcedure/.test(procedureCode);
		const accessesCtx = /ctx\.session|ctx\.user/.test(procedureCode);
		const accessesDb = /ctx\.db|db\./.test(procedureCode);

		const verdict = usesProtected
			? "protected"
			: usesPublic && !accessesDb
				? "public-safe"
				: "possibly-missing-auth";

		const issues: string[] = [];
		if (!usesProtected && accessesDb) {
			issues.push("Procedure accesses database but does not use protectedProcedure");
		}
		if (!usesProtected && accessesCtx) {
			issues.push("Procedure accesses ctx.session/ctx.user without being protected");
		}

		return JSON.stringify({ verdict, usesProtected, usesPublic, accessesCtx, accessesDb, issues });
	},
	{
		name: "check_auth_guard",
		description:
			"Check whether a tRPC procedure snippet correctly uses protectedProcedure for auth. " +
			"Paste the procedure definition code. Returns a verdict and any auth issues found.",
		schema: z.object({
			procedureCode: z.string().describe("The tRPC procedure code to analyze"),
		}),
	}
);

export const internetSearch = tool(
	async ({
		query,
		maxResults = 5,
		includeRawContent = false,
	}: {
		query: string;
		maxResults?: number;
		includeRawContent?: boolean;
	}) => {
		const tavilySearch = new TavilySearch({
			maxResults,
			tavilyApiKey: env.TAVILY_API_KEY,
			includeRawContent,
		});
		return await tavilySearch._call({ query });
	},
	{
		name: "internet_search",
		description: "Run an internet search to find technical documentation, Expo SDK updates, or troubleshoot errors.",
		schema: z.object({
			query: z.string().describe("The research query."),
			depth: z.enum(["basic", "advanced"]).optional().describe("Search depth."),
			maxResults: z.number().optional().default(5),
			includeRawContent: z.boolean().optional().default(false),
		}),
	},
);


// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function capitalize(s: string): string {
	return s
		.split("_")
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join("");
}