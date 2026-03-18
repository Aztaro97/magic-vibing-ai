
"use client";
 
import { cn } from "@acme/ui";
import type { ToolCallWithResult } from "@langchain/react";
import {
	BookOpenIcon,
	BugIcon,
	CheckCircle2Icon,
	CodeIcon,
	Loader2Icon,
	ShieldCheckIcon,
	TerminalIcon,
	TestTubeIcon,
	XCircleIcon
} from "lucide-react";
 
// ─────────────────────────────────────────────────────────────────────────────
// Tool → agent mapping for visual grouping
// ─────────────────────────────────────────────────────────────────────────────
 
const TOOL_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  // code-agent tools
  pnpm_script:            { label: "Run script",       icon: TerminalIcon,    color: "text-amber-600 dark:text-amber-400" },
  find_symbol:            { label: "Find symbol",      icon: CodeIcon,        color: "text-blue-600 dark:text-blue-400" },
  read_before_edit:       { label: "Read file",        icon: CodeIcon,        color: "text-blue-600 dark:text-blue-400" },
  scaffold_trpc_procedure:{ label: "Scaffold tRPC",    icon: CodeIcon,        color: "text-purple-600 dark:text-purple-400" },
  scaffold_drizzle_table: { label: "Scaffold schema",  icon: CodeIcon,        color: "text-purple-600 dark:text-purple-400" },
  // debug-agent tools
  parse_stack_trace:      { label: "Parse error",      icon: BugIcon,         color: "text-red-600 dark:text-red-400" },
  state_hypothesis:       { label: "Hypothesis",       icon: BugIcon,         color: "text-red-600 dark:text-red-400" },
  // test-agent tools
  plan_test_suite:        { label: "Plan tests",       icon: TestTubeIcon,    color: "text-green-600 dark:text-green-400" },
  parse_test_results:     { label: "Test results",     icon: TestTubeIcon,    color: "text-green-600 dark:text-green-400" },
  // doc-agent tools
  scaffold_jsdoc:         { label: "Scaffold JSDoc",   icon: BookOpenIcon,    color: "text-teal-600 dark:text-teal-400" },
  // review-agent tools
  record_finding:         { label: "Finding",          icon: ShieldCheckIcon, color: "text-orange-600 dark:text-orange-400" },
  check_auth_guard:       { label: "Auth check",       icon: ShieldCheckIcon, color: "text-orange-600 dark:text-orange-400" },
  // sub-agent dispatch (task tool from DeepAgents)
  task:                   { label: "Sub-agent",        icon: TerminalIcon,    color: "text-violet-600 dark:text-violet-400" },
};
 
// ─────────────────────────────────────────────────────────────────────────────
// Generic tool card — used for unknown tools + as base for specialised cards
// ─────────────────────────────────────────────────────────────────────────────
 
function ToolCardShell({
  toolCall,
  children,
}: {
  toolCall: ToolCallWithResult;
  children?: React.ReactNode;
}) {
  const meta = TOOL_META[toolCall.call.name] ?? {
    label:  toolCall.call.name.replace(/_/g, " "),
    icon:   TerminalIcon,
    color:  "text-muted-foreground",
  };
  const Icon = meta.icon;
 
  return (
    <div className={cn(
      "my-1 rounded-lg border px-3 py-2 text-[13px]",
      toolCall.state === "error"
        ? "border-destructive/40 bg-destructive/5"
        : "border-border/50 bg-muted/30"
    )}>
      <div className="flex items-center gap-2">
        <Icon className={cn("h-3.5 w-3.5 shrink-0", meta.color)} />
        <span className="font-medium text-foreground">{meta.label}</span>
        <span className="ml-auto">
          {toolCall.state === "pending" && (
            <Loader2Icon className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
          {toolCall.state === "completed" && (
            <CheckCircle2Icon className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          )}
          {toolCall.state === "error" && (
            <XCircleIcon className="h-3.5 w-3.5 text-destructive" />
          )}
        </span>
      </div>
      {children}
    </div>
  );
}
 
// ─────────────────────────────────────────────────────────────────────────────
// Specialised cards
// ─────────────────────────────────────────────────────────────────────────────
 
function PnpmScriptCard({ toolCall }: { toolCall: ToolCallWithResult }) {
  const args = toolCall.call.args as { filter: string; script: string; args?: string };
  return (
    <ToolCardShell toolCall={toolCall}>
      <p className="mt-1 font-mono text-[12px] text-muted-foreground">
        pnpm --filter {args.filter} {args.script}{args.args ? ` ${args.args}` : ""}
      </p>
      {toolCall.state === "completed" && toolCall.result && (
        <pre className="mt-1.5 max-h-24 overflow-auto rounded bg-background/50 p-2 font-mono text-[11px] text-muted-foreground">
          {String(toolCall.result.content).slice(0, 600)}
        </pre>
      )}
    </ToolCardShell>
  );
}
 
function TaskCard({ toolCall }: { toolCall: ToolCallWithResult }) {
  const args = toolCall.call.args as { name: string; task: string };
  return (
    <ToolCardShell toolCall={toolCall}>
      <p className="mt-1 text-[12px] text-muted-foreground">
        <span className="font-medium text-foreground">{args.name}</span>
        {" — "}
        {args.task?.slice(0, 120)}{(args.task?.length ?? 0) > 120 ? "…" : ""}
      </p>
    </ToolCardShell>
  );
}
 
function RecordFindingCard({ toolCall }: { toolCall: ToolCallWithResult }) {
  const args = toolCall.call.args as {
    severity: string; file: string; line?: number;
    rule: string; description: string; suggestedFix: string;
  };
  const severityColor: Record<string, string> = {
    critical: "text-red-600 dark:text-red-400",
    high:     "text-orange-600 dark:text-orange-400",
    medium:   "text-amber-600 dark:text-amber-400",
    low:      "text-blue-600 dark:text-blue-400",
  };
  return (
    <ToolCardShell toolCall={toolCall}>
      <div className="mt-1 flex items-start gap-2">
        <span className={cn("shrink-0 font-medium", severityColor[args.severity] ?? "text-foreground")}>
          {args.severity.toUpperCase()}
        </span>
        <span className="text-muted-foreground">
          {args.file}{args.line ? `:${args.line}` : ""} — {args.description}
        </span>
      </div>
    </ToolCardShell>
  );
}
 
function ParseTestResultsCard({ toolCall }: { toolCall: ToolCallWithResult }) {
  if (toolCall.state !== "completed" || !toolCall.result) {
    return <ToolCardShell toolCall={toolCall} />;
  }
 
  try {
    const data = JSON.parse(String(toolCall.result.content)) as {
      passed: number; failed: number; total: number; verdict: string;
    };
    return (
      <ToolCardShell toolCall={toolCall}>
        <div className="mt-1 flex items-center gap-3 text-[12px]">
          <span className="text-green-600 dark:text-green-400">{data.passed} passed</span>
          {data.failed > 0 && (
            <span className="text-red-600 dark:text-red-400">{data.failed} failed</span>
          )}
          <span className={cn(
            "ml-auto font-medium",
            data.verdict === "PASS" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {data.verdict}
          </span>
        </div>
      </ToolCardShell>
    );
  } catch {
    return <ToolCardShell toolCall={toolCall} />;
  }
}
 
// ─────────────────────────────────────────────────────────────────────────────
// Dispatcher — picks the right card by tool name
// ─────────────────────────────────────────────────────────────────────────────
 
export function ToolCard({ toolCall }: { toolCall: ToolCallWithResult }) {
  switch (toolCall.call.name) {
    case "pnpm_script":       return <PnpmScriptCard toolCall={toolCall} />;
    case "task":              return <TaskCard toolCall={toolCall} />;
    case "record_finding":    return <RecordFindingCard toolCall={toolCall} />;
    case "parse_test_results":return <ParseTestResultsCard toolCall={toolCall} />;
    default:                  return <ToolCardShell toolCall={toolCall} />;
  }
}
 
// ─────────────────────────────────────────────────────────────────────────────
// Multi-tool renderer — used inline within AI message bubbles
// ─────────────────────────────────────────────────────────────────────────────
 
export function MessageToolCalls({
  messageToolCallIds,
  toolCalls,
}: {
  messageToolCallIds: string[];
  toolCalls: ToolCallWithResult[];
}) {
  const relevant = toolCalls.filter((tc) =>
    messageToolCallIds.includes(tc.call.id)
  );
  if (relevant.length === 0) return null;
 
  return (
    <div className="mt-2 space-y-0.5">
      {relevant.map((tc) => (
        <ToolCard key={tc.call.id} toolCall={tc} />
      ))}
    </div>
  );
}