import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { DecisionBadge, RiskScore, StatusPill } from "@/components/security/badges";
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
import { applyAuditFilters, auditLogsToCsv, getAuditLogs } from "@/services/auditService";
import { riskLevelOf } from "@/components/security/badges";
import type { AuditLog } from "@/types";

export const Route = createFileRoute("/audit-logs")({
  head: () => ({
    meta: [
      { title: "AI Audit Logs · SentinelAI Gateway" },
      {
        name: "description",
        content:
          "Immutable, exportable traceability records for every AI request routed through the gateway.",
      },
      { property: "og:title", content: "AI Audit Logs" },
      {
        property: "og:description",
        content: "Search, filter and export full-fidelity AI request audit records.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditLogsPage,
});

const decisions = ["all", "ALLOW", "REDACT_AND_ALLOW", "BLOCK"];
const risks = ["all", "LOW", "MEDIUM", "HIGH", "CRITICAL"];

function initialSearch() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("q") ?? "";
}

function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(initialSearch);
  const [decision, setDecision] = useState("all");
  const [risk, setRisk] = useState("all");
  const [model, setModel] = useState("all");
  const [user, setUser] = useState("all");
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    getAuditLogs()
      .then(setLogs)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const models = useMemo(
    () => ["all", ...Array.from(new Set(logs.map((l) => l.model)))],
    [logs],
  );
  const users = useMemo(() => ["all", ...Array.from(new Set(logs.map((l) => l.user)))], [logs]);

  const filtered = useMemo(() => {
    const base = applyAuditFilters(logs, { search, decision, model });
    return base.filter(
      (l) =>
        (user === "all" || l.user === user) &&
        (risk === "all" || riskLevelOf(l.riskScore) === risk),
    );
  }, [logs, search, decision, model, user, risk]);

  const exportCsv = () => {
    const csv = auditLogsToCsv(filtered);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusTone = (s: AuditLog["status"]) =>
    s === "Success" ? "safe" : s === "Blocked" ? "danger" : "warn";

  return (
    <AppShell
      title="Audit Logs"
      heading="AI Audit Logs"
      subheading="Immutable traceability for every prompt, decision and response."
      actions={
        <Button size="sm" onClick={exportCsv} disabled={!filtered.length}>
          <Download className="size-4" aria-hidden />
          Export CSV
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

      <SectionCard title="Filters" subtitle="Narrow the audit trail">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="grid gap-1.5">
            <Label htmlFor="audit-q">Search</Label>
            <div className="relative">
              <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
              <Input
                id="audit-q"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Request ID, user, model…"
                className="pl-8"
              />
            </div>
          </div>
          {[
            { label: "Decision", value: decision, set: setDecision, options: decisions },
            { label: "Risk", value: risk, set: setRisk, options: risks },
            { label: "Model", value: model, set: setModel, options: models },
            { label: "User", value: user, set: setUser, options: users },
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
        title="Request Audit Trail"
        subtitle={`${filtered.length} of ${logs.length} records`}
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
            No audit records match the current filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request ID</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Detections</TableHead>
                  <TableHead>Latency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => (
                  <TableRow key={l.requestId}>
                    <TableCell className="font-mono text-xs">{l.requestId}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.timestamp}</TableCell>
                    <TableCell className="font-mono text-xs">{l.user}</TableCell>
                    <TableCell className="text-xs">{l.department}</TableCell>
                    <TableCell className="text-muted-foreground">{l.model}</TableCell>
                    <TableCell>
                      <DecisionBadge decision={l.decision} />
                    </TableCell>
                    <TableCell>
                      <RiskScore score={l.riskScore} showBar={false} />
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-xs">
                      {l.detections.length ? l.detections.join(", ") : "None"}
                    </TableCell>
                    <TableCell className="font-mono text-xs tabular-nums">{l.latencyMs}ms</TableCell>
                    <TableCell>
                      <StatusPill tone={statusTone(l.status)}>{l.status}</StatusPill>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(l)}>
                        View Details
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
                  <span className="font-mono text-sm">{selected.requestId}</span>
                  <DecisionBadge decision={selected.decision} />
                </SheetTitle>
              </SheetHeader>
              <div className="grid gap-5 px-4 pb-8">
                <dl className="grid grid-cols-2 gap-3 text-xs">
                  {[
                    ["Timestamp", selected.timestamp],
                    ["User", selected.user],
                    ["Role", selected.role],
                    ["Department", selected.department],
                    ["Model", selected.model],
                    ["Latency", `${selected.latencyMs} ms`],
                    ["Auth Status", selected.authStatus],
                    ["Policy Result", selected.policyResult],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-md border border-border bg-surface-strong p-2.5">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="mt-0.5 font-mono text-[11px] break-all">{v}</dd>
                    </div>
                  ))}
                </dl>

                <div className="flex items-center gap-3">
                  <StatusPill tone={statusTone(selected.status)}>{selected.status}</StatusPill>
                  <div className="flex-1">
                    <RiskScore score={selected.riskScore} />
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">Security Checks</h3>
                  <ul className="grid gap-2">
                    {selected.securityChecks.map((c) => (
                      <li
                        key={c.name}
                        className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-strong px-3 py-2 text-xs"
                      >
                        <span>{c.name}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {c.result}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">Sanitized Prompt</h3>
                  <pre className="overflow-x-auto rounded-md border border-border bg-surface-strong p-3 font-mono text-[11px] whitespace-pre-wrap">
                    {selected.sanitizedPrompt}
                  </pre>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Secrets and personal data are permanently tokenized — raw values are never
                    stored or displayed.
                  </p>
                </div>

                <div className="grid gap-2 text-xs">
                  <div className="rounded-md border border-border bg-surface-strong p-2.5">
                    <p className="text-muted-foreground">LLM Status</p>
                    <p className="mt-0.5 font-mono text-[11px]">{selected.llmStatus}</p>
                  </div>
                  <div className="rounded-md border border-border bg-surface-strong p-2.5">
                    <p className="text-muted-foreground">Response Scan</p>
                    <p className="mt-0.5 font-mono text-[11px]">{selected.responseScan}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
