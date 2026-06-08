"use client";

import { useCan } from "@/hooks/use-my-permissions";

interface RequirePermissionProps {
  permission: string;
  /** Renderizado quando sem permissão. Padrão: null (não renderiza nada). */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Renderiza `children` apenas se o usuário tiver a `permission` informada.
 *
 * Enquanto as permissões estão carregando, renderiza `fallback` (padrão: null).
 * Suporta wildcard "*" para ADMIN preset.
 *
 * @example
 * <RequirePermission permission="settings:roles">
 *   <RolesTab />
 * </RequirePermission>
 *
 * <RequirePermission permission="deal:import" fallback={null}>
 *   <ImportButton />
 * </RequirePermission>
 */
export function RequirePermission({ permission, fallback = null, children }: RequirePermissionProps) {
  const can = useCan(permission);
  return can ? <>{children}</> : <>{fallback}</>;
}
