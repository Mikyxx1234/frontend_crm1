/**
 * Dados de identidade da organização do usuário logado.
 *
 * Consome `GET /api/organization` (rewrite pro backend), que retorna o
 * metadata visual da org (id, nome, slug, logo, cor). Usado pela NavRail
 * para renderizar o avatar/iniciais da empresa e expor o ID da conta.
 *
 * staleTime alto: nome/id da org praticamente não mudam durante a sessão.
 */
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { apiUrl, parseApiResponse } from "@/lib/api";

export type OrganizationData = {
  id: string;
  name: string;
  slug: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  status: string | null;
  onboardingCompletedAt: string | null;
};

export function useOrganization() {
  const { data: session } = useSession();
  const orgId = (session?.user as { organizationId?: string } | undefined)
    ?.organizationId;

  return useQuery({
    queryKey: ["organization", orgId],
    queryFn: async (): Promise<OrganizationData | null> => {
      const res = await fetch(apiUrl("/api/organization"));
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!orgId,
    staleTime: 5 * 60_000, // 5 min — identidade da org quase não muda na sessão
  });
}

/**
 * Hook de identidade da org (id) usado como chave de cache nas mutations
 * abaixo — mantém a invalidação alinhada com `useOrganization`.
 */
function useOrgQueryKey() {
  const { data: session } = useSession();
  const orgId = (session?.user as { organizationId?: string } | undefined)
    ?.organizationId;
  return ["organization", orgId] as const;
}

/**
 * Faz upload do ícone/logo da empresa (`POST /api/organization/logo`) e
 * invalida o cache da org para a navrail refletir a troca na hora.
 */
export function useUpdateOrganizationLogo() {
  const queryClient = useQueryClient();
  const key = useOrgQueryKey();
  return useMutation({
    mutationFn: async (file: File): Promise<{ url: string }> => {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(apiUrl("/api/organization/logo"), {
        method: "POST",
        body,
      });
      return parseApiResponse<{ url: string }>(res, "Erro ao enviar o ícone.");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

/**
 * Remove o ícone da empresa (`DELETE /api/organization/logo`) e invalida
 * o cache da org.
 */
export function useRemoveOrganizationLogo() {
  const queryClient = useQueryClient();
  const key = useOrgQueryKey();
  return useMutation({
    mutationFn: async (): Promise<{ ok: true }> => {
      const res = await fetch(apiUrl("/api/organization/logo"), {
        method: "DELETE",
      });
      return parseApiResponse<{ ok: true }>(res, "Erro ao remover o ícone.");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
