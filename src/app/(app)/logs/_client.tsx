"use client";

import * as React from "react";
import { IconLoader2 as Loader2 } from "@tabler/icons-react";
import {
  IconClipboardList,
  IconCopy,
} from "@tabler/icons-react";
import { format, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { RestrictedScreen } from "@/components/crm/restricted-screen";
import { useRequireManager } from "@/hooks/use-user-role";
import { PageHeader } from "@/components/crm/page-header";
import {
  PAGE_FILTER_DROPDOWN_CLASS,
  PageFilterBar,
  PageSearchBar,
  PageSegmentedControl,
} from "@/components/crm/page-toolbar";
import { PaginationGlass } from "@/components/crm/pagination-glass";
import {
  listTableHeadRowClass,
  SortableHeader,
  type SortDir,
} from "@/components/crm/sortable-header";
import { Button } from "@/components/ui/button";
import { DropdownGlass } from "@/components/crm/dropdown-glass";
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

const LOG_TABS = ["Feed", "Estatísticas (30d)"] as const;

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
  const [activeTab, setActiveTab] = React.useState(0);
  const isFeed = activeTab === 0;

  const [entity, setEntity] = React.useState<string>("ALL");
  const [actor, setActor] = React.useState<string>("ALL");
  const [q, setQ] = React.useState<string>("");
  const [qDebounced, setQDebounced] = React.useState<string>("");
  const [demo, setDemo] = React.useState<boolean>(false);
  const [limit, setLimit] = React.useState<number>(50);
  const [range, setRange] = React.useState<DateRange>({ from: null, to: null });

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
      limit,
    }),
    [entity, actor, qDebounced, range, limit],
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
    entity !== "ALL" || actor !== "ALL" || Boolean(q) || Boolean(range.from);

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
      <NavRailV2 />

      <main className="flex min-w-0 flex-col gap-3 overflow-hidden sm:gap-4">
        <PageHeader
          icon={<IconClipboardList size={22} stroke={2.2} />}
          title="Logs"
          description="Histórico completo da operação — humanos, IA, automações e integrações."
          center={
            isFeed ? (
              <PageSearchBar
                variant="compact"
                value={q}
                onChange={setQ}
                placeholder="Buscar evento, lead, ator..."
                aria-label="Buscar eventos"
              />
            ) : undefined
          }
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <PageSegmentedControl
                size="compact"
                aria-label="Visão dos logs"
                items={LOG_TABS.map((label, index) => ({
                  value: String(index),
                  label,
                }))}
                value={String(activeTab)}
                onChange={(v) => setActiveTab(Number(v))}
              />
            </div>
          }
        />

        {isFeed ? (
          <>
            <PageFilterBar className="toolbar-hscroll max-w-full flex-nowrap overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible">
              <DropdownGlass
                options={ENTITY_OPTIONS}
                value={entity}
                onValueChange={(v) => setEntity(v)}
                menuLabel="Entidade"
                triggerClassName={PAGE_FILTER_DROPDOWN_CLASS}
              />
              <DropdownGlass
                options={ACTOR_OPTIONS}
                value={actor}
                onValueChange={(v) => setActor(v)}
                menuLabel="Responsável"
                triggerClassName={PAGE_FILTER_DROPDOWN_CLASS}
              />
              <DateRangePicker value={range} onChange={setRange} />
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEntity("ALL");
                    setActor("ALL");
                    setQ("");
                    setRange({ from: null, to: null });
                  }}
                >
                  Limpar
                </Button>
              )}
            </PageFilterBar>

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
              /* Outer card: ocupa largura disponível sem vazar da viewport */
              <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-1.5 backdrop-blur-md shadow-[var(--glass-shadow)]">
                {/* Scroll horizontal: ativa quando viewport < 960px */}
                <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
                  {/* Conteúdo interno com largura mínima — header + linhas rolam juntos */}
                  <div className="flex min-h-0 min-w-[960px] flex-1 flex-col">
                    <div className={listTableHeadRowClass(FEED_GRID)}>
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
                      <div className="mb-2 px-1 font-body text-[11px] italic text-[var(--text-muted)]">
                        Ordenando eventos carregados — role para carregar mais.
                      </div>
                    )}

                    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
                      {isDefaultSort
                        ? groups.map(([dayKey, dayItems]) => (
                            <React.Fragment key={dayKey}>
                              <div className="flex items-center gap-2.5 px-1 pb-1 pt-3 first:pt-1">
                                <span className="shrink-0 font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                                  {dayLabel(dayItems[0].occurredAt)}
                                </span>
                                <span className="h-px flex-1 bg-[var(--glass-border-subtle)]" />
                              </div>
                              {dayItems.map((ev) => (
                                <EventCard key={ev.id} event={ev} />
                              ))}
                            </React.Fragment>
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
        ) : (
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto pr-1">
            {statsLoading || !stats ? (
              <div className="flex items-center justify-center py-16 text-[13px] text-[var(--text-muted)]">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Calculando estatísticas...
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <StatCard label="Total de eventos" value={stats.totals.total} />
                  {Object.entries(stats.totals.byActorType).map(([k, v]) => (
                    <StatCard key={k} label={`Por ${k}`} value={v} />
                  ))}
                </div>

                <StatTable
                  title="Top tipos de evento"
                  rows={stats.totals.byType.map((r) => ({
                    label: EVENT_CONFIG[r.type]?.label ?? r.type,
                    value: r.count,
                  }))}
                />

                <StatTable
                  title="Por entidade"
                  rows={Object.entries(stats.totals.byEntityType).map(
                    ([k, v]) => ({ label: ENTITY_LABEL[k] ?? k, value: v }),
                  )}
                />

                <section className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-md shadow-[var(--glass-shadow)]">
                  <h3 className="border-b border-[var(--glass-border-subtle)] px-4 py-3 font-display text-[13px] font-bold text-[var(--text-primary)]">
                    Eventos por dia
                  </h3>
                  <ul>
                    {stats.timeline.map((r) => {
                      const max = Math.max(
                        1,
                        ...stats.timeline.map((x) => x.count),
                      );
                      return (
                        <li
                          key={r.day}
                          className="flex items-center gap-3 border-b border-[var(--glass-border-subtle)] px-4 py-2 text-[13px] last:border-0"
                        >
                          <span className="w-24 font-mono text-[11px] text-[var(--text-muted)]">
                            {r.day}
                          </span>
                          <div className="h-2 flex-1 rounded bg-[var(--glass-bg-overlay)]">
                            <div
                              className="h-2 rounded bg-[var(--brand-primary)]"
                              style={{ width: `${(r.count / max) * 100}%` }}
                            />
                          </div>
                          <span className="w-12 text-right font-display tabular-nums text-[var(--text-primary)]">
                            {r.count}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </div>
            )}
          </div>
        )}
      </main>
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
      className={`grid ${FEED_GRID} items-center gap-3.5 border-b border-[var(--glass-border-subtle)] px-3.5 py-2.5 transition-colors last:border-b-0 hover:bg-[var(--glass-bg-overlay)]`}
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

      {/* Coluna: Entidade */}
      <div className="min-w-0">
        {entityLabelText || event.entityType ? (
          <div className="flex min-w-0 flex-col gap-0.5">
            {/* Tipo (pill) + nome (truncável) na mesma linha */}
            <span className="flex min-w-0 items-center gap-1.5">
              {event.entityType && (
                <span className="shrink-0 rounded px-1.5 py-0.5 font-display text-[10px] font-bold uppercase tracking-[0.05em] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)]">
                  {ENTITY_LABEL[event.entityType] ?? event.entityType}
                </span>
              )}
              {entityLabelText && (
                <span className="min-w-0 truncate font-display text-[12.5px] text-[var(--text-secondary)]">
                  {entityLabelText}
                </span>
              )}
            </span>
            {entityId && (
              <button
                type="button"
                onClick={() => void copyId(entityId)}
                title={`Copiar ID: ${entityId}`}
                className="inline-flex w-fit items-center gap-1 rounded px-1 py-0.5 font-mono text-[10px] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-secondary)]"
              >
                <span>{truncateId(entityId)}</span>
                <IconCopy size={10} />
              </button>
            )}
          </div>
        ) : (
          <span className="font-display text-[12.5px] text-[var(--text-muted)]">—</span>
        )}
      </div>

      {/* Coluna: Origem */}
      <div className="min-w-0">
        {origin.pill ? (
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-display text-[10px] font-bold ${
                  origin.pill === "client"
                    ? "bg-[color-mix(in_srgb,var(--color-info)_14%,transparent)] text-[var(--color-info)]"
                    : origin.pill === "agent"
                    ? "bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)] text-[var(--color-success)]"
                    : "bg-[var(--glass-bg-overlay)] text-[var(--text-muted)]"
                }`}
              >
                {origin.pill === "client"
                  ? "Cliente"
                  : origin.pill === "agent"
                  ? "Agente"
                  : origin.primary ?? "Canal"}
              </span>
              {/* Para client/agent: mostrar o nome ao lado da pill */}
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
        ) : (
          <span className="font-display text-[12.5px] text-[var(--text-muted)]">—</span>
        )}
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-4 backdrop-blur-md shadow-[var(--glass-shadow)]">
      <p className="font-body text-[12px] text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 font-display text-[24px] font-bold tabular-nums text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

function StatTable({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: number }[];
}) {
  return (
    <section className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-md shadow-[var(--glass-shadow)]">
      <h3 className="border-b border-[var(--glass-border-subtle)] px-4 py-3 font-display text-[13px] font-bold text-[var(--text-primary)]">
        {title}
      </h3>
      <ul>
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex items-center justify-between border-b border-[var(--glass-border-subtle)] px-4 py-2 text-[13px] last:border-0"
          >
            <span className="font-body text-[var(--text-secondary)]">
              {r.label}
            </span>
            <span className="font-display tabular-nums text-[var(--text-primary)]">
              {r.value}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
