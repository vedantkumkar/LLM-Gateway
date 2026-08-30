import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  EyeOff,
  Gauge,
  ShieldAlert,
  ShieldCheck,
  Signal,
  Timer,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { DecisionBadge, RiskScore, SeverityBadge } from "@/components/security/badges";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getCachedOverviewData,
  getOverviewData,
  type OverviewData,
  type TimeRange,
} from "@/services/dashboardService";
import type {
  DashboardMetrics,
  DecisionBreakdown,
  SecurityEvent,
  SecurityPosture,
  ThreatCategory,
  TrafficPoint,
} from "@/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/overview")({
  head: () => ({
    meta: [
      { title: "AI Security Command Center · SentinelAI Gateway" },
      {
        name: "description",
        content:
          "Real-time visibility into enterprise AI traffic: blocked threats, PII detections, risk scores and gateway latency.",
      },
      { property: "og:title", content: "AI Security Command Center" },
      {
        property: "og:description",
        content: "Real-time protection metrics across enterprise LLM interactions.",
      },
    ],
  }),
  component: OverviewPage,
});

const ranges: { value: TimeRange; label: string }[] = [
  { value: "24h", label: "Last 24 Hours" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
];

const decisionColors: Record<string, string> = {
  Allowed: "var(--color-safe)",
  Redacted: "var(--color-warn)",
  Blocked: "var(--color-danger)",
};

function OverviewPage() {
  const initialOverview = getCachedOverviewData("24h");
  const [range, setRange] = useState<TimeRange>("24h");
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(initialOverview?.metrics ?? null);
  const [posture, setPosture] = useState<SecurityPosture | null>(initialOverview?.posture ?? null);
  const [traffic, setTraffic] = useState<TrafficPoint[]>(initialOverview?.traffic ?? []);
  const [decisions, setDecisions] = useState<DecisionBreakdown[]>(initialOverview?.decisions ?? []);
  const [threats, setThreats] = useState<ThreatCategory[]>(initialOverview?.threats ?? []);
  const [events, setEvents] = useState<SecurityEvent[]>(initialOverview?.events ?? []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialOverview);
  const [refreshing, setRefreshing] = useState(false);
  const latestRequestId = useRef(0);
  const trendPrefix = "";

  const applyOverview = (overview: OverviewData) => {
    setMetrics(overview.metrics);
    setPosture(overview.posture);
    setTraffic(overview.traffic);
    setDecisions(overview.decisions);
    setThreats(overview.threats);
    setEvents(overview.events.slice(0, 6));
  };

  const load = (r: TimeRange) => {
    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;
    const cached = getCachedOverviewData(r);
    if (cached) {
      applyOverview(cached);
      setLoading(false);
    } else if (!metrics || !posture) {
      setLoading(true);
    }
    setRefreshing(true);
    setError(null);
    getOverviewData(r)
      .then((overview) => {
        if (latestRequestId.current !== requestId) return;
        applyOverview(overview);
      })
      .catch(() => {
        if (latestRequestId.current !== requestId) return;
        setError(
          cached || metrics || posture
            ? "Could not refresh dashboard data. Showing the last successful data."
            : "Dashboard data failed to load.",
        );
      })
      .finally(() => {
        if (latestRequestId.current !== requestId) return;
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    load(range);
    return () => {
      latestRequestId.current += 1;
    };
  }, [range]);

  return (
    <AppShell
      title="Overview"
      heading="AI Security Command Center"
      subheading="Real-time visibility and protection across enterprise AI interactions."
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
          {refreshing && !loading && (
            <span className="px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Refreshing...
            </span>
          )}
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

      {loading && (!metrics || !posture) ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total AI Requests"
              value={metrics.totalRequests.toLocaleString()}
              icon={Activity}
              trend={metrics.totalRequestsTrend}
              tone="info"
            />
            <MetricCard
              label="Allowed Requests"
              value={metrics.allowedRequests.toLocaleString()}
              icon={CheckCircle2}
              trend={metrics.allowedTrend}
              tone="safe"
            />
            <MetricCard
              label="Redacted Requests"
              value={metrics.redactedRequests.toLocaleString()}
              icon={EyeOff}
              trend={metrics.redactedTrend}
              tone="warn"
              trendGoodDirection="down"
            />
            <MetricCard
              label="Blocked Threats"
              value={metrics.blockedThreats.toLocaleString()}
              icon={ShieldAlert}
              trend={metrics.blockedTrend}
              tone="danger"
              trendGoodDirection="down"
            />
            <MetricCard
              label="PII / PHI Detections"
              value={metrics.piiDetections.toLocaleString()}
              icon={AlertTriangle}
              trend={metrics.piiTrend}
              tone="warn"
              trendGoodDirection="down"
            />
            <MetricCard
              label="Prompt Injection Attempts"
              value={metrics.injectionAttempts.toLocaleString()}
              icon={ShieldAlert}
              trend={metrics.injectionTrend}
              tone="danger"
              trendGoodDirection="down"
            />
            <MetricCard
              label="Average Risk Score"
              value={`${metrics.averageRiskScore} / 100`}
              icon={Gauge}
              trend={metrics.riskTrend}
              tone="safe"
              trendGoodDirection="down"
            />
            <MetricCard
              label="Gateway Latency"
              value={`${metrics.gatewayLatencyMs} ms`}
              icon={Timer}
              trend={metrics.latencyTrend}
              tone="info"
              trendGoodDirection="down"
            />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <SectionCard
              title="Current Security Posture"
              subtitle="Aggregated control coverage across the gateway"
            >
              <div className="flex items-center gap-4">
                <div className="relative grid size-24 shrink-0 place-items-center rounded-full border-4 border-safe/25">
                  <div className="text-center">
                    <p className="font-mono text-xl font-semibold text-safe">{posture.score}</p>
                    <p className="text-[10px] text-muted-foreground">/ 100</p>
                  </div>
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-safe/30 bg-safe-soft px-2 py-1 text-xs font-semibold text-safe">
                    <ShieldCheck className="size-3.5" /> {posture.status}
                  </span>
                  <p className="mt-2 text-sm font-medium">{posture.label}</p>
                  <p className="text-xs text-muted-foreground">
                    All primary security controls are operating normally.
                  </p>
                </div>
              </div>
              <ul className="mt-4 grid gap-1.5">
                {posture.controls.map((c) => (
                  <li
                    key={c.name}
                    className="flex items-center justify-between rounded-md border border-border bg-surface-strong px-3 py-1.5 text-xs"
                  >
                    <span className="text-muted-foreground">{c.name}</span>
                    <span className="inline-flex items-center gap-1 font-medium text-safe">
                      <Signal className="size-3.5" /> {c.state}
                    </span>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard
              title="AI Gateway Traffic"
              subtitle={
                refreshing && traffic.length === 0
                  ? "Loading traffic data"
                  : `${trendPrefix}Total, allowed and blocked requests`
              }
              className="lg:col-span-2"
            >
              <div className="h-64 w-full">
                {traffic.length === 0 ? (
                  <Skeleton className="h-full w-full rounded-md" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={traffic} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
                      <defs>
                        <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
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
                      <Tooltip
                        contentStyle={{
                          background: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        name="Total"
                        stroke="var(--color-chart-1)"
                        fill="url(#gTotal)"
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
                )}
              </div>
            </SectionCard>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <SectionCard title="Request Decisions" subtitle="Share of gateway outcomes">
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={decisions}
                      dataKey="value"
                      nameKey="decision"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={2}
                    >
                      {decisions.map((d) => (
                        <Cell key={d.decision} fill={decisionColors[d.decision]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="grid gap-1.5">
                {decisions.map((d) => (
                  <li key={d.decision} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: decisionColors[d.decision] }}
                      />
                      {d.decision}
                    </span>
                    <span className="font-mono font-medium">{d.value}%</span>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard
              title="Top Detected Threats"
              subtitle="Detection counts by category"
              className="lg:col-span-2"
            >
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={threats}
                    layout="vertical"
                    margin={{ top: 4, right: 16, bottom: 0, left: 42 }}
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
                      width={120}
                      tick={{ fontSize: 11 }}
                      stroke="var(--color-muted-foreground)"
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar
                      dataKey="count"
                      name="Detections"
                      fill="var(--color-chart-1)"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>

          <SectionCard
            title="Live Security Events"
            subtitle={
              refreshing && events.length === 0
                ? "Loading recent gateway decisions"
                : "Most recent gateway decisions"
            }
            className="mt-5"
            bodyClassName="p-0"
            action={
              <Button asChild size="sm" variant="outline">
                <Link to="/security-events">View all events</Link>
              </Button>
            }
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <Skeleton className="h-10 w-full rounded-md" />
                      </TableCell>
                    </TableRow>
                  ) : (
                    events.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>
                          <SeverityBadge severity={e.severity} />
                        </TableCell>
                        <TableCell className="font-medium">{e.event}</TableCell>
                        <TableCell className="font-mono text-xs">{e.user}</TableCell>
                        <TableCell className="text-muted-foreground">{e.department}</TableCell>
                        <TableCell className="text-muted-foreground">{e.model}</TableCell>
                        <TableCell>
                          <RiskScore score={e.riskScore} />
                        </TableCell>
                        <TableCell>
                          <DecisionBadge decision={e.decision} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {e.relativeTime}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </>
      )}
    </AppShell>
  );
}
