"use client";

/**
 * use-calls-widget — gate centralizado da feature de Telefonia.
 *
 * Toda a telefonia (SoftphoneWidget global, DealCallButton, página
 * /widgets/calls) só renderiza quando o widget `calls_history` está ATIVO
 * na org. Quem desinstala em /widgets desliga TUDO de uma vez — espelha
 * o modelo da Distribuição Inteligente.
 *
 * Migration: por seed em todas as orgs existentes (não-breaking — quem
 * já usava telefonia continua usando sem ação manual).
 *
 * Estado intermediário: enquanto a query `useWidgets` carrega, devolvemos
 * `enabled=null` (loading) — consumidores devem renderizar nada em vez
 * de assumir false (evita flash visual de "Telefonia desabilitada" em
 * orgs que TÊM o widget instalado).
 */

import { useWidgets } from "@/features/widgets/hooks";

export const CALLS_WIDGET_SLUG = "calls_history";

export interface CallsWidgetState {
  /** True quando o widget está ATIVO; false quando não instalado; null
   *  enquanto a query carrega. */
  enabled: boolean | null;
  isLoading: boolean;
}

export function useCallsWidget(authEnabled = true): CallsWidgetState {
  const { data, isLoading } = useWidgets(authEnabled);

  if (isLoading || !data) {
    return { enabled: null, isLoading: true };
  }

  const widget = data.items.find((w) => w.slug === CALLS_WIDGET_SLUG);
  const enabled = widget?.installed ?? false;

  return { enabled, isLoading: false };
}
