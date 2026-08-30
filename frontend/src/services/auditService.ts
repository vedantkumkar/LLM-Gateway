import { apiEndpoints, request, USE_MOCK_API } from "./api";
import {
  auditToEvent,
  eventFromBackend,
  mapAudit,
  parseBackendTimestamp,
  type BackendAuditRecord,
  type BackendSecurityEvent,
} from "./backendMappers";
import { mockAuditLogs, mockSecurityEvents } from "@/data/mockData";
import type { AuditLog, SecurityEvent } from "@/types";

const AUDIT_CACHE_TTL_MS = 45000;
const securityEventsCache = new Map<string, { value: SecurityEvent[]; expiresAt: number }>();
const securityEventsInflight = new Map<string, Promise<SecurityEvent[]>>();
let cacheScope = "signed-out";

export interface EventFilters {
  search?: string;
  severity?: string;
  threatType?: string;
  user?: string;
  department?: string;
  model?: string;
  decision?: string;
}

function cacheKey(filters: EventFilters) {
  return JSON.stringify(Object.entries(filters).sort(([a], [b]) => a.localeCompare(b)));
}

export function setAuditCacheScope(userId: string | null): void {
  const nextScope = userId ?? "signed-out";
  if (nextScope === cacheScope) return;
  cacheScope = nextScope;
  clearAuditCache();
}

export function clearAuditCache(): void {
  securityEventsCache.clear();
  securityEventsInflight.clear();
}

export async function getSecurityEvents(filters: EventFilters = {}): Promise<SecurityEvent[]> {
  const key = `${cacheScope}:security-events:${cacheKey(filters)}`;
  const cached = securityEventsCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (cached) securityEventsCache.delete(key);
  const active = securityEventsInflight.get(key);
  if (active) return active;

  const promise = loadSecurityEvents(filters).then((events) => {
    if (key.startsWith(`${cacheScope}:`)) {
      securityEventsCache.set(key, { value: events, expiresAt: Date.now() + AUDIT_CACHE_TTL_MS });
    }
    return events;
  });
  securityEventsInflight.set(key, promise);
  return promise.finally(() => {
    if (securityEventsInflight.get(key) === promise) securityEventsInflight.delete(key);
  });
}

async function loadSecurityEvents(filters: EventFilters): Promise<SecurityEvent[]> {
  if (USE_MOCK_API) {
    return request<SecurityEvent[]>({
      path: apiEndpoints.securityEvents,
      query: filters as Record<string, string | undefined>,
      mock: () => applyEventFilters(mockSecurityEvents, filters),
    });
  }
  const records = await request<BackendSecurityEvent[]>({
    path: apiEndpoints.securityEvents,
    query: { limit: 100 },
    mock: () => [] as BackendSecurityEvent[],
  });
  return applyEventFilters(records.map(eventFromBackend), filters);
}

function matches(value: string, filter?: string) {
  return !filter || filter === "all" || value === filter;
}

export function applyEventFilters(events: SecurityEvent[], f: EventFilters): SecurityEvent[] {
  const q = f.search?.trim().toLowerCase();
  return events.filter(
    (e) =>
      matches(e.severity, f.severity) &&
      matches(e.threatType, f.threatType) &&
      matches(e.user, f.user) &&
      matches(e.department, f.department) &&
      matches(e.model, f.model) &&
      matches(e.decision, f.decision) &&
      (!q ||
        [e.id, e.event, e.user, e.requestId, e.threatType, e.model]
          .join(" ")
          .toLowerCase()
          .includes(q)),
  );
}

export interface AuditFilters {
  search?: string;
  decision?: string;
  department?: string;
  model?: string;
}

export async function getAuditLogs(filters: AuditFilters = {}): Promise<AuditLog[]> {
  if (USE_MOCK_API) {
    return request<AuditLog[]>({
      path: apiEndpoints.audit,
      query: filters as Record<string, string | undefined>,
      mock: () => applyAuditFilters(mockAuditLogs, filters),
    });
  }
  const records = await request<BackendAuditRecord[]>({
    path: apiEndpoints.audit,
    query: {
      limit: 100,
      decision: filters.decision === "all" ? undefined : filters.decision,
      model: filters.model === "all" ? undefined : filters.model,
    },
    mock: () => [] as BackendAuditRecord[],
  });
  return applyAuditFilters(sortAuditRecords(records).map(mapAudit), filters);
}

function sortAuditRecords(records: BackendAuditRecord[]) {
  return [...records].sort(
    (a, b) =>
      parseBackendTimestamp(b.timestamp).getTime() - parseBackendTimestamp(a.timestamp).getTime(),
  );
}

export function applyAuditFilters(logs: AuditLog[], f: AuditFilters): AuditLog[] {
  const q = f.search?.trim().toLowerCase();
  return logs.filter(
    (l) =>
      matches(l.decision, f.decision) &&
      matches(l.department, f.department) &&
      matches(l.model, f.model) &&
      (!q ||
        [l.requestId, l.user, l.model, l.decision, ...l.detections]
          .join(" ")
          .toLowerCase()
          .includes(q)),
  );
}

export function auditLogsToCsv(logs: AuditLog[]): string {
  const header = [
    "Request ID",
    "Timestamp",
    "User",
    "Department",
    "Model",
    "Decision",
    "Risk Score",
    "Detections",
    "Latency (ms)",
    "Status",
  ];
  const rows = logs.map((l) => [
    l.requestId,
    l.timestamp,
    l.user,
    l.department,
    l.model,
    l.decision,
    String(l.riskScore),
    l.detections.join("|"),
    String(l.latencyMs),
    l.status,
  ]);
  return [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
}
