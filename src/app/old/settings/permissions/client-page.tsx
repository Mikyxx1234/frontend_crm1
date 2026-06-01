"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Search,
  Shield,
  ShieldCheck,
  UserPlus,
  Users,
  Workflow,
} from "lucide-react";
import Link from "next/link";

import { pageHeaderDescriptionClass, pageHeaderTitleClass } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import {
  CRM_ACTION_KEYS,
  CRM_ACTION_LABELS,
  type CrmActionKey,
  readCrmActionGrantForUser,
  setCrmActionGrantForUser,
} from "@/lib/permissions";

type VisibilityMode = "all" | "own";
type VisibilitySettings = Record<string, VisibilityMode>;
type SelfAssignSettings = Record<string, boolean>;
type ScopeGrantsPayload = Record<string, unknown>;

type PermissionsPayload = {
  canManage: boolean;
  featureEnabled: boolean;
  visibility: VisibilitySettings;
  selfAssign: SelfAssignSettings;
  scopeGrants: ScopeGrantsPayload;
};

type UserRole = "ADMIN" | "MANAGER" | "MEMBER";

type TeamUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  MEMBER: "Membro",
};

const ROLE_BADGE: Record<UserRole, string> = {
  ADMIN: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  MANAGER: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
  MEMBER: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const ACTION_ICONS: Record<CrmActionKey, typeof Pencil> = {
  editLeads: Pencil,
  runAutomations: Workflow,
  assignOwner: Users,
};

const ACTION_ACCENT: Record<CrmActionKey, { on: string; off: string; ring: string }> = {
  editLeads: {
    on: "bg-indigo-500",
    off: "bg-gray-300 dark:bg-gray-600",
    ring: "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30",
  },
  runAutomations: {
    on: "bg-violet-500",
    off: "bg-gray-300 dark:bg-gray-600",
    ring: "border-violet-500 bg-violet-50/50 dark:bg-violet-950/30",
  },
  assignOwner: {
    on: "bg-rose-500",
    off: "bg-gray-300 dark:bg-gray-600",
    ring: "border-rose-500 bg-rose-50/50 dark:bg-rose-950/30",
  },
};

const ROLE_VISIBILITY = [
  {
    key: "ADMIN" as const,
    label: "Administrador",
    description: "Acesso total. Sempre vê todos os leads, conversas e dados.",
    locked: true,
  },
  {
    key: "MANAGER" as const,
    label: "Gerente",
    description: "Pode gerenciar equipe e pipeline. Visibilidade configurável.",
    locked: false,
  },
  {
    key: "MEMBER" as const,
    label: "Membro",
    description: "Usuário padrão. Visibilidade configurável.",
    locked: false,
  },
];

const VISIBILITY_OPTIONS: { value: VisibilityMode; label: string; desc: string; icon: typeof Eye }[] = [
  { value: "all", label: "Vê todos os leads", desc: "Pipeline e inbox completos", icon: Eye },
  { value: "own", label: "Apenas os próprios", desc: "Só leads atribuídos como responsável", icon: EyeOff },
];

async function fetchSettings(): Promise<PermissionsPayload> {
  const res = await fetch(apiUrl("/api/settings/permissions"));
  if (!res.ok) throw new Error("Erro ao carregar permissões.");
  return res.json();
}

async function fetchUsers(): Promise<TeamUser[]> {
  const res = await fetch(apiUrl("/api/users"));
  if (!res.ok) throw new Error("Erro ao carregar equipe.");
  return res.json();
}

export default function PermissionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");

  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ["visibility-settings"],
    queryFn: fetchSettings,
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["users-list"],
    queryFn: fetchUsers,
  });

  const visibilityMutation = useMutation({
    mutationFn: async (body: Record<string, VisibilityMode>) => {
      const res = await fetch(apiUrl("/api/settings/permissions"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erro ao salvar");
      }
      return res.json() as Promise<PermissionsPayload>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["visibility-settings"], data);
    },
  });

  const selfAssignMutation = useMutation({
    mutationFn: async (body: Record<string, boolean>) => {
      const res = await fetch(apiUrl("/api/settings/permissions"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selfAssign: body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erro ao salvar");
      }
      return res.json() as Promise<PermissionsPayload>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["visibility-settings"], data);
    },
  });

  const scopeMutation = useMutation({
    mutationFn: async (scopeGrants: ScopeGrantsPayload) => {
      const res = await fetch(apiUrl("/api/settings/permissions"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scopeGrants }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erro ao salvar");
      }
      return res.json() as Promise<PermissionsPayload>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["visibility-settings"], data);
    },
  });

  const handleVisibilityChange = (role: string, mode: VisibilityMode) => {
    visibilityMutation.mutate({ [role]: mode });
  };

  const handleSelfAssignChange = (role: "MANAGER" | "MEMBER", enabled: boolean) => {
    selfAssignMutation.mutate({ [role]: enabled });
  };

  const handleUserActionToggle = (action: CrmActionKey, userId: string, enabled: boolean) => {
    const next = setCrmActionGrantForUser(settings?.scopeGrants, action, userId, enabled);
    scopeMutation.mutate(next as ScopeGrantsPayload);
  };

  const filteredUsers = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [users, search]);

  const isLoading = loadingSettings || loadingUsers;

  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Link
            href="/old/settings"
            className="flex size-8 items-center justify-center rounded-xl text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex size-10 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40">
            <Shield className="size-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className={pageHeaderTitleClass}>Permissões do CRM</h1>
            <p className={pageHeaderDescriptionClass}>
              Controle por usuário o que cada um pode fazer com leads, contatos e automações
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* ─── Seção 1: Permissões por usuário ──────────────────── */}
          <section className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Ações por usuário
                </h2>
                <p className="mt-1 text-xs text-gray-400">
                  Cada toggle vale para um usuário específico. Administradores sempre podem executar todas as
                  ações — eles aparecem aqui apenas para conferência.
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome ou e-mail"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/80 dark:bg-gray-800/40">
                    <tr>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                        Usuário
                      </th>
                      {CRM_ACTION_KEYS.map((action) => {
                        const Icon = ACTION_ICONS[action];
                        return (
                          <th
                            key={action}
                            className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500"
                            style={{ minWidth: 160 }}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <Icon className="size-3.5 text-gray-400" />
                              <span className="leading-tight">{CRM_ACTION_LABELS[action]}</span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={CRM_ACTION_KEYS.length + 1}
                          className="px-5 py-12 text-center text-sm text-gray-400"
                        >
                          {search.trim()
                            ? "Nenhum usuário encontrado para essa busca."
                            : "Nenhum usuário cadastrado na organização."}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => {
                        const isAdmin = user.role === "ADMIN";
                        return (
                          <tr key={user.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-100 to-purple-100 text-xs font-semibold text-gray-700 dark:from-blue-950/40 dark:to-purple-950/40 dark:text-gray-200">
                                  {user.name
                                    .split(" ")
                                    .map((p) => p[0])
                                    .filter(Boolean)
                                    .slice(0, 2)
                                    .join("")
                                    .toUpperCase() || "?"}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                      {user.name}
                                    </span>
                                    <span
                                      className={cn(
                                        "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                        ROLE_BADGE[user.role],
                                      )}
                                    >
                                      {ROLE_LABEL[user.role]}
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-500">{user.email}</span>
                                </div>
                              </div>
                            </td>
                            {CRM_ACTION_KEYS.map((action) => {
                              const enabled = isAdmin
                                ? true
                                : readCrmActionGrantForUser(action, user.id, settings?.scopeGrants);
                              const accent = ACTION_ACCENT[action];
                              return (
                                <td key={action} className="px-3 py-3 text-center">
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={enabled}
                                    aria-label={`${CRM_ACTION_LABELS[action]} para ${user.name}`}
                                    disabled={isAdmin || scopeMutation.isPending}
                                    onClick={() => handleUserActionToggle(action, user.id, !enabled)}
                                    title={
                                      isAdmin ? "Administradores sempre podem executar esta ação" : undefined
                                    }
                                    className={cn(
                                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                                      enabled ? accent.on : accent.off,
                                      isAdmin && "cursor-not-allowed opacity-60",
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "inline-block size-5 rounded-full bg-white shadow-sm transition-transform",
                                        enabled ? "translate-x-5" : "translate-x-0.5",
                                      )}
                                    />
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {scopeMutation.isError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                {scopeMutation.error instanceof Error ? scopeMutation.error.message : "Erro ao salvar"}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              {CRM_ACTION_KEYS.map((action) => {
                const Icon = ACTION_ICONS[action];
                return (
                  <div
                    key={action}
                    className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 text-xs dark:border-gray-800 dark:bg-gray-800/30"
                  >
                    <div className="mb-1 flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-200">
                      <Icon className="size-3.5 text-gray-400" />
                      {CRM_ACTION_LABELS[action]}
                    </div>
                    <p className="text-gray-500">{descriptionFor(action)}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ─── Seção 2: Visibilidade por papel (legado) ─────────── */}
          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Visibilidade por papel
              </h2>
              <p className="mt-1 text-xs text-gray-400">
                Define quais leads e conversas cada papel consegue enxergar. Aplicado a todos os usuários
                daquele papel.
              </p>
            </div>

            {ROLE_VISIBILITY.map((role) => {
              const currentMode =
                settings?.visibility?.[role.key] ?? (role.key === "MEMBER" ? "own" : "all");
              return (
                <div
                  key={role.key}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-xl",
                        role.key === "ADMIN"
                          ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                          : role.key === "MANAGER"
                            ? "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
                      )}
                    >
                      <ShieldCheck className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
                          {role.label}
                        </h3>
                        {role.locked && (
                          <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                            FIXO
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-gray-500">{role.description}</p>

                      {role.locked ? (
                        <div className="mt-4 flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-800/50">
                          <Eye className="size-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                            Vê todos os leads
                          </span>
                          <span className="ml-auto text-[11px] text-gray-400">Não editável</span>
                        </div>
                      ) : (
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                          {VISIBILITY_OPTIONS.map((opt) => {
                            const isSelected = currentMode === opt.value;
                            const Icon = opt.icon;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => handleVisibilityChange(role.key, opt.value)}
                                disabled={visibilityMutation.isPending}
                                className={cn(
                                  "relative flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200",
                                  isSelected
                                    ? "border-blue-500 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/30"
                                    : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600",
                                )}
                              >
                                <div
                                  className={cn(
                                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                                    isSelected
                                      ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
                                      : "bg-gray-100 text-gray-400 dark:bg-gray-800",
                                  )}
                                >
                                  <Icon className="size-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span
                                    className={cn(
                                      "block text-sm font-medium",
                                      isSelected
                                        ? "text-blue-700 dark:text-blue-300"
                                        : "text-gray-700 dark:text-gray-300",
                                    )}
                                  >
                                    {opt.label}
                                  </span>
                                  <span className="mt-0.5 block text-[11px] text-gray-400">{opt.desc}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {visibilityMutation.isError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                {visibilityMutation.error instanceof Error
                  ? visibilityMutation.error.message
                  : "Erro ao salvar"}
              </div>
            )}
          </section>

          {/* ─── Seção 3: Auto-atribuição (legado) ────────────────── */}
          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Auto-atribuição de conversas
              </h2>
              <p className="mt-1 text-xs text-gray-400">
                Atalho específico da inbox para puxar conversas livres pra si com um clique.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <UserPlus className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
                    Botão &quot;Atribuir para mim&quot;
                  </h3>
                  <p className="mt-0.5 text-sm text-gray-500">
                    Permite que usuários peguem para si conversas sem responsável diretamente do card da
                    inbox. ADMIN sempre pode atribuir.
                  </p>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {(["MANAGER", "MEMBER"] as const).map((roleKey) => {
                      const enabled = settings?.selfAssign?.[roleKey] ?? true;
                      const roleLabel = roleKey === "MANAGER" ? "Gerente" : "Membro";
                      return (
                        <button
                          key={roleKey}
                          type="button"
                          onClick={() => handleSelfAssignChange(roleKey, !enabled)}
                          disabled={selfAssignMutation.isPending}
                          className={cn(
                            "flex items-center justify-between gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200",
                            enabled
                              ? "border-emerald-500 bg-emerald-50/50 dark:border-emerald-500 dark:bg-emerald-950/30"
                              : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600",
                          )}
                        >
                          <div className="min-w-0">
                            <span
                              className={cn(
                                "block text-sm font-semibold",
                                enabled
                                  ? "text-emerald-700 dark:text-emerald-300"
                                  : "text-gray-700 dark:text-gray-300",
                              )}
                            >
                              {roleLabel}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-gray-400">
                              {enabled ? "Pode pegar conversas livres" : "Bloqueado — só admin atribui"}
                            </span>
                          </div>
                          <div
                            className={cn(
                              "relative h-6 w-10 shrink-0 rounded-full transition-colors",
                              enabled ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600",
                            )}
                            aria-hidden="true"
                          >
                            <div
                              className={cn(
                                "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
                                enabled ? "translate-x-4" : "translate-x-0.5",
                              )}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {selfAssignMutation.isError && (
                    <p className="mt-3 text-xs text-red-600">
                      {selfAssignMutation.error instanceof Error
                        ? selfAssignMutation.error.message
                        : "Erro ao salvar"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function descriptionFor(action: CrmActionKey): string {
  switch (action) {
    case "editLeads":
      return "Mover negócios entre estágios e preencher campos adicionais (custom fields, tags, valor, etc.).";
    case "runAutomations":
      return "Disparar automações manualmente e habilitar/desabilitar workflows. Não inclui edição da estrutura.";
    case "assignOwner":
      return "Definir ou trocar o responsável de leads, contatos e conversas.";
  }
}
