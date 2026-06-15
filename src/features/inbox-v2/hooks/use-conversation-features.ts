"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api";

/**
 * Permissões de funcionalidades da conversa, configuradas por admin em
 * /settings/conversations. Usam o endpoint genérico /api/settings/org
 * com o prefixo "conversation.".
 *
 * Valores default (quando a chave não existe no banco):
 *  - agentSignatureEnabled: true  — agentes podem usar assinatura
 *  - agentSignatureEditable: true — agentes podem editar o texto da assinatura
 */
export interface ConversationFeatures {
  agentSignatureEnabled: boolean;
  agentSignatureEditable: boolean;
}

const QUERY_KEY = ["org-settings", "conversation"];

async function fetchConversationFeatures(): Promise<ConversationFeatures> {
  const res = await fetch(
    apiUrl("/api/settings/org?prefix=conversation."),
    { credentials: "include" },
  );
  if (!res.ok) return { agentSignatureEnabled: true, agentSignatureEditable: true };
  const data: Record<string, string> = await res.json();
  return {
    agentSignatureEnabled: data["conversation.agentSignatureEnabled"] !== "false",
    agentSignatureEditable: data["conversation.agentSignatureEditable"] !== "false",
  };
}

/** Lê as permissões de conversa para uso no Composer e em outras UIs. */
export function useConversationFeatures() {
  const { data, ...rest } = useQuery<ConversationFeatures>({
    queryKey: QUERY_KEY,
    queryFn: fetchConversationFeatures,
    staleTime: 5 * 60_000,
  });

  return {
    features: data ?? { agentSignatureEnabled: true, agentSignatureEditable: true },
    ...rest,
  };
}

/** Salva uma única chave de funcionalidade da conversa (admin only). */
export function useSaveConversationFeature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      key,
      value,
    }: {
      key: keyof ConversationFeatures;
      value: boolean;
    }) => {
      const fullKey = `conversation.${key}`;
      const res = await fetch(apiUrl("/api/settings/org"), {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: fullKey, value: String(value) }),
      });
      if (!res.ok) throw new Error("Falha ao salvar configuração");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
