/**
 * Permissões efetivas do usuário logado — Permissions v2 (Sprint 5).
 *
 * Usa o endpoint /api/users/[id]/effective-permissions criado no Sprint 2.
 * staleTime alinhado com TTL do cache Redis de authz no backend (60s).
 */
"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

export type MyPermissionsData = {
  permissions: string[];
  channelGrants: string[];
  stageGrants: string[];
  roles: { id: string; name: string; systemPreset: string | null }[];
  groups: { id: string; name: string }[];
};

const EMPTY_PERMISSIONS: MyPermissionsData = {
  permissions: [],
  channelGrants: [],
  stageGrants: [],
  roles: [],
  groups: [],
};

export function useMyPermissions() {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  return useQuery({
    queryKey: ["my-permissions", userId],
    queryFn: async (): Promise<MyPermissionsData> => {
      const res = await fetch(`/api/users/${userId}/effective-permissions`);
      if (!res.ok) return EMPTY_PERMISSIONS;
      return res.json();
    },
    enabled: !!userId,
    staleTime: 60_000, // 1 min — alinhado com TTL do cache Redis de authz
  });
}

/**
 * Verifica se o usuário tem uma permission key específica.
 * Suporta wildcard "*" (ADMIN preset).
 *
 * Retorna `false` enquanto os dados ainda estão carregando.
 */
export function useCan(key: string): boolean {
  const { data } = useMyPermissions();
  if (!data) return false;
  const { permissions } = data;
  return permissions.includes("*") || permissions.includes(key);
}
