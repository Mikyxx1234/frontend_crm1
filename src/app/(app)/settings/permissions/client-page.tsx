"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  IconPlus,
  IconSearch,
  IconShield,
  IconShieldCheck,
  IconUser,
  IconUsers,
} from "@tabler/icons-react";

import { RestrictedScreen } from "@/components/crm/restricted-screen";
import { useUserRole } from "@/hooks/use-user-role";
import { GroupPermissionsEditor } from "@/features/permissions/group-permissions-editor";
import { RoleEditor } from "@/features/permissions/role-editor";
import { UserPermissionsView } from "@/features/permissions/user-permissions-view";
import { useGroups, useRoles } from "@/features/permissions/hooks";
import type { GroupSummary, RoleSummary, RoleUser } from "@/features/permissions/types";
import { apiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

import { SettingsV2Shell } from "../_v2-shell";

// ─── Selection state via query ──────────────────────────────────────────────

type Selection =
  | { kind: "role"; id: string | "new" }
  | { kind: "group"; id: string | "new" }
  | { kind: "user"; id: string }
  | { kind: "none" };

function readSelection(params: URLSearchParams): Selection {
  const role = params.get("role");
  if (role) return { kind: "role", id: role === "new" ? "new" : role };
  const group = params.get("group");
  if (group) return { kind: "group", id: group === "new" ? "new" : group };
  const user = params.get("user");
  if (user) return { kind: "user", id: user };
  return { kind: "none" };
}

// ─── Users fetch ────────────────────────────────────────────────────────────

interface UserListItem extends RoleUser {
  role?: string;
}

function useUsers() {
  return useQuery<UserListItem[]>({
    queryKey: ["users-list"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/users"));
      if (!res.ok) throw new Error("Erro ao carregar usuários");
      return res.json() as Promise<UserListItem[]>;
    },
  });
}

// ─── Página ─────────────────────────────────────────────────────────────────

export function PermissionsClientPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { role, isSuperAdmin, ready } = useUserRole();

  const isOrgAdmin = isSuperAdmin || role === "ADMIN";
  const selection = readSelection(new URLSearchParams(params.toString()));

  const select = useCallback(
    (next: Selection) => {
      const sp = new URLSearchParams();
      if (next.kind === "role") sp.set("role", next.id);
      else if (next.kind === "group") sp.set("group", next.id);
      else if (next.kind === "user") sp.set("user", next.id);
      const qs = sp.toString();
      router.replace(qs ? `/settings/permissions?${qs}` : "/settings/permissions");
    },
    [router],
  );

  const clearSelection = useCallback(() => select({ kind: "none" }), [select]);

  if (ready && !isOrgAdmin) {
    return (
      <RestrictedScreen
        title="Acesso restrito"
        description="Permissões são gerenciadas apenas por administradores da organização."
      />
    );
  }

  return (
    <SettingsV2Shell
      title="Permissões"
      description="Papéis, grupos e usuários"
      icon={<IconShieldCheck size={22} />}
    >
      <div className="grid h-full min-h-0 grid-cols-1 gap-3 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Sidebar selection={selection} onSelect={select} />
        <DetailPane
          selection={selection}
          onClear={clearSelection}
          onSelect={select}
        />
      </div>
    </SettingsV2Shell>
  );
}

// ─── Sidebar (master) ───────────────────────────────────────────────────────

function Sidebar({
  selection,
  onSelect,
}: {
  selection: Selection;
  onSelect: (s: Selection) => void;
}) {
  const { data: roles = [], isLoading: rolesLoading } = useRoles();
  const { data: groups = [], isLoading: groupsLoading } = useGroups();
  const { data: users = [], isLoading: usersLoading } = useUsers();

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] shadow-[var(--glass-shadow)] backdrop-blur-md">
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
        <Section
          icon={<IconShield size={13} />}
          title="Papéis"
          count={roles.length}
          loading={rolesLoading}
          onAdd={() => onSelect({ kind: "role", id: "new" })}
          addLabel="Novo papel"
        >
          {roles.map((r) => (
            <RoleRow
              key={r.id}
              role={r}
              active={selection.kind === "role" && selection.id === r.id}
              onClick={() => onSelect({ kind: "role", id: r.id })}
            />
          ))}
          {!rolesLoading && roles.length === 0 && (
            <EmptyRow label="Nenhum papel" />
          )}
        </Section>

        <Section
          icon={<IconUsers size={13} />}
          title="Grupos"
          count={groups.length}
          loading={groupsLoading}
          onAdd={() => onSelect({ kind: "group", id: "new" })}
          addLabel="Novo grupo"
        >
          {groups.map((g) => (
            <GroupRow
              key={g.id}
              group={g}
              active={selection.kind === "group" && selection.id === g.id}
              onClick={() => onSelect({ kind: "group", id: g.id })}
            />
          ))}
          {!groupsLoading && groups.length === 0 && (
            <EmptyRow label="Nenhum grupo" />
          )}
        </Section>

        <UsersSection
          users={users}
          loading={usersLoading}
          selection={selection}
          onSelect={(id) => onSelect({ kind: "user", id })}
        />
      </div>
    </aside>
  );
}

// ─── Section wrapper ────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  count,
  loading,
  onAdd,
  addLabel,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  loading?: boolean;
  onAdd?: () => void;
  addLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1">
      <header className="flex items-center gap-1.5 px-2 pb-1 pt-1.5">
        <span className="text-[var(--text-muted)]">{icon}</span>
        <h3 className="font-display text-[10.5px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
          {title}
        </h3>
        <span className="text-[10.5px] font-semibold text-[var(--text-muted)]">
          {loading ? "…" : count}
        </span>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            title={addLabel}
            aria-label={addLabel}
            className="ml-auto flex size-5 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--brand-primary)] transition-colors hover:bg-[var(--brand-primary)] hover:text-white"
          >
            <IconPlus size={12} />
          </button>
        )}
      </header>
      <div className="flex flex-col gap-0.5">{children}</div>
    </section>
  );
}

// ─── Rows ───────────────────────────────────────────────────────────────────

function RoleRow({
  role,
  active,
  onClick,
}: {
  role: RoleSummary;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = role.isSystem ? IconShieldCheck : IconShield;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5 text-left transition-colors",
        active
          ? "bg-[var(--color-primary-soft)] text-[var(--brand-primary)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]",
      )}
    >
      <Icon size={14} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate font-display text-[12.5px] font-semibold">
        {role.name}
      </span>
      {role.isSystem && (
        <span className="shrink-0 text-[9.5px] font-bold uppercase tracking-wide opacity-60">
          base
        </span>
      )}
    </button>
  );
}

function GroupRow({
  group,
  active,
  onClick,
}: {
  group: GroupSummary;
  active: boolean;
  onClick: () => void;
}) {
  const members = group._count?.members ?? 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5 text-left transition-colors",
        active
          ? "bg-[var(--color-primary-soft)] text-[var(--brand-primary)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]",
      )}
    >
      <IconUsers size={14} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate font-display text-[12.5px] font-semibold">
        {group.name}
      </span>
      {members > 0 && (
        <span className="shrink-0 text-[10px] font-semibold opacity-70">
          {members}
        </span>
      )}
    </button>
  );
}

function UserRow({
  user,
  active,
  onClick,
}: {
  user: UserListItem;
  active: boolean;
  onClick: () => void;
}) {
  const initials =
    user.name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") ?? "?";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5 text-left transition-colors",
        active
          ? "bg-[var(--color-primary-soft)] text-[var(--brand-primary)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-primary)]",
      )}
    >
      <span
        className={cn(
          "flex size-[22px] shrink-0 items-center justify-center rounded-full font-display text-[9px] font-bold text-white",
          active ? "bg-[var(--brand-primary)]" : "bg-[var(--text-muted)]",
        )}
      >
        {initials}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[12.5px] font-semibold leading-tight">
          {user.name}
        </span>
        <span className="block truncate text-[10.5px] leading-tight opacity-70">
          {user.email}
        </span>
      </span>
    </button>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <p className="px-2 py-2 text-[11.5px] italic text-[var(--text-muted)]">
      {label}
    </p>
  );
}

// ─── Users section (com busca quando lista grande) ──────────────────────────

function UsersSection({
  users,
  loading,
  selection,
  onSelect,
}: {
  users: UserListItem[];
  loading: boolean;
  selection: Selection;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q),
    );
  }, [users, search]);

  return (
    <Section
      icon={<IconUser size={13} />}
      title="Usuários"
      count={users.length}
      loading={loading}
    >
      {users.length >= 8 && (
        <div className="relative px-1.5 pb-1">
          <IconSearch
            size={12}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar"
            className="h-7 w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] pl-7 pr-2 font-display text-[11.5px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/30"
          />
        </div>
      )}
      {filtered.map((u) => (
        <UserRow
          key={u.id}
          user={u}
          active={selection.kind === "user" && selection.id === u.id}
          onClick={() => onSelect(u.id)}
        />
      ))}
      {!loading && filtered.length === 0 && (
        <EmptyRow label={search ? "Sem resultados" : "Nenhum usuário"} />
      )}
    </Section>
  );
}

// ─── DetailPane (detail) ────────────────────────────────────────────────────

function DetailPane({
  selection,
  onClear,
  onSelect,
}: {
  selection: Selection;
  onClear: () => void;
  onSelect: (s: Selection) => void;
}) {
  if (selection.kind === "role") {
    return (
      <PaneShell>
        <RoleEditor
          roleId={selection.id === "new" ? null : selection.id}
          onClose={onClear}
          onSaved={onClear}
        />
      </PaneShell>
    );
  }
  if (selection.kind === "group") {
    return (
      <PaneShell>
        <GroupPermissionsEditor
          groupId={selection.id === "new" ? null : selection.id}
          onClose={onClear}
          onSaved={(id) => onSelect({ kind: "group", id })}
          onDeleted={onClear}
        />
      </PaneShell>
    );
  }
  if (selection.kind === "user") {
    return (
      <PaneShell>
        <UserDetailHeader userId={selection.id} />
        <UserPermissionsView userId={selection.id} editable />
      </PaneShell>
    );
  }
  return (
    <PaneShell empty>
      <DetailEmptyState onSelect={onSelect} />
    </PaneShell>
  );
}

function PaneShell({
  children,
  empty,
}: {
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-y-auto rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] shadow-[var(--glass-shadow)] backdrop-blur-md",
        empty ? "items-center justify-center p-6" : "p-5",
      )}
    >
      {children}
    </div>
  );
}

function UserDetailHeader({ userId }: { userId: string }) {
  const { data: users = [] } = useUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return null;
  return (
    <header className="mb-4 flex items-center gap-3 border-b border-[var(--glass-border-subtle)] pb-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] font-display text-[13px] font-bold text-white">
        {user.name
          ?.trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((w) => w[0]?.toUpperCase() ?? "")
          .join("") ?? "?"}
      </span>
      <div className="min-w-0">
        <h2 className="truncate font-display text-[15px] font-bold text-[var(--text-primary)]">
          {user.name}
        </h2>
        <p className="truncate text-[12px] text-[var(--text-muted)]">
          {user.email}
        </p>
      </div>
    </header>
  );
}

function DetailEmptyState({
  onSelect,
}: {
  onSelect: (s: Selection) => void;
}) {
  return (
    <div className="flex max-w-md flex-col items-center gap-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-[var(--color-primary-soft)] text-[var(--brand-primary)]">
        <IconShieldCheck size={28} />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-[15px] font-bold text-[var(--text-primary)]">
          Selecione um item à esquerda
        </h2>
        <p className="font-body text-[12.5px] leading-relaxed text-[var(--text-muted)]">
          Escolha um papel, grupo ou usuário para configurar.
          <br />
          Ou crie um novo agora:
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => onSelect({ kind: "role", id: "new" })}
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-primary)] px-3.5 py-1.5 font-display text-[12.5px] font-bold text-white shadow-[var(--shadow-brand)] transition-colors hover:bg-[var(--brand-primary-dark)]"
        >
          <IconPlus size={13} />
          Novo papel
        </button>
        <button
          type="button"
          onClick={() => onSelect({ kind: "group", id: "new" })}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3.5 py-1.5 font-display text-[12.5px] font-bold text-[var(--brand-primary)] transition-colors hover:bg-[var(--glass-bg-strong)]"
        >
          <IconPlus size={13} />
          Novo grupo
        </button>
      </div>
    </div>
  );
}
