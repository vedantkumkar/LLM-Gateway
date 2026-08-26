import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Briefcase,
  Check,
  Code2,
  Minus,
  Search,
  ShieldCheck,
  ShieldHalf,
  UserCheck,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { StatusPill } from "@/components/security/badges";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
  capabilities,
  getRolePermissions,
  getUsers,
  summarizeUsers,
  updateUserRole,
} from "@/services/userService";
import type { DirectoryUser, RolePermission, UserRole } from "@/types";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "Users & Access · SentinelAI Gateway" },
      {
        name: "description",
        content: "Manage gateway users, roles and model access with an RBAC permissions matrix.",
      },
      { property: "og:title", content: "Users & Access" },
      {
        property: "og:description",
        content: "Directory, role management and RBAC permissions for the AI security gateway.",
      },
    ],
  }),
  component: UsersPage,
});

const roles: UserRole[] = ["Admin", "Security Analyst", "Developer", "Employee", "Auditor"];

function initialSearch() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("q") ?? "";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function UsersPage() {
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<DirectoryUser | null>(null);
  const [roleDraft, setRoleDraft] = useState<UserRole>("Employee");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState(initialSearch);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([getUsers(), getRolePermissions()])
      .then(([u, p]) => {
        setUsers(u);
        setPermissions(p);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const summary = useMemo(() => summarizeUsers(users), [users]);
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) =>
      [user.name, user.email, user.username, user.department, user.role]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [users, search]);

  const openEdit = (u: DirectoryUser) => {
    setEditing(u);
    setRoleDraft(u.role);
  };

  const saveRole = () => {
    if (!editing || saving) return;
    setSaving(true);
    updateUserRole(editing.id, roleDraft)
      .then((next) => {
        setUsers(next);
        setEditing(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setSaving(false));
  };

  const statusTone = (s: DirectoryUser["status"]) =>
    s === "Active" ? "safe" : s === "Suspended" ? "danger" : "info";

  const permissionFor = (role: UserRole, capability: string) =>
    permissions.find((p) => p.role === role)?.permissions[capability] ?? false;

  return (
    <AppShell
      title="Users & Access"
      heading="Users & Access"
      subheading="Manage directory members, roles and model access."
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard
            label="Total Users"
            value={summary.total.toLocaleString()}
            icon={Users}
            tone="info"
          />
          <MetricCard
            label="Active Users"
            value={summary.active.toLocaleString()}
            icon={UserCheck}
            tone="safe"
          />
          <MetricCard
            label="Admins"
            value={summary.admins.toLocaleString()}
            icon={ShieldCheck}
            tone="info"
          />
          <MetricCard
            label="Security Analysts"
            value={summary.analysts.toLocaleString()}
            icon={ShieldHalf}
            tone="safe"
          />
          <MetricCard
            label="Developers"
            value={summary.developers.toLocaleString()}
            icon={Code2}
            tone="info"
          />
          <MetricCard
            label="Employees"
            value={summary.employees.toLocaleString()}
            icon={Briefcase}
            tone="neutral"
          />
        </div>
      )}

      <SectionCard
        title="User Directory"
        subtitle={`${filteredUsers.length} of ${users.length} members`}
        className="mt-5"
      >
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users, roles, departments..."
            className="pl-8"
          />
        </div>
        {loading ? (
          <div className="grid gap-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-md" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Model Access</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-8">
                          <AvatarFallback className="bg-sidebar-accent text-xs text-sidebar-accent-foreground">
                            {initials(u.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium whitespace-nowrap">{u.name}</p>
                          <p className="truncate font-mono text-[11px] text-muted-foreground">
                            {u.username}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{u.email}</TableCell>
                    <TableCell className="text-xs">{u.department}</TableCell>
                    <TableCell className="text-xs font-medium">{u.role}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                      {u.modelAccess}
                    </TableCell>
                    <TableCell>
                      <StatusPill tone={statusTone(u.status)}>{u.status}</StatusPill>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.lastActive}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>
                        Edit role
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="RBAC Permissions Matrix"
        subtitle="Capabilities granted to each role"
        className="mt-5"
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[160px]">Role</TableHead>
                {capabilities.map((c) => (
                  <TableHead key={c} className="text-center">
                    {c}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role}>
                  <TableCell className="font-medium whitespace-nowrap">{role}</TableCell>
                  {capabilities.map((c) => {
                    const allowed = permissionFor(role, c);
                    return (
                      <TableCell key={c} className="text-center">
                        {allowed ? (
                          <Check className="mx-auto size-4 text-safe" aria-label="Granted" />
                        ) : (
                          <Minus
                            className="mx-auto size-4 text-muted-foreground/50"
                            aria-label="Denied"
                          />
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          {editing && (
            <>
              <DialogHeader>
                <DialogTitle>Edit user role</DialogTitle>
                <DialogDescription>
                  Update {editing.name}&apos;s role. Changes apply to the local demo directory only.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="flex items-center gap-3 rounded-md border border-border bg-surface-strong p-3">
                  <Avatar className="size-10">
                    <AvatarFallback className="bg-sidebar-accent text-sm text-sidebar-accent-foreground">
                      {initials(editing.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{editing.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {editing.email} · {editing.department}
                    </p>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-md border border-border bg-surface-strong p-2.5">
                    <dt className="text-muted-foreground">Model Access</dt>
                    <dd className="mt-0.5 font-mono text-[11px] break-all">
                      {editing.modelAccess}
                    </dd>
                  </div>
                  <div className="rounded-md border border-border bg-surface-strong p-2.5">
                    <dt className="text-muted-foreground">Last Active</dt>
                    <dd className="mt-0.5 font-mono text-[11px]">{editing.lastActive}</dd>
                  </div>
                </dl>

                <div className="grid gap-1.5">
                  <Label>Role</Label>
                  <Select value={roleDraft} onValueChange={(v) => setRoleDraft(v as UserRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button onClick={saveRole} disabled={saving || roleDraft === editing.role}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
