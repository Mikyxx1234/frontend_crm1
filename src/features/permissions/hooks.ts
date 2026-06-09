import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiUrl } from "@/lib/api";

import type {
  EffectivePermissions,
  GroupMember,
  GroupSummary,
  PermissionsCatalog,
  RoleSummary,
} from "./types";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `Erro ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Roles ──────────────────────────────────────────────────────────────────

export function useRoles() {
  return useQuery<RoleSummary[]>({
    queryKey: ["roles"],
    queryFn: () => apiFetch("/api/roles"),
  });
}

export function useRole(id: string | null) {
  return useQuery<RoleSummary>({
    queryKey: ["roles", id],
    queryFn: () => apiFetch(`/api/roles/${id}`),
    enabled: !!id,
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; permissions: string[] }) =>
      apiFetch<RoleSummary>("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      description?: string;
      permissions?: string[];
    }) =>
      apiFetch<RoleSummary>(`/api/roles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: ["roles"] });
      void qc.invalidateQueries({ queryKey: ["roles", id] });
    },
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: boolean }>(`/api/roles/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

export function useAddRoleAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, userId }: { roleId: string; userId: string }) =>
      apiFetch(`/api/roles/${roleId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      }),
    onSuccess: (_, { roleId, userId }) => {
      void qc.invalidateQueries({ queryKey: ["roles", roleId] });
      void qc.invalidateQueries({ queryKey: ["roles"] });
      // Invalida o efetivo do usuário pra refletir as novas roles na UI sem refresh.
      // `my-permissions` é o cache da sessão corrente — invalidado também caso o
      // admin esteja editando a própria conta (cenário comum em setup inicial).
      void qc.invalidateQueries({ queryKey: ["effective-permissions", userId] });
      void qc.invalidateQueries({ queryKey: ["my-permissions"] });
    },
  });
}

export function useRemoveRoleAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, userId }: { roleId: string; userId: string }) =>
      apiFetch(`/api/roles/${roleId}/assignments/${userId}`, { method: "DELETE" }),
    onSuccess: (_, { roleId, userId }) => {
      void qc.invalidateQueries({ queryKey: ["roles", roleId] });
      void qc.invalidateQueries({ queryKey: ["roles"] });
      void qc.invalidateQueries({ queryKey: ["effective-permissions", userId] });
      void qc.invalidateQueries({ queryKey: ["my-permissions"] });
    },
  });
}

// ── Grupos ─────────────────────────────────────────────────────────────────

export function useGroups() {
  return useQuery<GroupSummary[]>({
    queryKey: ["groups"],
    queryFn: () => apiFetch("/api/groups"),
  });
}

export function useGroup(id: string | null) {
  return useQuery<GroupSummary>({
    queryKey: ["groups", id],
    queryFn: () => apiFetch(`/api/groups/${id}`),
    enabled: !!id,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      color?: string;
      roleId?: string | null;
      channelGrants?: string[];
      stageGrants?: string[];
    }) =>
      apiFetch<GroupSummary>("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      description?: string;
      color?: string;
      roleId?: string | null;
      channelGrants?: string[];
      stageGrants?: string[];
      isActive?: boolean;
    }) =>
      apiFetch<GroupSummary>(`/api/groups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: ["groups"] });
      void qc.invalidateQueries({ queryKey: ["groups", id] });
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: boolean }>(`/api/groups/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useAddGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      userId,
      roleId,
    }: {
      groupId: string;
      userId: string;
      roleId?: string | null;
    }) =>
      apiFetch<GroupMember>(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, roleId }),
      }),
    onSuccess: (_, { groupId }) => {
      void qc.invalidateQueries({ queryKey: ["groups", groupId] });
      void qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useUpdateGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      userId,
      roleId,
    }: {
      groupId: string;
      userId: string;
      roleId: string | null;
    }) =>
      apiFetch<GroupMember>(`/api/groups/${groupId}/members/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId }),
      }),
    onSuccess: (_, { groupId }) => {
      void qc.invalidateQueries({ queryKey: ["groups", groupId] });
    },
  });
}

export function useRemoveGroupMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      apiFetch(`/api/groups/${groupId}/members/${userId}`, { method: "DELETE" }),
    onSuccess: (_, { groupId }) => {
      void qc.invalidateQueries({ queryKey: ["groups", groupId] });
      void qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

// ── Catálogo de permissões ─────────────────────────────────────────────────

export function usePermissionsCatalog() {
  return useQuery<PermissionsCatalog>({
    queryKey: ["permissions-catalog"],
    queryFn: () => apiFetch("/api/permissions/catalog"),
    staleTime: Infinity,
  });
}

// ── Permissões efetivas ────────────────────────────────────────────────────

export function useEffectivePermissions(userId: string | null) {
  return useQuery<EffectivePermissions>({
    queryKey: ["effective-permissions", userId],
    queryFn: () => apiFetch(`/api/users/${userId}/effective-permissions`),
    enabled: !!userId,
  });
}
