import type { SidebarItemPreference } from "@/lib/sidebar-catalog";

export type { SidebarItemPreference };

/** Resposta de GET /api/profile/preferences e PATCH .../sidebar. */
export interface SidebarPreferencesResponse {
  sidebar: {
    items: SidebarItemPreference[];
  };
  /** Keys liberadas para o usuario (gating por permission + widgets ativos).
   *  Ausente em respostas antigas — trate como "catalogo inteiro". */
  availableKeys?: string[];
}
