import type { LucideIcon } from "lucide-react"
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: number;
  trendGoodDirection?: "up" | "down";
  tone?: "neutral" | "safe" | "warn" | "danger" | "info";
  footnote?: string;
}

const toneStyles: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  neutral: "bg-muted text-muted-foreground",
  safe: "bg-safe-soft text-safe",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};

export function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
  trendGoodDirection = "up",
  tone = "neutral",
  footnote,
}: MetricCardProps) {
  const isUp = (trend ?? 0) >= 0;
  const good = trendGoodDirection === "up" ? isUp : !isUp;
  const TrendIcon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="card-surface p-4 transition-shadow hover:shadow-pop">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        <span className={cn("grid size-8 place-items-center rounded-md", toneStyles[tone])}>
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="mt-3 font-mono text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {trend !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              good ? "text-safe" : "text-danger",
            )}
          >
            <TrendIcon className="size-3.5" aria-hidden />
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
        {footnote && <span className="text-muted-foreground">{footnote}</span>}
      </div>
    </div>
  );
}
