import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SidebarContent } from "./Sidebar";
import { Header } from "./Header";
import { getStoredUser } from "@/services/authService";
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
    const stored = getStoredUser();
    if (!stored) {
      void navigate({ to: "/" });
      return;
    }
    if (!canAccessRoute(stored.role, location.pathname)) {
      void navigate({ to: firstAllowedRoute[stored.role], replace: true });
      return;
    }
    setUser(stored);
  }, [location.pathname, navigate]);

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Verifying session…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "hidden shrink-0 border-r border-sidebar-border lg:block",
          collapsed ? "w-[68px]" : "w-64",
        )}
      >
        <div className={cn("fixed top-0 bottom-0 left-0", collapsed ? "w-[68px]" : "w-64")}>
          <SidebarContent collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 border-sidebar-border bg-sidebar p-0">
          <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={title} user={user} onOpenMobileNav={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-5 md:px-6">
          {(heading || actions) && (
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                {heading && (
                  <h2 className="text-xl font-semibold tracking-tight md:text-2xl">{heading}</h2>
                )}
                {subheading && (
                  <p className="mt-1 text-sm text-muted-foreground">{subheading}</p>
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
