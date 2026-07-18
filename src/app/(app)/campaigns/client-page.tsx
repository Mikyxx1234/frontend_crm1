"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  IconAdjustmentsHorizontal,
  IconAlertTriangle,
  IconBrandWhatsapp,
  IconCheck,
  IconChevronRight,
  IconCircleCheck,
  IconLayoutGrid,
  IconMenu2,
  IconPlus,
  IconRotateClockwise,
  IconSearch,
  IconSend,
  IconSpeakerphone,
} from "@tabler/icons-react";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import { EmptyState } from "@/components/crm/empty-state";
import { PagePrimaryButton, PageSegmentedControl } from "@/components/crm/page-toolbar";
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
  const router = useRouter();
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

  const dashSource = isDemoBase ? MOCK_CAMPAIGNS_PAGE.items : realItems;
  const hasFilters = Boolean(statusFilter) || search.trim().length > 0;
  const clearFilters = () => {
    setStatusFilter("");
    setSearch("");
  };

  return (
    <div className="v2-screen grid min-w-0 grid-cols-[var(--nav-rail-w,72px)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] gap-3 overflow-hidden p-3 sm:gap-4 sm:p-4">
      <NavRailV2 />

      <main className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden sm:gap-4">
        <PageHeader
          icon={<IconSpeakerphone size={22} stroke={2.2} />}
          title="Campanhas"
          center={
            <CampaignsSearchFilterBar
              search={search}
              onSearch={setSearch}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              statusCounts={statusCounts}
              total={dashSource.length}
              onClearAll={clearFilters}
            />
          }
          actions={
            <div className="flex items-center gap-2">
              <PageSegmentedControl
                size="compact"
                aria-label="Automações e campanhas"
                items={[
                  { value: "automations", label: "Automações" },
                  { value: "campaigns", label: "Campanhas" },
                ]}
                value="campaigns"
                onChange={(v) => {
                  if (v === "automations") router.push("/automations");
                }}
              />
              <CampaignsActionsMenu />
            </div>
          }
        />

        <CampaignsMiniDash items={dashSource} />

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
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
      <p className="mt-1.5 font-body text-[10px] font-semibold tracking-[0.01em] text-[var(--text-muted)]">
        {label}
      </p>
    </div>
  );
}

// ── Mini-dash de campanhas ───────────────────────────────────────────────

const SENDING_SET: CampaignStatus[] = ["SENDING", "PROCESSING"];

function CampaignsMiniDash({ items }: { items: CampaignListItem[] }) {
  const stats = useMemo(() => {
    let sending = 0;
    let sent = 0;
    let read = 0;
    let failed = 0;
    for (const c of items) {
      if (SENDING_SET.includes(c.status)) sending++;
      sent += c.sentCount || 0;
      read += c.readCount || 0;
      failed += c.failedCount || 0;
    }
    const readRate = sent > 0 ? Math.round((read / sent) * 100) : 0;
    const failRate =
      sent + failed > 0 ? Math.round((failed / (sent + failed)) * 100) : 0;
    return { total: items.length, sending, sent, failed, readRate, failRate };
  }, [items]);

  const cards: {
    key: string;
    label: string;
    value: number;
    percent?: number;
    accent: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: "total",
      label: "Total de campanhas",
      value: stats.total,
      accent: "var(--brand-primary)",
      icon: <IconSpeakerphone size={16} />,
    },
    {
      key: "sending",
      label: "Em envio agora",
      value: stats.sending,
      accent: "var(--color-warning, #d97706)",
      icon: <IconSend size={16} />,
    },
    {
      key: "sent",
      label: "Enviadas · taxa de leitura",
      value: stats.sent,
      percent: stats.readRate,
      accent: "var(--color-success)",
      icon: <IconCircleCheck size={16} />,
    },
    {
      key: "failed",
      label: "Falhas · taxa de erro",
      value: stats.failed,
      percent: stats.failRate,
      accent: "var(--color-danger, #dc2626)",
      icon: <IconAlertTriangle size={16} />,
    },
  ];

  return (
    <div className="grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.key}
          className="flex items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-4 py-3 shadow-[var(--glass-shadow-sm)] backdrop-blur-md"
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{
              background: `color-mix(in srgb, ${c.accent} 14%, transparent)`,
              color: c.accent,
            }}
          >
            {c.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-[11.5px] font-semibold tracking-[0.01em] text-[var(--text-muted)]">
              {c.label}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[22px] font-bold leading-none text-[var(--text-primary)] tabular-nums">
                {c.value.toLocaleString("pt-BR")}
              </span>
              {c.percent !== undefined && (
                <span
                  className="font-display text-[12px] font-bold tabular-nums"
                  style={{ color: c.accent }}
                >
                  {c.percent}%
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Busca + popover de filtros (status) ──────────────────────────────────

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-primary)] px-1 font-display text-[10px] font-bold leading-none text-white">
      {count}
    </span>
  );
}

function CampaignsSearchFilterBar({
  search,
  onSearch,
  statusFilter,
  onStatusChange,
  statusCounts,
  total,
  onClearAll,
}: {
  search: string;
  onSearch: (v: string) => void;
  statusFilter: string;
  onStatusChange: (v: string) => void;
  statusCounts: Partial<Record<CampaignStatus, number>>;
  total: number;
  onClearAll: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const activeCount = statusFilter ? 1 : 0;

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative w-full">
      <IconSearch
        size={15}
        className="absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-[var(--text-muted)]"
      />
      <input
        type="search"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Pesquisar e filtrar campanhas..."
        aria-label="Buscar e filtrar campanhas"
        className="h-10 w-full rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] pl-9 pr-11 font-body text-[13px] text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)] outline-none placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--input-ring-focus)]"
      />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Filtros"
        className={cn(
          "absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition-colors",
          activeCount > 0 || open
            ? "bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)]"
            : "text-[var(--text-muted)] hover:bg-[var(--glass-bg-strong)]",
        )}
      >
        <IconAdjustmentsHorizontal size={15} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-40 flex w-[min(100vw-2rem,380px)] flex-col overflow-visible rounded-[22px] border border-[var(--glass-border)] bg-[var(--glass-bg-modal,#fff)] text-left shadow-[var(--glass-shadow-lg)] backdrop-blur-md">
          <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
            <div className="flex items-center gap-2">
              <span className="font-display text-[14px] font-bold text-[var(--text-primary)]">
                Filtrar por status
              </span>
              <CountBadge count={activeCount} />
            </div>
            <button
              type="button"
              onClick={onClearAll}
              disabled={activeCount === 0 && !search}
              className="flex items-center gap-1 font-display text-[12px] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--brand-primary)] disabled:opacity-40"
            >
              <IconRotateClockwise size={13} /> Limpar
            </button>
          </div>

          <div className="max-h-[min(60vh,420px)] overflow-y-auto px-4 pb-4">
            <div className="flex flex-wrap gap-1.5">
              {CAMPAIGN_STATUS_FILTERS.map((f) => {
                const selected = statusFilter === f.value;
                const count =
                  f.value === ""
                    ? total
                    : statusCounts[f.value as CampaignStatus] ?? 0;
                return (
                  <button
                    key={f.value || "all"}
                    type="button"
                    onClick={() => onStatusChange(f.value)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-display text-[12px] font-bold transition-colors",
                      selected
                        ? "border-[var(--brand-primary)] bg-[var(--color-primary-soft)] text-[var(--brand-primary)]"
                        : "border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-overlay)]",
                    )}
                  >
                    {selected && <IconCheck size={12} stroke={2.4} />}
                    {f.label}
                    <span
                      className={cn(
                        "min-w-[18px] rounded-full px-1.5 text-center text-[10px] font-bold",
                        selected
                          ? "bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]"
                          : "bg-[var(--glass-bg-overlay)] text-[var(--text-muted)]",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Menu hamburger (CTAs da página) ──────────────────────────────────────

function CampaignsActionsMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const items: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    divider?: boolean;
  }[] = [
    {
      icon: <IconPlus size={16} stroke={2.4} />,
      label: "Nova campanha",
      onClick: () => router.push("/campaigns/new"),
    },
    {
      icon: <IconLayoutGrid size={16} />,
      label: "Gerenciar segmentos",
      onClick: () => router.push("/campaigns/segments"),
      divider: true,
    },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Ações"
        aria-expanded={open}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)] transition-[filter,box-shadow] hover:brightness-105",
          open && "ring-2 ring-[var(--brand-primary)]/35 brightness-95",
        )}
      >
        <IconMenu2 size={18} stroke={2.2} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-[220px] overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-modal,#fff)] p-1 shadow-[var(--glass-shadow)] backdrop-blur-md">
          {items.map((it) => (
            <div key={it.label}>
              {it.divider && <div className="my-1 h-px bg-[var(--glass-border)]" />}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  it.onClick();
                }}
                className="flex w-full items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2 text-left font-display text-[13px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--brand-primary)]"
              >
                <span className="text-[var(--text-muted)]">{it.icon}</span>
                {it.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
