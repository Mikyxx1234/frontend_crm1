"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Circle } from "lucide-react";

type FeatureFlagItem = {
  key: string;
  description: string;
  enabled: boolean;
  defaultEnabled: boolean;
};

async function fetchFlags(): Promise<{ flags: FeatureFlagItem[] }> {
  const res = await fetch("/api/settings/feature-flags");
  if (!res.ok) throw new Error("Erro ao carregar flags.");
  return res.json();
}

async function toggleFlag(key: string, enabled: boolean): Promise<void> {
  const res = await fetch("/api/settings/feature-flags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, enabled }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { message?: string }).message ?? "Erro ao salvar.");
  }
}

const FLAG_LABELS: Record<string, { label: string; warning?: string }> = {
  permissions_v2_enabled: {
    label: "Permissões v2 (RBAC dinâmico)",
    warning:
      "Após ativar, a visibilidade de negócios e conversas passará a ser controlada pelos roles e grupos configurados. Certifique-se de que os grupos estão configurados antes de ativar.",
  },
  rbac_granular_scope_v1: {
    label: "Escopo granular de RBAC (v1)",
    warning:
      "Ativa enforcement granular por funil, etapa, campo e sidebar via scope-grants. Use em conjunto com a configuração de permissões.",
  },
};

export function SecurityClientPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["settings", "feature-flags"],
    queryFn: fetchFlags,
  });

  const mutation = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) =>
      toggleFlag(key, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings", "feature-flags"] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-[var(--text-muted)]">
        <Circle size={16} className="animate-spin" />
        Carregando…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 text-[var(--color-danger)]">
        Erro ao carregar configurações de segurança.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <div>
        <h1 className="font-display text-xl font-bold text-[var(--text-primary)]">
          Segurança
        </h1>
        <p className="mt-1 text-[13.5px] text-[var(--text-muted)]">
          Gerencie feature flags e configurações avançadas de controle de acesso.
        </p>
      </div>

      <section>
        <h2 className="mb-4 font-display text-[13px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          Feature Flags
        </h2>

        <div className="space-y-3">
          {data.flags.map((flag) => {
            const meta = FLAG_LABELS[flag.key];
            const label = meta?.label ?? flag.key;
            const warning = meta?.warning;

            return (
              <div
                key={flag.key}
                className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-[13.5px] font-semibold text-[var(--text-primary)]">
                        {label}
                      </span>
                      {flag.enabled ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success)]/12 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-success)]">
                          <CheckCircle2 size={10} />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--glass-bg-strong)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-muted)]">
                          <Circle size={10} />
                          Inativo
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[12.5px] text-[var(--text-muted)]">
                      {flag.description}
                    </p>
                    {warning && !flag.enabled && (
                      <div className="mt-2 flex items-start gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-warning)]/8 px-2.5 py-2 text-[12px] text-[var(--color-warning)]">
                        <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                        <span>{warning}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={mutation.isPending}
                    onClick={() =>
                      mutation.mutate({ key: flag.key, enabled: !flag.enabled })
                    }
                    className={`inline-flex shrink-0 items-center rounded-[var(--radius-md)] px-3 py-1.5 font-display text-[12px] font-semibold transition-colors disabled:opacity-50 ${
                      flag.enabled
                        ? "bg-[var(--color-danger)]/8 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/15"
                        : "bg-[var(--brand-primary)]/8 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/15"
                    }`}
                  >
                    {flag.enabled ? "Desativar" : "Ativar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
