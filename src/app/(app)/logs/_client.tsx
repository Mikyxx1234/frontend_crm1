"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconLoader2 as Loader2 } from "@tabler/icons-react";
import {
  IconAdjustmentsHorizontal,
  IconActivity,
  IconArrowsExchange,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandTelegram,
  IconBrandWhatsapp,
  IconBriefcase,
  IconBuildingCommunity,
  IconCalendarEvent,
  IconCheck,
  IconChecklist,
  IconClipboardList,
  IconCopy,
  IconExternalLink,
  IconLink,
  IconMail,
  IconMessageCircle,
  IconPhone,
  IconPhoneCall,
  IconPhoneCheck,
  IconPhoneIncoming,
  IconPhoneOutgoing,
  IconRefresh,
  IconRotateClockwise,
  IconSearch,
  IconSettings,
  IconTestPipe,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { format, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { NavRailSpacer } from "@/components/crm/nav-rail-spacer";
import { CallHistoryList } from "@/features/softphone/components/call-history-list";
import {
  CallsSearchFilterBar,
  type CallsFilterState,
} from "@/features/softphone/components/calls-search-filter-bar";
import { useCallsWidget } from "@/features/softphone/hooks/use-calls-widget";
import {
  getCallsStats,
  listCalls,
  syncCalls,
} from "@/features/softphone/api/extensions";
import type { ListCallsFilters } from "@/features/softphone/api/types";
import { RestrictedScreen } from "@/components/crm/restricted-screen";
import { useRequireManager } from "@/hooks/use-user-role";
import { PageHeader } from "@/components/crm/page-header";
import { PageActionsMenu, PageSegmentedControl } from "@/components/crm/page-toolbar";
import { PaginationGlass } from "@/components/crm/pagination-glass";
import {
  listTableHeadRowClass,
  SortableHeader,
  type SortDir,
} from "@/components/crm/sortable-header";
import { DateRangePicker, type DateRange } from "@/components/crm/date-range-picker";
import { EmptyState } from "@/components/crm/empty-state";
import { PageDemoBanner } from "@/components/crm/page-demo-banner";
import {
  EVENT_CONFIG,
  FALLBACK_CONFIG,
  actorDisplay,
  eventDescription,
  groupFeedByDay,
  type FeedEvent,
} from "@/components/crm/feed";
import { useActivityFeed } from "@/features/activity-feed/use-activity-feed";
import type { ActivityFeedFilters } from "@/features/activity-feed/api";
import { useActivityStats } from "@/features/activity-feed/use-activity-stats";
import { MOCK_FEED } from "@/features/activity-feed/mock-feed";
import { shouldAutoDemoEmpty } from "@/lib/page-mock-mode";
import { cn } from "@/lib/utils";

const LOG_TABS = ["Eventos", "Chamadas", "Estatísticas (30d)"] as const;

const ENTITY_OPTIONS = [
  { value: "ALL", label: "Todas as entidades" },
  { value: "DEAL", label: "Negócios" },
  { value: "CONTACT", label: "Contatos" },
  { value: "CONVERSATION", label: "Conversas" },
  { value: "MESSAGE", label: "Mensagens" },
  { value: "ACTIVITY", label: "Tarefas" },
  { value: "NOTE", label: "Notas" },
];

const ACTOR_OPTIONS = [
  { value: "ALL", label: "Todos os atores" },
  { value: "HUMAN", label: "Humanos" },
  { value: "AI", label: "Agentes IA" },
  { value: "AUTOMATION", label: "Automações" },
  { value: "INTEGRATION", label: "Integrações" },
  { value: "SYSTEM", label: "Sistema" },
];

const ENTITY_LABEL: Record<string, string> = {
  DEAL: "Negócio",
  CONTACT: "Contato",
  CONVERSATION: "Conversa",
  MESSAGE: "Mensagem",
  ACTIVITY: "Tarefa",
  NOTE: "Nota",
  TAG: "Tag",
};

const ACTOR_BADGE: Record<
  FeedEvent["actorType"] & string,
  { label: string; className: string }
> = {
  HUMAN: {
    label: "Humano",
    className:
      "bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]",
  },
  AI: {
    label: "IA",
    className: "bg-fuchsia-500/10 text-[var(--color-fuchsia)] dark:text-[var(--color-fuchsia)]",
  },
  AUTOMATION: {
    label: "Automação",
    className: "bg-purple-500/10 text-[var(--color-lavender)] dark:text-[var(--color-lavender)]",
  },
  INTEGRATION: {
    label: "Integração",
    className: "bg-sky-500/10 text-[var(--color-sky)] dark:text-[var(--color-sky)]",
  },
  SYSTEM: {
    label: "Sistema",
    className: "bg-[var(--glass-bg-overlay)] text-[var(--text-muted)]",
  },
};

// Ordem/cores dos KPIs por tipo de ator na aba Estatísticas (espelha ACTOR_BADGE).
const STATS_ACTOR_ORDER: { key: string; label: string; color: string }[] = [
  { key: "HUMAN", label: "Humanos", color: "var(--brand-primary)" },
  { key: "AI", label: "Agentes IA", color: "var(--color-fuchsia)" },
  { key: "AUTOMATION", label: "Automações", color: "var(--color-lavender)" },
  { key: "INTEGRATION", label: "Integrações", color: "var(--color-sky)" },
  { key: "SYSTEM", label: "Sistema", color: "var(--text-muted)" },
];

// Paleta cíclica das barras (Top tipos / Por entidade).
const BAR_PALETTE = [
  "var(--brand-primary)",
  "var(--color-success)",
  "var(--color-sky)",
  "var(--color-lavender)",
  "var(--color-fuchsia)",
  "var(--color-danger)",
];

// 6 colunas: Evento | Detalhe | Entidade | Origem | Responsável | Data.
// minmax garante largura mínima legível mesmo ao rolar lateralmente.
const FEED_GRID =
  "grid-cols-[minmax(160px,1.4fr)_minmax(180px,1.7fr)_minmax(150px,1.5fr)_minmax(150px,1.5fr)_minmax(120px,0.9fr)_minmax(90px,0.7fr)]";

type SortColumn = "evento" | "detalhe" | "entidade" | "origem" | "ator" | "data";

function resolveEntityId(ev: FeedEvent): string | null {
  const t = ev.entityType;
  if (t === "DEAL") return ev.dealId ?? ev.entityId ?? null;
  if (t === "CONTACT" || t === "MESSAGE")
    return ev.contactId ?? ev.entityId ?? null;
  if (t === "CONVERSATION") return ev.conversationId ?? ev.entityId ?? null;
  return ev.entityId ?? null;
}

function truncateId(id: string): string {
  if (id.length <= 10) return `#${id}`;
  return `#${id.slice(0, 8)}…`;
}

async function copyId(id: string) {
  try {
    await navigator.clipboard.writeText(id);
    toast.success("ID copiado", { description: id });
  } catch {
    toast.error("Não foi possível copiar o ID");
  }
}

interface OriginInfo {
  pill: "client" | "agent" | "channel" | null;
  primary: string | null;
  secondary: string | null;
}

const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  instagram: "Instagram",
  manual: "Manual",
  webhook: "Webhook",
  api: "API",
  automation: "Automação",
};

function resolveChannelLabel(raw: string): string {
  return CHANNEL_LABEL[raw.toLowerCase()] ?? raw;
}

function resolveOrigin(ev: FeedEvent): OriginInfo {
  // Mensagens: direção (cliente enviou / agente enviou)
  if (ev.type === "MESSAGE_RECEIVED") {
    const name = ev.contactName ?? ev.entityLabel ?? null;
    return { pill: "client", primary: name, secondary: null };
  }
  if (
    ev.type === "MESSAGE_SENT" ||
    ev.type === "SCHEDULED_MESSAGE_SENT" ||
    ev.type === "MESSAGE_FAILED"
  ) {
    const agent = ev.actorUser?.name ?? ev.actorLabel ?? null;
    const client =
      ev.contactName ??
      (typeof ev.meta?.contactName === "string" ? ev.meta.contactName : null) ??
      ev.entityLabel ??
      null;
    return {
      pill: "agent",
      primary: agent,
      secondary: client ? `Cliente: ${client}` : null,
    };
  }
  // Todos os outros eventos: mostrar canal se disponível no meta
  const rawChannel =
    typeof ev.meta?.channel === "string" ? ev.meta.channel : null;
  if (rawChannel) {
    return { pill: "channel", primary: resolveChannelLabel(rawChannel), secondary: null };
  }
  return { pill: null, primary: null, secondary: null };
}

export default function LogsClientPage() {
  const { ready, isManagerUp } = useRequireManager();
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState(0);
  const isFeed = activeTab === 0;
  const isCalls = activeTab === 1;

  // Aba Chamadas (histórico movido do ícone da nav rail para dentro de Logs).
  const callsWidget = useCallsWidget(sessionStatus === "authenticated");
  const queryClient = useQueryClient();
  const callsSyncMutation = useMutation({
    mutationFn: syncCalls,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["calls"] });
      if (res?.reason === "no_api4com_token") return;
      const total = (res?.created ?? 0) + (res?.updated ?? 0);
      if (total > 0) {
        toast.success(
          `Chamadas sincronizadas (${res.created} nova(s), ${res.updated} atualizada(s)).`,
        );
      }
    },
    onError: () => {
      toast.error("Não foi possível sincronizar as chamadas agora.");
    },
  });
  const [callsSearch, setCallsSearch] = React.useState<string>("");
  const [callsSearchDebounced, setCallsSearchDebounced] = React.useState<string>("");
  const [callsFilters, setCallsFilters] = React.useState<CallsFilterState>({});
  const [callsPage, setCallsPage] = React.useState<number>(1);
  const [callsSortBy, setCallsSortBy] = React.useState<
    ListCallsFilters["sortBy"]
  >("startedAt");
  const [callsSortDir, setCallsSortDir] = React.useState<
    ListCallsFilters["sortDir"]
  >("desc");
  React.useEffect(() => {
    const t = setTimeout(() => setCallsSearchDebounced(callsSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [callsSearch]);
  // Reset da paginação quando busca/filtros mudam.
  React.useEffect(() => {
    setCallsPage(1);
  }, [
    callsSearchDebounced,
    callsFilters.direction,
    callsFilters.status,
    callsFilters.dateFrom,
    callsFilters.dateTo,
  ]);

  const callsListFilters = React.useMemo<ListCallsFilters>(
    () => ({
      page: callsPage,
      perPage: 25,
      search: callsSearchDebounced || undefined,
      direction: callsFilters.direction,
      status: callsFilters.status,
      dateFrom: callsFilters.dateFrom,
      dateTo: callsFilters.dateTo,
      sortBy: callsSortBy,
      sortDir: callsSortDir,
    }),
    [
      callsPage,
      callsSearchDebounced,
      callsFilters,
      callsSortBy,
      callsSortDir,
    ],
  );

  // Total de chamadas para o contador da aba — mesma queryKey da lista, então
  // o cache é compartilhado com o CallHistoryList (sem fetch duplicado).
  const { data: callsData } = useQuery({
    queryKey: ["calls", callsListFilters],
    queryFn: () => listCalls(callsListFilters),
    enabled: callsWidget.enabled === true,
  });
  const callsTotal = callsData?.total;

  // Mini-dash da aba Chamadas — respeita busca/período (não filtra por direção
  // ou status, pois é justamente o breakdown desses eixos).
  const callsStatsFilters = React.useMemo(
    () => ({
      search: callsSearchDebounced || undefined,
      dateFrom: callsFilters.dateFrom,
      dateTo: callsFilters.dateTo,
    }),
    [callsSearchDebounced, callsFilters.dateFrom, callsFilters.dateTo],
  );
  const { data: callsStats } = useQuery({
    queryKey: ["calls-stats", callsStatsFilters],
    queryFn: () => getCallsStats(callsStatsFilters),
    enabled: callsWidget.enabled === true && isCalls,
  });

  // Sincronização é manual via menu de ações (não dispara toast ao abrir a aba).

  const [entity, setEntity] = React.useState<string>("ALL");
  const [actor, setActor] = React.useState<string>("ALL");
  const [q, setQ] = React.useState<string>("");
  const [qDebounced, setQDebounced] = React.useState<string>("");
  const [demo, setDemo] = React.useState<boolean>(false);
  const [limit, setLimit] = React.useState<number>(50);
  const [range, setRange] = React.useState<DateRange>({ from: null, to: null });
  const [stagePipelineId, setStagePipelineId] = React.useState<string | null>(null);
  const [stageFrom, setStageFrom] = React.useState<string[]>([]);
  const [stageTo, setStageTo] = React.useState<string[]>([]);

  React.useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const filters = React.useMemo<ActivityFeedFilters>(
    () => ({
      entityType: entity === "ALL" ? undefined : [entity],
      actorType: actor === "ALL" ? undefined : [actor],
      q: qDebounced || undefined,
      dateFrom: range.from ? format(range.from, "yyyy-MM-dd") : undefined,
      dateTo: range.to ? format(range.to, "yyyy-MM-dd") : undefined,
      stagePipelineId: stagePipelineId || undefined,
      stageFrom: stageFrom.length ? stageFrom : undefined,
      stageTo: stageTo.length ? stageTo : undefined,
      limit,
    }),
    [entity, actor, qDebounced, range, stagePipelineId, stageFrom, stageTo, limit],
  );

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useActivityFeed(filters);

  const realItems = React.useMemo(
    () => (data?.pages ?? []).flatMap((p) => p.items),
    [data],
  );

  const hasFilters =
    entity !== "ALL" ||
    actor !== "ALL" ||
    Boolean(q) ||
    Boolean(range.from) ||
    Boolean(stagePipelineId) ||
    stageFrom.length > 0 ||
    stageTo.length > 0;

  // Modo demonstração: ativo manualmente OU automaticamente quando não há
  // eventos reais e nenhum filtro aplicado (para visualizar todos os tipos).
  const isDemo =
    demo ||
    shouldAutoDemoEmpty({
      realCount: realItems.length,
      hasFilters,
      isLoading,
      isError,
    });

  const allItems = isDemo ? MOCK_FEED : realItems;

  const [sort, setSort] = React.useState<{ column: SortColumn; dir: Exclude<SortDir, null> }>(
    { column: "data", dir: "desc" },
  );

  const isDefaultSort = sort.column === "data" && sort.dir === "desc";

  const sortedFlat = React.useMemo(() => {
    if (isDefaultSort) return allItems;
    const arr = [...allItems];
    const dir = sort.dir === "asc" ? 1 : -1;
    const getKey = (ev: FeedEvent): string => {
      if (sort.column === "evento")
        return (EVENT_CONFIG[ev.type]?.label ?? ev.type).toLowerCase();
      if (sort.column === "detalhe") return eventDescription(ev).toLowerCase();
      if (sort.column === "entidade")
        return [
          ENTITY_LABEL[ev.entityType ?? ""] ?? ev.entityType ?? "",
          ev.entityLabel ?? "",
        ]
          .join(" ")
          .toLowerCase();
      if (sort.column === "origem") {
        const o = resolveOrigin(ev);
        return [o.pill ?? "", o.primary ?? ""].join(" ").toLowerCase();
      }
      if (sort.column === "ator")
        return (actorDisplay(ev).label ?? "").toLowerCase();
      return ev.occurredAt;
    };
    arr.sort((a, b) => {
      const ka = getKey(a);
      const kb = getKey(b);
      if (sort.column === "data") {
        return (
          (new Date(ka).getTime() - new Date(kb).getTime()) * dir
        );
      }
      return ka.localeCompare(kb, "pt-BR") * dir;
    });
    return arr;
  }, [allItems, sort, isDefaultSort]);

  const groups = React.useMemo(
    () => (isDefaultSort ? groupFeedByDay(allItems) : []),
    [allItems, isDefaultSort],
  );

  const toggleSort = (column: SortColumn) => {
    setSort((prev) =>
      prev.column === column
        ? { column, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { column, dir: column === "data" ? "desc" : "asc" },
    );
  };

  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !isFetchingNextPage) {
            void fetchNextPage();
          }
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const { data: stats, isLoading: statsLoading } = useActivityStats(!isFeed);

  if (ready && !isManagerUp) return <RestrictedScreen />;

  return (
    <div className="v2-screen grid min-w-0 grid-cols-[var(--nav-rail-w,72px)_1fr] gap-3 overflow-hidden p-3 sm:gap-4 sm:p-4">
      <NavRailSpacer />

      <main className="flex min-w-0 flex-col gap-3 overflow-hidden sm:gap-4">
        <PageHeader
          icon={<IconClipboardList size={22} stroke={2.2} />}
          title="Logs"
          center={
            isFeed ? (
              <FeedSearchFilterBar
                search={q}
                onSearch={setQ}
                entity={entity}
                onEntityChange={setEntity}
                actor={actor}
                onActorChange={setActor}
                range={range}
                onRangeChange={setRange}
                stagePipelineId={stagePipelineId}
                onStagePipelineChange={setStagePipelineId}
                stageFrom={stageFrom}
                onStageFromChange={setStageFrom}
                stageTo={stageTo}
                onStageToChange={setStageTo}
              />
            ) : isCalls && callsWidget.enabled === true ? (
              <div className="flex w-full justify-start">
                <CallsSearchFilterBar
                  search={callsSearch}
                  onSearch={setCallsSearch}
                  filters={callsFilters}
                  onFiltersChange={setCallsFilters}
                />
              </div>
            ) : undefined
          }
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <PageSegmentedControl
                size="compact"
                aria-label="Visão dos logs"
                items={LOG_TABS.map((label, index) => ({
                  value: String(index),
                  label:
                    index === 1 && typeof callsTotal === "number" ? (
                      <span className="inline-flex items-center gap-1.5">
                        {label}
                        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-primary)] px-1.5 font-display text-[10px] font-bold leading-none text-white">
                          {callsTotal.toLocaleString("pt-BR")}
                        </span>
                      </span>
                    ) : (
                      label
                    ),
                }))}
                value={String(activeTab)}
                onChange={(v) => setActiveTab(Number(v))}
              />
              {isFeed && (
                <FeedActionsMenu
                  demo={demo}
                  onToggleDemo={() => setDemo((d) => !d)}
                  hasFilters={hasFilters}
                  onClearFilters={() => {
                    setEntity("ALL");
                    setActor("ALL");
                    setQ("");
                    setRange({ from: null, to: null });
                    setStagePipelineId(null);
                    setStageFrom([]);
                    setStageTo([]);
                  }}
                />
              )}
              {isCalls && callsWidget.enabled === true && (
                <CallsActionsMenu
                  syncing={callsSyncMutation.isPending}
                  onSync={() => callsSyncMutation.mutate()}
                  onSettings={() => router.push("/widgets?configure=calls_history")}
                />
              )}
            </div>
          }
        />

        {isFeed ? (
          <>
            <FeedMiniDash items={allItems} />

            {isDemo && (
              <PageDemoBanner>
                Dados de exemplo — um evento de cada tipo para visualizar as
                variações visuais. Os eventos reais aparecerão aqui assim que
                ocorrerem.
              </PageDemoBanner>
            )}

            {isLoading && allItems.length === 0 ? (
              <div className="h-[400px] animate-pulse rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]" />
            ) : isError && !isDemo ? (
              <div className="rounded-[var(--radius-xl)] border border-[var(--color-danger)]/20 bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] p-6 text-center font-body text-[13px] text-[var(--color-danger-text)]">
                Não foi possível carregar o feed.
              </div>
            ) : allItems.length === 0 ? (
              <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-md shadow-[var(--glass-shadow)]">
                <EmptyState
                  icon={<IconClipboardList size={28} />}
                  title="Nenhum evento encontrado"
                  description={
                    hasFilters
                      ? "Sem resultados para os filtros atuais."
                      : "Os eventos da operação aparecerão aqui."
                  }
                />
              </div>
            ) : (
              /* Layout em cards (padrão Chamadas): cabeçalho solto + linhas
                 individuais com gap. Scroll horizontal se viewport < 960px. */
              <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
                <div className="flex min-w-[960px] flex-col gap-2">
                  <div
                    className={listTableHeadRowClass(
                      `${FEED_GRID} gap-3.5 border border-transparent px-4 py-2`,
                    )}
                  >
                    <SortableHeader
                      label="Evento"
                      sort={sort.column === "evento" ? sort.dir : null}
                      onSort={() => toggleSort("evento")}
                    />
                    <SortableHeader
                      label="Detalhe"
                      sort={sort.column === "detalhe" ? sort.dir : null}
                      onSort={() => toggleSort("detalhe")}
                    />
                    <SortableHeader
                      label="Entidade"
                      sort={sort.column === "entidade" ? sort.dir : null}
                      onSort={() => toggleSort("entidade")}
                    />
                    <SortableHeader
                      label="Origem"
                      sort={sort.column === "origem" ? sort.dir : null}
                      onSort={() => toggleSort("origem")}
                    />
                    <SortableHeader
                      label="Responsável"
                      sort={sort.column === "ator" ? sort.dir : null}
                      onSort={() => toggleSort("ator")}
                    />
                    <SortableHeader
                      label="Data"
                      sort={sort.column === "data" ? sort.dir : null}
                      onSort={() => toggleSort("data")}
                      align="right"
                    />
                  </div>

                  {!isDefaultSort && hasNextPage && (
                    <div className="px-1 font-body text-[11px] italic text-[var(--text-muted)]">
                      Ordenando eventos carregados — role para carregar mais.
                    </div>
                  )}

                  {isDefaultSort
                    ? groups.map(([dayKey, dayItems]) => (
                        <div key={dayKey} className="flex flex-col gap-2">
                          <div className="flex items-center justify-between px-1 pt-1">
                            <span className="shrink-0 font-display text-[11px] font-bold text-[var(--text-secondary)]">
                              {dayLabel(dayItems[0].occurredAt)}
                            </span>
                            <span className="shrink-0 font-display text-[11px] font-medium text-[var(--text-muted)]">
                              {dayItems.length} evento
                              {dayItems.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          {dayItems.map((ev) => (
                            <EventCard key={ev.id} event={ev} />
                          ))}
                        </div>
                      ))
                    : sortedFlat.map((ev) => (
                        <EventCard key={ev.id} event={ev} />
                      ))}

                  <div ref={sentinelRef} className="h-1" />
                  {isFetchingNextPage && (
                    <div className="flex items-center justify-center py-4 text-[13px] text-[var(--text-muted)]">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Carregando mais...
                    </div>
                  )}
                  {!hasNextPage && allItems.length > 0 && (
                    <p className="pb-2 pt-2 text-center text-[11px] text-[var(--text-muted)]/70">
                      Fim do histórico.
                    </p>
                  )}
                </div>
              </div>
            )}

            {!isLoading && !isError && allItems.length > 0 && (
              <PaginationGlass
                label={`${allItems.length.toLocaleString("pt-BR")} eventos carregados`}
                showNav={false}
                perPage={limit}
                perPageOptions={[25, 50, 100, 200]}
                onPerPageChange={setLimit}
              />
            )}
          </>
        ) : isCalls ? (
          callsWidget.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-md"
                />
              ))}
            </div>
          ) : callsWidget.enabled !== true ? (
            <CallsNotEnabledState />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <CallsMiniDash stats={callsStats} />
              <CallHistoryList
                groupByDay
                filters={callsListFilters}
                onFiltersChange={(f) => {
                  if (f.page !== undefined) setCallsPage(f.page);
                  if (f.sortBy !== undefined) setCallsSortBy(f.sortBy);
                  if (f.sortDir !== undefined) setCallsSortDir(f.sortDir);
                }}
              />
            </div>
          )
        ) : (
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto pr-1">
            {statsLoading || !stats ? (
              <div className="flex items-center justify-center py-16 text-[13px] text-[var(--text-muted)]">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Calculando estatísticas...
              </div>
            ) : (
              <div className="space-y-4">
                {/* KPIs por tipo de ator — Total destacado em brand */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                  <ActorKpi total value={stats.totals.total} />
                  {STATS_ACTOR_ORDER.map((a) => (
                    <ActorKpi
                      key={a.key}
                      label={a.label}
                      value={stats.totals.byActorType[a.key] ?? 0}
                      color={a.color}
                    />
                  ))}
                </div>

                {/* Top tipos de evento + Por entidade — barras proporcionais */}
                <div className="grid gap-3 lg:grid-cols-2">
                  <StatBarPanel
                    title="Top tipos de evento"
                    caption="30 dias"
                    rows={stats.totals.byType.map((r, i) => ({
                      label: EVENT_CONFIG[r.type]?.label ?? r.type,
                      value: r.count,
                      color: BAR_PALETTE[i % BAR_PALETTE.length],
                    }))}
                  />
                  <StatBarPanel
                    title="Por entidade"
                    caption="30 dias"
                    rows={Object.entries(stats.totals.byEntityType).map(
                      ([k, v], i) => ({
                        label: ENTITY_LABEL[k] ?? k,
                        value: v,
                        color: BAR_PALETTE[i % BAR_PALETTE.length],
                      }),
                    )}
                  />
                </div>

                <EventsPerDay rows={stats.timeline} />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Mini-dash de chamadas — 4 KPIs (feitas, recebidas, atendidas %, completadas %)
type CallsStatsSnapshot = {
  total: number;
  inbound: number;
  outbound: number;
  answered: number;
  completed: number;
};

function CallsMiniDash({ stats }: { stats: CallsStatsSnapshot | undefined }) {
  const s = stats ?? { total: 0, inbound: 0, outbound: 0, answered: 0, completed: 0 };
  const pct = (n: number) =>
    s.total > 0 ? Math.round((n / s.total) * 100) : 0;

  const cards: {
    key: string;
    label: string;
    value: number;
    percent?: number;
    accent: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: "outbound",
      label: "Ligações feitas",
      value: s.outbound,
      accent: "var(--brand-primary)",
      icon: <IconPhoneOutgoing size={16} />,
    },
    {
      key: "inbound",
      label: "Ligações recebidas",
      value: s.inbound,
      accent: "var(--color-success)",
      icon: <IconPhoneIncoming size={16} />,
    },
    {
      key: "answered",
      label: "Atendidas",
      value: s.answered,
      percent: pct(s.answered),
      accent: "var(--color-warning)",
      icon: <IconPhoneCall size={16} />,
    },
    {
      key: "completed",
      label: "Completadas",
      value: s.completed,
      percent: pct(s.completed),
      accent: "var(--brand-secondary, #a78bfa)",
      icon: <IconPhoneCheck size={16} />,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <div className="font-display text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
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

function CallsNotEnabledState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-12 text-center shadow-[var(--glass-shadow-sm)] backdrop-blur-md">
      <IconPhone size={36} className="text-[var(--text-muted)]" />
      <p className="font-display text-[16px] font-bold text-[var(--text-primary)]">
        Módulo de Telefonia não habilitado
      </p>
      <p className="max-w-md font-body text-[13px] text-[var(--text-muted)]">
        O histórico de chamadas, o softphone integrado e o botão de ligar nos
        cards fazem parte do widget de Telefonia. Ative-o na Central de Widgets
        para liberar esta área.
      </p>
      <Link
        href="/widgets"
        className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-primary)] px-4 py-2 font-display text-[13px] font-bold text-white transition-all hover:-translate-y-px"
      >
        Ir para a Central de Widgets
      </Link>
    </div>
  );
}

function EventCard({ event }: { event: FeedEvent }) {
  const cfg = EVENT_CONFIG[event.type] ?? FALLBACK_CONFIG;
  const Icon = cfg.Icon;
  const detail = eventDescription(event);
  const actor = actorDisplay(event);
  const badge = ACTOR_BADGE[actor.type] ?? ACTOR_BADGE.SYSTEM;

  // Evita duplicar o nome do contato: quando o rótulo da entidade é o
  // mesmo do ator (ex.: "Mensagem recebida" → entidade e ator são o
  // contato), mostramos só o TIPO da entidade na coluna Entidade.
  const actorNorm = (actor.label ?? "").trim().toLowerCase();
  const entityLabelText =
    event.entityLabel && event.entityLabel.trim().toLowerCase() !== actorNorm
      ? event.entityLabel
      : null;

  const entityId = resolveEntityId(event);
  const origin = resolveOrigin(event);

  return (
    <div
      className={`grid ${FEED_GRID} items-center gap-3.5 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-4 py-3 shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:shadow-[var(--glass-shadow)]`}
    >
      {/* Coluna: Evento */}
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ${cfg.ring} ${cfg.bg}`}
        >
          <Icon size={14} />
        </span>
        <span className="truncate font-display text-[13px] font-semibold text-[var(--text-primary)]">
          {cfg.label}
        </span>
      </div>

      {/* Coluna: Detalhe */}
      <span className="block truncate font-display text-[12.5px] text-[var(--text-secondary)]">
        {detail || "—"}
      </span>

      {/* Coluna: Entidade — pill clicável (quando há link) + copy ID + copy link */}
      <div className="min-w-0">
        <EntityCell
          entityType={event.entityType ?? null}
          entityLabel={entityLabelText}
          entityId={entityId}
        />
      </div>

      {/* Coluna: Origem — canal em pill com ícone dedicado (WhatsApp, IG, etc.) */}
      <div className="min-w-0">
        <OriginCell origin={origin} />
      </div>

      {/* Coluna: Responsável */}
      <div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-display text-[11px] font-semibold ${badge.className}`}
        >
          {actor.label}
        </span>
      </div>

      {/* Coluna: Data */}
      <div className="text-right">
        <EventDate iso={event.occurredAt} />
      </div>
    </div>
  );
}

// ── Célula de Entidade ──────────────────────────────────────────────────────
// Padrão: pill do tipo + nome truncável. Quando há link canônico (DEAL,
// CONTACT, CONVERSATION, MESSAGE) a pill vira Link e ganha um botão de
// "copiar link" ao lado do "copiar ID".

function entityHref(entityType: string | null, entityId: string): string | null {
  if (!entityType || !entityId) return null;
  switch (entityType) {
    case "DEAL":
      return `/deals/${entityId}`;
    case "CONTACT":
      return `/contacts/${entityId}`;
    case "CONVERSATION":
    case "MESSAGE":
      return `/inbox?conversation=${entityId}`;
    case "ACTIVITY":
      return `/activities/${entityId}`;
    default:
      return null;
  }
}

const ENTITY_PILL_STYLE: Record<
  string,
  { className: string; icon: React.ReactNode }
> = {
  DEAL: {
    className:
      "bg-[color-mix(in_srgb,var(--brand-primary)_14%,transparent)] text-[var(--brand-primary-dark)]",
    icon: <IconBriefcase size={11} />,
  },
  CONTACT: {
    className:
      "bg-[color-mix(in_srgb,var(--color-info)_14%,transparent)] text-[var(--color-info)]",
    icon: <IconUsers size={11} />,
  },
  CONVERSATION: {
    className:
      "bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)] text-[var(--color-success)]",
    icon: <IconMessageCircle size={11} />,
  },
  MESSAGE: {
    className:
      "bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)] text-[var(--color-success)]",
    icon: <IconMessageCircle size={11} />,
  },
  ACTIVITY: {
    className:
      "bg-[color-mix(in_srgb,var(--color-warning)_16%,transparent)] text-[var(--color-warning)]",
    icon: <IconChecklist size={11} />,
  },
  NOTE: {
    className: "bg-[var(--glass-bg-overlay)] text-[var(--text-secondary)]",
    icon: <IconClipboardList size={11} />,
  },
  TAG: {
    className: "bg-[var(--glass-bg-overlay)] text-[var(--text-secondary)]",
    icon: null,
  },
};

async function copyEntityLink(path: string) {
  try {
    const url = new URL(path, window.location.origin).toString();
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado", { description: url });
  } catch {
    toast.error("Não foi possível copiar o link");
  }
}

function EntityCell({
  entityType,
  entityLabel,
  entityId,
}: {
  entityType: string | null;
  entityLabel: string | null;
  entityId: string | null;
}) {
  if (!entityType && !entityLabel) {
    return (
      <span className="font-display text-[12.5px] text-[var(--text-muted)]">
        —
      </span>
    );
  }

  const style = (entityType && ENTITY_PILL_STYLE[entityType]) || {
    className: "bg-[var(--glass-bg-overlay)] text-[var(--text-muted)]",
    icon: null as React.ReactNode,
  };
  const label = entityType ? ENTITY_LABEL[entityType] ?? entityType : null;
  const href = entityType && entityId ? entityHref(entityType, entityId) : null;

  const pill = (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-[0.04em] transition-transform",
        style.className,
        href && "hover:-translate-y-px hover:brightness-95",
      )}
    >
      {style.icon}
      {label}
      {href && <IconExternalLink size={9} className="opacity-70" />}
    </span>
  );

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="flex min-w-0 items-center gap-1.5">
        {href ? (
          <Link
            href={href}
            title={`Abrir ${label?.toLowerCase()}`}
            className="shrink-0"
          >
            {pill}
          </Link>
        ) : (
          pill
        )}
        {entityLabel && (
          <span className="min-w-0 truncate font-display text-[12.5px] text-[var(--text-secondary)]">
            {entityLabel}
          </span>
        )}
      </span>
      {entityId && (
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => void copyId(entityId)}
            title={`Copiar ID: ${entityId}`}
            className="inline-flex w-fit items-center gap-1 rounded px-1 py-0.5 font-mono text-[10px] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-secondary)]"
          >
            <span>{truncateId(entityId)}</span>
            <IconCopy size={10} />
          </button>
          {href && (
            <button
              type="button"
              onClick={() => void copyEntityLink(href)}
              title="Copiar link"
              className="inline-flex items-center rounded p-0.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)]"
            >
              <IconLink size={11} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Célula de Origem ────────────────────────────────────────────────────────
// Pill com ícone dedicado por canal (WhatsApp, IG, Facebook, etc). Para
// mensagens (cliente/agente) mantém a pill neutra existente.

const CHANNEL_STYLE: Record<
  string,
  { icon: React.ReactNode; className: string }
> = {
  whatsapp: {
    icon: <IconBrandWhatsapp size={11} />,
    className:
      "bg-[color-mix(in_srgb,#25D366_16%,transparent)] text-[#128C4A]",
  },
  instagram: {
    icon: <IconBrandInstagram size={11} />,
    className:
      "bg-[color-mix(in_srgb,#DD2A7B_14%,transparent)] text-[#C13584]",
  },
  facebook: {
    icon: <IconBrandFacebook size={11} />,
    className:
      "bg-[color-mix(in_srgb,#1877F2_14%,transparent)] text-[#1877F2]",
  },
  telegram: {
    icon: <IconBrandTelegram size={11} />,
    className:
      "bg-[color-mix(in_srgb,#0088CC_14%,transparent)] text-[#0088CC]",
  },
  email: {
    icon: <IconMail size={11} />,
    className:
      "bg-[color-mix(in_srgb,var(--color-info)_14%,transparent)] text-[var(--color-info)]",
  },
  webhook: {
    icon: <IconActivity size={11} />,
    className: "bg-[var(--glass-bg-overlay)] text-[var(--text-secondary)]",
  },
  api: {
    icon: <IconActivity size={11} />,
    className: "bg-[var(--glass-bg-overlay)] text-[var(--text-secondary)]",
  },
  manual: {
    icon: null,
    className: "bg-[var(--glass-bg-overlay)] text-[var(--text-secondary)]",
  },
  automation: {
    icon: <IconActivity size={11} />,
    className:
      "bg-[color-mix(in_srgb,var(--color-warning)_16%,transparent)] text-[var(--color-warning)]",
  },
};

function OriginCell({ origin }: { origin: OriginInfo }) {
  if (!origin.pill) {
    return (
      <span className="font-display text-[12.5px] text-[var(--text-muted)]">
        —
      </span>
    );
  }

  let pillNode: React.ReactNode = null;
  if (origin.pill === "client") {
    pillNode = (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-display text-[10px] font-bold bg-[color-mix(in_srgb,var(--color-info)_14%,transparent)] text-[var(--color-info)]">
        Cliente
      </span>
    );
  } else if (origin.pill === "agent") {
    pillNode = (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-display text-[10px] font-bold bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)] text-[var(--color-success)]">
        Agente
      </span>
    );
  } else {
    const key = (origin.primary ?? "").toLowerCase();
    const style = CHANNEL_STYLE[key] ?? {
      icon: <IconActivity size={11} />,
      className: "bg-[var(--glass-bg-overlay)] text-[var(--text-secondary)]",
    };
    pillNode = (
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-display text-[10px] font-bold",
          style.className,
        )}
      >
        {style.icon}
        {origin.primary}
      </span>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="flex min-w-0 items-center gap-1.5">
        {pillNode}
        {origin.pill !== "channel" && origin.primary && (
          <span className="min-w-0 truncate font-display text-[12.5px] text-[var(--text-secondary)]">
            {origin.primary}
          </span>
        )}
      </span>
      {origin.secondary && (
        <span className="truncate font-display text-[11px] text-[var(--text-muted)]">
          {origin.secondary}
        </span>
      )}
    </div>
  );
}

// ── Mini-dash de Eventos ────────────────────────────────────────────────────
// Mesmo padrão do mini-dash de Chamadas: 4 KPIs derivados do lote carregado.

function FeedMiniDash({ items }: { items: FeedEvent[] }) {
  const stats = React.useMemo(() => {
    let messages = 0;
    let conversations = 0;
    let deals = 0;
    for (const ev of items) {
      const t = ev.entityType;
      if (t === "MESSAGE") messages++;
      else if (t === "CONVERSATION") conversations++;
      else if (t === "DEAL") deals++;
    }
    return { total: items.length, messages, conversations, deals };
  }, [items]);

  const cards: {
    key: string;
    label: string;
    value: number;
    accent: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: "total",
      label: "Total de eventos",
      value: stats.total,
      accent: "var(--brand-primary)",
      icon: <IconActivity size={16} />,
    },
    {
      key: "messages",
      label: "Mensagens",
      value: stats.messages,
      accent: "var(--color-success)",
      icon: <IconMessageCircle size={16} />,
    },
    {
      key: "conversations",
      label: "Conversas",
      value: stats.conversations,
      accent: "var(--color-info)",
      icon: <IconUsers size={16} />,
    },
    {
      key: "deals",
      label: "Negócios",
      value: stats.deals,
      accent: "var(--brand-secondary, #a78bfa)",
      icon: <IconBriefcase size={16} />,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <div className="font-display text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
              {c.label}
            </div>
            <div className="font-display text-[22px] font-bold leading-none text-[var(--text-primary)] tabular-nums">
              {c.value.toLocaleString("pt-BR")}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EventDate({ iso }: { iso: string }) {
  const d = parseISO(iso);
  const isToday = isSameDay(d, new Date());
  if (isToday) {
    return (
      <span className="font-display tabular-nums text-[12.5px] text-[var(--text-muted)]">
        {format(d, "HH:mm", { locale: ptBR })}
      </span>
    );
  }
  return (
    <span className="flex flex-col items-end gap-0">
      <span className="font-display tabular-nums text-[12.5px] text-[var(--text-secondary)]">
        {format(d, "dd MMM", { locale: ptBR })}
      </span>
      <span className="font-display tabular-nums text-[11px] text-[var(--text-muted)]">
        {format(d, "HH:mm", { locale: ptBR })}
      </span>
    </span>
  );
}

function dayLabel(iso: string): string {
  const d = parseISO(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Hoje";
  if (sameDay(d, yesterday)) return "Ontem";
  return format(d, "EEEE, dd 'de' MMMM", { locale: ptBR });
}

function ActorKpi({
  label,
  value,
  color,
  total,
}: {
  label?: string;
  value: number;
  color?: string;
  total?: boolean;
}) {
  if (total) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-[var(--brand-primary)] bg-[var(--brand-primary)] p-4 text-white shadow-[0_6px_20px_rgba(91,111,245,0.35)]">
        <p className="font-display text-[26px] font-bold leading-none tabular-nums">
          {value.toLocaleString("pt-BR")}
        </p>
        <p className="mt-1.5 font-body text-[11.5px] text-white/85">
          Total de eventos
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-4 backdrop-blur-md shadow-[var(--glass-shadow-sm)]">
      <p className="font-display text-[26px] font-bold leading-none tabular-nums text-[var(--text-primary)]">
        {value.toLocaleString("pt-BR")}
      </p>
      <p className="mt-1.5 flex items-center gap-1.5 font-body text-[11.5px] text-[var(--text-muted)]">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        {label}
      </p>
    </div>
  );
}

function StatBarPanel({
  title,
  caption,
  rows,
}: {
  title: string;
  caption?: string;
  rows: { label: string; value: number; color: string }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-md shadow-[var(--glass-shadow)]">
      <div className="flex items-center justify-between border-b border-[var(--glass-border-subtle)] px-4 py-3">
        <h3 className="font-display text-[13px] font-bold text-[var(--text-primary)]">
          {title}
        </h3>
        {caption && (
          <span className="font-body text-[11px] text-[var(--text-muted)]">
            {caption}
          </span>
        )}
      </div>
      <ul className="px-4 py-2">
        {rows.length === 0 ? (
          <li className="py-3 text-center font-body text-[12px] text-[var(--text-muted)]">
            Sem dados no período.
          </li>
        ) : (
          rows.map((r) => (
            <li
              key={r.label}
              className="grid grid-cols-[minmax(110px,150px)_1fr_auto] items-center gap-3 py-1.5"
            >
              <span className="truncate font-body text-[12.5px] text-[var(--text-secondary)]">
                {r.label}
              </span>
              <div className="h-2 rounded-full bg-[var(--glass-bg-overlay)]">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${(r.value / max) * 100}%`,
                    backgroundColor: r.color,
                  }}
                />
              </div>
              <span className="w-12 text-right font-display text-[13px] font-bold tabular-nums text-[var(--text-primary)]">
                {r.value.toLocaleString("pt-BR")}
              </span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

// ── Feed: busca + popover de filtros (padrão Contatos/Empresas) ─────────────

type FeedFilterTab = "entidade" | "ator" | "periodo" | "transicao";

const FEED_FILTER_TABS: {
  id: FeedFilterTab;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "entidade",
    label: "Entidade",
    icon: <IconBuildingCommunity size={14} stroke={2.2} />,
  },
  { id: "ator", label: "Ator", icon: <IconUsers size={14} stroke={2.2} /> },
  {
    id: "periodo",
    label: "Período",
    icon: <IconCalendarEvent size={14} stroke={2.2} />,
  },
  {
    id: "transicao",
    label: "Fase",
    icon: <IconArrowsExchange size={14} stroke={2.2} />,
  },
];

type PipelineWithStagesLite = {
  id: string;
  name: string;
  stages: { id: string; name: string }[];
};

function usePipelinesLite(enabled: boolean) {
  return useQuery<PipelineWithStagesLite[]>({
    queryKey: ["logs-pipelines-lite"],
    queryFn: async () => {
      const res = await fetch("/api/pipelines");
      if (!res.ok) throw new Error("Falha ao carregar pipelines");
      return res.json();
    },
    enabled,
    staleTime: 60_000,
  });
}

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-primary)] px-1 font-display text-[10px] font-bold leading-none text-white">
      {count}
    </span>
  );
}

function FeedSearchFilterBar({
  search,
  onSearch,
  entity,
  onEntityChange,
  actor,
  onActorChange,
  range,
  onRangeChange,
  stagePipelineId,
  onStagePipelineChange,
  stageFrom,
  onStageFromChange,
  stageTo,
  onStageToChange,
}: {
  search: string;
  onSearch: (v: string) => void;
  entity: string;
  onEntityChange: (v: string) => void;
  actor: string;
  onActorChange: (v: string) => void;
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
  stagePipelineId: string | null;
  onStagePipelineChange: (v: string | null) => void;
  stageFrom: string[];
  onStageFromChange: (v: string[]) => void;
  stageTo: string[];
  onStageToChange: (v: string[]) => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<FeedFilterTab>("entidade");

  const stageTransitionActive =
    Boolean(stagePipelineId) || stageFrom.length > 0 || stageTo.length > 0;

  const activeCount =
    (entity !== "ALL" ? 1 : 0) +
    (actor !== "ALL" ? 1 : 0) +
    (range.from || range.to ? 1 : 0) +
    (stageTransitionActive ? 1 : 0);

  const { data: pipelines = [] } = usePipelinesLite(open && tab === "transicao");
  const currentPipeline = React.useMemo(
    () => pipelines.find((p) => p.id === stagePipelineId) ?? null,
    [pipelines, stagePipelineId],
  );

  const toggleStageId = (
    current: string[],
    id: string,
    setter: (v: string[]) => void,
  ) => {
    if (current.includes(id)) setter(current.filter((x) => x !== id));
    else setter([...current, id]);
  };

  React.useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const tabBadge = (id: FeedFilterTab) => {
    if (id === "entidade") return entity !== "ALL" ? 1 : 0;
    if (id === "ator") return actor !== "ALL" ? 1 : 0;
    if (id === "periodo") return range.from || range.to ? 1 : 0;
    if (id === "transicao")
      return (
        (stagePipelineId ? 1 : 0) +
        (stageFrom.length > 0 ? 1 : 0) +
        (stageTo.length > 0 ? 1 : 0)
      );
    return 0;
  };

  function clearAll() {
    onEntityChange("ALL");
    onActorChange("ALL");
    onRangeChange({ from: null, to: null });
    onStagePipelineChange(null);
    onStageFromChange([]);
    onStageToChange([]);
  }

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
        placeholder="Pesquisar e filtrar eventos..."
        aria-label="Buscar e filtrar eventos"
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
                Filtros
              </span>
              <CountBadge count={activeCount} />
            </div>
            <button
              type="button"
              onClick={clearAll}
              disabled={activeCount === 0}
              className="flex items-center gap-1 font-display text-[12px] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--brand-primary)] disabled:opacity-40"
            >
              <IconRotateClockwise size={13} /> Limpar
            </button>
          </div>

          <div className="px-4 pb-3">
            <div
              role="tablist"
              aria-label="Seções do filtro"
              className="flex items-center gap-0.5 rounded-full bg-[var(--glass-bg-strong)] p-1"
            >
              {FEED_FILTER_TABS.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-1.5 font-display text-[12px] font-bold transition-all",
                      active
                        ? "bg-[var(--glass-bg-modal,#fff)] text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                    )}
                  >
                    <span
                      className={
                        active ? "text-[var(--brand-primary)]" : undefined
                      }
                    >
                      {t.icon}
                    </span>
                    {t.label}
                    <CountBadge count={tabBadge(t.id)} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="max-h-[min(60vh,420px)] overflow-y-auto px-4 pb-3">
            {tab === "entidade" && (
              <div className="flex flex-wrap gap-1.5">
                {ENTITY_OPTIONS.map((opt) => {
                  const selected = entity === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onEntityChange(opt.value)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-display text-[12px] font-bold transition-colors",
                        selected
                          ? "border-[var(--brand-primary)] bg-[var(--color-primary-soft)] text-[var(--brand-primary)]"
                          : "border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-overlay)]",
                      )}
                    >
                      {selected && <IconCheck size={12} stroke={2.4} />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}

            {tab === "ator" && (
              <div className="flex flex-wrap gap-1.5">
                {ACTOR_OPTIONS.map((opt) => {
                  const selected = actor === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onActorChange(opt.value)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-display text-[12px] font-bold transition-colors",
                        selected
                          ? "border-[var(--brand-primary)] bg-[var(--color-primary-soft)] text-[var(--brand-primary)]"
                          : "border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-overlay)]",
                      )}
                    >
                      {selected && <IconCheck size={12} stroke={2.4} />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}

            {tab === "periodo" && (
              <div className="flex flex-col gap-2">
                <p className="font-display text-[11px] font-semibold text-[var(--text-muted)]">
                  Intervalo de datas
                </p>
                <DateRangePicker value={range} onChange={onRangeChange} />
              </div>
            )}

            {tab === "transicao" && (
              <div className="flex flex-col gap-3">
                <div className="rounded-[12px] border border-[var(--brand-primary)]/25 bg-[var(--color-primary-soft)] px-3 py-2 font-body text-[11.5px] leading-snug text-[var(--brand-primary-dark)]">
                  Filtra apenas eventos de <b>mudança de fase</b>. Combina com
                  período e ator selecionados. Escolha o funil e, opcionalmente,
                  as fases de <b>origem</b> e <b>destino</b>.
                </div>

                <div>
                  <p className="mb-1.5 font-display text-[11px] font-semibold text-[var(--text-muted)]">
                    Funil
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onStagePipelineChange(null);
                        onStageFromChange([]);
                        onStageToChange([]);
                      }}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-display text-[12px] font-bold transition-colors",
                        !stagePipelineId
                          ? "border-[var(--brand-primary)] bg-[var(--color-primary-soft)] text-[var(--brand-primary)]"
                          : "border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-overlay)]",
                      )}
                    >
                      {!stagePipelineId && <IconCheck size={12} stroke={2.4} />}
                      Todos
                    </button>
                    {pipelines.map((p) => {
                      const selected = stagePipelineId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            onStagePipelineChange(p.id);
                            onStageFromChange([]);
                            onStageToChange([]);
                          }}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-display text-[12px] font-bold transition-colors",
                            selected
                              ? "border-[var(--brand-primary)] bg-[var(--color-primary-soft)] text-[var(--brand-primary)]"
                              : "border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-overlay)]",
                          )}
                        >
                          {selected && <IconCheck size={12} stroke={2.4} />}
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {currentPipeline && (
                  <>
                    <StagePicker
                      label="De (fase de origem)"
                      hint="Vazio = qualquer fase de origem"
                      stages={currentPipeline.stages}
                      selected={stageFrom}
                      onToggle={(id) =>
                        toggleStageId(stageFrom, id, onStageFromChange)
                      }
                      onClear={() => onStageFromChange([])}
                    />
                    <StagePicker
                      label="Para (fase de destino)"
                      hint="Vazio = qualquer fase de destino"
                      stages={currentPipeline.stages}
                      selected={stageTo}
                      onToggle={(id) =>
                        toggleStageId(stageTo, id, onStageToChange)
                      }
                      onClear={() => onStageToChange([])}
                    />
                  </>
                )}

                {!currentPipeline && pipelines.length > 0 && (
                  <p className="rounded-[10px] border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-3 py-3 text-center font-body text-[11.5px] text-[var(--text-muted)]">
                    Selecione um funil acima para escolher as fases de origem
                    e destino.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StagePicker({
  label,
  hint,
  stages,
  selected,
  onToggle,
  onClear,
}: {
  label: string;
  hint: string;
  stages: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="font-display text-[11px] font-semibold text-[var(--text-muted)]">
          {label}
        </p>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="font-display text-[10.5px] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--brand-primary)]"
          >
            limpar ({selected.length})
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {stages.map((s) => {
          const on = selected.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onToggle(s.id)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-display text-[11.5px] font-bold transition-colors",
                on
                  ? "border-[var(--brand-primary)] bg-[var(--color-primary-soft)] text-[var(--brand-primary)]"
                  : "border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-overlay)]",
              )}
            >
              {on && <IconCheck size={11} stroke={2.4} />}
              {s.name}
            </button>
          );
        })}
      </div>
      <p className="mt-1 font-body text-[10.5px] italic text-[var(--text-muted)]">
        {hint}
      </p>
    </div>
  );
}

/** Menu hamburger do Feed — Limpar filtros + Modo demonstração. */
function FeedActionsMenu({
  demo,
  onToggleDemo,
  hasFilters,
  onClearFilters,
}: {
  demo: boolean;
  onToggleDemo: () => void;
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  return (
    <PageActionsMenu
      items={[
        {
          icon: <IconX size={13} />,
          label: "Limpar filtros",
          onClick: onClearFilters,
          disabled: !hasFilters,
          primary: false,
        },
        {
          icon: <IconTestPipe size={13} />,
          label: demo ? "Desativar modo demo" : "Ativar modo demo",
          onClick: onToggleDemo,
          active: demo,
          divider: true,
        },
      ]}
    />
  );
}

/** Menu hamburger padrão Contatos/Empresas — Sincronizar + Configurações. */
function CallsActionsMenu({
  syncing,
  onSync,
  onSettings,
}: {
  syncing: boolean;
  onSync: () => void;
  onSettings: () => void;
}) {
  return (
    <PageActionsMenu
      items={[
        {
          icon: (
            <IconRefresh
              size={13}
              className={syncing ? "animate-spin" : undefined}
            />
          ),
          label: syncing ? "Sincronizando…" : "Sincronizar",
          onClick: onSync,
          disabled: syncing,
          primary: true,
        },
        {
          icon: <IconSettings size={13} />,
          label: "Configurações",
          onClick: onSettings,
          divider: true,
        },
      ]}
    />
  );
}

function EventsPerDay({ rows }: { rows: { day: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <section className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-md shadow-[var(--glass-shadow)]">
      <div className="flex items-center justify-between border-b border-[var(--glass-border-subtle)] px-4 py-3">
        <h3 className="font-display text-[13px] font-bold text-[var(--text-primary)]">
          Eventos por dia
        </h3>
        <span className="font-body text-[11px] text-[var(--text-muted)]">
          {rows.length} dias
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="py-8 text-center font-body text-[12px] text-[var(--text-muted)]">
          Sem eventos no período.
        </p>
      ) : (
        <div className="flex h-[180px] items-end gap-1.5 px-4 pb-3 pt-5">
          {rows.map((r) => (
            <div
              key={r.day}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
              title={`${r.day}: ${r.count}`}
            >
              <span className="font-display text-[10px] font-bold tabular-nums text-[var(--text-secondary)]">
                {r.count}
              </span>
              <div
                className="w-full max-w-[26px] rounded-t-md bg-gradient-to-b from-[var(--brand-primary)] to-[color-mix(in_srgb,var(--brand-primary)_55%,#fff)]"
                style={{ height: `${(r.count / max) * 100}%` }}
              />
              <span className="font-mono text-[9px] text-[var(--text-muted)]">
                {r.day.length > 5 ? r.day.slice(5) : r.day}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
