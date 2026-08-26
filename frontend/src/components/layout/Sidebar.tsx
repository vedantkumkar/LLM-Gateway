import { Link } from "@tanstack/react-router";
import {
  Activity,
  Boxes,
  ChevronLeft,
  FileClock,
  Gauge,
  LayoutDashboard,
  ScrollText,
  Settings,
  ShieldCheck,
  ShieldHalf,
  Terminal,
  Users,
} from "lucide-react";
import { getStoredUser } from "@/services/authService";
import { roleAccess, type AppRoute } from "@/services/rbacService";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  to: AppRoute;
  icon: typeof LayoutDashboard;
}

export const navGroups: { group: string; items: NavItem[] }[] = [
  {
    group: "Monitor",
    items: [
      { label: "Overview", to: "/overview", icon: LayoutDashboard },
      { label: "Security Events", to: "/security-events", icon: ShieldHalf },
      { label: "Analytics", to: "/analytics", icon: Activity },
    ],
  },
  {
    group: "Gateway",
    items: [
      { label: "Secure Playground", to: "/playground", icon: Terminal },
      { label: "Models", to: "/models", icon: Boxes },
      { label: "Policies", to: "/policies", icon: ScrollText },
    ],
  },
  {
    group: "Administration",
    items: [
      { label: "Users & Access", to: "/users", icon: Users },
      { label: "Audit Logs", to: "/audit-logs", icon: FileClock },
      { label: "System Health", to: "/system-health", icon: Gauge },
      { label: "Settings", to: "/settings", icon: Settings },
    ],
  },
];

export function SidebarContent({
  collapsed,
  onToggle,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  const role = getStoredUser()?.role ?? "Employee";
  const allowed = new Set(roleAccess[role]);
  const visibleGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => allowed.has(item.to)) }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div
        className={cn(
          "flex items-center gap-3 border-b border-sidebar-border px-4 py-4",
          collapsed && "justify-center px-2",
        )}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/20 text-primary ring-1 ring-primary/30">
          <ShieldCheck className="size-5" aria-hidden />
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">SentinelAI Gateway</p>
            <p className="truncate text-[11px] text-sidebar-muted">Enterprise AI Security</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Main navigation">
        {visibleGroups.map((group) => (
          <div key={group.group} className="mb-4">
            {!collapsed && (
              <p className="px-2 pb-1.5 text-[10px] font-semibold tracking-widest text-sidebar-muted uppercase">
                {group.group}
              </p>
            )}
            <ul className="grid gap-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      collapsed && "justify-center px-0",
                    )}
                    activeProps={{
                      className:
                        "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-[inset_2px_0_0_0_var(--color-primary)]",
                    }}
                  >
                    <item.icon className="size-4 shrink-0" aria-hidden />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          className="hidden items-center gap-2 border-t border-sidebar-border px-4 py-3 text-xs text-sidebar-muted transition-colors hover:text-sidebar-accent-foreground lg:flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={cn("size-4 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && "Collapse"}
        </button>
      )}
    </div>
  );
}
