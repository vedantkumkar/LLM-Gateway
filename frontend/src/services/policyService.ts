import { apiEndpoints, request, USE_MOCK_API } from "./api";
import { mapPolicies, type BackendPolicyConfig } from "./backendMappers";
import { mockPolicies } from "@/data/mockData";
import type { Policy } from "@/types";

let policies: Policy[] = [...mockPolicies];

export async function getPolicies(): Promise<Policy[]> {
  if (USE_MOCK_API) {
    return request<Policy[]>({
      path: apiEndpoints.policies,
      mock: () => policies.map((p) => ({ ...p })),
    });
  }
  const config = await request<BackendPolicyConfig>({
    path: apiEndpoints.policies,
    mock: () => ({}) as BackendPolicyConfig,
  });
  policies = mapPolicies(config);
  return policies.map((p) => ({ ...p }));
}

export async function togglePolicy(id: string, enabled: boolean): Promise<Policy[]> {
  if (!USE_MOCK_API) {
    policies = policies.map((p) => (p.id === id ? { ...p, enabled } : p));
    return policies.map((p) => ({ ...p }));
  }
  return request<Policy[]>({
    path: `${apiEndpoints.policies}/${id}`,
    method: "PATCH",
    body: { enabled },
    mockDelayMs: 220,
    mock: () => {
      policies = policies.map((p) => (p.id === id ? { ...p, enabled } : p));
      return policies.map((p) => ({ ...p }));
    },
  });
}

export type PolicyDraft = Omit<Policy, "id" | "updatedAt">;

export async function createPolicy(draft: PolicyDraft): Promise<Policy[]> {
  if (!USE_MOCK_API) {
    const id = `LOCAL-${String(policies.length + 1).padStart(3, "0")}`;
    policies = [...policies, { ...draft, id, updatedAt: "Local demo" }];
    return policies.map((p) => ({ ...p }));
  }
  return request<Policy[]>({
    path: apiEndpoints.policies,
    method: "POST",
    body: draft,
    mockDelayMs: 400,
    mock: () => {
      const id = `PL-${String(policies.length + 1).padStart(3, "0")}`;
      policies = [
        ...policies,
        { ...draft, id, updatedAt: new Date().toISOString().slice(0, 10) },
      ];
      return policies.map((p) => ({ ...p }));
    },
  });
}

export async function updatePolicy(id: string, draft: PolicyDraft): Promise<Policy[]> {
  if (!USE_MOCK_API) {
    policies = policies.map((p) => (p.id === id ? { ...p, ...draft, updatedAt: "Local demo" } : p));
    return policies.map((p) => ({ ...p }));
  }
  return request<Policy[]>({
    path: `${apiEndpoints.policies}/${id}`,
    method: "PUT",
    body: draft,
    mockDelayMs: 350,
    mock: () => {
      policies = policies.map((p) =>
        p.id === id ? { ...p, ...draft, updatedAt: new Date().toISOString().slice(0, 10) } : p,
      );
      return policies.map((p) => ({ ...p }));
    },
  });
}
