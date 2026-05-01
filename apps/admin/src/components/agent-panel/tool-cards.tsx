"use client";

import type { ToolCallWithResult } from "@langchain/react";
import {
  BookOpenIcon,
  BugIcon,
  CheckCircle2Icon,
  CodeIcon,
  FileIcon,
  FileTextIcon,
  FolderOpenIcon,
  GlobeIcon,
  LightbulbIcon,
  Loader2Icon,
  PenLineIcon,
  ShieldCheckIcon,
  TerminalIcon,
  TestTubeIcon,
  XCircleIcon,
  ZapIcon,
} from "lucide-react";

import { cn } from "@acme/ui";

// ─────────────────────────────────────────────────────────────────────────────
// Tool metadata — covers every tool in the deep-agents system
// ─────────────────────────────────────────────────────────────────────────────

const TOOL_META: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  // ── BaseSandbox / deepagents execution tools ────────────────────────────────
  execute: {
    label: "Execute",
    icon: TerminalIcon,
    color: "text-amber-600 dark:text-amber-400",
  },
  write_file: {
    label: "Write file",
    icon: FileIcon,
    color: "text-blue-600 dark:text-blue-400",
  },
  read_file: {
    label: "Read file",
    icon: FileTextIcon,
    color: "text-slate-500 dark:text-slate-400",
  },
  edit_file: {
    label: "Edit file",
    icon: PenLineIcon,
    color: "text-violet-600 dark:text-violet-400",
  },
  list_files: {
    label: "List files",
    icon: FolderOpenIcon,
    color: "text-slate-500 dark:text-slate-400",
  },
  upload_files: {
    label: "Upload files",
    icon: FileIcon,
    color: "text-blue-500 dark:text-blue-400",
  },
  download_files: {
    label: "Download files",
    icon: FileTextIcon,
    color: "text-blue-500 dark:text-blue-400",
  },
  // ── Code agent ─────────────────────────────────────────────────────────────
  bun_script: {
    label: "Run script",
    icon: ZapIcon,
    color: "text-amber-600 dark:text-amber-400",
  },
  pnpm_script: {
    label: "Run script",
    icon: TerminalIcon,
    color: "text-amber-600 dark:text-amber-400",
  },
  find_symbol: {
    label: "Find symbol",
    icon: CodeIcon,
    color: "text-blue-600 dark:text-blue-400",
  },
  read_before_edit: {
    label: "Read file",
    icon: FileTextIcon,
    color: "text-blue-600 dark:text-blue-400",
  },
  scaffold_trpc_procedure: {
    label: "Scaffold tRPC",
    icon: CodeIcon,
    color: "text-purple-600 dark:text-purple-400",
  },
  scaffold_drizzle_table: {
    label: "Scaffold schema",
    icon: CodeIcon,
    color: "text-purple-600 dark:text-purple-400",
  },
  // ── Debug agent ────────────────────────────────────────────────────────────
  parse_stack_trace: {
    label: "Parse error",
    icon: BugIcon,
    color: "text-red-600 dark:text-red-400",
  },
  state_hypothesis: {
    label: "Hypothesis",
    icon: LightbulbIcon,
    color: "text-amber-500 dark:text-amber-300",
  },
  // ── Test agent ─────────────────────────────────────────────────────────────
  plan_test_suite: {
    label: "Plan tests",
    icon: TestTubeIcon,
    color: "text-green-600 dark:text-green-400",
  },
  parse_test_results: {
    label: "Test results",
    icon: TestTubeIcon,
    color: "text-green-600 dark:text-green-400",
  },
  // ── Doc agent ──────────────────────────────────────────────────────────────
  scaffold_jsdoc: {
    label: "Generate docs",
    icon: BookOpenIcon,
    color: "text-teal-600 dark:text-teal-400",
  },
  // ── Review agent ───────────────────────────────────────────────────────────
  record_finding: {
    label: "Finding",
    icon: ShieldCheckIcon,
    color: "text-orange-600 dark:text-orange-400",
  },
  check_auth_guard: {
    label: "Auth check",
    icon: ShieldCheckIcon,
    color: "text-orange-600 dark:text-orange-400",
  },
  // ── Research agent ─────────────────────────────────────────────────────────
  internet_search: {
    label: "Web search",
    icon: GlobeIcon,
    color: "text-blue-600 dark:text-blue-400",
  },
  // ── Supervisor ─────────────────────────────────────────────────────────────
  task: {
    label: "Sub-agent",
    icon: TerminalIcon,
    color: "text-violet-600 dark:text-violet-400",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Shell — base card used by every tool
// ─────────────────────────────────────────────────────────────────────────────

function ToolCardShell({
  toolCall,
  labelOverride,
  children,
}: {
  toolCall: ToolCallWithResult;
  labelOverride?: string;
  children?: React.ReactNode;
}) {
  const meta = TOOL_META[toolCall.call.name] ?? {
    label: toolCall.call.name.replace(/_/g, " "),
    icon: TerminalIcon,
    color: "text-muted-foreground",
  };
  const Icon = meta.icon;
  const label = labelOverride ?? meta.label;

  return (
    <div
      className={cn(
        "my-1 rounded-lg border px-3 py-2 text-[13px]",
        toolCall.state === "error"
          ? "border-destructive/40 bg-destructive/5"
          : "border-border/50 bg-muted/30",
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn("h-3.5 w-3.5 shrink-0", meta.color)} />
        <span className="text-foreground font-medium">{label}</span>
        <span className="ml-auto">
          {toolCall.state === "pending" && (
            <Loader2Icon className="text-muted-foreground h-3.5 w-3.5 animate-spin" />
          )}
          {toolCall.state === "completed" && (
            <CheckCircle2Icon className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          )}
          {toolCall.state === "error" && (
            <XCircleIcon className="text-destructive h-3.5 w-3.5" />
          )}
        </span>
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getExecuteLabel(command: string): string {
  if (/ngrok\s+(http|start)/i.test(command)) return "Start tunnel";
  if (/expo\s+start/i.test(command)) return "Start Expo";
  if (/expo\s+export/i.test(command)) return "Build app";
  if (/bun\s+install|npm\s+install|pnpm\s+install/i.test(command))
    return "Install dependencies";
  if (/tsc\s+--noEmit|typecheck/i.test(command)) return "Type check";
  if (/eslint|lint\b/i.test(command)) return "Lint";
  if (/cat\s+|head\s+|tail\s+|ls\s+/i.test(command)) return "Inspect";
  return "Execute";
}

// ─────────────────────────────────────────────────────────────────────────────
// Specialised cards
// ─────────────────────────────────────────────────────────────────────────────

function ExecuteCard({ toolCall }: { toolCall: ToolCallWithResult }) {
  const args = toolCall.call.args as { command?: string };
  const command = args.command ?? "";
  const label = getExecuteLabel(command);
  const output =
    toolCall.state === "completed" && toolCall.result
      ? String(toolCall.result.content).trim()
      : null;

  return (
    <ToolCardShell toolCall={toolCall} labelOverride={label}>
      <p className="text-muted-foreground mt-1 truncate font-mono text-[12px]">
        {command}
      </p>
      {output && (
        <pre className="bg-background/50 text-muted-foreground mt-1.5 max-h-20 overflow-auto rounded p-2 font-mono text-[11px] leading-snug">
          {output.slice(0, 600)}
        </pre>
      )}
    </ToolCardShell>
  );
}

function WriteFileCard({ toolCall }: { toolCall: ToolCallWithResult }) {
  const args = toolCall.call.args as { file_path?: string; content?: string };
  const filePath = args.file_path ?? "";
  const fileName = filePath.split("/").pop() ?? filePath;

  return (
    <ToolCardShell toolCall={toolCall} labelOverride={`Write ${fileName}`}>
      <p className="text-muted-foreground mt-1 truncate font-mono text-[12px]">
        {filePath}
      </p>
    </ToolCardShell>
  );
}

function ReadFileCard({ toolCall }: { toolCall: ToolCallWithResult }) {
  const args = toolCall.call.args as {
    file_path?: string;
    start_line?: number;
    end_line?: number;
  };
  const filePath = args.file_path ?? "";
  const fileName = filePath.split("/").pop() ?? filePath;
  const range =
    args.start_line != null
      ? ` :${args.start_line}${args.end_line != null ? `–${args.end_line}` : ""}`
      : "";

  return (
    <ToolCardShell toolCall={toolCall} labelOverride={`Read ${fileName}`}>
      <p className="text-muted-foreground mt-1 truncate font-mono text-[12px]">
        {filePath}
        {range}
      </p>
    </ToolCardShell>
  );
}

function EditFileCard({ toolCall }: { toolCall: ToolCallWithResult }) {
  const args = toolCall.call.args as {
    file_path?: string;
    old_str?: string;
    new_str?: string;
  };
  const filePath = args.file_path ?? "";
  const fileName = filePath.split("/").pop() ?? filePath;

  return (
    <ToolCardShell toolCall={toolCall} labelOverride={`Edit ${fileName}`}>
      <p className="text-muted-foreground mt-1 truncate font-mono text-[12px]">
        {filePath}
      </p>
      {args.old_str && (
        <div className="mt-1.5 space-y-0.5">
          <pre className="line-clamp-2 rounded bg-red-500/8 px-2 py-1 font-mono text-[11px] leading-snug text-red-700 dark:text-red-400">
            -{args.old_str.split("\n")[0]}
          </pre>
          <pre className="line-clamp-2 rounded bg-green-500/8 px-2 py-1 font-mono text-[11px] leading-snug text-green-700 dark:text-green-400">
            +{(args.new_str ?? "").split("\n")[0]}
          </pre>
        </div>
      )}
    </ToolCardShell>
  );
}

function BunScriptCard({ toolCall }: { toolCall: ToolCallWithResult }) {
  const args = toolCall.call.args as { script?: string; args?: string };
  const output =
    toolCall.state === "completed" && toolCall.result
      ? String(toolCall.result.content).trim()
      : null;

  return (
    <ToolCardShell toolCall={toolCall}>
      <p className="text-muted-foreground mt-1 font-mono text-[12px]">
        bun run {args.script}
        {args.args ? ` ${args.args}` : ""}
      </p>
      {output && (
        <pre className="bg-background/50 text-muted-foreground mt-1.5 max-h-20 overflow-auto rounded p-2 font-mono text-[11px] leading-snug">
          {output.slice(0, 400)}
        </pre>
      )}
    </ToolCardShell>
  );
}

function PnpmScriptCard({ toolCall }: { toolCall: ToolCallWithResult }) {
  const args = toolCall.call.args as {
    filter: string;
    script: string;
    args?: string;
  };
  return (
    <ToolCardShell toolCall={toolCall}>
      <p className="text-muted-foreground mt-1 font-mono text-[12px]">
        pnpm --filter {args.filter} {args.script}
        {args.args ? ` ${args.args}` : ""}
      </p>
      {toolCall.state === "completed" && toolCall.result && (
        <pre className="bg-background/50 text-muted-foreground mt-1.5 max-h-24 overflow-auto rounded p-2 font-mono text-[11px]">
          {String(toolCall.result.content).slice(0, 600)}
        </pre>
      )}
    </ToolCardShell>
  );
}

function InternetSearchCard({ toolCall }: { toolCall: ToolCallWithResult }) {
  const args = toolCall.call.args as { query?: string; maxResults?: number };
  return (
    <ToolCardShell toolCall={toolCall}>
      <p className="text-muted-foreground mt-1 line-clamp-2 text-[12px]">
        {args.query}
      </p>
    </ToolCardShell>
  );
}

function StateHypothesisCard({ toolCall }: { toolCall: ToolCallWithResult }) {
  const args = toolCall.call.args as {
    hypothesis?: string;
    affectedFile?: string;
    proposedFix?: string;
  };
  return (
    <ToolCardShell toolCall={toolCall}>
      {args.hypothesis && (
        <p className="text-muted-foreground mt-1 line-clamp-2 text-[12px] italic">
          {args.hypothesis}
        </p>
      )}
      {args.affectedFile && (
        <p className="text-muted-foreground/60 mt-0.5 truncate font-mono text-[11px]">
          → {args.affectedFile}
        </p>
      )}
    </ToolCardShell>
  );
}

function TaskCard({ toolCall }: { toolCall: ToolCallWithResult }) {
  const args = toolCall.call.args as { name: string; task: string };
  return (
    <ToolCardShell toolCall={toolCall}>
      <p className="text-muted-foreground mt-1 text-[12px]">
        <span className="text-foreground font-medium">{args.name}</span>
        {" — "}
        {args.task?.slice(0, 120)}
        {(args.task?.length ?? 0) > 120 ? "…" : ""}
      </p>
    </ToolCardShell>
  );
}

function RecordFindingCard({ toolCall }: { toolCall: ToolCallWithResult }) {
  const args = toolCall.call.args as {
    severity: string;
    file: string;
    line?: number;
    description: string;
  };
  const severityColor: Record<string, string> = {
    critical: "text-red-600 dark:text-red-400",
    high: "text-orange-600 dark:text-orange-400",
    medium: "text-amber-600 dark:text-amber-400",
    low: "text-blue-600 dark:text-blue-400",
  };
  return (
    <ToolCardShell toolCall={toolCall}>
      <div className="mt-1 flex items-start gap-2">
        <span
          className={cn(
            "shrink-0 font-medium",
            severityColor[args.severity] ?? "text-foreground",
          )}
        >
          {args.severity?.toUpperCase()}
        </span>
        <span className="text-muted-foreground line-clamp-2">
          {args.file}
          {args.line ? `:${args.line}` : ""} — {args.description}
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
      passed: number;
      failed: number;
      total: number;
      verdict: string;
    };
    return (
      <ToolCardShell toolCall={toolCall}>
        <div className="mt-1 flex items-center gap-3 text-[12px]">
          <span className="text-green-600 dark:text-green-400">
            {data.passed} passed
          </span>
          {data.failed > 0 && (
            <span className="text-red-600 dark:text-red-400">
              {data.failed} failed
            </span>
          )}
          <span
            className={cn(
              "ml-auto font-medium",
              data.verdict === "PASS"
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400",
            )}
          >
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
// Dispatcher
// ─────────────────────────────────────────────────────────────────────────────

export function ToolCard({ toolCall }: { toolCall: ToolCallWithResult }) {
  switch (toolCall.call.name) {
    case "execute":
      return <ExecuteCard toolCall={toolCall} />;
    case "write_file":
      return <WriteFileCard toolCall={toolCall} />;
    case "read_file":
      return <ReadFileCard toolCall={toolCall} />;
    case "edit_file":
      return <EditFileCard toolCall={toolCall} />;
    case "bun_script":
      return <BunScriptCard toolCall={toolCall} />;
    case "pnpm_script":
      return <PnpmScriptCard toolCall={toolCall} />;
    case "internet_search":
      return <InternetSearchCard toolCall={toolCall} />;
    case "state_hypothesis":
      return <StateHypothesisCard toolCall={toolCall} />;
    case "task":
      return <TaskCard toolCall={toolCall} />;
    case "record_finding":
      return <RecordFindingCard toolCall={toolCall} />;
    case "parse_test_results":
      return <ParseTestResultsCard toolCall={toolCall} />;
    default:
      return <ToolCardShell toolCall={toolCall} />;
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
    messageToolCallIds.includes(tc.call.id ?? ""),
  );
  if (relevant.length === 0) return null;

  return (
    <div className="mt-2 space-y-0.5">
      {relevant.map((tc, i) => (
        <ToolCard key={tc.call.id ?? `${tc.call.name}-${i}`} toolCall={tc} />
      ))}
    </div>
  );
}
