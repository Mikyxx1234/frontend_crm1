"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  IconAdjustmentsHorizontal,
  IconAlertCircle,
  IconAlertTriangle,
  IconBrandWhatsapp,
  IconCheck,
  IconChevronRight,
  IconCircleCheck,
  IconEye,
  IconLayoutGrid,
  IconMessageReply,
  IconPlus,
  IconRotateClockwise,
  IconSearch,
  IconSend,
  IconSpeakerphone,
} from "@tabler/icons-react";

import { NavRailSpacer } from "@/components/crm/nav-rail-spacer";
import { PageHeader } from "@/components/crm/page-header";
import { EmptyState } from "@/components/crm/empty-state";
import { PageActionsMenu, PagePrimaryButton, PageSegmentedControl } from "@/components/crm/page-toolbar";
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
      <NavRailSpacer />

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

// Cor do dot de status — mapeada a partir do meta.tone (padrão Automações
// usa dot simples). Também aplica pulse quando a campanha está enviando.
const DOT_TONE: Record<string, string> = {
  success: "bg-[var(--color-success)]",
  brand: "bg-[var(--brand-primary)]",
  info: "bg-[var(--color-info)]",
  warning: "bg-[var(--color-warning)]",
  danger: "bg-[var(--color-danger)]",
  neutral: "bg-[var(--text-muted)] opacity-45",
};

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
      className="group flex min-w-0 cursor-pointer items-center gap-3 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-3.5 py-3 shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--input-border-focus,rgba(91,111,245,0.50))] hover:shadow-[var(--glass-shadow)] sm:gap-4 sm:px-4"
    >
      {/* Bloco esquerdo — dot + nome + subtítulo (padrão Automações). */}
      <div className="min-w-0 flex-1 lg:min-w-[240px] lg:flex-none lg:shrink-0">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              DOT_TONE[meta.tone] ?? DOT_TONE.neutral,
              isSending && "animate-pulse",
            )}
          />
          <h3 className="min-w-0 truncate font-display text-[14px] font-bold text-[var(--text-primary)]">
            {campaign.name}
          </h3>
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-1.5 pl-4">
          <IconBrandWhatsapp
            size={13}
            stroke={2.2}
            className="shrink-0 text-[var(--color-wa-dark,#128c4b)]"
          />
          <span className="min-w-0 truncate font-body text-[12px] text-[var(--text-muted)] sm:text-[12.5px]">
            {listLabel} · {dateLabel}
          </span>
        </div>
      </div>

      {/* Centro — pill de status compacta + progresso ou mensagem de espera. */}
      <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 font-display text-[11px] font-bold before:h-1.5 before:w-1.5 before:rounded-full before:bg-current",
            TONE_CLASSES[meta.tone],
            isSending && "before:animate-pulse",
          )}
        >
          {meta.label}
        </span>
        {noMetrics ? (
          <p className="min-w-0 flex-1 truncate font-body text-[12px] italic text-[var(--text-muted)]">
            {campaign.status === "SCHEDULED"
              ? "Aguardando disparo — métricas após o início do envio."
              : "Rascunho — configure e lance a campanha para ver métricas."}
          </p>
        ) : (
          <div className="min-w-0 flex-1">
            <div className="flex h-[6px] overflow-hidden rounded-full bg-[var(--glass-bg-overlay)]">
              <div
                className="bg-[var(--color-success)] transition-all duration-500"
                style={{ width: `${pctSent}%` }}
              />
              <div
                className="bg-[var(--color-danger)] transition-all duration-500"
                style={{ width: `${pctFailed}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between font-display text-[10.5px] font-bold">
              <span className="text-[var(--color-success-dark,var(--color-success-text))]">
                {pctSent}% enviado
              </span>
              {pctFailed > 0 && (
                <span className="text-[var(--color-danger)]">
                  {pctFailed}% falha
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Direita — métricas compactas no estilo Automações (icone/valor/label). */}
      {!noMetrics && (
        <div className="hidden shrink-0 items-center gap-6.5 min-[1100px]:flex">
          <RowMetric
            icon={<IconCircleCheck size={13} />}
            value={total.toLocaleString("pt-BR")}
            label="Total"
          />
          <RowMetric
            icon={<IconSend size={13} />}
            value={sent.toLocaleString("pt-BR")}
            label="Enviado"
          />
          <RowMetric
            icon={<IconEye size={13} />}
            value={(campaign.readCount ?? 0).toLocaleString("pt-BR")}
            label="Lido"
          />
          <RowMetric
            icon={<IconMessageReply size={13} />}
            value={(campaign.repliedCount ?? 0).toLocaleString("pt-BR")}
            label="Resp."
          />
          <RowMetric
            icon={<IconAlertCircle size={13} />}
            value={failed.toLocaleString("pt-BR")}
            label="Falha"
          />
        </div>
      )}

      {/* Fallback mobile — pill de status + chevron. */}
      <div className="flex shrink-0 items-center gap-2 lg:hidden">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-display text-[11px] font-bold before:h-1.5 before:w-1.5 before:rounded-full before:bg-current",
            TONE_CLASSES[meta.tone],
            isSending && "before:animate-pulse",
          )}
        >
          {meta.label}
        </span>
        <IconChevronRight
          size={16}
          stroke={2.5}
          className="text-[var(--brand-primary)]"
        />
      </div>

      <IconChevronRight
        size={16}
        stroke={2.2}
        className="hidden shrink-0 text-[var(--text-muted)] transition-all group-hover:translate-x-0.5 group-hover:text-[var(--brand-primary)] lg:block"
      />
    </Link>
  );
}

// Métrica no formato Automações: ícone pequeno em cima, valor bold, label pequeno.
function RowMetric({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="min-w-[52px] text-center">
      <div className="mb-0.5 flex items-center justify-center gap-1 text-[var(--text-muted)]">
        {icon}
      </div>
      <p className="font-display text-[15px] font-extrabold leading-none text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-1 font-body text-[10px] font-semibold tracking-[0.01em] text-[var(--text-muted)]">
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
  return (
    <PageActionsMenu
      items={[
        {
          icon: <IconPlus size={14} stroke={2.6} />,
          label: "Nova campanha",
          onClick: () => router.push("/campaigns/new"),
          primary: true,
        },
        {
          icon: <IconLayoutGrid size={13} />,
          label: "Gerenciar segmentos",
          onClick: () => router.push("/campaigns/segments"),
          divider: true,
        },
      ]}
    />
  );
}
