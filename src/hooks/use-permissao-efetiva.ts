/**
 * usePermissaoEfetiva — escopo efetivo do usuário logado para um módulo.
 *
 * Envolve `useMyPermissions` (fonte única = backend, que já faz o merge
 * papel+grupo+canal com negação vencendo) e classifica o resultado na escala
 * Nenhum → Ver → Operar → Total. Use no navrail para condicionar itens
 * (`Nenhum` = oculto; sem `canAdminister` = sem submenu de configuração).
 */
"use client";

import { useMyPermissions } from "./use-my-permissions";
import {
  deriveModuleScope,
  scopeAllowsAdmin,
  scopeAllowsOperate,
  scopeAllowsView,
  type EffectiveScope,
} from "@/lib/permissao-efetiva";

export interface PermissaoEfetiva {
  scope: EffectiveScope;
  canView: boolean;
  canOperate: boolean;
  canAdminister: boolean;
  isLoading: boolean;
}

export function usePermissaoEfetiva(moduloId: string): PermissaoEfetiva {
  const { data, isLoading } = useMyPermissions();
  const scope = deriveModuleScope(moduloId, data?.permissions ?? []);
  return {
    scope,
    canView: scopeAllowsView(scope),
    canOperate: scopeAllowsOperate(scope),
    canAdminister: scopeAllowsAdmin(scope),
    isLoading,
  };
}
