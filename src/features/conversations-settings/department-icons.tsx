"use client";

import type React from "react";
import {
  IconBuilding,
  IconChartBar,
  IconClipboardList,
  IconCurrencyDollar,
  IconDeviceLaptop,
  IconGlobe,
  IconHeadset,
  IconHome,
  IconLifebuoy,
  IconMail,
  IconMessageCircle,
  IconPhone,
  IconScale,
  IconSchool,
  IconSettings,
  IconShoppingCart,
  IconSpeakerphone,
  IconStar,
  IconTool,
  IconTruck,
  IconUsers,
} from "@tabler/icons-react";

/**
 * Registro compartilhado de ícones de departamento.
 *
 * O campo `Department.icon` guarda uma STRING: normalmente o nome de um
 * componente Tabler (ex.: "IconHeadset") — mas algumas orgs antigas
 * salvaram um emoji. Este módulo centraliza o mapeamento nome→componente
 * e o fallback (emoji cru ou ícone padrão), pra que a string nunca vaze
 * como texto na UI (bug do `<option>IconHeadset ...`).
 */

type IconComponent = React.ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}>;

export const DEPARTMENT_ICON_REGISTRY: Record<string, IconComponent> = {
  IconBuilding,
  IconHeadset,
  IconPhone,
  IconBriefcase: IconClipboardList, // alias legado
  IconCurrencyDollar,
  IconUsers,
  IconDeviceLaptop,
  IconSpeakerphone,
  IconTruck,
  IconScale,
  IconShoppingCart,
  IconLifebuoy,
  IconClipboardList,
  IconStar,
  IconSettings,
  IconChartBar,
  IconMail,
  IconMessageCircle,
  IconTool,
  IconSchool,
  IconGlobe,
  IconHome,
};

/**
 * Renderiza o glifo de um departamento a partir da string `icon`:
 *  - nome de componente conhecido → ícone Tabler
 *  - string curta que NÃO começa com "Icon" → tratada como emoji (texto)
 *  - qualquer outro caso → ícone genérico (prédio)
 */
export function DeptGlyph({
  icon,
  size = 16,
  color,
  className,
}: {
  icon: string | null | undefined;
  size?: number;
  color?: string;
  className?: string;
}) {
  const name = icon ?? "";
  const Comp = DEPARTMENT_ICON_REGISTRY[name];
  if (Comp) {
    return (
      <Comp
        size={size}
        strokeWidth={1.75}
        className={className}
        style={color ? { color } : undefined}
      />
    );
  }
  // Emoji salvo em orgs antigas (não é nome de componente).
  if (name && !name.startsWith("Icon")) {
    return (
      <span
        className={className}
        style={{ fontSize: size, lineHeight: 1, color }}
        aria-hidden
      >
        {name}
      </span>
    );
  }
  return (
    <IconBuilding
      size={size}
      strokeWidth={1.75}
      className={className}
      style={color ? { color } : undefined}
    />
  );
}
