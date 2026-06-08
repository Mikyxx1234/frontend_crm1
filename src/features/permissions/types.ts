export interface ActionDef {
  action: string;
  label: string;
  description?: string;
  destructive?: boolean;
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

export interface RoleSummary {
  id: string;
  name: string;
  systemPreset: string | null;
  isSystem: boolean;
  description: string | null;
  permissions: string[];
  _count?: { assignments: number; groups: number; groupMembers: number };
  assignments?: { id: string; user: RoleUser }[];
}

export interface GroupSummary {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  isActive: boolean;
  roleId: string | null;
  role: RoleSummary | null;
  channelGrants: string[];
  stageGrants: string[];
  _count?: { members: number };
  members?: GroupMember[];
}

export interface GroupMember {
  id: string;
  userId: string;
  groupId: string;
  roleId: string | null;
  joinedAt: string;
  user: RoleUser;
  role: RoleSummary | null;
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
