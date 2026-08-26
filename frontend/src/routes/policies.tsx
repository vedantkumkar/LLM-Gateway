import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { SeverityBadge, StatusPill } from "@/components/security/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  createPolicy,
  getPolicies,
  togglePolicy,
  updatePolicy,
  type PolicyDraft,
} from "@/services/policyService";
import { getStoredUser } from "@/services/authService";
import { canMutatePolicies } from "@/services/rbacService";
import type { Policy } from "@/types";

export const Route = createFileRoute("/policies")({
  head: () => ({
    meta: [
      { title: "Security Policies · SentinelAI Gateway" },
      {
        name: "description",
        content:
          "Manage DLP, PII, injection-defense and model-access policies enforced on every AI request.",
      },
      { property: "og:title", content: "Security Policies" },
      {
        property: "og:description",
        content: "Create, tune and toggle enterprise AI guardrail policies.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PoliciesPage,
});

const categories: Policy["category"][] = [
  "PII",
  "PHI",
  "Secrets",
  "Prompt Injection",
  "Model Access",
  "Rate Limit",
  "Content Policy",
  "DLP",
];
const severities: Policy["severity"][] = ["low", "medium", "high", "critical"];
const actions: Policy["action"][] = ["Allow", "Alert", "Redact", "Block", "Restrict"];
const scopes: Policy["appliesTo"][] = ["Organization", "Department", "Role", "User"];

const emptyDraft: PolicyDraft = {
  name: "",
  description: "",
  category: "PII",
  severity: "medium",
  threshold: 70,
  action: "Redact",
  appliesTo: "Organization",
  enabled: true,
};

const severityTone = (s: Policy["severity"]) =>
  s === "critical" || s === "high" ? "danger" : s === "medium" ? "warn" : "safe";

function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Policy | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PolicyDraft>(emptyDraft);
  const [notice, setNotice] = useState("");
  const canMutate = canMutatePolicies(getStoredUser()?.role ?? "Employee");

  const load = () => {
    setLoading(true);
    setError(null);
    getPolicies()
      .then(setPolicies)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const stats = useMemo(
    () => ({
      total: policies.length,
      enabled: policies.filter((p) => p.enabled).length,
      blocking: policies.filter((p) => p.action === "Block").length,
    }),
    [policies],
  );

  const onToggle = (p: Policy, enabled: boolean) => {
    if (!canMutate) return;
    setPolicies((prev) => prev.map((x) => (x.id === p.id ? { ...x, enabled } : x)));
    setNotice("Demo/local policy change only. Backend enforcement was not changed.");
    togglePolicy(p.id, enabled)
      .then(setPolicies)
      .catch((e: Error) => setError(e.message));
  };

  const openCreate = () => {
    if (!canMutate) return;
    setEditing(null);
    setDraft(emptyDraft);
    setOpen(true);
  };

  const openEdit = (p: Policy) => {
    if (!canMutate) return;
    setEditing(p);
    const { id: _id, updatedAt: _u, ...rest } = p;
    setDraft(rest);
    setOpen(true);
  };

  const submit = () => {
    if (!canMutate) return;
    if (!draft.name.trim()) return;
    setSaving(true);
    const op = editing ? updatePolicy(editing.id, draft) : createPolicy(draft);
    op.then((next) => {
      setPolicies(next);
      setOpen(false);
    })
      .catch((e: Error) => setError(e.message))
      .finally(() => setSaving(false));
  };

  return (
    <AppShell
      title="Policies"
      heading="Security Policies"
      subheading="Guardrails evaluated in order on every prompt and response."
      actions={
        canMutate ? (
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" aria-hidden />
            Add Policy
          </Button>
        ) : (
          <StatusPill tone="info">Read-only</StatusPill>
        )
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

      {notice && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-info/30 bg-info-soft px-4 py-3 text-sm text-info">
          <span>{notice}</span>
          <Button size="sm" variant="outline" onClick={() => setNotice("")}>
            Dismiss
          </Button>
        </div>
      )}

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Policies", value: stats.total },
          { label: "Enabled", value: stats.enabled },
          { label: "Blocking Actions", value: stats.blocking },
        ].map((s) => (
          <div key={s.label} className="card-surface p-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {s.label}
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <SectionCard
        title="Policy Catalog"
        subtitle={`${policies.length} policies configured`}
        bodyClassName="p-0"
      >
        {loading ? (
          <div className="grid gap-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-md" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Manage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <p className="font-medium">{p.name}</p>
                      <p className="mt-0.5 max-w-[380px] text-xs text-muted-foreground">
                        {p.description}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs">{p.category}</TableCell>
                    <TableCell>
                      <SeverityBadge severity={p.severity} />
                    </TableCell>
                    <TableCell>
                      <StatusPill tone={severityTone(p.severity)}>{p.action}</StatusPill>
                    </TableCell>
                    <TableCell className="text-xs">
                      {p.appliesTo}
                      {p.appliesToValue ? ` · ${p.appliesToValue}` : ""}
                    </TableCell>
                    <TableCell className="font-mono text-xs tabular-nums">{p.threshold}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={p.enabled}
                          onCheckedChange={(v) => onToggle(p, v)}
                          aria-label={`Toggle ${p.name}`}
                          disabled={!canMutate}
                        />
                        <span className="text-xs text-muted-foreground">
                          {canMutate
                            ? `${p.enabled ? "Enabled" : "Disabled"} · Demo only`
                            : "Read-only"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(p)}
                        disabled={!canMutate}
                      >
                        {canMutate ? "Edit" : "Read-only"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Policy" : "Add Policy"}</DialogTitle>
            <DialogDescription>
              Changes apply to the local demo policy set only — no backend calls are made.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="p-name">Policy name</Label>
              <Input
                id="p-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Block Secret Keys"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea
                id="p-desc"
                rows={3}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Category</Label>
                <Select
                  value={draft.category}
                  onValueChange={(v) => setDraft({ ...draft, category: v as Policy["category"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Severity</Label>
                <Select
                  value={draft.severity}
                  onValueChange={(v) => setDraft({ ...draft, severity: v as Policy["severity"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {severities.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Action</Label>
                <Select
                  value={draft.action}
                  onValueChange={(v) => setDraft({ ...draft, action: v as Policy["action"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {actions.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Scope</Label>
                <Select
                  value={draft.appliesTo}
                  onValueChange={(v) => setDraft({ ...draft, appliesTo: v as Policy["appliesTo"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scopes.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Risk threshold</Label>
                <span className="font-mono text-xs tabular-nums">{draft.threshold}</span>
              </div>
              <Slider
                value={[draft.threshold]}
                min={0}
                max={100}
                step={5}
                onValueChange={(v) => setDraft({ ...draft, threshold: v[0] ?? draft.threshold })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Enabled</p>
                <p className="text-xs text-muted-foreground">
                  Local demo toggle; backend enforcement is unchanged.
                </p>
              </div>
              <Switch
                checked={draft.enabled}
                onCheckedChange={(v) => setDraft({ ...draft, enabled: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving || !draft.name.trim()}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create policy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
