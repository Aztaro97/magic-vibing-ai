
"use client";
 
import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import { AlertTriangleIcon, CheckIcon, PencilIcon, XIcon } from "lucide-react";
import { useState } from "react";
 
interface HITLRequest {
  actionRequests: Array<{
    action: string;
    args: Record<string, unknown>;
    description?: string;
  }>;
  reviewConfigs: Array<{
    allowedDecisions: ("approve" | "reject" | "edit")[];
  }>;
}
 
interface HITLCardProps {
  interrupt: { value: HITLRequest };
  onRespond: (response: {
    decision: "approve" | "reject" | "edit";
    args?:    unknown;
    reason?:  string;
  }) => void;
}
 
export function HITLCard({ interrupt, onRespond }: HITLCardProps) {
  const request = interrupt.value;
  const action  = request.actionRequests[0];
  const config  = request.reviewConfigs[0];
 
  const [mode,       setMode]       = useState<"review" | "edit" | "reject">("review");
  const [editedArgs, setEditedArgs] = useState(() =>
    JSON.stringify(action?.args ?? {}, null, 2)
  );
  const [editValid,  setEditValid]  = useState(true);
  const [reason,     setReason]     = useState("");
 
  if (!action || !config) return null;
 
  function submitEdit() {
    try {
      const parsed = JSON.parse(editedArgs);
      onRespond({ decision: "edit", args: parsed });
    } catch {
      setEditValid(false);
    }
  }
 
  return (
    <div className="mx-2 my-3 rounded-xl border-2 border-amber-400/50 bg-amber-50/60 p-4 dark:border-amber-500/30 dark:bg-amber-950/20">
      <div className="flex items-center gap-2">
        <AlertTriangleIcon className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
          Approval required
        </span>
      </div>
 
      <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
        {action.description ?? `The agent wants to run: ${action.action}`}
      </p>
 
      {/* Args display */}
      {mode !== "edit" && (
        <pre className="mt-2.5 overflow-auto rounded-lg bg-white/70 p-3 font-mono text-[12px] text-foreground dark:bg-black/30 max-h-40">
          {JSON.stringify(action.args, null, 2)}
        </pre>
      )}
 
      {/* Edit mode */}
      {mode === "edit" && (
        <div className="mt-2.5 space-y-2">
          <textarea
            className={cn(
              "w-full rounded-lg border bg-white/70 p-3 font-mono text-[12px] text-foreground dark:bg-black/30",
              "min-h-[120px] resize-y outline-none focus:ring-1",
              editValid
                ? "border-border focus:ring-amber-400"
                : "border-destructive focus:ring-destructive"
            )}
            value={editedArgs}
            onChange={(e) => {
              setEditedArgs(e.target.value);
              setEditValid(true);
            }}
          />
          {!editValid && (
            <p className="text-xs text-destructive">Invalid JSON — fix before submitting</p>
          )}
        </div>
      )}
 
      {/* Reject mode */}
      {mode === "reject" && (
        <div className="mt-2.5 space-y-2">
          <textarea
            className="w-full rounded-lg border border-border bg-white/70 p-3 text-sm text-foreground dark:bg-black/30 outline-none min-h-[80px] resize-none"
            placeholder="Optional: reason for rejection..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      )}
 
      {/* Action buttons */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {mode === "review" && (
          <>
            {config.allowedDecisions.includes("approve") && (
              <Button
                size="sm"
                className="h-7 gap-1.5 bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                onClick={() => onRespond({ decision: "approve" })}
              >
                <CheckIcon className="h-3.5 w-3.5" />
                Approve
              </Button>
            )}
            {config.allowedDecisions.includes("edit") && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5"
                onClick={() => setMode("edit")}
              >
                <PencilIcon className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
            {config.allowedDecisions.includes("reject") && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={() => setMode("reject")}
              >
                <XIcon className="h-3.5 w-3.5" />
                Reject
              </Button>
            )}
          </>
        )}
 
        {mode === "edit" && (
          <>
            <Button
              size="sm"
              className="h-7 bg-blue-600 text-white hover:bg-blue-700"
              onClick={submitEdit}
            >
              Submit edits
            </Button>
            <Button size="sm" variant="ghost" className="h-7" onClick={() => setMode("review")}>
              Cancel
            </Button>
          </>
        )}
 
        {mode === "reject" && (
          <>
            <Button
              size="sm"
              className="h-7 bg-destructive text-white hover:bg-destructive/90"
              onClick={() => onRespond({ decision: "reject", reason: reason || undefined })}
            >
              Confirm rejection
            </Button>
            <Button size="sm" variant="ghost" className="h-7" onClick={() => setMode("review")}>
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
 