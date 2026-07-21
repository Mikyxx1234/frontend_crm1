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

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { apiUrl } from "@/lib/api";

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
