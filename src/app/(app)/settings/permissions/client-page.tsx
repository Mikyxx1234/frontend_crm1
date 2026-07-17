"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  IconPlus,
  IconSearch,
  IconShield,
  IconShieldCheck,
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

import { SETTINGS_HUB_BACK, SettingsV2Shell } from "../_v2-shell";

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
      back={SETTINGS_HUB_BACK}
      title="Permissões"
      description="Papéis, grupos e usuários"
      icon={<IconShieldCheck size={22} />}
    >
      {/* Mobile: coluna única, altura natural (page scroll) — lista antes,
          detail embaixo. Em lg+: duas colunas com altura travada ao viewport
          e scroll interno em cada painel (comportamento anterior). */}
      <div className="grid min-w-0 grid-cols-1 gap-3 lg:h-full lg:min-h-0 lg:grid-cols-[300px_minmax(0,1fr)]">
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

type SidebarTab = "role" | "group" | "user";

const ADD_LABEL: Record<SidebarTab, string> = {
  role: "Papel",
  group: "Grupo",
  user: "Pessoa",
};

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

  const [tab, setTab] = useState<SidebarTab>(
    selection.kind === "group" || selection.kind === "user"
      ? selection.kind
      : "role",
  );
  const [search, setSearch] = useState("");

  // Ao selecionar um item (ou o detail limpar/recriar), sincroniza a aba ativa
  // com o tipo selecionado — mantém o contexto coerente.
  useEffect(() => {
    if (selection.kind !== "none") setTab(selection.kind);
  }, [selection.kind]);

  // Reseta a busca ao trocar de contexto (a busca é por aba).
  useEffect(() => {
    setSearch("");
  }, [tab]);

  const q = search.trim().toLowerCase();
  const filteredRoles = useMemo(
    () => (q ? roles.filter((r) => r.name.toLowerCase().includes(q)) : roles),
    [roles, q],
  );
  const filteredGroups = useMemo(
    () => (q ? groups.filter((g) => g.name.toLowerCase().includes(q)) : groups),
    [groups, q],
  );
  const filteredUsers = useMemo(
    () =>
      q
        ? users.filter(
            (u) =>
              u.name?.toLowerCase().includes(q) ||
              u.email?.toLowerCase().includes(q),
          )
        : users,
    [users, q],
  );

  const canAdd = tab === "role" || tab === "group";
  const handleAdd = () => {
    if (tab === "role") onSelect({ kind: "role", id: "new" });
    else if (tab === "group") onSelect({ kind: "group", id: "new" });
  };

  const TABS: { id: SidebarTab; label: string; count: number }[] = [
    { id: "role", label: "Papéis", count: roles.length },
    { id: "group", label: "Grupos", count: groups.length },
    { id: "user", label: "Pessoas", count: users.length },
  ];

  return (
    <aside className="flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] shadow-[var(--glass-shadow)] backdrop-blur-md v2-dark:bg-[var(--glass-bg-modal)] lg:h-full lg:min-h-0">
      {/* Header + segmented (um contexto por vez) */}
      <div className="flex flex-col gap-3 border-b border-[var(--glass-border-subtle)] px-3.5 pb-3 pt-3">
        <div className="flex items-center gap-2">
          <span className="text-[var(--brand-primary)]">
            <IconShieldCheck size={16} />
          </span>
          <h2 className="font-display text-[13px] font-bold text-[var(--text-primary)]">
            Acessos
          </h2>
        </div>
        <div className="flex gap-1 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-1">
          {TABS.map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-[7px] px-2 py-1.5 font-display text-[12px] font-bold transition-colors",
                  on
                    ? "bg-[var(--brand-primary)] text-white shadow-[0_3px_10px_rgba(91,111,245,0.3)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--glass-bg-strong)]",
                )}
              >
                {t.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px] font-bold leading-4",
                    on
                      ? "bg-white/25 text-white"
                      : "bg-[var(--glass-bg-strong)] text-[var(--text-muted)]",
                  )}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Busca única + ação contextual */}
      <div className="flex items-center gap-2 px-3 pb-2 pt-2.5">
        <div className="relative min-w-0 flex-1">
          <IconSearch
            size={13}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar…"
            className="h-8 w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] pl-8 pr-2 font-display text-[12.5px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/30"
          />
        </div>
        {canAdd && (
          <button
            type="button"
            onClick={handleAdd}
            className="flex h-8 shrink-0 items-center gap-1 rounded-[var(--radius-md)] bg-[var(--brand-primary)] px-2.5 font-display text-[12px] font-bold text-white shadow-[0_3px_12px_rgba(91,111,245,0.3)] transition-colors hover:bg-[var(--brand-primary-dark)]"
          >
            <IconPlus size={13} />
            {ADD_LABEL[tab]}
          </button>
        )}
      </div>

      {/* Lista do contexto ativo */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 pb-2.5">
        {tab === "role" && (
          <>
            {filteredRoles.map((r) => (
              <RoleRow
                key={r.id}
                role={r}
                active={selection.kind === "role" && selection.id === r.id}
                onClick={() => onSelect({ kind: "role", id: r.id })}
              />
            ))}
            {!rolesLoading && filteredRoles.length === 0 && (
              <EmptyRow label={q ? "Sem resultados" : "Nenhum papel"} />
            )}
          </>
        )}

        {tab === "group" && (
          <>
            {filteredGroups.map((g) => (
              <GroupRow
                key={g.id}
                group={g}
                active={selection.kind === "group" && selection.id === g.id}
                onClick={() => onSelect({ kind: "group", id: g.id })}
              />
            ))}
            {!groupsLoading && filteredGroups.length === 0 && (
              <EmptyRow label={q ? "Sem resultados" : "Nenhum grupo"} />
            )}
          </>
        )}

        {tab === "user" && (
          <>
            {filteredUsers.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                active={selection.kind === "user" && selection.id === u.id}
                onClick={() => onSelect({ kind: "user", id: u.id })}
              />
            ))}
            {!usersLoading && filteredUsers.length === 0 && (
              <EmptyRow label={q ? "Sem resultados" : "Nenhuma pessoa"} />
            )}
          </>
        )}
      </div>
    </aside>
  );
}

// ─── Rows (anatomia consistente: tile/avatar + nome + meta) ─────────────────

function RowShell({
  active,
  onClick,
  leading,
  title,
  meta,
  trailing,
}: {
  active: boolean;
  onClick: () => void;
  leading: React.ReactNode;
  title: string;
  meta?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 text-left transition-colors",
        active
          ? "bg-[var(--color-primary-soft)]"
          : "hover:bg-[var(--glass-bg-overlay)]",
      )}
    >
      {active && (
        <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-[var(--brand-primary)]" />
      )}
      {leading}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate font-display text-[12.5px] font-semibold leading-tight",
            active ? "text-[var(--brand-primary)]" : "text-[var(--text-primary)]",
          )}
        >
          {title}
        </span>
        {meta && (
          <span className="mt-0.5 block truncate font-body text-[11px] leading-tight text-[var(--text-muted)]">
            {meta}
          </span>
        )}
      </span>
      {trailing}
    </button>
  );
}

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
  const perms = role.permissions?.length ?? 0;
  const usersCount = role._count?.assignments ?? 0;
  const meta = `${perms} ${perms === 1 ? "permissão" : "permissões"} · ${usersCount} ${usersCount === 1 ? "usuário" : "usuários"}`;
  return (
    <RowShell
      active={active}
      onClick={onClick}
      leading={
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-[var(--color-primary-soft)] text-[var(--brand-primary)]">
          <Icon size={16} />
        </span>
      }
      title={role.name}
      meta={meta}
      trailing={
        role.isSystem ? (
          <span className="shrink-0 rounded-full bg-[var(--glass-bg-strong)] px-2 py-0.5 font-display text-[9.5px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
            Base
          </span>
        ) : undefined
      }
    />
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
    <RowShell
      active={active}
      onClick={onClick}
      leading={
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-[color-mix(in_srgb,#0d9488_16%,transparent)] text-[#0d9488]">
          <IconUsers size={16} />
        </span>
      }
      title={group.name}
      meta={`${members} ${members === 1 ? "membro" : "membros"}`}
    />
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
    <RowShell
      active={active}
      onClick={onClick}
      leading={
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full font-display text-[10.5px] font-bold text-white",
            active ? "bg-[var(--brand-primary)]" : "bg-[var(--text-muted)]",
          )}
        >
          {initials}
        </span>
      }
      title={user.name}
      meta={user.email}
    />
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <p className="px-2 py-3 text-center text-[11.5px] italic text-[var(--text-muted)]">
      {label}
    </p>
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
        "flex min-w-0 flex-col overflow-y-auto rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] shadow-[var(--glass-shadow)] backdrop-blur-md lg:h-full lg:min-h-0",
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
