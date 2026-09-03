import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, ChevronDown, LogOut, Menu, Moon, Search, Sun, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getNotifications } from "@/services/healthService";
import { getGatewayHealthStatus, logout } from "@/services/authService";
import { USE_MOCK_API } from "@/services/api";
import { searchWorkspace, type GlobalSearchResult } from "@/services/globalSearchService";
import type { AppNotification, AuthUser } from "@/types";
import { cn } from "@/lib/utils";

const THEME_STORAGE_KEY = "sentinel-theme";
const NOTIFICATION_READ_KEY_PREFIX = "sentinel-read-notification-ids";

function getReadNotificationIds(userId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const value = window.localStorage.getItem(`${NOTIFICATION_READ_KEY_PREFIX}:${userId}`);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function Header({
  title,
  user,
  onOpenMobileNav,
}: {
  title: string;
  user: AuthUser;
  onOpenMobileNav: () => void;
}) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [health, setHealth] = useState<"healthy" | "degraded" | "down">("healthy");
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark";
  });
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [searchMessage, setSearchMessage] = useState("");

  useEffect(() => {
    void getNotifications().then((items) => {
      setNotifications(items);
      const readIds = new Set(getReadNotificationIds(user.id));
      setUnreadCount(items.filter((item) => !readIds.has(item.id)).length);
    });
    void getGatewayHealthStatus().then(setHealth);
  }, [user.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.classList.toggle("dark", dark);
    window.localStorage.setItem(THEME_STORAGE_KEY, dark ? "dark" : "light");
  }, [dark]);

  const handleNotificationsOpenChange = (open: boolean) => {
    if (!open || typeof window === "undefined") return;
    const key = `${NOTIFICATION_READ_KEY_PREFIX}:${user.id}`;
    const readIds = new Set(getReadNotificationIds(user.id));
    for (const notification of notifications) {
      readIds.add(notification.id);
    }
    window.localStorage.setItem(key, JSON.stringify([...readIds]));
    setUnreadCount(0);
  };

  const handleLogout = () => {
    void logout();
    void navigate({ to: "/" });
  };

  const goToResult = (result: GlobalSearchResult) => {
    void navigate({
      to: result.target,
      search: { q: result.query },
    } as never);
  };

  const runSearch = () => {
    const next = query.trim();
    if (!next || searching) return;
    setSearching(true);
    setSearchMessage("");
    searchWorkspace(next)
      .then((matches) => {
        setResults(matches);
        if (matches.length === 0) {
          setSearchMessage("No results");
          return;
        }
        goToResult(matches[0]!);
      })
      .catch((e: Error) => {
        setResults([]);
        setSearchMessage(e.message);
      })
      .finally(() => setSearching(false));
  };

  return (
    <header className="app-header sticky top-0 z-30 flex h-14 flex-wrap items-center gap-2 border-b border-border bg-surface/95 px-4 py-1.5 backdrop-blur">
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="app-icon-button grid size-8 place-items-center rounded-md border border-border lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-4" />
      </button>

      <h1 className="mr-auto text-sm font-semibold tracking-tight text-foreground">{title}</h1>

      <div className="relative hidden w-64 xl:block">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="app-search-input h-8 pl-8 text-[13px]"
          placeholder="Search events, users, request IDs..."
          aria-label="Global search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSearchMessage("");
            setResults([]);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") runSearch();
          }}
        />
        {(results.length > 0 || searchMessage || searching) && (
          <div className="app-search-popover absolute top-11 right-0 left-0 z-50 rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-md">
            {searching && <p className="px-2 py-1.5 text-xs text-muted-foreground">Searching...</p>}
            {searchMessage && !searching && (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">{searchMessage}</p>
            )}
            {results.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() => goToResult(result)}
                className="app-search-result block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
              >
                <span className="block font-medium">{result.title}</span>
                <span className="block text-muted-foreground">{result.detail}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <span
        className={cn("app-env-chip", USE_MOCK_API ? "app-env-chip-demo" : "app-env-chip-live")}
      >
        {USE_MOCK_API ? "Demo Environment" : "Live Environment"}
      </span>

      <span
        className="app-health-chip hidden h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs sm:flex"
        title="Gateway health"
      >
        <span
          className={cn(
            "size-2 rounded-full",
            health === "healthy" ? "bg-safe" : health === "degraded" ? "bg-warn" : "bg-danger",
          )}
          aria-hidden
        />
        Gateway {health}
      </span>

      <DropdownMenu onOpenChange={handleNotificationsOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="app-icon-button relative size-8"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-danger text-[10px] font-semibold text-danger-foreground">
                {unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="app-dropdown w-80">
          <DropdownMenuLabel>Security notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {notifications.map((n) => (
            <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 py-2">
              <span className="flex w-full items-center justify-between gap-2">
                <span className="text-xs font-medium">{n.title}</span>
                <span className="text-[10px] text-muted-foreground">{n.time}</span>
              </span>
              <span className="text-[11px] text-muted-foreground">{n.detail}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        size="icon"
        className="app-icon-button size-8"
        onClick={() => setDark((d) => !d)}
        aria-label="Toggle theme"
      >
        {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="app-profile-button h-8 gap-2 px-2">
            <UserCircle2 className="size-4 text-muted-foreground" />
            <span className="hidden text-left sm:block">
              <span className="block text-xs leading-tight font-medium">{user.name}</span>
              <span className="block text-[10px] leading-tight text-muted-foreground">
                {user.role}
              </span>
            </span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="app-dropdown w-56">
          <DropdownMenuLabel className="font-normal">
            <span className="block text-sm font-medium">{user.name}</span>
            <span className="block text-xs text-muted-foreground">{user.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>Department · {user.department}</DropdownMenuItem>
          <DropdownMenuItem disabled>Role · {user.role}</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleLogout}>
            <LogOut className="mr-2 size-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
