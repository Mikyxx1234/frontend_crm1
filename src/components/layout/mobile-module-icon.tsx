"use client";

import {
  Activity,
  BarChart3,
  Building2,
  CheckSquare,
  Kanban,
  Megaphone,
  MessageSquare,
  Settings,
  UserCircle2,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

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
