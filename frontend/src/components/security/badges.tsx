import { cn } from "@/lib/utils";
import type { DecisionType, RiskLevel, Severity } from "@/types";

const base =
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap";

const severityStyles: Record<Severity, string> = {
  critical: "border-danger/30 bg-danger-soft text-danger",
  high: "border-warn/40 bg-warn-soft text-warn",
  medium: "border-info/30 bg-info-soft text-info",
  low: "border-safe/30 bg-safe-soft text-safe",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={cn(base, severityStyles[severity], "capitalize")}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {severity}
    </span>
  );
}

const decisionLabel: Record<DecisionType, string> = {
  ALLOW: "Allowed",
  REDACT_AND_ALLOW: "Redacted",
  BLOCK: "Blocked",
};

const decisionStyles: Record<DecisionType, string> = {
  ALLOW: "border-safe/30 bg-safe-soft text-safe",
  REDACT_AND_ALLOW: "border-warn/40 bg-warn-soft text-warn",
  BLOCK: "border-danger/30 bg-danger-soft text-danger",
};

export function DecisionBadge({ decision }: { decision: DecisionType }) {
  return <span className={cn(base, decisionStyles[decision])}>{decisionLabel[decision]}</span>;
}

export function riskLevelOf(score: number): RiskLevel {
  return score >= 85 ? "CRITICAL" : score >= 60 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW";
}

export function riskTextClass(score: number) {
  const level = riskLevelOf(score);
  return level === "CRITICAL" || level === "HIGH"
    ? "text-danger"
    : level === "MEDIUM"
      ? "text-warn"
      : "text-safe";
}

export function RiskScore({ score, showBar = true }: { score: number; showBar?: boolean }) {
  const level = riskLevelOf(score);
  const color =
    level === "CRITICAL"
      ? "bg-danger"
      : level === "HIGH"
        ? "bg-danger/80"
        : level === "MEDIUM"
          ? "bg-warn"
          : "bg-safe";
  return (
    <div className="flex items-center gap-2">
      <span className={cn("font-mono text-sm font-semibold tabular-nums", riskTextClass(score))}>
        {score}
      </span>
      {showBar && (
        <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full", color)} style={{ width: `${score}%` }} />
        </div>
      )}
    </div>
  );
}

export function StatusPill({
  tone,
  children,
}: {
  tone: "safe" | "warn" | "danger" | "info" | "muted";
  children: React.ReactNode;
}) {
  const tones = {
    safe: "border-safe/30 bg-safe-soft text-safe",
    warn: "border-warn/40 bg-warn-soft text-warn",
    danger: "border-danger/30 bg-danger-soft text-danger",
    info: "border-info/30 bg-info-soft text-info",
    muted: "border-border bg-muted text-muted-foreground",
  };
  return <span className={cn(base, tones[tone])}>{children}</span>;
}
