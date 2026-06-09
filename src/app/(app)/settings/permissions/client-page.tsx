"use client";

import { useState } from "react";
import { Plus, RefreshCw, Shield, Users } from "lucide-react";

import { RestrictedScreen } from "@/components/crm/restricted-screen";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/use-user-role";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GroupEditor } from "@/features/permissions/group-editor";
import { RoleEditor } from "@/features/permissions/role-editor";
import { UsersTab } from "@/features/permissions/users-tab";
import { useGroups, useRoles } from "@/features/permissions/hooks";
import type { RoleSummary } from "@/features/permissions/types";
import { cn } from "@/lib/utils";
import { SettingsV2Shell } from "../_v2-shell";

type ActiveSheet =
  | { type: "role"; id: string | null }
  | { type: "group"; id: string | null }
  | null;

export function PermissionsClientPage() {
  const { role, isSuperAdmin, ready } = useUserRole();
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [activeTab, setActiveTab] = useState("roles");

  const isOrgAdmin = isSuperAdmin || role === "ADMIN";
  if (ready && !isOrgAdmin) {
    return (
      <RestrictedScreen
        title="Acesso restrito"
        description="Permissões e roles são gerenciados apenas por administradores da organização."
      />
    );
  }

  return (
    <SettingsV2Shell
      title="Permissões"
      description="Roles, grupos e controle de acesso"
    >
      <Tabs defaultValue="roles" onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex items-center gap-3">
          <TabsList className="h-8">
            <TabsTrigger value="roles" className="h-7 px-3 text-xs">
              <Shield className="mr-1.5 size-3.5" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="groups" className="h-7 px-3 text-xs">
              <Users className="mr-1.5 size-3.5" />
              Grupos
            </TabsTrigger>
            <TabsTrigger value="users" className="h-7 px-3 text-xs">
              Usuários
            </TabsTrigger>
          </TabsList>

        <NewEntityButton
          tab={activeTab}
          onNewRole={() => setActiveSheet({ type: "role", id: null })}
          onNewGroup={() => setActiveSheet({ type: "group", id: null })}
        />
        </div>

        <TabsContent value="roles" className="flex-1 overflow-auto">
          <RolesTab onEdit={(id) => setActiveSheet({ type: "role", id })} />
        </TabsContent>

        <TabsContent value="groups" className="flex-1 overflow-auto">
          <GroupsTab onEdit={(id) => setActiveSheet({ type: "group", id })} />
        </TabsContent>

        <TabsContent value="users" className="flex-1 overflow-auto">
          <UsersTab />
        </TabsContent>
      </Tabs>

      {/* Sheet de edição de Role */}
      <Sheet
        open={activeSheet?.type === "role"}
        onOpenChange={(open) => !open && setActiveSheet(null)}
      >
        <SheetContent side="right" className="w-[560px] overflow-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-sm">
              {activeSheet?.type === "role" && activeSheet.id === null
                ? "Novo role"
                : "Editar role"}
            </SheetTitle>
          </SheetHeader>
          {activeSheet?.type === "role" && (
            <RoleEditor
              roleId={activeSheet.id}
              onClose={() => setActiveSheet(null)}
              onSaved={() => setActiveSheet(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Sheet de edição de Grupo */}
      <Sheet
        open={activeSheet?.type === "group"}
        onOpenChange={(open) => !open && setActiveSheet(null)}
      >
        <SheetContent side="right" className="w-[560px] overflow-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-sm">
              {activeSheet?.type === "group" && activeSheet.id === null
                ? "Novo grupo"
                : "Editar grupo"}
            </SheetTitle>
          </SheetHeader>
          {activeSheet?.type === "group" && (
            <GroupEditor
              groupId={activeSheet.id}
              onClose={() => setActiveSheet(null)}
              onSaved={() => setActiveSheet(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </SettingsV2Shell>
  );
}

/* ── NewEntityButton ─────────────────────────────────────────────────────── */

function NewEntityButton({
  tab,
  onNewRole,
  onNewGroup,
}: {
  tab: string;
  onNewRole: () => void;
  onNewGroup: () => void;
}) {
  if (tab === "roles") {
    return (
      <Button size="sm" className="ml-auto h-7 gap-1.5 text-xs" onClick={onNewRole}>
        <Plus className="size-3.5" />
        Novo role
      </Button>
    );
  }
  if (tab === "groups") {
    return (
      <Button size="sm" className="ml-auto h-7 gap-1.5 text-xs" onClick={onNewGroup}>
        <Plus className="size-3.5" />
        Novo grupo
      </Button>
    );
  }
  return null;
}

/* ── RolesTab ────────────────────────────────────────────────────────────── */

function RolesTab({ onEdit }: { onEdit: (id: string) => void }) {
  const { data: roles = [], isLoading, isError, error, refetch } = useRoles();

  if (isLoading) {
    return <TabSkeleton />;
  }

  if (isError) {
    return (
      <EmptyState
        message={error instanceof Error ? error.message : "Erro ao carregar roles."}
        onRefresh={() => void refetch()}
      />
    );
  }

  const systemRoles = roles.filter((r) => r.isSystem);
  const customRoles = roles.filter((r) => !r.isSystem);

  return (
    <div className="flex flex-col gap-4">
      {systemRoles.length > 0 && (
        <RoleGroup
          title="Presets do sistema"
          roles={systemRoles}
          onEdit={onEdit}
        />
      )}
      {customRoles.length > 0 && (
        <RoleGroup
          title="Roles customizados"
          roles={customRoles}
          onEdit={onEdit}
        />
      )}
      {roles.length === 0 && (
        <EmptyState message="Nenhum role encontrado." onRefresh={() => void refetch()} />
      )}
    </div>
  );
}

function RoleGroup({
  title,
  roles,
  onEdit,
}: {
  title: string;
  roles: RoleSummary[];
  onEdit: (id: string) => void;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        {title}
      </h3>
      <div
        className="overflow-hidden rounded-[var(--radius-xl)] border"
        style={{ borderColor: "var(--glass-border)", background: "var(--glass-bg-base)" }}
      >
        {roles.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => onEdit(role.id)}
            className="flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[var(--glass-bg-overlay)]"
            style={{ borderColor: "var(--glass-border-subtle)" }}
          >
            <Shield className="size-4 shrink-0" style={{ color: "var(--brand-primary)" }} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                {role.name}
              </p>
              {role.description && (
                <p className="truncate text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {role.description}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-3 text-[11px]" style={{ color: "var(--text-muted)" }}>
              <span>{role.permissions.length} permissão(ões)</span>
              <span>{role._count?.assignments ?? 0} usuário(s)</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ── GroupsTab ───────────────────────────────────────────────────────────── */

function GroupsTab({ onEdit }: { onEdit: (id: string) => void }) {
  const { data: groups = [], isLoading, isError, error, refetch } = useGroups();

  if (isLoading) {
    return <TabSkeleton />;
  }

  if (isError) {
    return (
      <EmptyState
        message={error instanceof Error ? error.message : "Erro ao carregar grupos."}
        onRefresh={() => void refetch()}
      />
    );
  }

  if (groups.length === 0) {
    return <EmptyState message="Nenhum grupo criado ainda." onRefresh={() => void refetch()} />;
  }

  return (
    <div
      className="overflow-hidden rounded-[var(--radius-xl)] border"
      style={{ borderColor: "var(--glass-border)", background: "var(--glass-bg-base)" }}
    >
      {groups.map((group) => (
        <button
          key={group.id}
          type="button"
          onClick={() => onEdit(group.id)}
          className="flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[var(--glass-bg-overlay)]"
          style={{ borderColor: "var(--glass-border-subtle)" }}
        >
          {/* Dot de cor */}
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ background: group.color ?? "var(--text-muted)" }}
          />

          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-xs font-medium" style={{ color: "var(--text-primary)" }}>
              {group.name}
              {!group.isActive && (
                <span className="text-[10px] text-amber-600">(arquivado)</span>
              )}
            </p>
            {group.role && (
              <p className="truncate text-[11px]" style={{ color: "var(--text-muted)" }}>
                Role padrão: {group.role.name}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {group._count?.members ?? 0} membro(s)
            </span>
            {group.channelGrants.length > 0 && (
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {group.channelGrants.join(", ")}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function TabSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-[var(--radius-lg)]"
          style={{ background: "var(--glass-bg-base)" }}
        />
      ))}
    </div>
  );
}

function EmptyState({ message, onRefresh }: { message: string; onRefresh: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12">
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{message}</p>
      <Button size="sm" variant="outline" onClick={onRefresh} className="h-7 gap-1.5 text-xs">
        <RefreshCw className="size-3" />
        Recarregar
      </Button>
    </div>
  );
}
