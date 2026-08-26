import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Boxes,
  Building2,
  Clock,
  Cloud,
  Database,
  Gauge,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { StatusPill } from "@/components/security/badges";
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
import { getModels } from "@/services/modelService";
import type { AIModel } from "@/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/models")({
  head: () => ({
    meta: [
      { title: "AI Model Governance · SentinelAI Gateway" },
      {
        name: "description",
        content:
          "Catalog and governance view of every LLM provider approved or restricted through the gateway.",
      },
      { property: "og:title", content: "AI Model Governance" },
      {
        property: "og:description",
        content: "Model inventory, risk tiers, permitted departments and access policy.",
      },
    ],
  }),
  component: ModelsPage,
});

const riskTone: Record<AIModel["riskTier"], "safe" | "warn" | "danger"> = {
  Low: "safe",
  Medium: "warn",
  High: "danger",
};

const statusTone: Record<AIModel["status"], "safe" | "warn" | "danger"> = {
  Available: "safe",
  Restricted: "warn",
  Disabled: "danger",
};

function ModelsPage() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    getModels()
      .then(setModels)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const stats = useMemo(
    () => ({
      total: models.length,
      external: models.filter((m) => m.type === "External").length,
      internal: models.filter((m) => m.type === "Internal").length,
      restricted: models.filter((m) => m.status === "Restricted").length,
    }),
    [models],
  );

  return (
    <AppShell
      title="Models"
      heading="AI Model Governance"
      subheading="Catalog, risk tiers and access policy for every connected model."
    >
      {error && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={load}>
            Retry
          </Button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Registered Models"
            value={String(stats.total)}
            icon={Boxes}
            tone="info"
          />
          <MetricCard
            label="External Providers"
            value={String(stats.external)}
            icon={Cloud}
            tone="info"
          />
          <MetricCard
            label="Internal Models"
            value={String(stats.internal)}
            icon={Database}
            tone="safe"
          />
          <MetricCard
            label="Restricted"
            value={String(stats.restricted)}
            icon={ShieldAlert}
            tone="warn"
          />
        </div>
      )}

      {loading ? (
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {models.map((m) => (
            <div key={m.id} className="card-surface flex flex-col p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-md",
                      m.type === "Internal" ? "bg-safe-soft text-safe" : "bg-info-soft text-info",
                    )}
                  >
                    {m.type === "Internal" ? (
                      <Database className="size-5" aria-hidden />
                    ) : (
                      <Cloud className="size-5" aria-hidden />
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-semibold tracking-tight">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.provider}</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <StatusPill tone={statusTone[m.status]}>{m.status}</StatusPill>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-strong px-2 py-0.5 text-muted-foreground">
                  <Building2 className="size-3" aria-hidden /> {m.type}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-strong px-2 py-0.5 text-muted-foreground">
                  <ShieldCheck className="size-3" aria-hidden /> {m.riskTier} Risk
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-md border border-border bg-surface-strong p-2.5">
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Clock className="size-3" aria-hidden /> Avg Latency
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold tabular-nums">
                    {m.averageLatencyMs} ms
                  </p>
                </div>
                <div className="rounded-md border border-border bg-surface-strong p-2.5">
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Gauge className="size-3" aria-hidden /> Daily Requests
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold tabular-nums">
                    {m.dailyRequests.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Permitted Departments
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {m.permittedDepartments.map((d) => (
                    <span
                      key={d}
                      className="rounded-full border border-border bg-surface-strong px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                {m.notes}
              </p>
            </div>
          ))}
        </div>
      )}

      <SectionCard
        title="Model Governance & Access"
        subtitle="Provider, risk and department access policy"
        className="mt-5"
        bodyClassName="p-0"
      >
        {loading ? (
          <div className="grid gap-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-md" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk Tier</TableHead>
                  <TableHead>Avg Latency</TableHead>
                  <TableHead>Daily Requests</TableHead>
                  <TableHead>Permitted Departments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="text-xs">{m.provider}</TableCell>
                    <TableCell className="text-xs">{m.type}</TableCell>
                    <TableCell>
                      <StatusPill tone={statusTone[m.status]}>{m.status}</StatusPill>
                    </TableCell>
                    <TableCell>
                      <StatusPill tone={riskTone[m.riskTier]}>{m.riskTier}</StatusPill>
                    </TableCell>
                    <TableCell className="font-mono text-xs tabular-nums">
                      {m.averageLatencyMs} ms
                    </TableCell>
                    <TableCell className="font-mono text-xs tabular-nums">
                      {m.dailyRequests.toLocaleString()}
                    </TableCell>
                    <TableCell className="max-w-[280px] text-xs text-muted-foreground">
                      {m.permittedDepartments.join(", ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>
    </AppShell>
  );
}
