"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  IconSpeakerphone,
  IconPlus,
  IconChevronRight,
  IconBrandWhatsapp,
} from "@tabler/icons-react";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import { PageDemoBanner } from "@/components/crm/page-demo-banner";
import { EmptyState } from "@/components/crm/empty-state";
import {
  PagePrimaryButton,
  PageSearchBar,
  PageSegmentedControl,
} from "@/components/crm/page-toolbar";
import { cn } from "@/lib/utils";

import { useCampaigns } from "@/features/campaigns/hooks";
import { MOCK_CAMPAIGNS_PAGE } from "@/features/campaigns/mock-campaigns";
import {
  CAMPAIGN_STATUS_FILTERS,
  STATUS_META,
  TONE_CLASSES,
} from "@/features/campaigns/constants";
import type { CampaignListItem, CampaignStatus } from "@/features/campaigns/types";
import { shouldAutoDemoEmpty } from "@/lib/page-mock-mode";

function fmtDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

function fmtDateTimeBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const SENDING_STATUSES: CampaignStatus[] = ["SENDING", "PROCESSING"];

export default function CampaignsClientPage() {
  const { status: authStatus } = useSession();
  const isAuthenticated = authStatus === "authenticated";
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  const allQuery = useCampaigns({ perPage: 200 }, isAuthenticated);
  const realItems = allQuery.data?.items ?? [];

  const isDemoBase = shouldAutoDemoEmpty({
    realCount: realItems.length,
    hasFilters: false,
    isLoading: allQuery.isLoading,
    isError: allQuery.isError,
  });

  const allItems = useMemo(() => {
    const base = isDemoBase ? MOCK_CAMPAIGNS_PAGE.items : realItems;
    const q = search.trim().toLowerCase();
    return base
      .filter((c) => !statusFilter || c.status === statusFilter)
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          (c.segment?.name ?? "").toLowerCase().includes(q),
      );
  }, [isDemoBase, realItems, statusFilter, search]);

  const statusCounts = useMemo(() => {
    const source = isDemoBase ? MOCK_CAMPAIGNS_PAGE.items : realItems;
    const map: Partial<Record<CampaignStatus, number>> = {};
    for (const c of source) {
      map[c.status] = (map[c.status] ?? 0) + 1;
    }
    return map;
  }, [isDemoBase, realItems]);

  const isLoading = allQuery.isLoading;
  const error = allQuery.error && !isDemoBase;
  const isDemo = isDemoBase && !isLoading;

  return (
    <div className="v2-screen grid min-w-0 grid-cols-[var(--nav-rail-w,72px)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] gap-3 overflow-hidden p-3 sm:gap-4 sm:p-4">
      <NavRailV2 />

      <main className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden sm:gap-4">
        <PageHeader
          icon={<IconSpeakerphone size={22} stroke={2.2} />}
          title="Campanhas"
          center={
            <PageSearchBar
              variant="compact"
              value={search}
              onChange={setSearch}
              placeholder="Buscar campanhas..."
              aria-label="Buscar campanhas"
            />
          }
          actions={
            <PagePrimaryButton href="/campaigns/new" className="shrink-0">
              <IconPlus size={15} stroke={2.4} />
              <span className="sm:hidden">Nova</span>
              <span className="hidden sm:inline">Nova campanha</span>
            </PagePrimaryButton>
          }
        />

        {isDemo && (
          <div className="shrink-0">
            <PageDemoBanner>
              Dados de exemplo — campanhas com métricas, barras de progresso e status variados.
            </PageDemoBanner>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          <div className="toolbar-hscroll shrink-0">
            <PageSegmentedControl
              size="compact"
              aria-label="Filtrar campanhas por status"
              className="w-max shrink-0"
              items={CAMPAIGN_STATUS_FILTERS.map((f) => {
                const count =
                  f.value === ""
                    ? isDemoBase
                      ? MOCK_CAMPAIGNS_PAGE.items.length
                      : realItems.length
                    : (statusCounts[f.value as CampaignStatus] ?? 0);
                return {
                  value: f.value,
                  label: (
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      {f.label}
                      {!isLoading && (
                        <span className="min-w-[18px] rounded-full bg-[var(--glass-bg-overlay)] px-1.5 text-center text-[11px] font-bold text-[var(--text-muted)]">
                          {count}
                        </span>
                      )}
                    </span>
                  ),
                };
              })}
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>

          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5 [-webkit-overflow-scrolling:touch]">
            {isLoading && allItems.length === 0 ? (
              <div className="flex flex-col gap-2.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[72px] animate-pulse rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-[var(--radius-xl)] border border-[var(--color-danger)]/20 bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] p-6 text-center font-body text-[13px] text-[var(--color-danger-text)]">
                {error instanceof Error ? error.message : "Erro ao carregar."}
              </div>
            ) : allItems.length === 0 ? (
              <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] shadow-[var(--glass-shadow)] backdrop-blur-md">
                <EmptyState
                  icon={<IconSpeakerphone size={28} />}
                  title="Nenhuma campanha"
                  description={
                    statusFilter
                      ? "Nenhuma campanha com esse status."
                      : "Crie sua primeira campanha para disparar mensagens em massa."
                  }
                  action={
                    <PagePrimaryButton href="/campaigns/new">
                      <IconPlus size={15} stroke={2.4} /> Nova campanha
                    </PagePrimaryButton>
                  }
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 pb-3">
                {allItems.map((c) => (
                  <CampaignRow key={c.id} campaign={c} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function CampaignRow({ campaign }: { campaign: CampaignListItem }) {
  const meta = STATUS_META[campaign.status] ?? STATUS_META.DRAFT;
  const isSending = SENDING_STATUSES.includes(campaign.status);

  const total = campaign.totalRecipients || 0;
  const sent = campaign.sentCount || 0;
  const failed = campaign.failedCount || 0;
  const pctSent = total ? Math.round((sent / total) * 100) : 0;
  const pctFailed = total ? Math.round((failed / total) * 100) : 0;

  const noMetrics =
    total === 0 ||
    campaign.status === "DRAFT" ||
    campaign.status === "SCHEDULED";

  const listLabel =
    campaign.segment?.name ?? campaign.channel?.name ?? "—";

  const dateLabel =
    campaign.status === "SCHEDULED" && campaign.scheduledAt
      ? `Agendada p/ ${fmtDateTimeBR(campaign.scheduledAt)}`
      : fmtDateBR(campaign.createdAt);

  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className="group flex min-w-0 cursor-pointer flex-col gap-3 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-3.5 py-3 shadow-[var(--glass-shadow-sm)] transition-all hover:border-[var(--input-border-focus,rgba(91,111,245,0.50))] hover:shadow-[var(--glass-shadow)] sm:flex-row sm:items-center sm:gap-4 sm:px-4.5 sm:py-3.5 sm:hover:translate-x-0.5"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-wa-bg,rgba(37,211,102,0.14))] text-[var(--color-wa-dark,#128c4b)] sm:h-11 sm:w-11">
          <IconBrandWhatsapp size={22} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="break-words font-display text-[14.5px] font-extrabold leading-snug text-[var(--text-primary)] sm:truncate sm:text-[15.5px]">
            {campaign.name}
          </p>
          <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 font-body text-[12px] text-[var(--text-muted)]">
            <span className="min-w-0 break-words sm:truncate">{listLabel}</span>
            <span className="h-[3px] w-[3px] shrink-0 rounded-full bg-[var(--text-muted)] opacity-60" />
            <span className="min-w-0 break-words">{dateLabel}</span>
          </p>
        </div>

        <IconChevronRight
          size={18}
          stroke={2.5}
          className="mt-1 shrink-0 text-[var(--brand-primary)] sm:hidden"
        />
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:contents">
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 font-display text-[11.5px] font-bold before:h-1.5 before:w-1.5 before:rounded-full before:bg-current",
            TONE_CLASSES[meta.tone],
            isSending && "before:animate-pulse",
          )}
        >
          {meta.label}
        </span>

        {noMetrics ? (
          <p className="min-w-0 flex-1 text-pretty break-words font-body text-[12px] italic leading-snug text-[var(--text-muted)] sm:text-[12.5px]">
            {campaign.status === "SCHEDULED"
              ? "Aguardando disparo — métricas após o início do envio."
              : "Rascunho — configure e lance a campanha para ver métricas."}
          </p>
        ) : (
          <div className="w-full min-w-0 sm:w-[180px] sm:shrink-0">
            <div className="flex h-[7px] overflow-hidden rounded-full bg-[var(--glass-bg-overlay)]">
              <div
                className="bg-[var(--color-success)] transition-all duration-500"
                style={{ width: `${pctSent}%` }}
              />
              <div
                className="bg-[var(--color-danger)] transition-all duration-500"
                style={{ width: `${pctFailed}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between font-display text-[11px] font-bold">
              <span className="text-[var(--color-success-dark,var(--color-success-text))]">
                {pctSent}% enviado
              </span>
              {pctFailed > 0 && (
                <span className="text-[var(--color-danger)]">{pctFailed}% falha</span>
              )}
            </div>
          </div>
        )}

        {!noMetrics && (
          <div className="hidden shrink-0 gap-5.5 min-[1100px]:flex">
            <Metric label="Total" value={total} tone="brand" />
            <Metric label="Enviado" value={sent} tone="success" />
            <Metric
              label="Lido"
              value={campaign.readCount}
              tone={campaign.readCount > 0 ? "brand" : "muted"}
            />
            <Metric
              label="Resp."
              value={campaign.repliedCount ?? 0}
              tone={(campaign.repliedCount ?? 0) > 0 ? "brand" : "muted"}
            />
            <Metric label="Falha" value={failed} tone="danger" />
          </div>
        )}
      </div>

      <IconChevronRight
        size={18}
        stroke={2.5}
        className="hidden shrink-0 text-[var(--brand-primary)] transition-transform group-hover:translate-x-0.5 sm:block"
      />
    </Link>
  );
}

const METRIC_TONES = {
  brand: "text-[var(--brand-primary)]",
  success: "text-[var(--color-success-dark,var(--color-success-text))]",
  danger: "text-[var(--color-danger)]",
  muted: "text-[var(--text-muted)]",
} as const;

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof METRIC_TONES;
}) {
  return (
    <div className="min-w-[46px] text-center">
      <p
        className={`font-display text-[17px] font-extrabold leading-none tracking-tight ${METRIC_TONES[tone]}`}
      >
        {value.toLocaleString("pt-BR")}
      </p>
      <p className="mt-1.5 font-body text-[9.5px] font-bold uppercase tracking-[0.04em] text-[var(--text-muted)]">
        {label}
      </p>
    </div>
  );
}
