"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api";

export interface DepartmentMember {
  id: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
}

function membersKey(departmentId: string | null) {
  return ["settings", "department-members", departmentId ?? ""] as const;
}

export function useDepartmentMembers(departmentId: string | null) {
  return useQuery<DepartmentMember[]>({
    queryKey: membersKey(departmentId),
    queryFn: async () => {
      const res = await fetch(
        apiUrl(`/api/settings/departments/${departmentId}/members`),
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("Erro ao carregar membros");
      return res.json();
    },
    enabled: !!departmentId,
    staleTime: 15_000,
  });
}

/** Substitui o conjunto de membros do departamento (PUT bulk). */
export function useSetDepartmentMembers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ departmentId, userIds }: { departmentId: string; userIds: string[] }) => {
      const res = await fetch(apiUrl(`/api/settings/departments/${departmentId}/members`), {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Erro ao salvar membros");
      }
      return res.json() as Promise<DepartmentMember[]>;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: membersKey(vars.departmentId) });
      qc.invalidateQueries({ queryKey: ["settings", "departments"] });
    },
  });
}
