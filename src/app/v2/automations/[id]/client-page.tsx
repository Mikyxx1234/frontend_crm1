"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  IconArrowLeft,
  IconArrowNarrowDown,
  IconBolt,
  IconCircleCheck,
  IconCircleOff,
  IconPlayerPlay,
} from "@tabler/icons-react";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";

import { useAutomation } from "@/features/automations-v2/hooks";

/**
 * Builder linear — read-only.
 *
 * O schema atual (`AutomationStep.position`) é uma cadeia linear: cada
 * step segue o anterior por `position`. O builder gráfico do ZIP usa
 * ramificação com `options`/`edges`/`x,y` — fora de escopo até o
 * backend evoluir (ver gaps no plano `Fase 3`).
 *
 * Esta página mostra a cadeia em coluna, com o trigger no topo e cada
 * step abaixo (com type e um snippet do config como JSON resumido).
 */
interface V2AutomationDetailClientPageProps {
  automationId: string;
}

function summarizeConfig(cfg: Record<string, unknown> | null): string {
  if (!cfg) return "—";
  const keys = Object.keys(cfg);
  if (!keys.length) return "{}";
  return keys.slice(0, 4).join(", ") + (keys.length > 4 ? ` … (+${keys.length - 4})` : "");
}

export default function V2AutomationDetailClientPage({
  automationId,
}: V2AutomationDetailClientPageProps) {
  const router = useRouter();
  const query = useAutomation(automationId);
  const data = query.data;

  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />

      <main className="flex min-w-0 flex-col gap-4 overflow-y-auto">
        <PageHeader
          icon={<IconBolt size={22} />}
          title={data?.name ?? "Automação"}
          description={
            data?.description ??
            "Cadeia linear de passos disparada pelo gatilho configurado."
          }
          actions={
            <button
              type="button"
              onClick={() => router.push("/v2/automations")}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3.5 py-1.5 font-display text-[12px] font-bold text-[var(--brand-primary)] shadow-[var(--glass-shadow-sm)] hover:bg-[var(--glass-bg-strong)]"
            >
              <IconArrowLeft size={14} />
              Voltar
            </button>
          }
        />

        {query.isLoading ? (
          <div className="h-[400px] animate-pulse rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]" />
        ) : query.error ? (
          <div className="flex flex-col items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--color-danger)]/20 bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] p-6 text-center">
            <p className="font-body text-[13px] text-[var(--color-danger-text)]">
              {query.error instanceof Error ? query.error.message : "Erro ao carregar."}
            </p>
            <Link
              href="/v2/automations"
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-primary)] px-4 py-2 font-display text-sm font-bold text-white"
            >
              <IconArrowLeft size={16} />
              Voltar à lista
            </Link>
          </div>
        ) : data ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-4 shadow-[var(--glass-shadow)] backdrop-blur-md">
              <span className="font-display text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                Status
              </span>
              {data.active ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-success)]/20 bg-[var(--color-success-bg)] px-2 py-0.5 font-display text-[11px] font-bold text-[var(--color-success-text)]">
                  <IconCircleCheck size={12} /> Ativa
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-2 py-0.5 font-display text-[11px] font-bold text-[var(--text-muted)]">
                  <IconCircleOff size={12} /> Pausada
                </span>
              )}

              <span className="ml-4 font-display text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
                Gatilho
              </span>
              <span className="rounded-full bg-[var(--color-enterprise-bg)] px-2.5 py-0.5 font-display text-[11px] font-bold text-[var(--brand-primary)]">
                {data.triggerType}
              </span>

              <span className="ml-auto font-display text-[11px] font-bold text-[var(--text-muted)]">
                {data.stepCount} passos
              </span>
            </div>

            <div className="flex flex-col items-center gap-2">
              {/* Gatilho */}
              <FlowCard
                kind="trigger"
                title={data.triggerType}
                subtitle="Disparo da automação"
              />

              {data.steps.length === 0 ? (
                <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-6 py-4 font-display text-[12px] text-[var(--text-muted)]">
                  Esta automação ainda não tem passos.
                </div>
              ) : (
                data.steps
                  .slice()
                  .sort((a, b) => a.position - b.position)
                  .map((s, idx) => (
                    <div key={s.id} className="flex flex-col items-center gap-1.5">
                      <IconArrowNarrowDown
                        size={20}
                        className="text-[var(--text-muted)]"
                      />
                      <FlowCard
                        kind="step"
                        index={idx + 1}
                        title={s.type}
                        subtitle={summarizeConfig(s.config)}
                      />
                    </div>
                  ))
              )}
            </div>

            <details className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-4 shadow-[var(--glass-shadow-sm)] backdrop-blur-md">
              <summary className="cursor-pointer font-display text-[12px] font-bold text-[var(--text-secondary)]">
                Configuração bruta dos passos (JSON)
              </summary>
              <pre className="mt-3 max-h-[300px] overflow-auto rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-3 font-mono text-[11px] leading-relaxed text-[var(--text-secondary)]">
                {JSON.stringify(data.steps, null, 2)}
              </pre>
            </details>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function FlowCard({
  kind,
  title,
  subtitle,
  index,
}: {
  kind: "trigger" | "step";
  title: string;
  subtitle?: string;
  index?: number;
}) {
  const isTrigger = kind === "trigger";
  return (
    <div
      className={
        isTrigger
          ? "flex w-full max-w-[460px] items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--brand-primary)]/30 bg-[var(--color-enterprise-bg)] px-4 py-3 shadow-[var(--glass-shadow)]"
          : "flex w-full max-w-[460px] items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-4 py-3 shadow-[var(--glass-shadow-sm)]"
      }
    >
      <span
        className={
          isTrigger
            ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-primary)] text-white"
            : "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--glass-bg-overlay)] font-display text-[12px] font-bold text-[var(--brand-primary)]"
        }
      >
        {isTrigger ? <IconPlayerPlay size={18} /> : index}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[13px] font-bold text-[var(--text-primary)]">
          {title}
        </p>
        {subtitle && (
          <p className="truncate font-body text-[11.5px] text-[var(--text-muted)]">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
