import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAnalytics, type TimeRange } from "@/services/dashboardService";
import { USE_MOCK_API } from "@/services/api";
import type { AnalyticsBundle } from "@/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "AI Usage & Security Analytics · SentinelAI Gateway" },
      {
        name: "description",
        content:
          "Usage and security analytics across request volume, threats, PII categories, model and department usage.",
      },
      { property: "og:title", content: "AI Usage & Security Analytics" },
      {
        property: "og:description",
        content: "Multi-range analytics for AI traffic, threats and governance metrics.",
      },
    ],
  }),
  component: AnalyticsPage,
});

const ranges: { value: TimeRange; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
];

const tooltipStyle = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
};

const piePalette = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const decisionColors: Record<string, string> = {
  Allowed: "var(--color-safe)",
  Redacted: "var(--color-warn)",
  Blocked: "var(--color-danger)",
};

function AnalyticsPage() {
  const [range, setRange] = useState<TimeRange>("7d");
  const [data, setData] = useState<AnalyticsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const trendPrefix = USE_MOCK_API ? "" : "Demo trend · ";

  const load = (r: TimeRange) => {
    setLoading(true);
    setError(null);
    getAnalytics(r)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(range);
  }, [range]);

  return (
    <AppShell
      title="Analytics"
      heading="AI Usage & Security Analytics"
      subheading="Usage, threat and governance trends across the gateway."
      actions={
        <div className="flex flex-wrap gap-1 rounded-md border border-border bg-card p-1">
          {ranges.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                range === r.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      }
    >
      {error && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => load(range)}>
            Retry
          </Button>
        </div>
      )}

      {loading || !data ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <SectionCard
            title="Request Volume"
            subtitle={`${trendPrefix}Total, allowed and blocked requests`}
            className="lg:col-span-2"
          >
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.requestVolume}
                  margin={{ top: 6, right: 8, bottom: 0, left: -18 }}
                >
                  <defs>
                    <linearGradient id="anaTotal" x1="0" y1="0" x2="0" y2="1">
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
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total"
                    stroke="var(--color-chart-1)"
                    fill="url(#anaTotal)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="allowed"
                    name="Allowed"
                    stroke="var(--color-safe)"
                    fill="transparent"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="blocked"
                    name="Blocked"
                    stroke="var(--color-danger)"
                    fill="transparent"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard
            title="Threat Trends"
            subtitle={`${trendPrefix}Injection, PII and secret detections over time`}
            className="lg:col-span-2"
          >
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.threatTrends}
                  margin={{ top: 6, right: 8, bottom: 0, left: -18 }}
                >
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
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="injection"
                    name="Prompt Injection"
                    stroke="var(--color-danger)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="pii"
                    name="PII / PHI"
                    stroke="var(--color-warn)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="secrets"
                    name="Secrets"
                    stroke="var(--color-chart-2)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="PII Categories" subtitle="Sensitive entity detections by type">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.piiCategories}
                  layout="vertical"
                  margin={{ top: 4, right: 16, bottom: 0, left: 46 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    stroke="var(--color-muted-foreground)"
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={110}
                    tick={{ fontSize: 11 }}
                    stroke="var(--color-muted-foreground)"
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar
                    dataKey="count"
                    name="Detections"
                    fill="var(--color-warn)"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard
            title="Prompt Injection Attempts"
            subtitle="Blocked injection attempts by period"
          >
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.threatTrends}
                  margin={{ top: 6, right: 8, bottom: 0, left: -18 }}
                >
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
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar
                    dataKey="injection"
                    name="Injection Attempts"
                    fill="var(--color-danger)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Model Usage" subtitle="Requests routed per model">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.modelUsage}
                    dataKey="count"
                    nameKey="category"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={2}
                  >
                    {data.modelUsage.map((m, i) => (
                      <Cell key={m.category} fill={piePalette[i % piePalette.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 grid gap-1.5">
              {data.modelUsage.map((m, i) => (
                <li key={m.category} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: piePalette[i % piePalette.length] }}
                    />
                    {m.category}
                  </span>
                  <span className="font-mono font-medium">{m.count.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Department Usage" subtitle="Requests routed per department">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.departmentUsage}
                  layout="vertical"
                  margin={{ top: 4, right: 16, bottom: 0, left: 46 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    stroke="var(--color-muted-foreground)"
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={110}
                    tick={{ fontSize: 11 }}
                    stroke="var(--color-muted-foreground)"
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar
                    dataKey="count"
                    name="Requests"
                    fill="var(--color-chart-1)"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Allowed vs Redacted vs Blocked" subtitle="Share of gateway decisions">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.blockedVsAllowed}
                    dataKey="value"
                    nameKey="decision"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={2}
                  >
                    {data.blockedVsAllowed.map((d) => (
                      <Cell
                        key={d.decision}
                        fill={decisionColors[d.decision] ?? "var(--color-chart-1)"}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 grid gap-1.5">
              {data.blockedVsAllowed.map((d) => (
                <li key={d.decision} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: decisionColors[d.decision] ?? "var(--color-chart-1)" }}
                    />
                    {d.decision}
                  </span>
                  <span className="font-mono font-medium">{d.value.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Risk Score Distribution" subtitle="Requests by risk band">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.riskDistribution}
                  margin={{ top: 6, right: 8, bottom: 0, left: -18 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 11 }}
                    stroke="var(--color-muted-foreground)"
                  />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar
                    dataKey="count"
                    name="Requests"
                    fill="var(--color-chart-2)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Average Latency" subtitle={`${trendPrefix}Gateway response latency over time`}>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.latencyTrend}
                  margin={{ top: 6, right: 8, bottom: 0, left: -18 }}
                >
                  <defs>
                    <linearGradient id="anaLatency" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-3)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--color-chart-3)" stopOpacity={0} />
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
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" unit="ms" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="latency"
                    name="Latency"
                    stroke="var(--color-chart-3)"
                    fill="url(#anaLatency)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>
      )}
    </AppShell>
  );
}
