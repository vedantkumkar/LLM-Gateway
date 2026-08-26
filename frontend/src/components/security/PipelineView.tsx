import { Check, CircleDashed, Loader2, ShieldAlert, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PipelineStageResult, StageState } from "@/types";

const stateStyles: Record<StageState, string> = {
  waiting: "border-border bg-muted text-muted-foreground",
  running: "border-info/40 bg-info-soft text-info",
  passed: "border-safe/30 bg-safe-soft text-safe",
  warning: "border-warn/40 bg-warn-soft text-warn",
  blocked: "border-danger/30 bg-danger-soft text-danger",
};

function StageIcon({ state }: { state: StageState }) {
  if (state === "passed") return <Check className="size-3.5" aria-hidden />;
  if (state === "running") return <Loader2 className="size-3.5 animate-spin" aria-hidden />;
  if (state === "warning") return <TriangleAlert className="size-3.5" aria-hidden />;
  if (state === "blocked") return <ShieldAlert className="size-3.5" aria-hidden />;
  return <CircleDashed className="size-3.5" aria-hidden />;
}

export function PipelineView({ stages }: { stages: PipelineStageResult[] }) {
  return (
    <ol className="grid gap-2">
      {stages.map((stage, i) => (
        <li key={stage.name} className="flex items-start gap-3">
          <span className="mt-1 w-4 shrink-0 font-mono text-[11px] text-muted-foreground">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div
            className={cn(
              "flex flex-1 flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2",
              stateStyles[stage.state],
            )}
          >
            <span className="flex items-center gap-2 text-xs font-medium">
              <StageIcon state={stage.state} />
              {stage.name}
            </span>
            <span className="text-[11px] opacity-80">{stage.detail ?? "Waiting"}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
