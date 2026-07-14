export interface ActionDef {
  action: string;
  label: string;
  description?: string;
  destructive?: boolean;
  /**
   * Nível mínimo (modo simplificado) em que a action é concedida:
   * 1 = Ver, 2 = Operar, 3 = Total (sensível). Quando ausente, é
   * derivado por heurística em `actionTier()` (level-matrix).
   */
  tier?: 1 | 2 | 3;
}

export interface ResourceDef {
  resource: string;
  label: string;
  description?: string;
  actions: ActionDef[];
}

export interface PermissionsCatalog {
  resources: ResourceDef[];
}

export interface RoleUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

/**
 * Preferência de menu lateral persistida no papel — mesmo shape que o
 * catálogo da sidebar usa. Ver `@/lib/sidebar-catalog`. `null` = sem
 * override (o papel cai no catálogo padrão do CRM).
 */
export interface RoleSidebarItem {
  key: string;
  enabled: boolean;
  order: number;
}

export interface RoleSummary {
  id: string;
  name: string;
  systemPreset: string | null;
  isSystem: boolean;
  description: string | null;
  permissions: string[];
  /**
   * Ponteiro de origem (modelo de herança pragmático): id do role base do
   * qual este grupo personalizado herda. Null/undefined em presets e grupos
   * legados. As permissões efetivas continuam em `permissions`.
   */
  inheritsFrom?: string | null;
  /**
   * Menu lateral configurado pelo admin para este papel. `null` = sem
   * override (usuários do papel veem o catálogo padrão). A sidebar EFETIVA
   * do usuário é a união dos `sidebarItems` de todos os papéis atribuídos
   * a ele — resolvida no backend em `getSidebarPreferences`.
   */
  sidebarItems?: RoleSidebarItem[] | null;
  _count?: { assignments: number; groups: number; groupMembers: number };
  assignments?: { id: string; user: RoleUser }[];
}

// ── Grupos de acesso (modelo Kommo — permissões scoped por grupo) ───────────

export type GroupScopeLevel = "NONE" | "SELF" | "TEAM" | "ALL";

export interface GroupPermissionEntry {
  resource: string;
  action: string;
  level: GroupScopeLevel;
}

export interface GroupStageGrantEntry {
  stageId: string;
  canView: boolean;
  canEdit: boolean;
}

export interface GroupFieldGrantEntry {
  /** "deal" | "contact" | "company" | "product" */
  entity: string;
  fieldKey: string;
  canView: boolean;
  canEdit: boolean;
}

export interface GroupMemberEntry {
  id: string;
  user: RoleUser;
}

export interface GroupSummary {
  id: string;
  name: string;
  description: string | null;
  sharedInbox: boolean;
  mediaAccess: boolean;
  sidebarRoutes: string[];
  _count?: { members: number; permissions: number };
}

export interface GroupDetail extends GroupSummary {
  members: GroupMemberEntry[];
  permissions: GroupPermissionEntry[];
  stageGrants: GroupStageGrantEntry[];
  fieldGrants: GroupFieldGrantEntry[];
}

/** Payload de escrita (POST/PUT) do grupo. */
export interface GroupWritePayload {
  name?: string;
  description?: string | null;
  sharedInbox?: boolean;
  mediaAccess?: boolean;
  sidebarRoutes?: string[];
  permissions?: GroupPermissionEntry[];
  stageGrants?: GroupStageGrantEntry[];
  fieldGrants?: GroupFieldGrantEntry[];
  /** IDs de usuários a vincular como membros já na criação do grupo. */
  memberIds?: string[];
}

export interface EffectivePermissions {
  permissions: string[];
  channelGrants: string[];
  stageGrants: string[];
  roles: { id: string; name: string; systemPreset: string | null }[];
  groups: {
    id: string;
    name: string;
    channelGrants: string[];
    stageGrants: string[];
  }[];
}
