import type { SidebarItemPreference } from "@/lib/sidebar-catalog";

export type { SidebarItemPreference };

/** Resposta de GET /api/profile/preferences (campos usados pela sidebar). */
export interface SidebarPreferencesResponse {
  sidebar: {
    items: SidebarItemPreference[];
  };
  appearance?: {
    theme: "light" | "dark" | null;
  };
}
