/** Tipos compartilhados da Central de Widgets (frontend). */

export type WidgetAvailability = "available" | "coming_soon";
export type WidgetInstallStatus = "ACTIVE" | "INACTIVE";

/**
 * Widget retornado por GET /api/widgets — catalogo estatico (backend
 * `widget-catalog.ts`) mesclado com o estado de instalacao da org.
 */
export interface WidgetDto {
  slug: string;
  name: string;
  description: string;
  features: string[];
  /** Chave de icone resolvida no card (ex.: "route", "bot"). */
  icon: string;
  category: string;
  availability: WidgetAvailability;
  installed: boolean;
  status: WidgetInstallStatus | null;
  installedAt: string | null;
}

export interface WidgetsResponse {
  items: WidgetDto[];
}
