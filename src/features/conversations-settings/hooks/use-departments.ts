"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api";

export interface Department {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: string;
}

const QUERY_KEY = ["settings", "departments"];

async function fetchDepartments(): Promise<Department[]> {
  const res = await fetch(apiUrl("/api/settings/departments"), {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Erro ao carregar departamentos");
  return res.json();
}

export function useDepartments() {
  return useQuery<Department[]>({
    queryKey: QUERY_KEY,
    queryFn: fetchDepartments,
    staleTime: 30_000,
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, color, icon }: { name: string; color: string; icon: string }) => {
      const res = await fetch(apiUrl("/api/settings/departments"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color, icon }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Erro ao criar departamento");
      }
      return res.json() as Promise<Department>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; color?: string; icon?: string }) => {
      const res = await fetch(`/api/settings/departments/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Erro ao atualizar departamento");
      }
      return res.json() as Promise<Department>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/api/settings/departments/${id}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (res.status === 409) {
        const err = await res.json().catch(() => ({}));
        throw Object.assign(
          new Error((err as { message?: string }).message ?? "Este departamento está em uso e não pode ser excluído"),
          { status: 409 },
        );
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Erro ao excluir departamento");
      }
    },
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueryData<Department[]>(QUERY_KEY);
      qc.setQueryData<Department[]>(QUERY_KEY, (old) => old?.filter((d) => d.id !== id) ?? []);
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData<Department[]>(QUERY_KEY, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
