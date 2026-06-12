"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  IconSpeakerphone,
  IconPlus,
  IconPlayerPause,
  IconPlayerPlay,
  IconX,
  IconRocket,
  IconChevronRight,
  IconBrandWhatsapp,
} from "@tabler/icons-react";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import { EmptyState } from "@/components/crm/empty-state";

import { useCampaigns, useCampaignAction } from "@/features/campaigns/hooks";
import {
  CAMPAIGN_STATUS_FILTERS,
  STATUS_META,
  TONE_CLASSES,
} from "@/features/campaigns/constants";
import type {
  CampaignAction,
  CampaignListItem,
} from "@/features/campaigns/types";

function fmtDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export default function CampaignsClientPage() {
  const { status: authStatus } = useSession();
  const isAuthenticated = authStatus === "authenticated";
  const [statusFilter, setStatusFilter] = useState("");

  const query = useCampaigns(
    { status: statusFilter || undefined, perPage: 50 },
    isAuthenticated,
  );

  const items = query.data?.items ?? [];

  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />

      <main className="flex min-w-0 flex-col gap-4 overflow-hidden">
        <PageHeader
          icon={<IconSpeakerphone size={22} />}
          title="Campanhas"
          description="Disparos em massa via WhatsApp (Meta Cloud API) com rastreamento completo"
          actions={
            <Link
              href="/campaigns/new"
              className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--brand-primary)] px-4 py-2 font-display text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(91,111,245,0.35)] transition-all hover:-translate-y-px hover:bg-[var(--brand-primary-dark)]"
            >
              <IconPlus size={16} /> Nova campanha
            </Link>
          }
        />

        <div className="flex flex-wrap items-center gap-1.5">
          {CAMPAIGN_STATUS_FILTERS.map((f) => (
            <button
              key={f.value || "all"}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-full border px-3 py-1.5 font-display text-[12px] font-semibold transition-colors ${
                statusFilter === f.value
                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                  : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/35"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {query.isLoading && items.length === 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-44 animate-pulse rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]"
                />
              ))}
            </div>
          ) : query.error ? (
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-danger)]/20 bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] p-6 text-center font-body text-[13px] text-[var(--color-danger-text)]">
              {query.error instanceof Error ? query.error.message : "Erro ao carregar."}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-md shadow-[var(--glass-shadow)]">
              <EmptyState
                icon={<IconSpeakerphone size={28} />}
                title="Nenhuma campanha"
                description={
                  statusFilter
                    ? "Nenhuma campanha com esse status."
                    : "Crie sua primeira campanha para disparar mensagens em massa."
                }
                action={
                  <Link
                    href="/campaigns/new"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-primary)] px-4 py-2 font-display text-[13px] font-bold text-white transition-colors hover:bg-[var(--brand-primary-dark)]"
                  >
                    <IconPlus size={16} /> Nova campanha
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((c) => (
                <CampaignCard key={c.id} campaign={c} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: CampaignListItem }) {
  const action = useCampaignAction(campaign.id);
  const meta = STATUS_META[campaign.status] ?? STATUS_META.DRAFT;

  const total = campaign.totalRecipients || 0;
  const sent = campaign.sentCount || 0;
  const failed = campaign.failedCount || 0;
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

  function run(e: React.MouseEvent, a: CampaignAction) {
    e.preventDefault();
    e.stopPropagation();
    action.mutate(a);
  }

  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className="group flex flex-col gap-3 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-4 shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-all hover:-translate-y-px hover:border-[var(--brand-primary)]/35 hover:shadow-[var(--glass-shadow)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--color-success)_25%,transparent)] bg-[var(--color-success-bg)] text-[var(--color-success-text)]">
            <IconBrandWhatsapp size={18} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-[15px] font-bold text-[var(--text-primary)]">
              {campaign.name}
            </p>
            <p className="mt-0.5 truncate font-body text-[11.5px] text-[var(--text-muted)]">
              {campaign.channel?.name ?? "—"} · {fmtDateBR(campaign.createdAt)}
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 font-display text-[10.5px] font-bold ${TONE_CLASSES[meta.tone]}`}
        >
          {meta.label}
        </span>
      </div>

      {total > 0 ? (
        <>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between font-body text-[10.5px] text-[var(--text-muted)]">
              <span>
                <span className="font-display font-bold text-[var(--text-secondary)]">
                  {pctSent}%
                </span>{" "}
                enviado
              </span>
              {pctFailed > 0 ? (
                <span className="text-[var(--color-danger-text)]">
                  {pctFailed}% falha
                </span>
              ) : null}
            </div>
            <div className="flex h-2 overflow-hidden rounded-full bg-[var(--glass-bg-subtle)]">
              <div
                className="bg-[var(--color-success)] transition-all duration-500"
                style={{ width: `${pctSent}%` }}
              />
              <div
                className="bg-[var(--color-danger)] transition-all duration-500"
                style={{ width: `${pctFailed}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-5 overflow-hidden rounded-[var(--radius-md)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-subtle)] text-center">
            <Mini label="Total" value={total} />
            <Mini label="Enviado" value={sent} tone="text-[var(--color-success-text)]" />
            <Mini label="Lido" value={campaign.readCount} tone="text-[var(--brand-primary)]" />
            <Mini
              label="Resp."
              value={campaign.repliedCount ?? 0}
              tone="text-[var(--color-info)]"
            />
            <Mini label="Falha" value={failed} tone="text-[var(--color-danger-text)]" />
          </div>
        </>
      ) : (
        <p className="font-body text-[12px] italic text-[var(--text-muted)]">
          Sem destinatários processados ainda.
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1.5">
          {canPause ? (
            <ActionBtn onClick={(e) => run(e, "pause")} disabled={action.isPending}>
              <IconPlayerPause size={14} /> Pausar
            </ActionBtn>
          ) : null}
          {canResume ? (
            <ActionBtn onClick={(e) => run(e, "resume")} disabled={action.isPending}>
              <IconPlayerPlay size={14} /> Retomar
            </ActionBtn>
          ) : null}
          {campaign.status === "DRAFT" ? (
            <ActionBtn onClick={(e) => run(e, "launch")} disabled={action.isPending}>
              <IconRocket size={14} /> Lançar
            </ActionBtn>
          ) : null}
          {canCancel ? (
            <ActionBtn
              danger
              onClick={(e) => run(e, "cancel")}
              disabled={action.isPending}
            >
              <IconX size={14} /> Cancelar
            </ActionBtn>
          ) : null}
        </div>
        <IconChevronRight
          size={16}
          className="text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5"
        />
      </div>

      {action.error ? (
        <p className="font-body text-[11px] text-[var(--color-danger-text)]">
          {(action.error as Error).message}
        </p>
      ) : null}
    </Link>
  );
}

function Mini({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="border-l border-[var(--glass-border-subtle)] py-1.5 first:border-l-0">
      <p className={`font-display text-[14px] font-bold ${tone ?? "text-[var(--text-primary)]"}`}>
        {value.toLocaleString("pt-BR")}
      </p>
      <p className="font-body text-[9.5px] uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-display text-[11px] font-semibold transition-colors disabled:opacity-50 ${
        danger
          ? "border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)] text-[var(--color-danger-text)] hover:bg-[color-mix(in_srgb,var(--color-danger)_18%,transparent)]"
          : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/35"
      }`}
    >
      {children}
    </button>
  );
}
