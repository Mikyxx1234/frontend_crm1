"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiUrl } from "@/lib/api";

/**
 * Conexão WhatsApp da org (forma reduzida). Usado pelo seletor de canal
 * acima do composer (Inbox / Deal). O campo `phoneNumber` é exibido como
 * sublinha para o agente distinguir entre dois WhatsApps com nomes
 * parecidos (ex.: "WhatsApp Vendas" 5511… vs "WhatsApp Suporte" 5511…).
 */
export interface OutboundChannelOption {
  id: string;
  name: string;
  type: string;
  provider: string;
  status: string;
  phoneNumber: string | null;
}

interface ApiChannel {
  id: string;
  name: string;
  type: string;
  provider: string;
  status: string;
  phoneNumber?: string | null;
}

interface ChannelsResponse {
  channels?: ApiChannel[];
}

async function fetchOutboundWhatsappChannels(): Promise<OutboundChannelOption[]> {
  const res = await fetch(apiUrl("/api/channels"));
  if (!res.ok) {
    throw new Error("Erro ao carregar canais.");
  }
  const data = (await res.json().catch(() => ({}))) as ChannelsResponse;
  const list = Array.isArray(data.channels) ? data.channels : [];
  return list
    .filter((c) => c.type === "WHATSAPP" && c.status === "CONNECTED")
    .map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      provider: c.provider,
      status: c.status,
      phoneNumber: c.phoneNumber ?? null,
    }));
}

/**
 * Canais WhatsApp CONNECTED da org corrente — alimenta o seletor de
 * canal de envio no Composer. Faz uma única request por org/sessão
 * (cache de 60s) e é compartilhado entre Inbox e Deal panel.
 *
 * O backend NÃO escopa a lista por scope-grants aqui (já que o gating
 * final acontece no POST de envio via `resolveOutboundChannel`). Se a
 * org expandir granularidade de permissões por usuário, o filtro extra
 * passa a fazer mais sentido aqui também.
 */
export function useWhatsappChannels(enabled = true) {
  return useQuery<OutboundChannelOption[]>({
    queryKey: ["inbox-v2", "outbound-whatsapp-channels"],
    queryFn: fetchOutboundWhatsappChannels,
    enabled,
    staleTime: 60_000,
  });
}

/**
 * Estado controlado do canal de envio para uma conversa:
 *   - persiste a escolha do agente em localStorage por conversationId
 *     (a próxima vez que o agente abrir esta mesma conversa, lembra do
 *     canal que ele estava usando — útil para conversas multi-canal)
 *   - default: canal "atual" da conversa (último inbound)
 *   - valida que o canal salvo ainda existe entre os disponíveis (fail
 *     fast quando a org desativa um canal)
 *
 * Devolve `{ selectedChannelId, setSelectedChannelId }` — passe direto
 * para o Composer.
 */
const SELECTED_CHANNEL_STORAGE_PREFIX = "eduit:inbox:selected-channel:";

export function useSelectedOutboundChannel(args: {
  conversationId: string | null;
  conversationChannelId: string | null | undefined;
  availableChannels: OutboundChannelOption[] | undefined;
}): {
  selectedChannelId: string | null;
  setSelectedChannelId: (id: string) => void;
} {
  const { conversationId, conversationChannelId, availableChannels } = args;

  const storageKey = useMemo(
    () =>
      conversationId
        ? `${SELECTED_CHANNEL_STORAGE_PREFIX}${conversationId}`
        : null,
    [conversationId],
  );

  const [selectedChannelId, setSelectedChannelIdState] = useState<string | null>(
    null,
  );

  // Re-inicializa o seletor quando a conversa muda ou quando a lista de
  // canais disponíveis chega/atualiza. Ordem de fallback:
  //   1) escolha persistida em localStorage (se ainda válida)
  //   2) canal "atual" da conversa (último inbound) — se ainda válido
  //   3) primeiro canal disponível (org com canais mas conversa sem channelId)
  //   4) null (sem canais → composer mostra fallback do header padrão)
  useEffect(() => {
    if (!conversationId || !availableChannels) {
      setSelectedChannelIdState(null);
      return;
    }
    const validIds = new Set(availableChannels.map((c) => c.id));

    let next: string | null = null;
    if (storageKey) {
      try {
        const persisted = window.localStorage.getItem(storageKey);
        if (persisted && validIds.has(persisted)) next = persisted;
      } catch {
        /* ignore */
      }
    }
    if (!next && conversationChannelId && validIds.has(conversationChannelId)) {
      next = conversationChannelId;
    }
    if (!next && availableChannels.length > 0) {
      next = availableChannels[0].id;
    }
    setSelectedChannelIdState(next);
  }, [conversationId, conversationChannelId, availableChannels, storageKey]);

  const setSelectedChannelId = useCallback(
    (id: string) => {
      setSelectedChannelIdState(id);
      if (storageKey) {
        try {
          window.localStorage.setItem(storageKey, id);
        } catch {
          /* ignore */
        }
      }
    },
    [storageKey],
  );

  return { selectedChannelId, setSelectedChannelId };
}
