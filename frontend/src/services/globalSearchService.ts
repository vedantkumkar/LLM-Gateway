import { getAuditLogs, getSecurityEvents } from "./auditService";
import { getUsers } from "./userService";

export type GlobalSearchTarget = "/audit-logs" | "/security-events" | "/users";

export interface GlobalSearchResult {
  id: string;
  title: string;
  detail: string;
  target: GlobalSearchTarget;
  query: string;
}

function includes(value: string, query: string) {
  return value.toLowerCase().includes(query);
}

export async function searchWorkspace(rawQuery: string): Promise<GlobalSearchResult[]> {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];

  const [auditLogs, events, users] = await Promise.all([
    getAuditLogs(),
    getSecurityEvents(),
    getUsers(),
  ]);

  const auditResults = auditLogs
    .filter((log) =>
      [
        log.requestId,
        log.user,
        log.model,
        log.decision,
        log.department,
        log.detections.join(" "),
      ].some((value) => includes(value, query)),
    )
    .slice(0, 4)
    .map((log): GlobalSearchResult => ({
      id: `audit-${log.requestId}`,
      title: log.requestId,
      detail: `${log.decision} · ${log.user}`,
      target: "/audit-logs",
      query: log.requestId,
    }));

  const eventResults = events
    .filter((event) =>
      [
        event.id,
        event.event,
        event.requestId,
        event.user,
        event.threatType,
        event.decision,
      ].some((value) => includes(value, query)),
    )
    .slice(0, 4)
    .map((event): GlobalSearchResult => ({
      id: `event-${event.id}`,
      title: event.event,
      detail: `${event.decision} · ${event.requestId}`,
      target: "/security-events",
      query: event.requestId,
    }));

  const userResults = users
    .filter((user) =>
      [user.name, user.email, user.username, user.role, user.department].some((value) =>
        includes(value, query),
      ),
    )
    .slice(0, 4)
    .map((user): GlobalSearchResult => ({
      id: `user-${user.id}`,
      title: user.name,
      detail: `${user.role} · ${user.email}`,
      target: "/users",
      query: user.email,
    }));

  return [...auditResults, ...eventResults, ...userResults].slice(0, 8);
}
