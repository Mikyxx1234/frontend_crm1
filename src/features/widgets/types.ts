/** Tipos compartilhados da Central de Widgets (frontend). */

export type WidgetAvailability = "available" | "coming_soon";
export type WidgetInstallStatus = "ACTIVE" | "INACTIVE";
export type WidgetOwnerType = "INTERNAL" | "PARTNER";
export type WidgetMarketplaceStatus = "DRAFT" | "ONLINE" | "OFFLINE";

/**
 * Widget retornado por GET /api/widgets — catalogo `Widget` no banco
 * (internos por seed + parceiros publicados) mesclado com o estado
 * de instalacao da org atual.
 */
export interface WidgetDto {
  slug: string;
  name: string;
  description: string;
  features: string[];
  /** Para INTERNAL: chave de icone resolvida no card (ex.: "route", "bot").
   *  Para PARTNER: URL absoluta de imagem do parceiro. */
  icon: string;
  category: string;
  availability: WidgetAvailability;
  /** Origem do widget. */
  ownerType: WidgetOwnerType;
  /** Nome do parceiro (preenchido quando ownerType=PARTNER). */
  partnerName?: string | null;
  /** URL do iframe do parceiro (so PARTNER). */
  iframeUrl?: string | null;
  installed: boolean;
  status: WidgetInstallStatus | null;
  installedAt: string | null;
  /** Status no marketplace — hoje listamos so ONLINE, mas o tipo
   *  fica disponivel para UIs futuras. */
  marketplaceStatus: WidgetMarketplaceStatus;
  /** Widget instalado mas indisponivel (parceiro OFFLINE ou suspenso).
   *  UI deve esconder botao Abrir e mostrar apenas Desinstalar. */
  disabled?: boolean;
  /** Motivo curto exibido no card quando disabled=true. */
  disabledReason?: string | null;
}

export interface WidgetsResponse {
  items: WidgetDto[];
}
