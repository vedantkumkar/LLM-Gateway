import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { PipelineView } from "@/components/security/PipelineView";
import { DecisionBadge, RiskScore, SeverityBadge } from "@/components/security/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { applyEventFilters, getSecurityEvents } from "@/services/auditService";
import type { SecurityEvent } from "@/types";

export const Route = createFileRoute("/security-events")({
  head: () => ({
    meta: [
      { title: "Security Events · SentinelAI Gateway" },
      {
        name: "description",
        content:
          "Investigate blocked prompts, PII leaks and injection attempts with full request forensics.",
      },
      { property: "og:title", content: "Security Events" },
      {
        property: "og:description",
        content: "Filterable security event stream with per-request forensic detail.",
      },
    ],
  }),
  component: SecurityEventsPage,
});

const severities = ["all", "critical", "high", "medium", "low"];
const decisions = ["all", "ALLOW", "REDACT_AND_ALLOW", "BLOCK"];

function initialSearch() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("q") ?? "";
}

function SecurityEventsPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(initialSearch);
  const [severity, setSeverity] = useState("all");
  const [decision, setDecision] = useState("all");
  const [threatType, setThreatType] = useState("all");
  const [department, setDepartment] = useState("all");
  const [selected, setSelected] = useState<SecurityEvent | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    getSecurityEvents()
      .then(setEvents)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const threatTypes = useMemo(
    () => ["all", ...Array.from(new Set(events.map((e) => e.threatType)))],
    [events],
  );
  const departments = useMemo(
    () => ["all", ...Array.from(new Set(events.map((e) => e.department)))],
    [events],
  );

  const filtered = useMemo(
    () => applyEventFilters(events, { search, severity, decision, threatType, department }),
    [events, search, severity, decision, threatType, department],
  );

  const reset = () => {
    setSearch("");
    setSeverity("all");
    setDecision("all");
    setThreatType("all");
    setDepartment("all");
  };

  return (
    <AppShell
      title="Security Events"
      heading="Security Events"
      subheading="Investigate every gateway decision with full forensic context."
      actions={
        <Button variant="outline" size="sm" onClick={reset}>
          Clear filters
        </Button>
      }
    >
      {error && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={load}>
            Retry
          </Button>
        </div>
      )}

      <SectionCard title="Filters" subtitle="Narrow the event stream">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="grid gap-1.5">
            <Label htmlFor="q">Search</Label>
            <div className="relative">
              <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
              <Input
                id="q"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="User, event, request ID…"
                className="pl-8"
              />
            </div>
          </div>
          {[
            { label: "Severity", value: severity, set: setSeverity, options: severities },
            { label: "Decision", value: decision, set: setDecision, options: decisions },
            { label: "Threat Type", value: threatType, set: setThreatType, options: threatTypes },
            { label: "Department", value: department, set: setDepartment, options: departments },
          ].map((f) => (
            <div key={f.label} className="grid gap-1.5">
              <Label>{f.label}</Label>
              <Select value={f.value} onValueChange={f.set}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {f.options.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o === "all" ? `All ${f.label.toLowerCase()}s` : o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Event Stream"
        subtitle={`${filtered.length} of ${events.length} events`}
        className="mt-5"
        bodyClassName="p-0"
      >
        {loading ? (
          <div className="grid gap-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-md" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            No events match the current filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Threat</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id} className="cursor-pointer" onClick={() => setSelected(e)}>
                    <TableCell className="text-xs text-muted-foreground">{e.relativeTime}</TableCell>
                    <TableCell>
                      <SeverityBadge severity={e.severity} />
                    </TableCell>
                    <TableCell className="text-xs">{e.threatType}</TableCell>
                    <TableCell className="font-medium">{e.event}</TableCell>
                    <TableCell className="font-mono text-xs">{e.user}</TableCell>
                    <TableCell className="text-muted-foreground">{e.model}</TableCell>
                    <TableCell>
                      <RiskScore score={e.riskScore} showBar={false} />
                    </TableCell>
                    <TableCell>
                      <DecisionBadge decision={e.decision} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost">
                        Investigate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex flex-wrap items-center gap-2">
                  {selected.event}
                  <SeverityBadge severity={selected.severity} />
                </SheetTitle>
              </SheetHeader>
              <div className="grid gap-5 px-4 pb-8">
                <dl className="grid grid-cols-2 gap-3 text-xs">
                  {[
                    ["Request ID", selected.requestId],
                    ["Timestamp", selected.timestamp],
                    ["User", selected.user],
                    ["Role", selected.role],
                    ["Department", selected.department],
                    ["Source IP", selected.sourceIp],
                    ["Model", selected.model],
                    ["Policy Triggered", selected.policyTriggered],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-md border border-border bg-surface-strong p-2.5">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="mt-0.5 font-mono text-[11px] break-all">{v}</dd>
                    </div>
                  ))}
                </dl>

                <div className="flex items-center gap-3">
                  <DecisionBadge decision={selected.decision} />
                  <div className="flex-1">
                    <RiskScore score={selected.riskScore} />
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">Detections</h3>
                  {selected.detections.length ? (
                    <ul className="grid gap-2">
                      {selected.detections.map((d, i) => (
                        <li
                          key={`${d.type}-${i}`}
                          className="rounded-md border border-border bg-surface-strong p-2.5 text-xs"
                        >
                          <p className="font-semibold text-primary">{d.type}</p>
                          <p className="font-mono break-all">{d.value}</p>
                          <p className="text-muted-foreground">Confidence: {d.confidence}%</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">No sensitive entities detected.</p>
                  )}
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">Sanitized Prompt</h3>
                  <pre className="max-h-48 overflow-auto rounded-md border border-border bg-surface-strong p-3 font-mono text-xs whitespace-pre-wrap">
                    {selected.sanitizedPrompt}
                  </pre>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">Pipeline Trace</h3>
                  <PipelineView stages={selected.pipeline} />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
