import { apiEndpoints, request, USE_MOCK_API } from "./api";
import { backendRolePermissions, mapUser, type BackendUser } from "./backendMappers";
import { mockRolePermissions, mockUsers, rbacCapabilities } from "@/data/mockData";
import type { DirectoryUser, RolePermission, UserRole } from "@/types";

let users: DirectoryUser[] = [...mockUsers];

export async function getUsers(): Promise<DirectoryUser[]> {
  if (USE_MOCK_API) {
    return request<DirectoryUser[]>({
      path: apiEndpoints.users,
      mock: () => users.map((u) => ({ ...u })),
    });
  }
  const backendUsers = await request<BackendUser[]>({
    path: apiEndpoints.users,
    mock: () => [] as BackendUser[],
  });
  users = backendUsers.map(mapUser);
  return users.map((u) => ({ ...u }));
}

export async function updateUserRole(id: string, role: UserRole): Promise<DirectoryUser[]> {
  if (USE_MOCK_API) {
    return request<DirectoryUser[]>({
      path: `${apiEndpoints.users}/${id}`,
      method: "PATCH",
      body: { role },
      mockDelayMs: 300,
      mock: () => {
        users = users.map((u) => (u.id === id ? { ...u, role } : u));
        return users.map((u) => ({ ...u }));
      },
    });
  }
  const backend = await request<BackendUser>({
    path: `${apiEndpoints.users}/${id}`,
    method: "PATCH",
    body: { role: roleToBackend(role) },
    mock: () => ({}) as BackendUser,
  });
  users = users.map((u) => (u.id === id ? mapUser(backend) : u));
  return users.map((u) => ({ ...u }));
}

export async function getRolePermissions(): Promise<RolePermission[]> {
  if (USE_MOCK_API) {
    return request<RolePermission[]>({
      path: `${apiEndpoints.users}/permissions`,
      mock: () => mockRolePermissions,
    });
  }
  const permissions = await request<Record<string, string[]>>({
    path: `${apiEndpoints.users}/permissions`,
    mock: () => ({}),
  });
  return backendRolePermissions(permissions);
}

export const capabilities = rbacCapabilities;

function roleToBackend(role: UserRole) {
  return role.toLowerCase().replaceAll(" ", "_");
}

export function summarizeUsers(list: DirectoryUser[]) {
  const byRole = (role: UserRole) => list.filter((u) => u.role === role).length;
  return {
    total: list.length,
    active: list.filter((u) => u.status === "Active").length,
    admins: byRole("Admin"),
    analysts: byRole("Security Analyst"),
    developers: byRole("Developer"),
    employees: byRole("Employee"),
    auditors: byRole("Auditor"),
  };
}
