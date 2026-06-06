import type { SidebarItemPreference } from "@/lib/sidebar-catalog";

export type { SidebarItemPreference };

/** Resposta de GET /api/profile/preferences e PATCH .../sidebar. */
export interface SidebarPreferencesResponse {
  sidebar: {
    items: SidebarItemPreference[];
  };
}
