/**
 * Lógica de grants sem I/O — seguro para import em Client Components.
 * (Não importar Prisma/request-context aqui.)
 */

/**
 * Deve coincidir com `InboxTab` em `@/services/conversations`.
 * "todos" não entra em grants por categoria — é aba agregadora.
 */
export type InboxTab =
  | "entrada"
  | "esperando"
  | "respondidas"
  | "automacao"
  | "finalizados"
  | "erro"
  | "todos";

/** Ordem das categorias na inbox (sem "todos") — manter alinhado a `INBOX_CATEGORY_TABS` no serviço. */
const INBOX_CATEGORY_TAB_ORDER: readonly Exclude<InboxTab, "todos">[] = [
  "entrada",
  "esperando",
  "respondidas",
  "automacao",
  "finalizados",
  "erro",
];

type RoleKey = "ADMIN" | "MANAGER" | "MEMBER";
type RoleScope = Partial<Record<RoleKey, string[]>>;

/**
 * Override por usuário para escopo de recursos com instâncias dinâmicas
 * (funis e canais). `users[userId] = string[]`: `["*"]` = todos, `[]` = nenhum,
 * lista = restrito; chave ausente = cai na regra por papel / liberado.
 */
export type UserScopeGrants = Partial<Record<string, string[]>>;

export type ScopeGrants = {
  /** Abas da Inbox por papel (`MEMBER`). Valores: chaves de aba ou `"*"`. */
  inbox?: {
    tabs?: RoleScope;
  };
  pipeline?: {
    view?: RoleScope;
    edit?: RoleScope;
    /** Override por usuário: IDs de funis visíveis (ou `["*"]`). */
    users?: UserScopeGrants;
  };
  /**
   * Escopo de canais (instâncias dinâmicas de `Channel`). 4 eixos de ação +
   * override `deny`. Cada eixo aceita 3 principais (user/role/group),
   * resolução aditiva (OR).
   *
   * Mantido em sincronia com o backend; atualizado 25/jun/26 pra incluir
   * `initiate`, `manage`, `deny` e eixo `groups`. Ver
   * `backend_crm1/src/lib/authz/scope-grants-shared.ts` (fonte de verdade
   * da lógica completa, incluindo precedência deny + anti-lockout).
   */
  channel?: {
    view?: {
      users?: UserScopeGrants;
      roles?: UserScopeGrants;
      groups?: UserScopeGrants;
    };
    send?: {
      users?: UserScopeGrants;
      roles?: UserScopeGrants;
      groups?: UserScopeGrants;
    };
    initiate?: {
      users?: UserScopeGrants;
      roles?: UserScopeGrants;
      groups?: UserScopeGrants;
    };
    manage?: {
      users?: UserScopeGrants;
      roles?: UserScopeGrants;
      groups?: UserScopeGrants;
    };
    deny?: {
      users?: UserScopeGrants;
      roles?: UserScopeGrants;
      groups?: UserScopeGrants;
    };
  };
  stage?: {
    view?: RoleScope;
    move?: RoleScope;
    edit?: RoleScope;
  };
  field?: {
    deal?: {
      view?: RoleScope;
      edit?: RoleScope;
    };
    contact?: {
      view?: RoleScope;
      edit?: RoleScope;
    };
    product?: {
      view?: RoleScope;
      edit?: RoleScope;
    };
  };
  sidebar?: {
    routes?: RoleScope;
    settingsItems?: RoleScope;
  };
};

function asRoleKey(role: string | null | undefined): RoleKey | null {
  if (role === "ADMIN" || role === "MANAGER" || role === "MEMBER") return role;
  return null;
}

function normalizeIds(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function normalizeRoleScope(input: unknown): RoleScope {
  const src = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    ADMIN: normalizeIds(src.ADMIN),
    MANAGER: normalizeIds(src.MANAGER),
    MEMBER: normalizeIds(src.MEMBER),
  };
}

function normalizeUserScope(input: unknown): UserScopeGrants {
  if (!input || typeof input !== "object") return {};
  const src = input as Record<string, unknown>;
  const out: UserScopeGrants = {};
  for (const [userId, raw] of Object.entries(src)) {
    if (typeof userId !== "string" || !userId) continue;
    out[userId] = normalizeIds(raw);
  }
  return out;
}

export function parseScopeGrants(input: unknown): ScopeGrants {
  const src = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const pipeline = src.pipeline && typeof src.pipeline === "object" ? (src.pipeline as Record<string, unknown>) : {};
  const stage = src.stage && typeof src.stage === "object" ? (src.stage as Record<string, unknown>) : {};
  const field = src.field && typeof src.field === "object" ? (src.field as Record<string, unknown>) : {};
  const sidebar = src.sidebar && typeof src.sidebar === "object" ? (src.sidebar as Record<string, unknown>) : {};
  const inbox = src.inbox && typeof src.inbox === "object" ? (src.inbox as Record<string, unknown>) : {};
  const channel = src.channel && typeof src.channel === "object" ? (src.channel as Record<string, unknown>) : {};
  const channelView = channel.view && typeof channel.view === "object" ? (channel.view as Record<string, unknown>) : {};
  const channelSend = channel.send && typeof channel.send === "object" ? (channel.send as Record<string, unknown>) : {};
  const channelInitiate = channel.initiate && typeof channel.initiate === "object" ? (channel.initiate as Record<string, unknown>) : {};
  const channelManage = channel.manage && typeof channel.manage === "object" ? (channel.manage as Record<string, unknown>) : {};
  const channelDeny = channel.deny && typeof channel.deny === "object" ? (channel.deny as Record<string, unknown>) : {};
  const dealField = field.deal && typeof field.deal === "object" ? (field.deal as Record<string, unknown>) : {};
  const contactField = field.contact && typeof field.contact === "object" ? (field.contact as Record<string, unknown>) : {};
  const productField = field.product && typeof field.product === "object" ? (field.product as Record<string, unknown>) : {};
  return {
    inbox: {
      tabs: normalizeRoleScope(inbox.tabs),
    },
    pipeline: {
      view: normalizeRoleScope(pipeline.view),
      edit: normalizeRoleScope(pipeline.edit),
      users: normalizeUserScope(pipeline.users),
    },
    channel: {
      view: {
        users: normalizeUserScope(channelView.users),
        roles: normalizeUserScope(channelView.roles),
        groups: normalizeUserScope(channelView.groups),
      },
      send: {
        users: normalizeUserScope(channelSend.users),
        roles: normalizeUserScope(channelSend.roles),
        groups: normalizeUserScope(channelSend.groups),
      },
      initiate: {
        users: normalizeUserScope(channelInitiate.users),
        roles: normalizeUserScope(channelInitiate.roles),
        groups: normalizeUserScope(channelInitiate.groups),
      },
      manage: {
        users: normalizeUserScope(channelManage.users),
        roles: normalizeUserScope(channelManage.roles),
        groups: normalizeUserScope(channelManage.groups),
      },
      deny: {
        users: normalizeUserScope(channelDeny.users),
        roles: normalizeUserScope(channelDeny.roles),
        groups: normalizeUserScope(channelDeny.groups),
      },
    },
    stage: {
      view: normalizeRoleScope(stage.view),
      move: normalizeRoleScope(stage.move),
      edit: normalizeRoleScope(stage.edit),
    },
    field: {
      deal: {
        view: normalizeRoleScope(dealField.view),
        edit: normalizeRoleScope(dealField.edit),
      },
      contact: {
        view: normalizeRoleScope(contactField.view),
        edit: normalizeRoleScope(contactField.edit),
      },
      product: {
        view: normalizeRoleScope(productField.view),
        edit: normalizeRoleScope(productField.edit),
      },
    },
    sidebar: {
      routes: normalizeRoleScope(sidebar.routes),
      settingsItems: normalizeRoleScope(sidebar.settingsItems),
    },
  };
}

function hasRoleRule(scope: RoleScope | undefined, role: RoleKey): boolean {
  if (!scope) return false;
  return Array.isArray(scope[role]);
}

function roleRuleAllows(scope: RoleScope | undefined, role: RoleKey, value: string): boolean {
  const ids = scope?.[role];
  if (!ids || ids.length === 0) return true;
  if (ids.includes("*")) return true;
  return ids.includes(value);
}

export function canAccessScopedResource(args: {
  grants: ScopeGrants;
  role: string | null | undefined;
  resource: "pipeline" | "stage";
  action: "view" | "edit" | "move";
  targetId: string;
}): boolean {
  const role = asRoleKey(args.role);
  if (!role || role === "ADMIN") return true;
  const scope =
    args.resource === "pipeline"
      ? args.action === "view"
        ? args.grants.pipeline?.view
        : args.grants.pipeline?.edit
      : args.action === "view"
        ? args.grants.stage?.view
        : args.action === "edit"
          ? args.grants.stage?.edit
          : args.grants.stage?.move;
  if (!hasRoleRule(scope, role)) return true;
  return roleRuleAllows(scope, role, args.targetId);
}

function userScopeAllows(ids: string[], value: string): boolean {
  if (ids.includes("*")) return true;
  return ids.includes(value);
}

export function canAccessPipelineForUser(args: {
  grants: ScopeGrants;
  role: string | null | undefined;
  userId: string;
  pipelineId: string;
}): boolean {
  if (asRoleKey(args.role) === "ADMIN") return true;
  const userRule = args.grants.pipeline?.users?.[args.userId];
  if (Array.isArray(userRule)) return userScopeAllows(userRule, args.pipelineId);
  return canAccessScopedResource({
    grants: args.grants,
    role: args.role,
    resource: "pipeline",
    action: "view",
    targetId: args.pipelineId,
  });
}

/**
 * Versão simplificada pra checagens UI (apenas override por usuário em
 * `view`/`send`). NÃO replica toda a lógica do backend (deny + groups +
 * roles + manage anti-lockout) — o backend é a fonte de verdade. Use só
 * pra gating cosmético no client; toda decisão de permissão real DEVE
 * passar pelo backend (`requireChannelScope` em `resource-policy.ts`).
 *
 * Ações `initiate`/`manage` ficam aceitas na assinatura mas, como a
 * cópia client não tem acesso a roleIds/groupIds, retornam permissivo
 * por padrão (preservando compat). O endpoint correspondente do backend
 * é que recusará a operação.
 */
export function canAccessChannelForUser(args: {
  grants: ScopeGrants;
  role: string | null | undefined;
  userId: string;
  action: "view" | "send" | "initiate" | "manage";
  channelId: string;
}): boolean {
  if (asRoleKey(args.role) === "ADMIN") return true;
  if (args.action === "initiate" || args.action === "manage") return true;
  const viewRule = args.grants.channel?.view?.users?.[args.userId];
  if (Array.isArray(viewRule) && !userScopeAllows(viewRule, args.channelId)) {
    return false;
  }
  if (args.action === "send") {
    const sendRule = args.grants.channel?.send?.users?.[args.userId];
    if (Array.isArray(sendRule) && !userScopeAllows(sendRule, args.channelId)) {
      return false;
    }
  }
  return true;
}

export function canAccessField(args: {
  grants: ScopeGrants;
  role: string | null | undefined;
  entity: "deal" | "contact" | "product";
  action: "view" | "edit";
  fieldKey: string;
}): boolean {
  const role = asRoleKey(args.role);
  if (!role || role === "ADMIN") return true;
  const root = args.grants.field?.[args.entity];
  const scope = args.action === "view" ? root?.view : root?.edit;
  if (!hasRoleRule(scope, role)) return true;
  return roleRuleAllows(scope, role, args.fieldKey);
}

export function canSeeSidebarRoute(args: {
  grants: ScopeGrants;
  role: string | null | undefined;
  route: string;
}): boolean {
  const role = asRoleKey(args.role);
  if (!role || role === "ADMIN") return true;
  const scope = args.grants.sidebar?.routes;
  if (!hasRoleRule(scope, role)) return true;
  return roleRuleAllows(scope, role, args.route);
}

export function canSeeSettingsItem(args: {
  grants: ScopeGrants;
  role: string | null | undefined;
  itemId: string;
}): boolean {
  const role = asRoleKey(args.role);
  if (!role || role === "ADMIN") return true;
  const scope = args.grants.sidebar?.settingsItems;
  if (!hasRoleRule(scope, role)) return true;
  return roleRuleAllows(scope, role, args.itemId);
}

const DEFAULT_MEMBER_INBOX_TABS = new Set<InboxTab>(["esperando", "respondidas"]);

export function canSeeInboxTab(args: {
  grants: ScopeGrants;
  role: string | null | undefined;
  tab: InboxTab;
}): boolean {
  if (args.tab === "todos") return true;
  const role = asRoleKey(args.role);
  if (!role || role === "ADMIN" || role === "MANAGER") return true;
  const scope = args.grants.inbox?.tabs;
  if (!hasRoleRule(scope, "MEMBER")) {
    return DEFAULT_MEMBER_INBOX_TABS.has(args.tab);
  }
  return roleRuleAllows(scope, "MEMBER", args.tab);
}

export function listAllowedInboxTabsForUser(args: {
  grants: ScopeGrants;
  role: string | null | undefined;
}): InboxTab[] {
  const role = asRoleKey(args.role);
  if (!role || role === "ADMIN" || role === "MANAGER") {
    return ["todos", ...INBOX_CATEGORY_TAB_ORDER];
  }
  const allowed = INBOX_CATEGORY_TAB_ORDER.filter((t) =>
    canSeeInboxTab({ grants: args.grants, role, tab: t }),
  );
  const base: Exclude<InboxTab, "todos">[] =
    allowed.length > 0 ? [...allowed] : ["esperando", "respondidas"];
  return ["todos", ...base];
}
