"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { IconClipboardList } from "@tabler/icons-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { RestrictedScreen } from "@/components/crm/restricted-screen";
import { useRequireManager } from "@/hooks/use-user-role";
import { PageHeader } from "@/components/crm/page-header";
import { SearchInput } from "@/components/crm/search-input";
import { Button } from "@/components/ui/button";
import { DropdownGlass } from "@/components/crm/dropdown-glass";
import { DateRangePicker, type DateRange } from "@/components/crm/date-range-picker";
import { TabsGlass } from "@/components/crm/tabs-glass";
import { EmptyState } from "@/components/crm/empty-state";
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
    className: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
  },
  AUTOMATION: {
    label: "Automação",
    className: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  INTEGRATION: {
    label: "Integração",
    className: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  SYSTEM: {
    label: "Sistema",
    className: "bg-[var(--glass-bg-overlay)] text-[var(--text-muted)]",
  },
};

type TableVariant = "grid" | "divided" | "zebra";

const VARIANT_OPTIONS: { value: TableVariant; label: string; hint: string }[] = [
  { value: "grid", label: "Grade", hint: "Bordas em linhas e colunas" },
  { value: "divided", label: "Divisores", hint: "Linhas verticais sutis" },
  { value: "zebra", label: "Zebra", hint: "Faixas alternadas, sem grade" },
];

export default function LogsClientPage() {
  const { ready, isManagerUp } = useRequireManager();
  const [activeTab, setActiveTab] = React.useState(0);
  const isFeed = activeTab === 0;

  const [entity, setEntity] = React.useState<string>("ALL");
  const [actor, setActor] = React.useState<string>("ALL");
  const [q, setQ] = React.useState<string>("");
  const [qDebounced, setQDebounced] = React.useState<string>("");
  const [demo, setDemo] = React.useState<boolean>(false);
  const [variant, setVariant] = React.useState<TableVariant>("grid");
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
      limit: 80,
    }),
    [entity, actor, qDebounced, range],
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
    demo || (!isLoading && !isError && realItems.length === 0 && !hasFilters);

  const allItems = isDemo ? MOCK_FEED : realItems;

  const groups = React.useMemo(() => groupFeedByDay(allItems), [allItems]);

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
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />

      <main className="flex min-w-0 flex-col gap-4 overflow-hidden">
        <PageHeader
          icon={<IconClipboardList size={22} />}
          title="Logs"
          description="Histórico completo da operação — humanos, IA, automações e integrações."
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsGlass
            tabs={["Feed", "Estatísticas (30d)"]}
            activeTab={activeTab}
            onChange={setActiveTab}
            className="max-w-[320px]"
          />
          {isFeed && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-0.5 backdrop-blur-md">
                {VARIANT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    title={opt.hint}
                    onClick={() => setVariant(opt.value)}
                    className={`rounded-[var(--radius-md)] px-2.5 py-1 font-display text-[12px] font-bold transition-colors ${
                      variant === opt.value
                        ? "bg-[var(--brand-primary)] text-[var(--brand-on-primary,#fff)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <Button
                variant={isDemo ? "default" : "ghost"}
                size="sm"
                onClick={() => setDemo((v) => !v)}
              >
                {isDemo ? "Modo demonstração ativo" : "Ver dados de exemplo"}
              </Button>
            </div>
          )}
        </div>

        {isFeed ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <SearchInput
                value={q}
                onChange={setQ}
                placeholder="Buscar evento, lead, ator..."
              />
              <DropdownGlass
                options={ENTITY_OPTIONS}
                value={entity}
                onValueChange={setEntity}
                menuLabel="Entidade"
                triggerClassName="min-w-[180px]"
              />
              <DropdownGlass
                options={ACTOR_OPTIONS}
                value={actor}
                onValueChange={setActor}
                menuLabel="Ator"
                triggerClassName="min-w-[180px]"
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
            </div>

            {isDemo && (
              <div className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--brand-primary)]/20 bg-[var(--color-enterprise-bg)] px-3 py-2 font-body text-[12px] text-[var(--brand-primary)]">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)]" />
                Dados de exemplo — um evento de cada tipo para visualizar as
                variações visuais. Os eventos reais aparecerão aqui assim que
                ocorrerem.
              </div>
            )}

            {isLoading && allItems.length === 0 ? (
              <div className="h-[400px] animate-pulse rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]" />
            ) : isError ? (
              <div className="rounded-[var(--radius-xl)] border border-[var(--color-danger)]/20 bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] p-6 text-center font-body text-[13px] text-[var(--color-danger-text)]">
                Não foi possível carregar o feed.
              </div>
            ) : groups.length === 0 ? (
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
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-md shadow-[var(--glass-shadow)]">
                <div className="scrollbar-thin min-h-0 flex-1 overflow-auto">
                  <table className="w-full table-fixed border-collapse">
                    <colgroup>
                      <col className="w-[22%]" />
                      <col className="w-[30%]" />
                      <col className="w-[28%]" />
                      <col className="w-[12%]" />
                      <col className="w-[8%]" />
                    </colgroup>
                    <thead className="sticky top-0 z-10 bg-[var(--bg-base)] shadow-[0_1px_0_var(--glass-border)]">
                      <tr className="border-b border-[var(--glass-border)]">
                        <Th variant={variant}>Evento</Th>
                        <Th variant={variant}>Detalhe</Th>
                        <Th variant={variant}>Entidade</Th>
                        <Th variant={variant}>Ator</Th>
                        <Th variant={variant} last className="text-right">
                          Data
                        </Th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map(([dayKey, dayItems]) => (
                        <React.Fragment key={dayKey}>
                          <tr className="sticky top-[41px] z-[5]">
                            <td
                              colSpan={5}
                              className="border-y border-[var(--glass-border-subtle)] bg-[var(--bg-base)] px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]"
                            >
                              {dayLabel(dayItems[0].occurredAt)}
                            </td>
                          </tr>
                          {dayItems.map((ev, i) => (
                            <EventRow
                              key={ev.id}
                              event={ev}
                              variant={variant}
                              index={i}
                            />
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>

                  <div ref={sentinelRef} className="h-10" />
                  {isFetchingNextPage && (
                    <div className="flex items-center justify-center py-4 text-[13px] text-[var(--text-muted)]">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Carregando mais...
                    </div>
                  )}
                  {!hasNextPage && allItems.length > 0 && (
                    <p className="pb-6 pt-2 text-center text-[11px] text-[var(--text-muted)]/70">
                      Fim do histórico.
                    </p>
                  )}
                </div>
              </div>
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

function EventRow({
  event,
  variant,
  index,
}: {
  event: FeedEvent;
  variant: TableVariant;
  index: number;
}) {
  const cfg = EVENT_CONFIG[event.type] ?? FALLBACK_CONFIG;
  const Icon = cfg.Icon;
  const detail = eventDescription(event);
  const actor = actorDisplay(event);
  const badge = ACTOR_BADGE[actor.type] ?? ACTOR_BADGE.SYSTEM;

  // Borda vertical entre colunas para "grid" e "divided".
  const colDivider =
    variant === "zebra"
      ? ""
      : "border-r border-[var(--glass-border-subtle)]";
  // Borda horizontal entre linhas apenas em "grid".
  const rowDivider =
    variant === "grid"
      ? "border-b border-[var(--glass-border-subtle)]"
      : variant === "divided"
        ? "border-b border-[var(--glass-border-subtle)]/60"
        : "";
  // Faixas alternadas em "zebra".
  const zebra =
    variant === "zebra" && index % 2 === 1
      ? "bg-[var(--glass-bg-subtle)]/50"
      : "";

  return (
    <tr
      className={`${rowDivider} ${zebra} last:border-b-0 transition-colors hover:bg-[var(--glass-bg-overlay)]`}
    >
      <td className={`px-3 py-2.5 ${colDivider}`}>
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ${cfg.ring} ${cfg.bg}`}
          >
            <Icon size={15} />
          </span>
          <span className="truncate font-display text-[13px] font-bold text-[var(--text-primary)]">
            {cfg.label}
          </span>
        </div>
      </td>
      <td className={`px-3 py-2.5 ${colDivider}`}>
        <span className="block truncate font-body text-[13px] text-[var(--text-secondary)]">
          {detail || "—"}
        </span>
      </td>
      <td className={`px-3 py-2.5 ${colDivider}`}>
        {event.entityLabel || event.entityType ? (
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            {event.entityType && (
              <span className="shrink-0 font-display text-[11px] font-bold uppercase tracking-[0.04em] text-[var(--text-muted)]">
                {ENTITY_LABEL[event.entityType] ?? event.entityType}
              </span>
            )}
            {event.entityLabel && (
              <span className="truncate font-body text-[12px] text-[var(--text-secondary)]">
                {event.entityLabel}
              </span>
            )}
          </span>
        ) : (
          <span className="text-[13px] text-[var(--text-muted)]">—</span>
        )}
      </td>
      <td className={`px-3 py-2.5 ${colDivider}`}>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 font-display text-[11px] font-bold ${badge.className}`}
        >
          {actor.label}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right">
        <span className="font-display tabular-nums text-[12px] text-[var(--text-muted)]">
          {format(parseISO(event.occurredAt), "HH:mm", { locale: ptBR })}
        </span>
      </td>
    </tr>
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

function Th({
  children,
  className,
  variant,
  last,
}: {
  children?: React.ReactNode;
  className?: string;
  variant: TableVariant;
  last?: boolean;
}) {
  const colDivider =
    variant === "zebra" || last
      ? ""
      : "border-r border-[var(--glass-border-subtle)]";
  return (
    <th
      className={`px-3 py-3 text-left font-display text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)] ${colDivider} ${className ?? ""}`}
    >
      {children}
    </th>
  );
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
