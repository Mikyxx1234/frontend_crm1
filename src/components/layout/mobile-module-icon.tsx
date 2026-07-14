"use client";

import { IconActivity as Activity, IconChartBar as BarChart3, IconBuilding as Building2, IconSquareCheck as CheckSquare, IconLayoutKanban as Kanban, IconSpeakerphone as Megaphone, IconMessage as MessageSquare, IconSettings as Settings, IconUserCircle as UserCircle2, IconUsers as Users, IconBolt as Zap } from "@tabler/icons-react"
import type { Icon as LucideIcon } from "@tabler/icons-react";

/**
 * Resolvedor de iconName (string PascalCase) -> componente.
 * Centralizado pra que o catalogo `MOBILE_MODULES` em `/lib` permaneça
 * server-safe (sem import de lucide-react). Front faz a resolução.
 *
 * Adicionar modulo novo: adicionar entrada aqui + no MOBILE_MODULES.
 */
const REGISTRY: Record<string, LucideIcon> = {
  MessageSquare,
  Kanban,
  CheckSquare,
  Users,
  Building2,
  Megaphone,
  Zap,
  BarChart3,
  Activity,
  Settings,
  UserCircle2,
};

export function MobileModuleIcon({
  name,
  className,
  strokeWidth,
}: {
  name: string;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = REGISTRY[name] ?? MessageSquare;
  return <Icon className={className} strokeWidth={strokeWidth ?? 2} />;
}

export function getMobileModuleIcon(name: string): LucideIcon {
  return REGISTRY[name] ?? MessageSquare;
}
