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

export interface EventFilters {
  search?: string;
  severity?: string;
  threatType?: string;
  user?: string;
  department?: string;
  model?: string;
  decision?: string;
}

export async function getSecurityEvents(filters: EventFilters = {}): Promise<SecurityEvent[]> {
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
