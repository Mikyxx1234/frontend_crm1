"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconPlus,
  IconRefresh,
  IconShield,
  IconShieldCheck,
  IconUsers,
  IconUsersGroup,
} from "@tabler/icons-react";

import { RestrictedScreen } from "@/components/crm/restricted-screen";
import { useUserRole } from "@/hooks/use-user-role";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { GroupEditor } from "@/features/permissions/group-editor";
import { UsersTab } from "@/features/permissions/users-tab";
import { useGroups, useRoles } from "@/features/permissions/hooks";
import type { GroupSummary, RoleSummary } from "@/features/permissions/types";
import { cn } from "@/lib/utils";

import { SettingsV2Shell } from "../_v2-shell";

/** Edição/criação de role é uma página dedicada (fora desta tela). */
function roleHref(id: string | null): string {
  return `/settings/permissions/roles/${id ?? "new"}`;
}

export function PermissionsClientPage() {
  const router = useRouter();
  const { role, isSuperAdmin, ready } = useUserRole();
  const [groupSheet, setGroupSheet] = useState<{ id: string | null } | null>(null);

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
      description="Usuários, regras e grupos de acesso"
      icon={<IconShieldCheck size={22} />}
    >
      {/* Tela unificada — tudo visível, sem tabs. Cards de Roles e Regras
          SEMPRE abaixo dos usuários (independente do zoom/viewport). */}
      <div className="flex flex-col gap-5">
        {/* ── Usuários ───────────────────────────────────────────────── */}
        <section className="flex min-w-0 flex-col gap-3">
          <SectionHeader
            icon={<IconUsers size={16} className="text-[var(--text-secondary)]" />}
            title="Usuários"
            hint="Gerencie regras e grupos por pessoa"
          />
          <UsersTab />
        </section>

        {/* ── Roles + Regras (sempre abaixo) ─────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <RolesCard
            onNew={() => router.push(roleHref(null))}
            onEdit={(id) => router.push(roleHref(id))}
          />
          <GroupsCard
            onNew={() => setGroupSheet({ id: null })}
            onEdit={(id) => setGroupSheet({ id })}
          />
        </div>
      </div>

      {/* Sheet de edição de Grupo */}
      <Sheet open={!!groupSheet} onOpenChange={(open) => !open && setGroupSheet(null)}>
        <SheetContent side="right" className="w-[560px] overflow-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-sm">
              {groupSheet?.id === null ? "Novo grupo" : "Editar grupo"}
            </SheetTitle>
          </SheetHeader>
          {groupSheet && (
            <GroupEditor
              groupId={groupSheet.id}
              onClose={() => setGroupSheet(null)}
              onSaved={() => setGroupSheet(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </SettingsV2Shell>
  );
}

/* ── Header de seção ─────────────────────────────────────────────────────── */

function SectionHeader({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <h2 className="font-display text-[13px] font-bold text-[var(--text-primary)]">{title}</h2>
      {hint && <span className="text-[11px] text-[var(--text-muted)]">· {hint}</span>}
    </div>
  );
}

/* ── Card de Roles ───────────────────────────────────────────────────────── */

function RolesCard({
  onNew,
  onEdit,
}: {
  onNew: () => void;
  onEdit: (id: string) => void;
}) {
  const { data: roles = [], isLoading, isError, error, refetch } = useRoles();
  const systemRoles = roles.filter((r) => r.isSystem);
  const customRoles = roles.filter((r) => !r.isSystem);

  return (
    <CardShell
      icon={<IconShield size={16} className="text-[var(--text-secondary)]" />}
      title="Regras"
      count={roles.length}
      action={<NewButton label="Nova regra" onClick={onNew} />}
    >
      {isLoading ? (
        <CardSkeleton />
      ) : isError ? (
        <CardError
          message={error instanceof Error ? error.message : "Erro ao carregar roles."}
          onRetry={() => void refetch()}
        />
      ) : roles.length === 0 ? (
        <CardEmpty message="Nenhum role encontrado." onRetry={() => void refetch()} />
      ) : (
        <div className="flex flex-col gap-3">
          {systemRoles.length > 0 && (
            <RoleSubgroup title="Presets do sistema" roles={systemRoles} onEdit={onEdit} />
          )}
          {customRoles.length > 0 && (
            <RoleSubgroup title="Roles customizados" roles={customRoles} onEdit={onEdit} />
          )}
        </div>
      )}
    </CardShell>
  );
}

function RoleSubgroup({
  title,
  roles,
  onEdit,
}: {
  title: string;
  roles: RoleSummary[];
  onEdit: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {title}
      </h3>
      {roles.map((role) => (
        <button
          key={role.id}
          type="button"
          onClick={() => onEdit(role.id)}
          className="flex w-full items-start gap-2.5 rounded-[var(--radius-md)] px-2 py-1.5 text-left transition-colors hover:bg-black/[0.04]"
        >
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary-soft)] text-[var(--brand-primary)]">
            {role.isSystem ? <IconShieldCheck size={15} /> : <IconShield size={15} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-semibold text-[var(--text-primary)]">
              {role.name}
            </span>
            {role.description && (
              <span className="block truncate text-[11px] text-[var(--text-muted)]">
                {role.description}
              </span>
            )}
            <span className="mt-0.5 flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
              <span>{role.permissions.length} permissão(ões)</span>
              <span aria-hidden>·</span>
              <span>{role._count?.assignments ?? 0} usuário(s)</span>
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

/* ── Card de Grupos ──────────────────────────────────────────────────────── */

function GroupsCard({
  onNew,
  onEdit,
}: {
  onNew: () => void;
  onEdit: (id: string) => void;
}) {
  const { data: groups = [], isLoading, isError, error, refetch } = useGroups();

  return (
    <CardShell
      icon={<IconUsersGroup size={16} className="text-[var(--text-secondary)]" />}
      title="Grupos"
      count={groups.length}
      action={<NewButton label="Novo grupo" onClick={onNew} />}
    >
      {isLoading ? (
        <CardSkeleton />
      ) : isError ? (
        <CardError
          message={error instanceof Error ? error.message : "Erro ao carregar grupos."}
          onRetry={() => void refetch()}
        />
      ) : groups.length === 0 ? (
        <CardEmpty message="Nenhum grupo criado ainda." onRetry={() => void refetch()} />
      ) : (
        <div className="flex flex-col gap-0.5">
          {groups.map((group) => (
            <GroupItem key={group.id} group={group} onEdit={onEdit} />
          ))}
        </div>
      )}
    </CardShell>
  );
}

function GroupItem({
  group,
  onEdit,
}: {
  group: GroupSummary;
  onEdit: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onEdit(group.id)}
      className="flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2 py-1.5 text-left transition-colors hover:bg-black/[0.04]"
    >
      <span
        className="size-2.5 shrink-0 rounded-full"
        style={{ background: group.color ?? "var(--text-muted)" }}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--text-primary)]">
          <span className="truncate">{group.name}</span>
          {!group.isActive && (
            <span className="text-[10px] text-[var(--color-warning)]">(arquivado)</span>
          )}
        </span>
        {group.role && (
          <span className="block truncate text-[11px] text-[var(--text-muted)]">
            Role padrão: {group.role.name}
          </span>
        )}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5 text-[10px] text-[var(--text-muted)]">
        <span>{group._count?.members ?? 0} membro(s)</span>
        {group.channelGrants.length > 0 && (
          <span className="truncate">{group.channelGrants.join(", ")}</span>
        )}
      </span>
    </button>
  );
}

/* ── Primitivas de card ──────────────────────────────────────────────────── */

function CardShell({
  icon,
  title,
  count,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-white shadow-sm">
      <header className="flex items-center justify-between gap-2 border-b border-[var(--glass-border-subtle)] px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="font-display text-[13px] font-bold text-[var(--text-primary)]">{title}</h2>
          <span className="rounded-full bg-black/[0.05] px-1.5 py-px text-[10px] font-semibold text-[var(--text-secondary)]">
            {count}
          </span>
        </div>
        {action}
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
}

function NewButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 font-display text-[11px] font-bold transition-all",
        "bg-[var(--brand-primary)] text-[var(--color-primary-foreground)] shadow-[var(--glass-shadow-sm)]",
        "hover:opacity-90 focus-visible:outline-2 focus-visible:outline-[var(--brand-primary)]",
      )}
    >
      <IconPlus size={13} />
      {label}
    </button>
  );
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-11 animate-pulse rounded-[var(--radius-md)] bg-black/[0.05]"
        />
      ))}
    </div>
  );
}

function CardEmpty({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <p className="text-[11px] text-[var(--text-muted)]">{message}</p>
      <RetryButton onClick={onRetry} />
    </div>
  );
}

function CardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <p className="text-[11px] text-[var(--color-destructive)]">{message}</p>
      <RetryButton onClick={onRetry} />
    </div>
  );
}

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-overlay)]"
    >
      <IconRefresh size={12} />
      Recarregar
    </button>
  );
}
