"use client";

import { useQuery } from "@tanstack/react-query";

import { getContact, type ContactDetail } from "../api";

/**
 * Carrega o contato selecionado para o painel direito (ContactAside).
 * Usa a query key `["contact-sidebar", contactId]` da Fase 1 para
 * permitir invalidação cruzada quando outras telas editam o contato.
 */
export function useContactSidebar(contactId: string | null | undefined) {
  return useQuery<ContactDetail>({
    queryKey: ["contact-sidebar", contactId ?? "__none__"],
    queryFn: () => getContact(contactId as string),
    enabled: !!contactId,
    staleTime: 30_000,
  });
}
