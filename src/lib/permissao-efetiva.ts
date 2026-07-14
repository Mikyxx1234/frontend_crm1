/**
 * permissao-efetiva — classificação de escopo efetivo de um módulo a partir
 * da lista de permission keys já resolvida pelo backend
 * (/api/users/:id/effective-permissions).
 *
 * IMPORTANTE: o MERGE de permissões (papel + grupo + canal, com "negação
 * explícita vence") acontece no BACKEND. Este módulo NÃO reimplementa merge —
 * apenas traduz o resultado (lista de keys `resource:action`) numa escala de
 * apresentação Nenhum → Ver → Operar → Total, útil p/ navrail e resumos.
 */

export type EffectiveScope = "nenhum" | "ver" | "operar" | "total";

export const SCOPE_RANK: Record<EffectiveScope, number> = {
  nenhum: 0,
  ver: 1,
  operar: 2,
  total: 3,
};

/** Ações que caracterizam nível "Operar" (escrita/domínio). */
const WRITE_ACTIONS = new Set([
  "create",
  "edit",
  "update",
  "operate",
  "assign",
  "move",
  "send",
  "reply",
  "export",
  "import",
]);

/** Ações que caracterizam nível "Total" (admin/destrutivas). */
const ADMIN_ACTIONS = new Set([
  "delete",
  "manage",
  "administer",
  "admin",
  "configure",
  "transfer_owner",
]);

/**
 * Deriva o escopo efetivo de um módulo (`resource`) a partir das keys.
 * `"*"` (preset ADMIN) => sempre "total". Sem nenhuma key do módulo =>
 * "nenhum" (negação/ausência = sem acesso).
 */
export function deriveModuleScope(
  moduleId: string,
  permissions: readonly string[],
): EffectiveScope {
  if (permissions.includes("*")) return "total";

  const prefix = `${moduleId}:`;
  const actions = permissions
    .filter((p) => p.startsWith(prefix))
    .map((p) => p.slice(prefix.length));

  if (actions.length === 0) return "nenhum";

  const isAdmin = actions.some(
    (a) => ADMIN_ACTIONS.has(a) || a.endsWith("_others"),
  );
  if (isAdmin) return "total";

  const isWrite = actions.some((a) => WRITE_ACTIONS.has(a));
  if (isWrite) return "operar";

  if (actions.includes("view")) return "ver";

  // Tem alguma ação não-view não catalogada acima: trata como operar.
  return "operar";
}

export function scopeAllowsView(scope: EffectiveScope): boolean {
  return SCOPE_RANK[scope] >= SCOPE_RANK.ver;
}

export function scopeAllowsOperate(scope: EffectiveScope): boolean {
  return SCOPE_RANK[scope] >= SCOPE_RANK.operar;
}

export function scopeAllowsAdmin(scope: EffectiveScope): boolean {
  return scope === "total";
}
