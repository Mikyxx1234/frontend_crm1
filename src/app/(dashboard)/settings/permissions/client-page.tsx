"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Eye, EyeOff, Loader2, Shield, ShieldCheck, UserPlus } from "lucide-react";
import Link from "next/link";

import { pageHeaderDescriptionClass, pageHeaderTitleClass } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

type VisibilityMode = "all" | "own";
type VisibilitySettings = Record<string, VisibilityMode>;

type SelfAssignSettings = Record<string, boolean>;

async function fetchSettings(): Promise<VisibilitySettings> {
  const res = await fetch(apiUrl("/api/settings/visibility"));
  if (!res.ok) throw new Error("Erro ao carregar");
  return res.json();
}

async function fetchSelfAssign(): Promise<SelfAssignSettings> {
  const res = await fetch(apiUrl("/api/settings/self-assign"));
  if (!res.ok) throw new Error("Erro ao carregar");
  const data = (await res.json()) as { settings: SelfAssignSettings };
  return data.settings;
}

const ROLES = [
  {
    key: "ADMIN",
    label: "Administrador",
    description: "Acesso total ao sistema. Sempre ve todos os leads, conversas e dados.",
    locked: true,
  },
  {
    key: "MANAGER",
    label: "Gerente",
    description: "Pode gerenciar equipe e pipeline. Controle de visibilidade configuravel.",
    locked: false,
  },
  {
    key: "MEMBER",
    label: "Membro",
    description: "Usuario padrao da equipe. Controle de visibilidade configuravel.",
    locked: false,
  },
] as const;

const MODE_OPTIONS: { value: VisibilityMode; label: string; desc: string; icon: typeof Eye }[] = [
  {
    value: "all",
    label: "Ve todos os leads",
    desc: "Acessa todos os leads, conversas e dados do pipeline",
    icon: Eye,
  },
  {
    value: "own",
    label: "Apenas os proprios",
    desc: "Ve somente leads atribuidos a ele como responsavel",
    icon: EyeOff,
  },
];

export default function PermissionsPage() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["visibility-settings"],
    queryFn: fetchSettings,
  });

  const { data: selfAssignSettings, isLoading: loadingSelfAssign } = useQuery({
    queryKey: ["self-assign-settings"],
    queryFn: fetchSelfAssign,
  });

  const mutation = useMutation({
    mutationFn: async (body: Record<string, VisibilityMode>) => {
      const res = await fetch(apiUrl("/api/settings/visibility"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erro ao salvar");
      }
      return res.json() as Promise<VisibilitySettings>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["visibility-settings"], data);
    },
  });

  const selfAssignMutation = useMutation({
    mutationFn: async (body: Record<string, boolean>) => {
      const res = await fetch(apiUrl("/api/settings/self-assign"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erro ao salvar");
      }
      const data = (await res.json()) as { settings: SelfAssignSettings };
      return data.settings;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["self-assign-settings"], data);
    },
  });

  const handleChange = (role: string, mode: VisibilityMode) => {
    mutation.mutate({ [role]: mode });
  };

  const handleSelfAssignChange = (role: "MANAGER" | "MEMBER", enabled: boolean) => {
    selfAssignMutation.mutate({ [role]: enabled });
  };

  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Link
            href="/settings"
            className="flex size-8 items-center justify-center rounded-xl text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex size-10 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40">
            <Shield className="size-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className={pageHeaderTitleClass}>
              Permissões de Visibilidade
            </h1>
            <p className={pageHeaderDescriptionClass}>
              Controle quem pode ver quais leads e conversas
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-4">
          {ROLES.map((role) => {
            const currentMode = settings?.[role.key] ?? (role.key === "MEMBER" ? "own" : "all");

            return (
              <div
                key={role.key}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl",
                      role.key === "ADMIN"
                        ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                        : role.key === "MANAGER"
                          ? "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
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
                          Ve todos os leads
                        </span>
                        <span className="ml-auto text-[11px] text-gray-400">
                          Nao editavel
                        </span>
                      </div>
                    ) : (
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {MODE_OPTIONS.map((opt) => {
                          const isSelected = currentMode === opt.value;
                          const Icon = opt.icon;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleChange(role.key, opt.value)}
                              disabled={mutation.isPending}
                              className={cn(
                                "relative flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200",
                                isSelected
                                  ? "border-blue-500 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/30"
                                  : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                              )}
                            >
                              <div
                                className={cn(
                                  "flex size-8 shrink-0 items-center justify-center rounded-lg",
                                  isSelected
                                    ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
                                    : "bg-gray-100 text-gray-400 dark:bg-gray-800"
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
                                      : "text-gray-700 dark:text-gray-300"
                                  )}
                                >
                                  {opt.label}
                                </span>
                                <span className="mt-0.5 block text-[11px] text-gray-400">
                                  {opt.desc}
                                </span>
                              </div>
                              {isSelected && (
                                <div className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-blue-500 text-white">
                                  <Check className="size-3" />
                                </div>
                              )}
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

          {mutation.isError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              {mutation.error instanceof Error ? mutation.error.message : "Erro ao salvar"}
            </div>
          )}

          {/* Auto-atribuição de conversas (inbox) */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <UserPlus className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
                  Auto-atribuição de conversas
                </h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  Permite que usuários peguem para si conversas sem responsável diretamente do card da inbox,
                  através do botão &quot;Atribuir para mim&quot;. ADMIN sempre pode atribuir.
                </p>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {(["MANAGER", "MEMBER"] as const).map((roleKey) => {
                    const enabled = selfAssignSettings?.[roleKey] ?? true;
                    const roleLabel = roleKey === "MANAGER" ? "Gerente" : "Membro";
                    return (
                      <button
                        key={roleKey}
                        type="button"
                        onClick={() => handleSelfAssignChange(roleKey, !enabled)}
                        disabled={selfAssignMutation.isPending || loadingSelfAssign}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200",
                          enabled
                            ? "border-emerald-500 bg-emerald-50/50 dark:border-emerald-500 dark:bg-emerald-950/30"
                            : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600",
                        )}
                      >
                        <div className="min-w-0">
                          <span className={cn(
                            "block text-sm font-semibold",
                            enabled
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-gray-700 dark:text-gray-300",
                          )}>
                            {roleLabel}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-gray-400">
                            {enabled
                              ? "Pode pegar conversas livres"
                              : "Bloqueado — só admin atribui"}
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

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
            <p className="text-xs text-gray-500">
              <strong>Como funciona:</strong> quando um usuario com visibilidade &quot;apenas os proprios&quot; acessa o pipeline ou inbox,
              ele ve somente os leads onde esta definido como responsavel. Leads sem responsavel ficam visiveis apenas para quem tem visibilidade total.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
