"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { PageHeader } from "@/components/crm/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownGlass } from "@/components/crm/dropdown-glass";
import {
  FeedDayHeader,
  FeedRow,
  groupFeedByDay,
} from "@/components/crm/feed";
import { useActivityFeed } from "@/features/activity-feed/use-activity-feed";
import type { ActivityFeedFilters } from "@/features/activity-feed/api";
import { useActivityStats } from "@/features/activity-feed/use-activity-stats";

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

interface LogsClientPageProps {
  navRail?: React.ReactNode;
}

export default function LogsClientPage({ navRail }: LogsClientPageProps = {}) {
  const [tab, setTab] = React.useState<"feed" | "stats">("feed");
  const [entity, setEntity] = React.useState<string>("ALL");
  const [actor, setActor] = React.useState<string>("ALL");
  const [q, setQ] = React.useState<string>("");
  const [qDebounced, setQDebounced] = React.useState<string>("");

  React.useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const filters = React.useMemo<ActivityFeedFilters>(
    () => ({
      entityType: entity === "ALL" ? undefined : [entity],
      actorType: actor === "ALL" ? undefined : [actor],
      q: qDebounced || undefined,
      limit: 80,
    }),
    [entity, actor, qDebounced],
  );

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useActivityFeed(filters);

  const allItems = React.useMemo(
    () => (data?.pages ?? []).flatMap((p) => p.items),
    [data],
  );

  const groups = React.useMemo(() => groupFeedByDay(allItems), [allItems]);

  // IntersectionObserver para scroll infinito
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

  const { data: stats, isLoading: statsLoading } = useActivityStats(tab === "stats");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {navRail && <aside className="shrink-0 p-3">{navRail}</aside>}
      <main className="flex-1 overflow-hidden flex flex-col">
        <PageHeader
          title="Logs"
          description="Histórico completo da operação — humanos, IA, automações e integrações."
        />

        <div className="flex items-center gap-2 px-6 pb-2 pt-1">
          <Button
            variant={tab === "feed" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTab("feed")}
          >
            Feed
          </Button>
          <Button
            variant={tab === "stats" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTab("stats")}
          >
            Estatísticas (30d)
          </Button>
        </div>

        {tab === "stats" ? (
          <div className="scrollbar-thin flex-1 overflow-y-auto px-6 pb-10">
            {statsLoading || !stats ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Calculando estatísticas…
              </div>
            ) : (
              <div className="space-y-6 pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-lg border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Total de eventos</p>
                    <p className="text-2xl font-semibold mt-1">{stats.totals.total}</p>
                  </div>
                  {Object.entries(stats.totals.byActorType).map(([k, v]) => (
                    <div key={k} className="rounded-lg border bg-card p-4">
                      <p className="text-xs text-muted-foreground">Por {k}</p>
                      <p className="text-2xl font-semibold mt-1">{v}</p>
                    </div>
                  ))}
                </div>

                <section>
                  <h3 className="text-sm font-semibold mb-2">Top tipos de evento</h3>
                  <ul className="rounded-lg border bg-card divide-y">
                    {stats.totals.byType.map((r) => (
                      <li
                        key={r.type}
                        className="px-4 py-2 flex justify-between text-sm"
                      >
                        <span className="font-mono text-xs">{r.type}</span>
                        <span className="tabular-nums">{r.count}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h3 className="text-sm font-semibold mb-2">Por entidade</h3>
                  <ul className="rounded-lg border bg-card divide-y">
                    {Object.entries(stats.totals.byEntityType).map(([k, v]) => (
                      <li key={k} className="px-4 py-2 flex justify-between text-sm">
                        <span>{k}</span>
                        <span className="tabular-nums">{v}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h3 className="text-sm font-semibold mb-2">Eventos por dia</h3>
                  <ul className="rounded-lg border bg-card divide-y">
                    {stats.timeline.map((r) => (
                      <li
                        key={r.day}
                        className="px-4 py-2 flex items-center gap-3 text-sm"
                      >
                        <span className="font-mono text-xs w-24">{r.day}</span>
                        <div className="flex-1 h-2 bg-muted rounded">
                          <div
                            className="h-2 bg-primary rounded"
                            style={{
                              width: `${Math.min(
                                100,
                                (r.count /
                                  Math.max(
                                    1,
                                    ...stats.timeline.map((x) => x.count),
                                  )) *
                                  100,
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="tabular-nums w-12 text-right">
                          {r.count}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            )}
          </div>
        ) : (
          <>
        <div className="flex flex-wrap items-center gap-3 px-6 pb-3">
          <Input
            placeholder="Buscar evento, lead, ator…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-64"
          />
          <DropdownGlass
            options={ENTITY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={entity}
            onValueChange={setEntity}
            menuLabel="Entidade"
            triggerClassName="min-w-[180px]"
          />
          <DropdownGlass
            options={ACTOR_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={actor}
            onValueChange={setActor}
            menuLabel="Ator"
            triggerClassName="min-w-[180px]"
          />
          {(entity !== "ALL" || actor !== "ALL" || q) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEntity("ALL");
                setActor("ALL");
                setQ("");
              }}
            >
              Limpar
            </Button>
          )}
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto px-6 pb-10">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Carregando feed…
            </div>
          ) : isError ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Não foi possível carregar o feed.
            </div>
          ) : groups.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Nenhum evento encontrado com os filtros atuais.
            </div>
          ) : (
            <div className="space-y-8 pt-2">
              {groups.map(([dayKey, dayItems]) => (
                <div key={dayKey}>
                  <FeedDayHeader isoDate={dayItems[0].occurredAt} />
                  <ul>
                    {dayItems.map((ev, idx) => (
                      <FeedRow
                        key={ev.id}
                        event={ev}
                        withRail
                        isLast={idx === dayItems.length - 1}
                      />
                    ))}
                  </ul>
                </div>
              ))}

              <div ref={sentinelRef} className="h-10" />
              {isFetchingNextPage && (
                <div className="flex items-center justify-center py-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Carregando mais…
                </div>
              )}
              {!hasNextPage && allItems.length > 0 && (
                <p className="pt-2 pb-6 text-center text-xs text-muted-foreground/70">
                  Fim do histórico.
                </p>
              )}
            </div>
          )}
        </div>
          </>
        )}
      </main>
    </div>
  );
}
