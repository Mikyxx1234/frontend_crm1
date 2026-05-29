/**
 * Permissões de ação do CRM (frontend gate).
 *
 * As flags ficam em `scopeGrants.crm.<action>.users[userId]: boolean` no
 * objeto retornado por `GET /api/settings/permissions`. Override por
 * usuário individual — não há mais toggles por papel para essas ações.
 *
 * Convenções:
 *   - ADMIN sempre pode tudo (não consultamos o JSON pra ele).
 *   - Ausência de chave = permitido (default `true`). Só desligamos
 *     quando o operador explicitamente marca `false`. Garante que ligar
 *     este repo num backend que ainda não conhece o namespace `crm` não
 *     tira privilégios de ninguém.
 *   - Enforcement final é responsabilidade do backend.
 */

export type CrmActionKey = "editLeads" | "runAutomations" | "assignOwner";

export type CrmActionUserGrants = Partial<Record<string, boolean>>;

export type CrmActionGrants = Partial<
  Record<CrmActionKey, { users?: CrmActionUserGrants }>
>;

export type CrmScopeGrants = {
  crm?: CrmActionGrants;
  [key: string]: unknown;
};

export const CRM_ACTION_KEYS: CrmActionKey[] = [
  "editLeads",
  "runAutomations",
  "assignOwner",
];

export const CRM_ACTION_LABELS: Record<CrmActionKey, string> = {
  editLeads: "Editar leads e contatos",
  runAutomations: "Executar automações",
  assignOwner: "Atribuir responsável",
};

export const CRM_ACTION_DESCRIPTIONS: Record<CrmActionKey, string> = {
  editLeads:
    "Mover negócios entre estágios e preencher campos adicionais (custom fields, tags, valor) nos leads e contatos visíveis.",
  runAutomations:
    "Disparar automações manualmente (executar agora) e habilitar/desabilitar workflows. Não inclui edição da estrutura.",
  assignOwner:
    "Definir ou trocar o responsável de leads, contatos e conversas. Sem isso o usuário só atua nos itens já atribuídos a ele.",
};

/**
 * Retorna `true` se o usuário pode executar a ação. Ordem:
 *   1. ADMIN → sempre `true`.
 *   2. Override explícito em `users[userId]` → respeita o booleano.
 *   3. Default → `true` (compat com instâncias que ainda não configuraram).
 */
export function canPerformCrmAction(
  action: CrmActionKey,
  userId: string | null | undefined,
  role: string | null | undefined,
  scopeGrants: unknown,
): boolean {
  if (role === "ADMIN") return true;
  if (!userId) return false;
  return readCrmActionGrantForUser(action, userId, scopeGrants);
}

/**
 * Lê só o override (sem checar role). Útil pra UI da tela de permissões
 * onde queremos mostrar o estado atual do toggle.
 */
export function readCrmActionGrantForUser(
  action: CrmActionKey,
  userId: string,
  scopeGrants: unknown,
): boolean {
  const grants = scopeGrants as CrmScopeGrants | undefined;
  const value = grants?.crm?.[action]?.users?.[userId];
  return value !== false;
}

/**
 * Faz merge imutável do grant de uma ação no `scopeGrants` existente,
 * preservando outros namespaces (`sidebar`, `inbox`, etc.) e outros
 * usuários dentro do mesmo namespace `crm.<action>.users`.
 */
export function setCrmActionGrantForUser(
  scopeGrants: unknown,
  action: CrmActionKey,
  userId: string,
  enabled: boolean,
): CrmScopeGrants {
  const current = (scopeGrants as CrmScopeGrants | undefined) ?? {};
  const currentCrm = (current.crm ?? {}) as CrmActionGrants;
  const currentAction = currentCrm[action] ?? {};
  const currentUsers = (currentAction.users ?? {}) as CrmActionUserGrants;
  return {
    ...current,
    crm: {
      ...currentCrm,
      [action]: {
        ...currentAction,
        users: {
          ...currentUsers,
          [userId]: enabled,
        },
      },
    },
  };
}

/**
 * Aplica vários grants ao mesmo usuário em um único merge. Útil pro
 * fluxo de "convidar membro" onde já queremos persistir o estado dos 3
 * toggles de uma vez.
 */
export function setCrmActionGrantsForUser(
  scopeGrants: unknown,
  userId: string,
  grants: Partial<Record<CrmActionKey, boolean>>,
): CrmScopeGrants {
  let next = (scopeGrants as CrmScopeGrants | undefined) ?? {};
  for (const action of CRM_ACTION_KEYS) {
    const value = grants[action];
    if (value === undefined) continue;
    next = setCrmActionGrantForUser(next, action, userId, value);
  }
  return next;
}
