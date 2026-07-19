"use client";

/**
 * Registry de configuração dos widgets instaláveis.
 *
 * Cada entrada mapeia um `slug` de widget para o painel de configuração que
 * abre no drawer da Central (`/widgets`). Só widgets presentes aqui ganham
 * o botão "Configurar" no card.
 *
 * Contrato:
 *  - `Component` é renderizado dentro do corpo rolável do FormSheet, sem
 *    header próprio (o header vem do drawer).
 *  - `requiredPermission` é a permission key canônica (`resource:action`).
 *    Falta dela (ou de "*") esconde o botão "Configurar" no card.
 */

import { IconArrowsShuffle, IconPhone } from "@tabler/icons-react";
import type { ComponentType, ReactNode } from "react";
import dynamic from "next/dynamic";

export type WidgetConfigSize = "sm" | "md" | "lg" | "xl";

export interface WidgetConfigEntry {
  title: string;
  description?: string;
  icon: ReactNode;
  size: WidgetConfigSize;
  requiredPermission: string;
  Component: ComponentType;
}

// Componentes carregados sob demanda — configs pesadas (Distribuição em
// especial) não devem entrar no bundle inicial da Central.
const DistributionConfig = dynamic(
  () => import("@/features/legacy-v1/settings/distribution"),
  { ssr: false },
);

const SoftphoneConfig = dynamic(
  () =>
    import("@/features/softphone/components/softphone-config").then(
      (m) => m.SoftphoneConfig,
    ),
  { ssr: false },
);

export const WIDGET_CONFIG_REGISTRY: Record<string, WidgetConfigEntry> = {
  smart_distribution: {
    title: "Distribuição",
    description: "Round-robin, priorização e regras de atribuição",
    icon: <IconArrowsShuffle size={20} />,
    size: "xl",
    requiredPermission: "distribution:manage",
    Component: DistributionConfig,
  },
  calls_history: {
    title: "Telefonia IP",
    description: "Ramal SIP e provedor de chamadas",
    icon: <IconPhone size={20} />,
    size: "lg",
    requiredPermission: "sip_extension:manage",
    Component: SoftphoneConfig,
  },
};

export function getWidgetConfig(slug: string): WidgetConfigEntry | null {
  return WIDGET_CONFIG_REGISTRY[slug] ?? null;
}
