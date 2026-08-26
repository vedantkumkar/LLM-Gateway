import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  Cpu,
  Database,
  HardDrive,
  Network,
  ScanSearch,
  ScrollText,
  Server,
  ShieldHalf,
  Timer,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { StatusPill } from "@/components/security/badges";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getSystemHealth } from "@/services/healthService";
import type { ServiceStatus, SystemHealth } from "@/types";

export const Route = createFileRoute("/system-health")({
  head: () => ({
    meta: [
      { title: "Gateway System Health · SentinelAI Gateway" },
      {
        name: "description",
        content:
          "Operational health of the gateway API, security engines, datastores and LLM providers.",
      },
      { property: "og:title", content: "Gateway System Health" },
      {
        property: "og:description",
        content: "Service status, throughput and instance health for the AI security gateway.",
      },
    ],
  }),
  component: SystemHealthPage,
});

const serviceIcons: Record<string, LucideIcon> = {
  "Gateway API": Server,
  "Policy Engine": ScrollText,
  "PII Detection Engine": ScanSearch,
  "Prompt Defense Engine": ShieldHalf,
  "Audit Database": Database,
  "Redis Rate Limiter": Zap,
  "LLM Provider": Cpu,
};

function statusTone(status: ServiceStatus["status"]): "safe" | "warn" | "danger" {
  if (status === "Degraded") return "warn";
  if (status === "Down") return "danger";
  return "safe";
}

const tooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
};

function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    getSystemHealth()
      .then(setHealth)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const uptimeParts = health ? health.uptime.split(" · ") : [];

  return (
    <AppShell
      title="System Health"
      heading="Gateway System Health"
      subheading="Operational status of every gateway service and instance."
    >
      {error && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={load}>
            Retry
          </Button>
        </div>
      )}

      {loading || !health ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Gateway Uptime"
              value={uptimeParts[0] ?? health.uptime}
              icon={Activity}
              tone="safe"
              {...(uptimeParts[1] ? { footnote: uptimeParts[1] } : {})}
            />
            <MetricCard
              label="Requests / Minute"
              value={health.requestsPerMinute.toLocaleString()}
              icon={Zap}
              tone="info"
              footnote="Demo"
            />
            <MetricCard
              label="Average Latency"
              value={`${health.averageLatencyMs} ms`}
              icon={Timer}
              tone="info"
              trendGoodDirection="down"
            />
            <MetricCard
              label="Error Rate"
              value={`${health.errorRate}%`}
              icon={AlertTriangle}
              tone={health.errorRate < 1 ? "safe" : "danger"}
              trendGoodDirection="down"
            />
            <MetricCard
              label="Active Connections"
              value={health.activeConnections.toLocaleString()}
              icon={Network}
              tone="info"
              footnote="Simulated"
            />
            <MetricCard
              label="Database Latency"
              value={`${health.databaseLatencyMs} ms`}
              icon={Database}
              tone="safe"
              trendGoodDirection="down"
              footnote="Simulated"
            />
            <MetricCard
              label="Cache Hit Rate"
              value={`${health.cacheHitRate}%`}
              icon={HardDrive}
              tone="safe"
              footnote="Simulated"
            />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {health.services.map((s) => {
              const Icon = serviceIcons[s.name] ?? Server;
              const tone = statusTone(s.status);
              return (
                <div key={s.name} className="card-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-md ${
                        tone === "safe"
                          ? "bg-safe-soft text-safe"
                          : tone === "warn"
                            ? "bg-warn-soft text-warn"
                            : "bg-danger-soft text-danger"
                      }`}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <StatusPill tone={tone}>{s.status}</StatusPill>
                  </div>
                  <p className="mt-3 text-sm font-semibold tracking-tight">{s.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.detail}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <SectionCard
              title="Gateway Throughput"
              subtitle="Demo throughput trend; live backend exposes current health only"
              className="lg:col-span-2"
            >
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={health.throughput}
                    margin={{ top: 6, right: 0, bottom: 0, left: -18 }}
                  >
                    <defs>
                      <linearGradient id="healthRpm" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      stroke="var(--color-muted-foreground)"
                    />
                    <YAxis
                      yAxisId="rpm"
                      tick={{ fontSize: 11 }}
                      stroke="var(--color-muted-foreground)"
                    />
                    <YAxis
                      yAxisId="latency"
                      orientation="right"
                      tick={{ fontSize: 11 }}
                      stroke="var(--color-muted-foreground)"
                      unit="ms"
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area
                      yAxisId="rpm"
                      type="monotone"
                      dataKey="rpm"
                      name="Requests / min"
                      stroke="var(--color-chart-1)"
                      fill="url(#healthRpm)"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="latency"
                      type="monotone"
                      dataKey="latency"
                      name="Latency"
                      stroke="var(--color-chart-3)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Gateway Instances" subtitle="Simulated local replica health and load">
              <ul className="grid gap-3">
                {health.instances.map((inst) => (
                  <li
                    key={inst.name}
                    className="rounded-md border border-border bg-surface-strong p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{inst.name}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{inst.region}</p>
                      </div>
                      <StatusPill tone={inst.status === "Healthy" ? "safe" : "warn"}>
                        {inst.status}
                      </StatusPill>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-chart-1"
                          style={{ width: `${inst.load}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                        {inst.load}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>
        </>
      )}
    </AppShell>
  );
}
