import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldCheck } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SidebarContent } from "./Sidebar";
import { Header } from "./Header";
import { subscribeToAuthChanges, verifySession } from "@/services/authService";
import { canAccessRoute, firstAllowedRoute } from "@/services/rbacService";
import type { AuthUser } from "@/types";
import { cn } from "@/lib/utils";

export function AppShell({
  title,
  heading,
  subheading,
  actions,
  children,
}: {
  title: string;
  heading?: string;
  subheading?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    verifySession().then((stored) => {
      if (cancelled) return;
      if (!stored) {
        void navigate({ to: "/" });
        return;
      }
      setUser(stored);
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    return subscribeToAuthChanges((nextUser) => {
      setUser(nextUser);
      if (!nextUser) void navigate({ to: "/" });
    });
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    if (!canAccessRoute(user.role, location.pathname)) {
      void navigate({ to: firstAllowedRoute[user.role], replace: true });
    }
  }, [location.pathname, navigate, user]);

  if (!user) {
    return (
      <div className="app-session-screen">
        <div className="app-session-card">
          <span className="app-session-logo">
            <ShieldCheck className="size-6" aria-hidden />
          </span>
          <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-foreground">Securing your session</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Verifying identity and access permissions…
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell flex min-h-screen bg-background">
      <aside
        className={cn(
          "app-sidebar-rail hidden shrink-0 border-r border-sidebar-border lg:block",
          collapsed ? "w-[60px]" : "w-[204px]",
        )}
      >
        <div className={cn("fixed top-0 bottom-0 left-0", collapsed ? "w-[60px]" : "w-[204px]")}>
          <SidebarContent collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[204px] border-sidebar-border bg-sidebar p-0">
          <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={title} user={user} onOpenMobileNav={() => setMobileOpen(true)} />
        <main className="app-workspace flex-1 px-4 py-3 md:px-5">
          {(heading || actions) && (
            <div className="app-page-header mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                {heading && (
                  <h2 className="text-xl font-semibold tracking-tight md:text-2xl">{heading}</h2>
                )}
                {subheading && (
                  <p className="mt-1 text-[13px] text-muted-foreground">{subheading}</p>
                )}
              </div>
              {actions}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
