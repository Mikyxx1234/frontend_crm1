"use client";

import { apiUrl } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconKey,
  IconMail,
  IconPlus,
  IconShield,
  IconTrash,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react";
import { IconEye as Eye, IconEyeOff as EyeOff, IconKey as KeyRound, IconLoader2 as Loader2, IconTrash as Trash2 } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import * as React from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CheckboxGlass } from "@/components/crm/checkbox-glass";
import { DropdownGlass } from "@/components/crm/dropdown-glass";
import {
  listTableHeadRowClass,
  ListColumnLabel,
} from "@/components/crm/sortable-header";
import { PaginationGlass } from "@/components/crm/pagination-glass";
import {
  PagePrimaryButton,
  PageSearchBar,
} from "@/components/crm/page-toolbar";
import { cn } from "@/lib/utils";
import {
  CRM_ACTION_KEYS,
  CRM_ACTION_LABELS,
  type CrmActionKey,
  setCrmActionGrantsForUser,
} from "@/lib/permissions";

import { useRoles } from "@/features/permissions/hooks";

import { SETTINGS_HUB_BACK, SettingsV2Shell } from "../_v2-shell";
import { TelephonyToggle } from "@/features/telephony/telephony-toggle";

type UserRole = "ADMIN" | "MANAGER" | "MEMBER";

type AssignedRole = { id: string; name: string; systemPreset: string | null };

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assignedRoles?: AssignedRole[];
};

type CrmPermissionDraft = Record<CrmActionKey, boolean>;

const DEFAULT_INVITE_PERMISSIONS: CrmPermissionDraft = {
  editLeads: true,
  runAutomations: true,
  assignOwner: true,
};

const DEFAULT_PER_PAGE = 25;

const AVATAR_COLORS = [
  "var(--brand-primary)",
  "var(--brand-secondary)",
  "var(--color-success)",
  "var(--brand-primary-light)",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** Classes do badge de função (espelha o HTML de referência DS v2). */
function roleBadgeClass(isAdminRole: boolean): string {
  return isAdminRole
    ? "border-transparent bg-[var(--color-enterprise-bg,rgba(91,111,245,0.15))] text-[var(--brand-primary-dark,#3d52e8)]"
    : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)]";
}

/**
 * Resolve a "função" exibida do usuário (modelo híbrido):
 *   - ADMIN legado → preset "Administrador".
 *   - senão, a primeira role CUSTOMIZADA atribuída (não-preset).
 *   - fallback: primeira role atribuída (preset legado MANAGER/MEMBER).
 */
function userFunctionRole(
  u: UserRow,
  adminRoleId: string | undefined,
): AssignedRole | undefined {
  if (u.role === "ADMIN") {
    return adminRoleId
      ? { id: adminRoleId, name: "Administrador", systemPreset: "ADMIN" }
      : { id: "__admin__", name: "Administrador", systemPreset: "ADMIN" };
  }
  const custom = u.assignedRoles?.find((r) => !r.systemPreset);
  if (custom) return custom;
  return u.assignedRoles?.[0];
}

async function parseJsonError(res: Response, fallback: string): Promise<never> {
  const data = (await res.json().catch(() => ({}))) as { message?: string };
  throw new Error(typeof data.message === "string" ? data.message : fallback);
}

async function fetchUsers(): Promise<UserRow[]> {
  const res = await fetch(apiUrl("/api/users"));
  if (!res.ok) await parseJsonError(res, "Erro ao carregar equipe.");
  return res.json();
}

export default function TeamV2ClientPage() {
  const qc = useQueryClient();
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  // Funções disponíveis (modelo híbrido): ADMIN preset + roles customizadas.
  const { data: roles = [] } = useRoles();
  const adminRole = React.useMemo(
    () => roles.find((r) => r.systemPreset === "ADMIN"),
    [roles],
  );
  const customRoles = React.useMemo(
    () => roles.filter((r) => !r.isSystem),
    [roles],
  );
  const baseRoleOptions = React.useMemo(
    () => [
      ...(adminRole ? [{ value: adminRole.id, label: "Administrador" }] : []),
      ...customRoles.map((r) => ({ value: r.id, label: r.name })),
    ],
    [adminRole, customRoles],
  );

  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(DEFAULT_PER_PAGE);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [inviteName, setInviteName] = React.useState("");
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [invitePassword, setInvitePassword] = React.useState("");
  const [inviteRoleId, setInviteRoleId] = React.useState<string>("");
  const [invitePermissions, setInvitePermissions] = React.useState<CrmPermissionDraft>(
    DEFAULT_INVITE_PERMISSIONS,
  );

  const [passwordTarget, setPasswordTarget] = React.useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  const [deleteTarget, setDeleteTarget] = React.useState<UserRow | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const [bulkDeleting, setBulkDeleting] = React.useState(false);

  const {
    data: users = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["users-list"],
    queryFn: fetchUsers,
    enabled: status === "authenticated",
  });

  // ─── Derivados: busca + paginação client-side ──────────────────────────
  const term = search.trim().toLowerCase();
  const filtered = React.useMemo(() => {
    if (!term) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term),
    );
  }, [users, term]);

  const total = filtered.length;
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(page, lastPage);
  const pageItems = React.useMemo(
    () => filtered.slice((currentPage - 1) * perPage, currentPage * perPage),
    [filtered, currentPage, perPage],
  );

  React.useEffect(() => {
    setPage(1);
  }, [term, perPage]);

  React.useEffect(() => {
    setSelected(new Set());
  }, [term, currentPage]);

  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const othersCount = users.filter((u) => u.role !== "ADMIN").length;

  const allChecked = pageItems.length > 0 && pageItems.every((u) => selected.has(u.id));
  const someChecked = pageItems.some((u) => selected.has(u.id));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) pageItems.forEach((u) => next.delete(u.id));
      else pageItems.forEach((u) => next.add(u.id));
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ─── Mutations ─────────────────────────────────────────────────────────
  // Função primária: aponta para uma Role (preset ADMIN ou customizada).
  const setPrimaryRole = useMutation({
    mutationFn: async ({ id, roleId }: { id: string; roleId: string }) => {
      const res = await fetch(apiUrl(`/api/users/${id}/primary-role`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId }),
      });
      if (!res.ok) await parseJsonError(res, "Erro ao atualizar função.");
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["users-list"] });
      void qc.invalidateQueries({ queryKey: ["my-permissions"] });
      toast.success("Função atualizada.");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar função."),
  });

  const updatePassword = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const res = await fetch(apiUrl(`/api/users/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) await parseJsonError(res, "Erro ao trocar senha.");
      return res.json();
    },
    onSuccess: (_data, vars) => {
      const targetName = passwordTarget?.name ?? "o usuário";
      if (vars.id === session?.user?.id) {
        toast.success("Sua senha foi atualizada.");
      } else {
        toast.success(`Senha de ${targetName} atualizada.`);
      }
      closePasswordDialog();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Erro ao trocar senha."),
  });

  const closePasswordDialog = React.useCallback(() => {
    setPasswordTarget(null);
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }, []);

  const openPasswordDialog = React.useCallback((u: UserRow) => {
    setPasswordTarget(u);
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }, []);

  const passwordMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmitPassword =
    newPassword.length >= 6 &&
    newPassword === confirmPassword &&
    !updatePassword.isPending;

  const inviteIsAdmin = inviteRoleId !== "" && inviteRoleId === adminRole?.id;
  const inviteIsCustomRole =
    inviteRoleId !== "" && !inviteIsAdmin && customRoles.some((r) => r.id === inviteRoleId);

  const invite = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/users"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          password: invitePassword,
          // Baseline legado: ADMIN preset ou MEMBER. A role customizada,
          // quando escolhida, é aplicada logo após via primary-role.
          role: inviteIsAdmin ? "ADMIN" : "MEMBER",
        }),
      });
      if (!res.ok) await parseJsonError(res, "Erro ao convidar membro.");
      const created = (await res.json()) as { id?: string } & UserRow;

      if (created?.id && inviteIsCustomRole) {
        try {
          await fetch(apiUrl(`/api/users/${created.id}/primary-role`), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ roleId: inviteRoleId }),
          });
        } catch {
          toast.warning(
            "Usuário criado, mas a função não foi aplicada. Ajuste na lista de Equipe.",
          );
        }
      }

      const allTrue = CRM_ACTION_KEYS.every((k) => invitePermissions[k] === true);
      if (created?.id && !allTrue && !inviteIsAdmin) {
        try {
          const cur = await fetch(apiUrl("/api/settings/permissions"));
          const curData = (await cur.json().catch(() => ({}))) as {
            scopeGrants?: Record<string, unknown>;
          };
          const nextGrants = setCrmActionGrantsForUser(
            curData?.scopeGrants ?? {},
            created.id,
            invitePermissions,
          );
          await fetch(apiUrl("/api/settings/permissions"), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scopeGrants: nextGrants }),
          });
        } catch (err) {
          toast.warning(
            "Usuário criado, mas as permissões customizadas não foram salvas. Ajuste em Configurações → Permissões.",
          );
          throw err;
        }
      }
      return created;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["users-list"] });
      void qc.invalidateQueries({ queryKey: ["visibility-settings"] });
      toast.success("Usuário criado com sucesso.");
      setInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
      setInvitePassword("");
      setInviteRoleId("");
      setInvitePermissions(DEFAULT_INVITE_PERMISSIONS);
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/api/users/${id}`), { method: "DELETE" });
      if (!res.ok) await parseJsonError(res, "Erro ao excluir usuário.");
      return res.json() as Promise<{ ok: true }>;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["users-list"] });
      toast.success("Usuário excluído com sucesso.");
      setDeleteTarget(null);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Erro ao excluir usuário."),
  });

  async function handleBulkDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBulkDeleting(true);
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        const res = await fetch(apiUrl(`/api/users/${id}`), { method: "DELETE" });
        if (!res.ok) throw new Error();
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    setBulkDeleting(false);
    setBulkDeleteOpen(false);
    setSelected(new Set());
    void qc.invalidateQueries({ queryKey: ["users-list"] });
    if (fail === 0) {
      toast.success(ok === 1 ? "Usuário excluído." : `${ok} usuários excluídos.`);
    } else if (ok === 0) {
      toast.error("Não foi possível excluir os usuários selecionados.");
    } else {
      toast.error(`${ok} excluído(s), ${fail} falharam.`);
    }
  }

  return (
    <SettingsV2Shell
      back={SETTINGS_HUB_BACK}
      title="Equipe"
      description="Usuários, convites e permissões CRM"
      center={
        <PageSearchBar
          variant="compact"
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome, e-mail..."
          aria-label="Buscar usuários"
        />
      }
      actions={
        <PagePrimaryButton type="button" onClick={() => setInviteOpen(true)}>
          <IconPlus size={16} /> Novo usuário
        </PagePrimaryButton>
      }
    >
      {/* STATS */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
        <StatCard
          tone="brand"
          icon={<IconUsers size={20} />}
          value={users.length}
          label="Usuários ativos"
        />
        <StatCard
          tone="violet"
          icon={<IconShield size={20} />}
          value={adminCount}
          label={adminCount === 1 ? "Administrador" : "Administradores"}
        />
        <StatCard
          tone="green"
          icon={<IconUserPlus size={20} />}
          value={othersCount}
          label="Demais funções"
        />
      </div>

      {/* BULK BAR */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-4 py-2.5 backdrop-blur-md">
          <span className="font-display text-[13px] font-bold text-[var(--text-primary)]">
            {selected.size} selecionado{selected.size > 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-full px-3 py-1.5 font-display text-[12px] font-semibold text-[var(--text-secondary)] hover:bg-black/5"
            >
              Limpar
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setBulkDeleteOpen(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--color-danger,#e11d48)] px-3.5 py-1.5 font-display text-[12px] font-bold text-white transition-all hover:-translate-y-px"
              >
                <IconTrash size={14} /> Excluir
              </button>
            )}
          </div>
        </div>
      )}

      {isError && error instanceof Error ? (
        <p className="rounded-[var(--radius-lg)] border border-[var(--color-danger)]/30 bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] px-4 py-3 text-sm text-[var(--color-danger,#e11d48)]">
          {error.message}
        </p>
      ) : null}

      {/* LIST — mesma estrutura glass-grid de /contacts */}
      {isLoading && users.length === 0 ? (
        <div className="h-[400px] animate-pulse rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)]" />
      ) : pageItems.length === 0 ? (
        <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] px-6 py-12 text-center font-body text-[13px] text-[var(--text-muted)] backdrop-blur-md shadow-[var(--glass-shadow)]">
          {term
            ? `Nenhum usuário encontrado para "${search.trim()}".`
            : "Nenhum usuário cadastrado ainda."}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] p-4 backdrop-blur-md shadow-[var(--glass-shadow)]">
          <div className={listTableHeadRowClass("mb-2.5 grid-cols-[42px_2.6fr_1.1fr_1.3fr]")}>
            <span>
              <CheckboxGlass
                checked={allChecked}
                indeterminate={!allChecked && someChecked}
                onChange={toggleAll}
                aria-label="Selecionar todos"
              />
            </span>
            <ListColumnLabel>Usuário</ListColumnLabel>
            <ListColumnLabel>Função</ListColumnLabel>
            <ListColumnLabel align="right">Ações</ListColumnLabel>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
            {pageItems.map((u) => {
              const isSelected = selected.has(u.id);
              const fnRole = userFunctionRole(u, adminRole?.id);
              const isAdminRole = fnRole?.systemPreset === "ADMIN";
              const fnLabel = fnRole?.name ?? "Sem função";
              // Garante que o valor atual apareça no dropdown mesmo se for um
              // preset legado (MANAGER/MEMBER) fora das opções base.
              const rowOptions =
                fnRole && fnRole.id !== "__admin__" &&
                !baseRoleOptions.some((o) => o.value === fnRole.id)
                  ? [{ value: fnRole.id, label: fnLabel }, ...baseRoleOptions]
                  : baseRoleOptions;
              return (
                <div
                  key={u.id}
                  className={cn(
                    "grid grid-cols-[42px_2.6fr_1.1fr_1.3fr] items-center gap-3.5 rounded-[var(--radius-lg)] border bg-[var(--glass-bg-overlay)] px-3.5 py-3 shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-all duration-200 hover:bg-[var(--glass-bg-base)]",
                    isSelected
                      ? "border-[var(--brand-primary)]/40 bg-[var(--glass-bg-base)] shadow-[0_6px_20px_rgba(91,111,245,0.18)]"
                      : "border-[var(--glass-border-subtle)]",
                  )}
                >
                  <span>
                    <CheckboxGlass
                      checked={isSelected}
                      onChange={() => toggleOne(u.id)}
                      aria-label={`Selecionar ${u.name}`}
                    />
                  </span>

                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full font-display text-[11px] font-bold text-white"
                      style={{ background: avatarColor(u.id) }}
                    >
                      {initials(u.name)}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-display text-[13px] font-bold text-[var(--text-primary)]">
                          {u.name}
                        </span>
                        <span
                          className={cn(
                            "inline-flex flex-shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-display text-[10px] font-bold",
                            roleBadgeClass(isAdminRole),
                          )}
                        >
                          <IconShield size={11} className="opacity-85" />
                          {fnLabel}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 font-body text-[12px] text-[var(--text-muted)]">
                        <IconMail size={13} className="flex-shrink-0" />
                        <span className="truncate">{u.email}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <DropdownGlass
                      options={rowOptions}
                      value={fnRole && fnRole.id !== "__admin__" ? fnRole.id : undefined}
                      placeholder="Definir função"
                      onValueChange={(next) => {
                        if (fnRole && next === fnRole.id) return;
                        setPrimaryRole.mutate({ id: u.id, roleId: next });
                      }}
                      disabled={setPrimaryRole.isPending || !isAdmin}
                      matchTriggerWidth={false}
                      triggerClassName="h-9 min-w-[160px]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    {isAdmin ? (
                      <>
                        <TelephonyToggle userId={u.id} />
                        <button
                          type="button"
                          onClick={() => openPasswordDialog(u)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-2 font-display text-[12px] font-bold text-[var(--brand-primary-dark,#3d52e8)] transition-colors hover:border-[var(--input-border-focus)] hover:bg-[var(--glass-bg-strong)]"
                        >
                          <IconKey size={13} /> Senha
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(u)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--color-danger,#e11d48)] px-3 py-2 font-display text-[12px] font-bold text-white transition-all hover:-translate-y-px"
                        >
                          <IconTrash size={13} /> Excluir
                        </button>
                      </>
                    ) : (
                      <span className="font-body text-[12px] text-[var(--text-muted)]">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <PaginationGlass
        label={`${total.toLocaleString("pt-BR")} ${
          total === 1 ? "usuário" : "usuários"
        } — página ${currentPage} de ${lastPage}`}
        canPrev={currentPage > 1}
        canNext={currentPage < lastPage}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(lastPage, p + 1))}
        perPage={perPage}
        onPerPageChange={(value) => {
          setPerPage(value);
          setPage(1);
        }}
      />

      {/* ─── Dialog: criar usuário ─── */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar usuário</DialogTitle>
            <DialogDescription>
              O usuário é criado na hora e já acessa com o e-mail e a senha
              definidos abaixo. Nenhum e-mail de convite é enviado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <label htmlFor="invite-name" className="text-sm font-medium">
                Nome
              </label>
              <Input
                id="invite-name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Nome completo"
                autoComplete="name"
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="invite-email" className="text-sm font-medium">
                E-mail
              </label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@empresa.com"
                autoComplete="email"
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="invite-password" className="text-sm font-medium">
                Senha inicial
              </label>
              <Input
                id="invite-password"
                type="password"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <p
                className={cn(
                  "text-[11px]",
                  invitePassword.length > 0 && invitePassword.length < 6
                    ? "text-[var(--color-danger,#e11d48)]"
                    : "text-muted-foreground",
                )}
              >
                Mínimo de 6 caracteres.
              </p>
            </div>
            <div className="grid gap-1.5">
              <span className="text-sm font-medium">Função</span>
              <DropdownGlass
                options={baseRoleOptions}
                value={inviteRoleId || undefined}
                placeholder="Selecione a função"
                onValueChange={(next) => setInviteRoleId(next)}
                matchTriggerWidth
                triggerClassName="w-full"
              />
              <p className="text-[11px] text-muted-foreground">
                Apenas <strong>Administrador</strong> é preset. As demais funções
                são as roles criadas em Permissões.
              </p>
            </div>
            <div className="grid gap-2 rounded-xl border border-border/60 bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Permissões iniciais</span>
                {inviteIsAdmin ? (
                  <span className="text-[11px] font-semibold uppercase text-[var(--color-warn)]">
                    Admin · tudo liberado
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    Editáveis depois em Configurações → Permissões
                  </span>
                )}
              </div>
              <div className="grid gap-1.5">
                {CRM_ACTION_KEYS.map((action) => {
                  const checked =
                    inviteIsAdmin ? true : invitePermissions[action];
                  return (
                    <label
                      key={action}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-lg border border-transparent bg-background/60 px-3 py-2 text-sm transition-colors",
                        !inviteIsAdmin && "hover:border-border",
                      )}
                    >
                      <span className="min-w-0 truncate text-[var(--text-primary)]">
                        {CRM_ACTION_LABELS[action]}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={checked}
                        disabled={inviteIsAdmin}
                        onClick={() =>
                          setInvitePermissions((prev) => ({
                            ...prev,
                            [action]: !prev[action],
                          }))
                        }
                        className={cn(
                          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                          checked ? "bg-primary" : "bg-muted-foreground/30",
                          inviteIsAdmin && "cursor-not-allowed opacity-70",
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block size-4 rounded-full bg-[var(--glass-bg-overlay)] shadow-sm transition-transform",
                            checked ? "translate-x-4" : "translate-x-0.5",
                          )}
                        />
                      </button>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          {invite.isError && invite.error instanceof Error ? (
            <p className="text-sm text-[var(--color-danger,#e11d48)]">
              {invite.error.message}
            </p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setInviteOpen(false)}
              className="rounded-full border border-[var(--glass-border)] px-4 py-2 font-display text-[13px] font-semibold text-[var(--text-secondary)] hover:bg-black/5"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={
                invite.isPending ||
                !inviteName.trim() ||
                !inviteEmail.trim() ||
                invitePassword.length < 6
              }
              onClick={() => invite.mutate()}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-primary)] px-4 py-2 font-display text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(91,111,245,0.35)] transition-all hover:-translate-y-px hover:bg-[var(--brand-primary-dark)] disabled:translate-y-0 disabled:opacity-60"
            >
              {invite.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <IconPlus size={16} />
              )}
              Criar usuário
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: trocar senha ─── */}
      <Dialog
        open={passwordTarget != null}
        onOpenChange={(open) => {
          if (!open && !updatePassword.isPending) closePasswordDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-4 text-[var(--color-lavender)]" />
              Trocar senha
            </DialogTitle>
            <DialogDescription>
              {passwordTarget ? (
                <>
                  Defina uma nova senha para{" "}
                  <span className="font-medium text-[var(--text-primary)]">
                    {passwordTarget.name}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    ({passwordTarget.email})
                  </span>
                  . O próximo login usará esta senha.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <label htmlFor="new-password" className="text-sm font-medium">
                Nova senha
              </label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-[var(--text-primary)]"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">Mínimo de 6 caracteres.</p>
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="confirm-password" className="text-sm font-medium">
                Confirmar nova senha
              </label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {passwordMismatch ? (
                <p className="text-[11px] text-[var(--color-danger,#e11d48)]">
                  As senhas não coincidem.
                </p>
              ) : null}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={closePasswordDialog}
              disabled={updatePassword.isPending}
              className="rounded-full border border-[var(--glass-border)] px-4 py-2 font-display text-[13px] font-semibold text-[var(--text-secondary)] hover:bg-black/5 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!canSubmitPassword}
              onClick={() => {
                if (!passwordTarget) return;
                updatePassword.mutate({
                  id: passwordTarget.id,
                  password: newPassword,
                });
              }}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-primary)] px-4 py-2 font-display text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(91,111,245,0.35)] transition-all hover:-translate-y-px hover:bg-[var(--brand-primary-dark)] disabled:translate-y-0 disabled:opacity-60"
            >
              {updatePassword.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <KeyRound className="size-4" />
              )}
              Salvar nova senha
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: excluir (single) ─── */}
      <Dialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open && !deleteUser.isPending) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="size-4 text-[var(--color-danger,#e11d48)]" />
              Excluir usuário
            </DialogTitle>
            <DialogDescription>
              {deleteTarget ? (
                <>
                  Esta ação remove o acesso de{" "}
                  <span className="font-medium text-[var(--text-primary)]">
                    {deleteTarget.name}
                  </span>{" "}
                  (<span className="text-muted-foreground">{deleteTarget.email}</span>).
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteUser.isPending}
              className="rounded-full border border-[var(--glass-border)] px-4 py-2 font-display text-[13px] font-semibold text-[var(--text-secondary)] hover:bg-black/5 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={deleteUser.isPending || !deleteTarget}
              onClick={() => {
                if (!deleteTarget) return;
                deleteUser.mutate(deleteTarget.id);
              }}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-danger,#e11d48)] px-4 py-2 font-display text-[13px] font-bold text-white transition-all hover:-translate-y-px disabled:translate-y-0 disabled:opacity-60"
            >
              {deleteUser.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Confirmar exclusão
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: excluir (bulk) ─── */}
      <Dialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => {
          if (!open && !bulkDeleting) setBulkDeleteOpen(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="size-4 text-[var(--color-danger,#e11d48)]" />
              Excluir {selected.size === 1 ? "usuário" : `${selected.size} usuários`}
            </DialogTitle>
            <DialogDescription>
              Esta ação remove o acesso{" "}
              {selected.size === 1 ? "do usuário selecionado" : "dos usuários selecionados"}.
              Não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setBulkDeleteOpen(false)}
              disabled={bulkDeleting}
              className="rounded-full border border-[var(--glass-border)] px-4 py-2 font-display text-[13px] font-semibold text-[var(--text-secondary)] hover:bg-black/5 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={bulkDeleting}
              onClick={handleBulkDelete}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-danger,#e11d48)] px-4 py-2 font-display text-[13px] font-bold text-white transition-all hover:-translate-y-px disabled:translate-y-0 disabled:opacity-60"
            >
              {bulkDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Confirmar exclusão
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsV2Shell>
  );
}

function StatCard({
  tone,
  icon,
  value,
  label,
}: {
  tone: "brand" | "violet" | "green";
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  const toneClass =
    tone === "brand"
      ? "bg-[var(--color-enterprise-bg,rgba(91,111,245,0.15))] text-[var(--brand-primary)]"
      : tone === "violet"
        ? "bg-[rgba(167,139,250,0.18)] text-[var(--brand-secondary)]"
        : "bg-[var(--color-success-bg,rgba(16,185,129,0.12))] text-[var(--color-success-dark)]";
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-4 py-3.5 shadow-[var(--glass-shadow-sm)] backdrop-blur-md">
      <span
        className={cn(
          "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)]",
          toneClass,
        )}
      >
        {icon}
      </span>
      <div>
        <div className="font-display text-[21px] font-extrabold leading-none tracking-tight text-[var(--text-primary)]">
          {value}
        </div>
        <div className="mt-1 font-body text-[11.5px] font-semibold text-[var(--text-muted)]">
          {label}
        </div>
      </div>
    </div>
  );
}
