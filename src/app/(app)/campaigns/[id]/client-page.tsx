"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  IconRocket,
  IconPlayerPause,
  IconPlayerPlay,
  IconX,
  IconLoader2,
  IconSend,
  IconCircleCheck,
  IconEye,
  IconMessage2,
  IconAlertTriangle,
  IconUsers,
} from "@tabler/icons-react";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import { EmptyState } from "@/components/crm/empty-state";

import {
  useCampaign,
  useCampaignAction,
  useCampaignRecipients,
  useCampaignStats,
} from "@/features/campaigns/hooks";
import {
  RECIPIENT_META,
  STATUS_META,
  TONE_CLASSES,
} from "@/features/campaigns/constants";
import type { CampaignAction } from "@/features/campaigns/types";

const ACTIVE = ["SCHEDULED", "PROCESSING", "SENDING"];

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR");
}

const RECIPIENT_FILTERS = [
  { value: "", label: "Todos" },
  { value: "SENT", label: "Enviado" },
  { value: "DELIVERED", label: "Entregue" },
  { value: "READ", label: "Lido" },
  { value: "FAILED", label: "Falhou" },
  { value: "PENDING", label: "Pendente" },
];

export default function CampaignDetailClientPage() {
  const { id } = useParams<{ id: string }>();
  const { status: authStatus } = useSession();
  const isAuth = authStatus === "authenticated";

  const [recipientFilter, setRecipientFilter] = useState("");
  const [page, setPage] = useState(1);
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());

  const toggleError = (recipientId: string) =>
    setExpandedErrors((prev) => {
      const next = new Set(prev);
      if (next.has(recipientId)) next.delete(recipientId);
      else next.add(recipientId);
      return next;
    });

  const campaignQuery = useCampaign(id, isAuth);
  const campaign = campaignQuery.data;
  const isActive = campaign ? ACTIVE.includes(campaign.status) : false;

  const statsQuery = useCampaignStats(id, isActive, isAuth && !!campaign);
  const stats = statsQuery.data;

  const recipientsQuery = useCampaignRecipients(
    id,
    { status: recipientFilter || undefined, page, perPage: 20 },
    isAuth && !!campaign && (campaign?.totalRecipients ?? 0) > 0,
  );

  const action = useCampaignAction(id);

  if (campaignQuery.isLoading) {
    return (
      <Shell>
        <div className="h-40 animate-pulse rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]" />
      </Shell>
    );
  }

  if (!campaign) {
    return (
      <Shell>
        <EmptyState
          icon={<IconUsers size={28} />}
          title="Campanha não encontrada"
          description="Ela pode ter sido removida."
          action={
            <Link
              href="/campaigns"
              className="font-display text-[12px] font-semibold text-[var(--brand-primary)] hover:underline"
            >
              Ir para campanhas
            </Link>
          }
        />
      </Shell>
    );
  }

  const meta = STATUS_META[campaign.status] ?? STATUS_META.DRAFT;
  const total = stats?.totalRecipients ?? campaign.totalRecipients;
  const sent = stats?.sentCount ?? campaign.sentCount;
  const failed = stats?.failedCount ?? campaign.failedCount;
  const pctSent = total ? Math.round((sent / total) * 100) : 0;
  const pctFailed = total ? Math.round((failed / total) * 100) : 0;

  const canPause = campaign.status === "SENDING" || campaign.status === "PROCESSING";
  const canResume = campaign.status === "PAUSED";
  const canCancel = [
    "DRAFT",
    "SCHEDULED",
    "PROCESSING",
    "SENDING",
    "PAUSED",
  ].includes(campaign.status);

  const run = (a: CampaignAction) => action.mutate(a);

  return (
    <Shell
      header={
        <div className="flex items-center gap-2">
          {campaign.status === "DRAFT" ? (
            <HeaderBtn onClick={() => run("launch")} disabled={action.isPending}>
              <IconRocket size={15} /> Lançar
            </HeaderBtn>
          ) : null}
          {canPause ? (
            <HeaderBtn onClick={() => run("pause")} disabled={action.isPending}>
              <IconPlayerPause size={15} /> Pausar
            </HeaderBtn>
          ) : null}
          {canResume ? (
            <HeaderBtn onClick={() => run("resume")} disabled={action.isPending}>
              <IconPlayerPlay size={15} /> Retomar
            </HeaderBtn>
          ) : null}
          {canCancel ? (
            <HeaderBtn danger onClick={() => run("cancel")} disabled={action.isPending}>
              <IconX size={15} /> Cancelar
            </HeaderBtn>
          ) : null}
        </div>
      }
      title={campaign.name}
      badge={
        <span
          className={`rounded-full border px-2.5 py-0.5 font-display text-[11px] font-bold ${TONE_CLASSES[meta.tone]}`}
        >
          {meta.label}
        </span>
      }
      subtitle={`${campaign.channel?.name ?? "—"} · ${
        campaign.type === "TEMPLATE"
          ? `Template: ${campaign.templateName ?? "—"}`
          : "Texto livre"
      }`}
    >
      {action.error ? (
        <p className="font-body text-[12.5px] text-[var(--color-danger-text)]">
          {(action.error as Error).message}
        </p>
      ) : null}

      {/* Funil */}
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={<IconUsers size={18} />} label="Total" value={total} />
        <StatCard
          icon={<IconSend size={18} />}
          label="Enviados"
          value={sent}
          tone="text-[var(--color-success-text)]"
        />
        <StatCard
          icon={<IconCircleCheck size={18} />}
          label="Entregues"
          value={stats?.deliveredCount ?? campaign.deliveredCount}
          tone="text-[var(--color-success-text)]"
          rate={stats?.deliveryRate}
        />
        <StatCard
          icon={<IconEye size={18} />}
          label="Lidos"
          value={stats?.readCount ?? campaign.readCount}
          tone="text-[var(--brand-primary)]"
          rate={stats?.readRate}
        />
        <StatCard
          icon={<IconMessage2 size={18} />}
          label="Responderam"
          value={stats?.repliedCount ?? campaign.repliedCount ?? 0}
          tone="text-sky-600"
          rate={stats?.replyRate}
        />
        <StatCard
          icon={<IconAlertTriangle size={18} />}
          label="Falhas"
          value={failed}
          tone="text-[var(--color-danger-text)]"
        />
      </div>

      {total > 0 ? (
        <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-4 shadow-[var(--glass-shadow-sm)] backdrop-blur-md">
          <div className="flex h-3 overflow-hidden rounded-full bg-[var(--glass-bg-subtle)]">
            <div
              className="bg-emerald-500 transition-all duration-500"
              style={{ width: `${pctSent}%` }}
            />
            <div
              className="bg-red-500 transition-all duration-500"
              style={{ width: `${pctFailed}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between font-body text-[11.5px] text-[var(--text-muted)]">
            <span>{pctSent}% enviado</span>
            <span>{stats?.pendingCount ?? 0} pendentes</span>
          </div>
        </div>
      ) : null}

      {/* Motivos de falha */}
      {stats?.failureReasons && stats.failureReasons.length > 0 ? (
        <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-4 shadow-[var(--glass-shadow-sm)] backdrop-blur-md">
          <p className="mb-2 font-display text-[13px] font-bold text-[var(--text-primary)]">
            Motivos de falha
          </p>
          <div className="space-y-1">
            {stats.failureReasons.map((r) => (
              <div
                key={r.reason}
                className="flex items-center justify-between gap-3 font-body text-[12px]"
              >
                <span className="truncate text-[var(--text-secondary)]">{r.reason}</span>
                <span className="shrink-0 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 font-display text-[11px] font-bold text-[var(--color-danger-text)]">
                  {r.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Destinatários */}
      {total > 0 ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] shadow-[var(--glass-shadow)] backdrop-blur-md">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--glass-border-subtle)] p-3">
            <p className="font-display text-[13px] font-bold text-[var(--text-primary)]">
              Destinatários
            </p>
            <div className="flex flex-wrap gap-1">
              {RECIPIENT_FILTERS.map((f) => (
                <button
                  key={f.value || "all"}
                  type="button"
                  onClick={() => {
                    setRecipientFilter(f.value);
                    setPage(1);
                  }}
                  className={`rounded-full border px-2.5 py-1 font-display text-[11px] font-semibold transition-colors ${
                    recipientFilter === f.value
                      ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                      : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-secondary)]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {recipientsQuery.isLoading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-9 animate-pulse rounded-[var(--radius-md)] bg-[var(--glass-bg-subtle)]"
                  />
                ))}
              </div>
            ) : (recipientsQuery.data?.items ?? []).length === 0 ? (
              <EmptyState
                icon={<IconUsers size={26} />}
                title="Nenhum destinatário"
                description="Nenhum contato com esse status."
              />
            ) : (
              <div className="divide-y divide-[var(--glass-border-subtle)]">
                {(recipientsQuery.data?.items ?? []).map((r) => {
                  const rmeta = RECIPIENT_META[r.status] ?? RECIPIENT_META.PENDING;
                  return (
                    <div key={r.id} className="px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-display text-[12.5px] font-semibold text-[var(--text-primary)]">
                            {r.contact.name}
                          </p>
                          <p className="truncate font-body text-[11px] text-[var(--text-muted)]">
                            {r.contact.phone ?? "—"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {r.errorMessage ? (
                            <button
                              type="button"
                              onClick={() => toggleError(r.id)}
                              title={r.errorMessage}
                              className="max-w-[180px] truncate font-body text-[10.5px] text-[var(--color-danger-text)] underline-offset-2 hover:underline"
                            >
                              {r.errorMessage}
                            </button>
                          ) : null}
                          {r.repliedAt ? (
                            <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-display text-[10px] font-bold text-sky-600">
                              Respondeu
                            </span>
                          ) : null}
                          <span
                            className={`rounded-full border px-2 py-0.5 font-display text-[10px] font-bold ${TONE_CLASSES[rmeta.tone]}`}
                          >
                            {rmeta.label}
                          </span>
                        </div>
                      </div>
                      {r.errorMessage && expandedErrors.has(r.id) ? (
                        <p className="mt-1.5 whitespace-pre-wrap break-words rounded-[var(--radius-md)] border border-red-500/20 bg-red-500/5 px-2.5 py-1.5 font-body text-[11px] leading-relaxed text-[var(--color-danger-text)]">
                          {r.errorMessage}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {(recipientsQuery.data?.totalPages ?? 1) > 1 ? (
            <div className="flex items-center justify-center gap-2 border-t border-[var(--glass-border-subtle)] p-2">
              <PageBtn disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </PageBtn>
              <span className="font-body text-[12px] text-[var(--text-muted)]">
                {page} / {recipientsQuery.data?.totalPages}
              </span>
              <PageBtn
                disabled={page >= (recipientsQuery.data?.totalPages ?? 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                Próximo
              </PageBtn>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Detalhes */}
      <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-4 shadow-[var(--glass-shadow-sm)] backdrop-blur-md">
        <DetailRow label="Criado em" value={fmtDateTime(campaign.createdAt)} />
        {campaign.startedAt ? (
          <DetailRow label="Iniciado em" value={fmtDateTime(campaign.startedAt)} />
        ) : null}
        {campaign.completedAt ? (
          <DetailRow label="Concluído em" value={fmtDateTime(campaign.completedAt)} />
        ) : null}
        {campaign.scheduledAt ? (
          <DetailRow label="Agendado para" value={fmtDateTime(campaign.scheduledAt)} />
        ) : null}
        <DetailRow label="Velocidade" value={`${campaign.sendRate} msgs/s`} />
        {campaign.segment ? (
          <DetailRow label="Segmento" value={campaign.segment.name} />
        ) : null}
      </div>
    </Shell>
  );
}

function Shell({
  children,
  header,
  title,
  subtitle,
  badge,
}: {
  children: React.ReactNode;
  header?: React.ReactNode;
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />
      <main className="flex min-w-0 flex-col gap-4 overflow-hidden">
        <PageHeader
          back={{ href: "/campaigns", label: "Campanhas" }}
          icon={<IconRocket size={22} />}
          title={title ?? "Campanha"}
          description={subtitle}
          center={badge ? <div>{badge}</div> : undefined}
          actions={header}
        />
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
  rate,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: string;
  rate?: number;
}) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-3 shadow-[var(--glass-shadow-sm)] backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span className={tone ?? "text-[var(--text-muted)]"}>{icon}</span>
        <div>
          <p className={`font-display text-[18px] font-bold leading-none ${tone ?? "text-[var(--text-primary)]"}`}>
            {value.toLocaleString("pt-BR")}
          </p>
          <p className="mt-0.5 font-body text-[10.5px] uppercase tracking-wide text-[var(--text-muted)]">
            {label}
            {rate !== undefined ? ` · ${rate}%` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

function HeaderBtn({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 font-display text-[12.5px] font-semibold transition-colors disabled:opacity-50 ${
        danger
          ? "border-red-500/30 bg-red-500/10 text-[var(--color-danger-text)] hover:bg-red-500/20"
          : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/35"
      }`}
    >
      {children}
    </button>
  );
}

function PageBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-1.5 font-display text-[12px] font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--brand-primary)]/35 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1 font-body text-[12.5px]">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="font-semibold text-[var(--text-primary)]">{value}</span>
    </div>
  );
}
