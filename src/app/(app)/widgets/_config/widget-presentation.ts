/**
 * Configuração de apresentação dos widgets (Central de extensões).
 *
 * Cada widget retornado pela API (`GET /api/widgets`) traz uma `icon` (chave) e
 * uma `category`. Este arquivo centraliza as VARIÁVEIS visuais usadas pelos
 * cards — componente de ícone e cor de destaque (accent) — para que cada
 * integração/plugin tenha identidade própria sem espalhar `if`s pela UI.
 *
 * Para adicionar um novo widget basta:
 *  1. Registrar a chave de ícone em `WIDGET_ICONS` (se for nova); e
 *  2. Opcionalmente registrar um accent por categoria em `WIDGET_ACCENTS`.
 */

import {
  IconAd2,
  IconBolt,
  IconBrandWhatsapp,
  IconCalendarEvent,
  IconChartHistogram,
  IconCreditCard,
  IconMail,
  IconMessageChatbot,
  IconPlugConnected,
  IconReportAnalytics,
  IconRobot,
  IconRoute,
  IconSchool,
  IconWebhook,
  type IconProps,
} from "@tabler/icons-react";

/** Ícone padrão usado quando a chave não está mapeada. */
export const WIDGET_FALLBACK_ICON = IconPlugConnected;

/**
 * Mapa de chave -> componente de ícone Tabler.
 * As chaves correspondem ao campo `icon` do catálogo (backend).
 */
export const WIDGET_ICONS: Record<string, React.ComponentType<IconProps>> = {
  route: IconRoute,
  bot: IconRobot,
  chatbot: IconMessageChatbot,
  whatsapp: IconBrandWhatsapp,
  email: IconMail,
  payment: IconCreditCard,
  analytics: IconReportAnalytics,
  reports: IconChartHistogram,
  calendar: IconCalendarEvent,
  ads: IconAd2,
  webhook: IconWebhook,
  automation: IconBolt,
  courses: IconSchool,
};

/**
 * Variáveis de destaque (accent) por categoria. O `token` referencia uma
 * variável de cor do DS v2 (globals-v2.css) e é resolvido em runtime via CSS.
 * `soft` controla a opacidade do fundo do ícone/realce.
 */
export interface WidgetAccent {
  /** Token de cor do DS v2, ex.: "--brand-primary". */
  token: string;
}

const DEFAULT_ACCENT: WidgetAccent = { token: "--brand-primary" };

/** Accent por categoria (case-insensitive na resolução). */
export const WIDGET_ACCENTS: Record<string, WidgetAccent> = {
  "operação comercial": { token: "--brand-primary" },
  "inteligência artificial": { token: "--color-info" },
  comunicação: { token: "--color-online" },
  "marketing": { token: "--color-warning" },
  financeiro: { token: "--color-success" },
  "relatórios": { token: "--color-info" },
  integrações: { token: "--brand-primary" },
};

/** Resolve o componente de ícone de um widget pela chave. */
export function resolveWidgetIcon(
  iconKey: string,
): React.ComponentType<IconProps> {
  return WIDGET_ICONS[iconKey] ?? WIDGET_FALLBACK_ICON;
}

/** Resolve a cor de destaque de um widget pela categoria. */
export function resolveWidgetAccent(category: string): WidgetAccent {
  return WIDGET_ACCENTS[category.trim().toLowerCase()] ?? DEFAULT_ACCENT;
}
