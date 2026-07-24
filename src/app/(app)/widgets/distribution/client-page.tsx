"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import {
  IconAdjustmentsHorizontal,
  IconAlertTriangle,
  IconCheck,
  IconCircleCheck,
  IconClockExclamation,
  IconLoader2,
  IconPencil,
  IconPlayerPlay,
  IconRefresh,
  IconRotateClockwise,
  IconRoute,
  IconSearch,
  IconTag,
  IconUserCheck,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { NavRailSpacer } from "@/components/crm/nav-rail-spacer";
import { RestrictedScreen } from "@/components/crm/restricted-screen";
import { useRequireManager } from "@/hooks/use-user-role";
import { PageHeader } from "@/components/crm/page-header";
import { PageActionsMenu, PageSegmentedControl } from "@/components/crm/page-toolbar";
import { PageDemoBanner } from "@/components/crm/page-demo-banner";
import { EmptyState } from "@/components/crm/empty-state";
import { ListColumnLabel, listTableHeadRowClass } from "@/components/crm/sortable-header";
import { cn } from "@/lib/utils";
import { useWidgets } from "@/features/widgets/hooks";
import {
  useDistributionResponsibles,
  usePendingDistributions,
  useRetryPending,
  useSetAgentStatus,
  useSimulateDistribution,
  useUpdateResponsible,
} from "@/features/distribution/hooks";
import {
  BLOCK_REASON_LABELS,
  type DistributionResponsibleDto,
  type DistributionResult,
  type PendingDistributionDto,
} from "@/features/distribution/types";
import {
  useDepartments,
  useUpdateDepartment,
} from "@/features/conversations-settings/hooks/use-departments";
import {
  MOCK_DISTRIBUTION_PENDING,
  MOCK_DISTRIBUTION_RESPONSIBLES,
} from "@/features/distribution/mock";
import { isPageMockMode, shouldAutoDemoEmpty } from "@/lib/page-mock-mode";

const SMART_DISTRIBUTION_SLUG = "smart_distribution";

type DistributionView = "team" | "queue";

/** Presença efetiva de um responsável (para badge + filtro). */
type PresenceKey = "ONLINE" | "AWAY" | "OFFLINE" | "INACTIVE";
function classifyPresence(r: DistributionResponsibleDto): PresenceKey {
  if (!r.participates) return "INACTIVE";
  if (r.paused) return "AWAY";
  return (r.status ?? "OFFLINE") === "ONLINE" ? "ONLINE" : r.status === "AWAY" ? "AWAY" : "OFFLINE";
}

interface DistributionClientPageProps {
  navRail?: React.ReactNode;
}

export default function DistributionClientPage({
  navRail,
}: DistributionClientPageProps = {}) {
  const { data: session, status: sessionStatus } = useSession();
  const { ready: roleReady, isManagerUp } = useRequireManager();
  const isAuthenticated = sessionStatus === "authenticated";
  const currentUserId = session?.user?.id ?? null;
  const role = session?.user?.role;
  const canManage = role === "ADMIN" || role === "MANAGER";

  const widgetsQuery = useWidgets(isAuthenticated);

  const widgetInstalled =
    widgetsQuery.data?.items.find((w) => w.slug === SMART_DISTRIBUTION_SLUG)?.installed ??
    false;

  const respQuery = useDistributionResponsibles(
    isAuthenticated && (isPageMockMode() || widgetInstalled),
  );
  const pendingQuery = usePendingDistributions(
    isAuthenticated && (isPageMockMode() || widgetInstalled),
  );
  const simulateMut = useSimulateDistribution();
  const retryMut = useRetryPending();

  const [editing, setEditing] = useState<DistributionResponsibleDto | null>(null);
  const [simResult, setSimResult] = useState<DistributionResult | null>(null);

  // ── Estado de UI: aba, busca, filtros ──
  const [view, setView] = useState<DistributionView>("team");
  const [search, setSearch] = useState("");
  const [presence, setPresence] = useState<PresenceKey[]>([]);
  const [eligibility, setEligibility] = useState<("eligible" | "blocked")[]>([]);
  const [types, setTypes] = useState<string[]>([]);

  const realResponsibles = respQuery.data?.responsibles ?? [];
  const realPending = pendingQuery.data?.pending ?? [];
  const useDemo =
    isPageMockMode() ||
    shouldAutoDemoEmpty({
      realCount: realResponsibles.length,
      hasFilters: false,
      isLoading:
        widgetsQuery.isLoading ||
        ((isPageMockMode() || widgetInstalled) && respQuery.isLoading),
      isError: !!respQuery.error,
    }) ||
    (!widgetsQuery.isLoading && !widgetInstalled);

  const smartInstalled = useDemo || widgetInstalled;

  const responsibles = useDemo
    ? MOCK_DISTRIBUTION_RESPONSIBLES.responsibles
    : realResponsibles;
  const pending = useDemo ? MOCK_DISTRIBUTION_PENDING.pending : realPending;

  const typeOptions = useMemo(
    () =>
      Array.from(
        new Set(responsibles.map((r) => r.type).filter((t): t is string => !!t)),
      ).sort(),
    [responsibles],
  );

  const hasFilters =
    search.trim().length > 0 ||
    presence.length > 0 ||
    eligibility.length > 0 ||
    types.length > 0;

  const filteredResponsibles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return responsibles.filter((r) => {
      if (q) {
        const hay = `${r.name ?? ""} ${r.email ?? ""} ${r.type ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (presence.length > 0 && !presence.includes(classifyPresence(r))) return false;
      if (eligibility.length === 1) {
        if (eligibility[0] === "eligible" && !r.eligible) return false;
        if (eligibility[0] === "blocked" && r.eligible) return false;
      }
      if (types.length > 0 && (!r.type || !types.includes(r.type))) return false;
      return true;
    });
  }, [responsibles, search, presence, eligibility, types]);

  const clearFilters = () => {
    setSearch("");
    setPresence([]);
    setEligibility([]);
    setTypes([]);
  };

  const handleRetry = () => {
    retryMut.mutate(undefined, {
      onSuccess: (res) => {
        if (res.resolved > 0) {
          toast.success(`${res.resolved} lead(s) distribuído(s).`);
        } else if (res.pending > 0) {
          toast.warning("Ainda não há responsável elegível para a fila.");
        } else {
          toast.info("Fila de espera vazia.");
        }
      },
      onError: (e) => toast.error(e.message || "Erro ao reprocessar a fila."),
    });
  };

  const handleTest = () => {
    simulateMut.mutate(undefined, {
      onSuccess: (res) => {
        setSimResult(res);
        if (res.success) {
          toast.success(
            `Distribuição apontaria para ${res.selectedUserName ?? "um responsável"}.`,
          );
        } else if (res.reason === "NO_ELIGIBLE_RESPONSIBLE") {
          toast.warning("Nenhum responsável elegível no momento.");
        } else {
          toast.error("Módulo de Distribuição não habilitado.");
        }
      },
      onError: (e) => toast.error(e.message || "Erro ao simular distribuição."),
    });
  };

  if (roleReady && !isManagerUp) return <RestrictedScreen />;

  const showContent =
    !widgetsQuery.isLoading &&
    smartInstalled &&
    !(!useDemo && respQuery.isLoading) &&
    !(!useDemo && respQuery.error);

  return (
    <div className="v2-screen grid min-w-0 grid-cols-[var(--nav-rail-w,72px)_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] gap-3 overflow-hidden p-3 sm:gap-4 sm:p-4">
      {navRail ?? <NavRailSpacer />}

      <main className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden pb-3 sm:gap-4 sm:pb-4">
        <PageHeader
          icon={<IconRoute size={22} />}
          title="Distribuição"
          center={
            smartInstalled ? (
              <DistributionSearchFilterBar
                search={search}
                onSearch={setSearch}
                presence={presence}
                onPresenceChange={setPresence}
                eligibility={eligibility}
                onEligibilityChange={setEligibility}
                types={types}
                onTypesChange={setTypes}
                typeOptions={typeOptions}
                onClearAll={clearFilters}
              />
            ) : undefined
          }
          actions={
            smartInstalled ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <PageSegmentedControl
                  size="compact"
                  aria-label="Visão da distribuição"
                  items={[
                    {
                      value: "team",
                      label: (
                        <SegLabel label="Equipe" count={responsibles.length} />
                      ),
                    },
                    {
                      value: "queue",
                      label: (
                        <SegLabel
                          label="Fila de espera"
                          count={pending.length}
                          tone={pending.length > 0 ? "warn" : "muted"}
                        />
                      ),
                    },
                  ]}
                  value={view}
                  onChange={(v) => setView(v as DistributionView)}
                />
                <DistributionActionsMenu
                  onTest={handleTest}
                  testing={simulateMut.isPending}
                  onRetry={handleRetry}
                  retrying={retryMut.isPending}
                  canRetry={pending.length > 0}
                  hasFilters={hasFilters}
                  onClearFilters={clearFilters}
                />
              </div>
            ) : undefined
          }
        />

        {widgetsQuery.isLoading ? (
          <SkeletonState />
        ) : !smartInstalled ? (
          <NotEnabledState />
        ) : !useDemo && respQuery.isLoading ? (
          <SkeletonState />
        ) : !useDemo && respQuery.error ? (
          <ErrorState message={respQuery.error.message} />
        ) : (
          showContent && (
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden sm:gap-4">
              {useDemo && (
                <PageDemoBanner>
                  Dados de exemplo — equipe, fila e elegibilidade ilustrativas para o módulo de distribuição.
                </PageDemoBanner>
              )}

              <DistributionMiniDash responsibles={responsibles} pending={pending} />

              {simResult && (
                <SimulationPanel result={simResult} onClose={() => setSimResult(null)} />
              )}

              {view === "team" && canManage && !useDemo && (
                <DepartmentsDistributionPanel />
              )}

              {view === "team" ? (
                <ResponsiblesCardList
                  responsibles={filteredResponsibles}
                  total={responsibles.length}
                  hasFilters={hasFilters}
                  onClearFilters={clearFilters}
                  currentUserId={currentUserId}
                  canManage={canManage}
                  onEdit={(r) => setEditing(r)}
                />
              ) : (
                <PendingQueueCards
                  pending={pending}
                  onRetry={handleRetry}
                  retrying={retryMut.isPending}
                  loading={pendingQuery.isLoading}
                />
              )}
            </div>
          )
        )}
      </main>

      {editing && (
        <EditResponsibleDialog
          responsible={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ── Label das pills (com contador) ──────────────────────────────────────
function SegLabel({
  label,
  count,
  tone = "brand",
}: {
  label: string;
  count: number;
  tone?: "brand" | "warn" | "muted";
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      <span
        className={cn(
          "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1.5 font-display text-[10px] font-bold leading-none",
          tone === "warn"
            ? "bg-[var(--color-warn,#d97706)] text-white"
            : tone === "muted"
              ? "bg-[var(--glass-border-subtle)] text-[var(--text-muted)]"
              : "bg-[var(--brand-primary)] text-white",
        )}
      >
        {count}
      </span>
    </span>
  );
}

// ── Mini-dash ────────────────────────────────────────────────────────────

function DistributionMiniDash({
  responsibles,
  pending,
}: {
  responsibles: DistributionResponsibleDto[];
  pending: PendingDistributionDto[];
}) {
  const stats = useMemo(() => {
    const participating = responsibles.filter((r) => r.participates);
    const eligible = responsibles.filter((r) => r.eligible).length;
    const blocked = participating.length - eligible;
    const inService = responsibles.reduce((acc, r) => acc + (r.queueCount ?? 0), 0);
    const waiting = pending.length;
    // Taxa de cobertura: elegíveis / participantes (capacidade de receber agora).
    const coverage =
      participating.length > 0
        ? Math.round((eligible / participating.length) * 100)
        : 0;
    // Taxa de sucesso da distribuição: distribuídos / (distribuídos + aguardando).
    const successRate =
      inService + waiting > 0
        ? Math.round((inService / (inService + waiting)) * 100)
        : 100;
    return { eligible, blocked, inService, waiting, coverage, successRate };
  }, [responsibles, pending]);

  const cards: {
    key: string;
    label: string;
    value: number;
    percent?: number;
    accent: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: "eligible",
      label: "Elegíveis agora",
      value: stats.eligible,
      percent: stats.coverage,
      accent: "var(--color-success)",
      icon: <IconUserCheck size={16} />,
    },
    {
      key: "blocked",
      label: "Indisponíveis",
      value: stats.blocked,
      accent: "var(--color-danger, #dc2626)",
      icon: <IconAlertTriangle size={16} />,
    },
    {
      key: "inService",
      label: "Aguardando resposta",
      value: stats.inService,
      accent: "var(--brand-primary)",
      icon: <IconUsers size={16} />,
    },
    {
      key: "waiting",
      label: "Aguardando · taxa de sucesso",
      value: stats.waiting,
      percent: stats.successRate,
      accent: "var(--color-warn, #d97706)",
      icon: <IconClockExclamation size={16} />,
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

// ── Lista de responsáveis em cards ───────────────────────────────────────

// 6 colunas com mínimos legíveis — H-scroll no container quando < ~960px.
const RESP_GRID =
  "grid-cols-[minmax(200px,2.4fr)_minmax(160px,1.4fr)_minmax(64px,0.7fr)_minmax(72px,0.8fr)_minmax(150px,1.2fr)_minmax(100px,0.9fr)]";

/* Paleta de avatares: rotaciona pelo índice do responsável */
const AVATAR_PALETTES = [
  "bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]",
  "bg-[var(--color-success-bg)] text-[var(--color-success-dark,#0f7a5a)]",
  "bg-[var(--color-warn-bg,rgba(217,119,6,0.10))] text-[var(--color-warn,#d97706)]",
  "bg-[color-mix(in_srgb,var(--brand-secondary)_16%,transparent)] text-[var(--brand-secondary)]",
] as const;

function ResponsiblesCardList({
  responsibles,
  total,
  hasFilters,
  onClearFilters,
  currentUserId,
  canManage,
  onEdit,
}: {
  responsibles: DistributionResponsibleDto[];
  total: number;
  hasFilters: boolean;
  onClearFilters: () => void;
  currentUserId: string | null;
  canManage: boolean;
  onEdit: (r: DistributionResponsibleDto) => void;
}) {
  if (total === 0) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] shadow-[var(--glass-shadow)] backdrop-blur-md">
        <EmptyState
          icon={<IconRoute size={28} />}
          title="Nenhum responsável disponível"
          description="Adicione consultores à organização para distribuir leads."
        />
      </div>
    );
  }

  if (responsibles.length === 0) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] shadow-[var(--glass-shadow)] backdrop-blur-md">
        <EmptyState
          icon={<IconSearch size={28} />}
          title="Nenhum responsável encontrado"
          description="Sem resultados para a busca e filtros atuais."
          action={
            hasFilters ? (
              <button
                type="button"
                onClick={onClearFilters}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-4 py-2 font-display text-[13px] font-bold text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)]"
              >
                <IconRotateClockwise size={14} /> Limpar filtros
              </button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
      <div className="flex min-w-[960px] flex-col gap-2">
        <div className={listTableHeadRowClass(cn(RESP_GRID, "gap-3.5 border border-transparent px-4 py-2"))}>
          <ListColumnLabel>Responsável</ListColumnLabel>
          <ListColumnLabel>Presença</ListColumnLabel>
          <ListColumnLabel className="text-center">Fila</ListColumnLabel>
          <ListColumnLabel className="text-center">Volume</ListColumnLabel>
          <ListColumnLabel>Elegibilidade</ListColumnLabel>
          <ListColumnLabel align="right">Ações</ListColumnLabel>
        </div>
        {responsibles.map((r, idx) => (
          <ResponsibleCard
            key={r.userId}
            r={r}
            idx={idx}
            isCurrentUser={r.userId === currentUserId}
            canManage={canManage}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  );
}

function ResponsibleCard({
  r,
  idx,
  isCurrentUser,
  canManage,
  onEdit,
}: {
  r: DistributionResponsibleDto;
  idx: number;
  isCurrentUser: boolean;
  canManage: boolean;
  onEdit: (r: DistributionResponsibleDto) => void;
}) {
  const statusMut = useSetAgentStatus();
  const initials = (r.name ?? r.email ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isOnline = (r.status ?? "OFFLINE") === "ONLINE";
  const avatarClass = AVATAR_PALETTES[idx % AVATAR_PALETTES.length];

  const toggleOwnStatus = () => {
    statusMut.mutate(
      { userId: r.userId, status: isOnline ? "OFFLINE" : "ONLINE" },
      { onError: (e) => toast.error(e.message || "Erro ao alterar status.") },
    );
  };

  return (
    <div
      className={cn(
        "grid items-center gap-3.5 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-4 py-3 shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:shadow-[var(--glass-shadow)]",
        RESP_GRID,
      )}
    >
      {/* Responsável */}
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-[13px] font-extrabold ${avatarClass}`}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-[13.5px] font-bold text-[var(--text-primary)]">
            {r.name ?? "Sem nome"}
          </p>
          <p className="truncate font-body text-[11.5px] text-[var(--text-muted)]">
            {r.email ?? "—"}{" "}
            <span className="font-mono text-[10px] text-[var(--text-secondary)]">· {r.role}</span>
          </p>
          {r.departments && r.departments.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {r.departments.map((d) => (
                <span
                  key={d.id}
                  className="inline-flex items-center rounded-full bg-[var(--glass-bg-overlay)] px-2 py-0.5 font-display text-[10px] font-bold text-[var(--text-secondary)]"
                >
                  {d.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 font-body text-[10px] italic text-[var(--text-muted)]">
              Sem departamento
            </p>
          )}
        </div>
      </div>

      {/* Presença */}
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <PresenceBadge status={r.status} paused={r.paused} participates={r.participates} />
        {isCurrentUser && (
          <button
            type="button"
            onClick={toggleOwnStatus}
            disabled={statusMut.isPending}
            className="shrink-0 cursor-pointer rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-2.5 py-1 font-display text-[11px] font-bold text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)] disabled:opacity-50"
          >
            {statusMut.isPending ? "…" : isOnline ? "Ficar offline" : "Ficar online"}
          </button>
        )}
      </div>

      {/* Fila */}
      <div className="text-center font-display text-[15px] font-extrabold text-[var(--text-primary)]">
        {r.queueCount}
      </div>

      {/* Volume */}
      <div className="text-center font-body text-[18px] leading-none text-[var(--text-muted)]">
        {r.queueLimit > 0 ? (
          <span className="font-display text-[15px] font-extrabold text-[var(--text-primary)]">
            {r.queueLimit}
          </span>
        ) : (
          "∞"
        )}
      </div>

      {/* Elegibilidade */}
      <div className="flex min-w-0 flex-col gap-1">
        {r.eligible ? (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--color-success-bg)] px-2.5 py-1 font-display text-[11.5px] font-bold text-[var(--color-success-dark,#0f7a5a)]">
            <IconCircleCheck size={13} /> Elegível
          </span>
        ) : (
          <>
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--color-danger-bg)] px-2.5 py-1 font-display text-[11.5px] font-bold text-[var(--color-danger-text)]">
              <IconAlertTriangle size={13} /> Indisponível
            </span>
            {r.blockedReasons.length > 0 && (
              <span className="min-w-0 break-words pl-0.5 font-body text-[11px] text-[var(--text-muted)]">
                {r.blockedReasons.map((b) => BLOCK_REASON_LABELS[b]).join(" · ")}
              </span>
            )}
          </>
        )}
      </div>

      {/* Ações */}
      <div className="flex justify-end">
        {canManage && (
          <button
            type="button"
            onClick={() => onEdit(r)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-1.5 font-display text-[12px] font-bold text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)]"
          >
            <IconPencil size={13} /> Editar
          </button>
        )}
      </div>
    </div>
  );
}

function PresenceBadge({
  status,
  paused,
  participates,
}: {
  status: DistributionResponsibleDto["status"];
  paused: boolean;
  participates: boolean;
}) {
  if (!participates) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--text-muted)]/12 px-2.5 py-1 text-[12px] font-semibold text-[var(--text-muted)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]" /> Inativo
      </span>
    );
  }
  const effective = paused ? "AWAY" : (status ?? "OFFLINE");
  const map = {
    ONLINE: { label: "Online", color: "var(--color-online)" },
    AWAY: { label: paused ? "Em pausa" : "Ausente", color: "#d9a514" },
    OFFLINE: { label: "Offline", color: "var(--text-muted)" },
  } as const;
  const cfg = map[effective];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold"
      style={{ backgroundColor: `${cfg.color}1f`, color: cfg.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
      {cfg.label}
    </span>
  );
}

// ── Busca + popover de filtros (padrão Logs/Contatos) ────────────────────

type DistFilterTab = "presenca" | "elegibilidade" | "tipo";

const PRESENCE_OPTIONS: { value: PresenceKey; label: string }[] = [
  { value: "ONLINE", label: "Online" },
  { value: "AWAY", label: "Em pausa / ausente" },
  { value: "OFFLINE", label: "Offline" },
  { value: "INACTIVE", label: "Inativo" },
];

const ELIGIBILITY_OPTIONS: { value: "eligible" | "blocked"; label: string }[] = [
  { value: "eligible", label: "Elegível" },
  { value: "blocked", label: "Indisponível" },
];

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-primary)] px-1 font-display text-[10px] font-bold leading-none text-white">
      {count}
    </span>
  );
}

function FilterChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-display text-[12px] font-bold transition-colors",
        selected
          ? "border-[var(--brand-primary)] bg-[var(--color-primary-soft)] text-[var(--brand-primary)]"
          : "border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-overlay)]",
      )}
    >
      {selected && <IconCheck size={12} stroke={2.4} />}
      {children}
    </button>
  );
}

function DistributionSearchFilterBar({
  search,
  onSearch,
  presence,
  onPresenceChange,
  eligibility,
  onEligibilityChange,
  types,
  onTypesChange,
  typeOptions,
  onClearAll,
}: {
  search: string;
  onSearch: (v: string) => void;
  presence: PresenceKey[];
  onPresenceChange: (v: PresenceKey[]) => void;
  eligibility: ("eligible" | "blocked")[];
  onEligibilityChange: (v: ("eligible" | "blocked")[]) => void;
  types: string[];
  onTypesChange: (v: string[]) => void;
  typeOptions: string[];
  onClearAll: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<DistFilterTab>("presenca");

  const activeCount =
    presence.length + (eligibility.length === 1 ? 1 : 0) + types.length;

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const toggle = <T,>(current: T[], val: T, setter: (v: T[]) => void) => {
    setter(current.includes(val) ? current.filter((x) => x !== val) : [...current, val]);
  };

  const tabBadge = (id: DistFilterTab) => {
    if (id === "presenca") return presence.length;
    if (id === "elegibilidade") return eligibility.length === 1 ? 1 : 0;
    return types.length;
  };

  const TABS: { id: DistFilterTab; label: string; icon: React.ReactNode }[] = [
    { id: "presenca", label: "Presença", icon: <IconUsers size={14} stroke={2.2} /> },
    { id: "elegibilidade", label: "Elegibilidade", icon: <IconUserCheck size={14} stroke={2.2} /> },
    { id: "tipo", label: "Tipo", icon: <IconTag size={14} stroke={2.2} /> },
  ];

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
        placeholder="Pesquisar e filtrar responsáveis..."
        aria-label="Buscar e filtrar responsáveis"
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
              onClick={onClearAll}
              disabled={activeCount === 0 && !search}
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
              {TABS.map((t) => {
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
                    <span className={active ? "text-[var(--brand-primary)]" : undefined}>
                      {t.icon}
                    </span>
                    {t.label}
                    <CountBadge count={tabBadge(t.id)} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="max-h-[min(60vh,420px)] overflow-y-auto px-4 pb-4">
            {tab === "presenca" && (
              <div className="flex flex-wrap gap-1.5">
                {PRESENCE_OPTIONS.map((opt) => (
                  <FilterChip
                    key={opt.value}
                    selected={presence.includes(opt.value)}
                    onClick={() => toggle(presence, opt.value, onPresenceChange)}
                  >
                    {opt.label}
                  </FilterChip>
                ))}
              </div>
            )}

            {tab === "elegibilidade" && (
              <div className="flex flex-wrap gap-1.5">
                {ELIGIBILITY_OPTIONS.map((opt) => (
                  <FilterChip
                    key={opt.value}
                    selected={eligibility.includes(opt.value)}
                    onClick={() => {
                      // Exclusivo: selecionar um limpa o outro.
                      onEligibilityChange(
                        eligibility.includes(opt.value) ? [] : [opt.value],
                      );
                    }}
                  >
                    {opt.label}
                  </FilterChip>
                ))}
              </div>
            )}

            {tab === "tipo" && (
              <div className="flex flex-wrap gap-1.5">
                {typeOptions.length === 0 ? (
                  <p className="rounded-[10px] border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-3 py-3 text-center font-body text-[11.5px] text-[var(--text-muted)]">
                    Nenhum tipo/segmento cadastrado nos responsáveis.
                  </p>
                ) : (
                  typeOptions.map((t) => (
                    <FilterChip
                      key={t}
                      selected={types.includes(t)}
                      onClick={() => toggle(types, t, onTypesChange)}
                    >
                      {t}
                    </FilterChip>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Menu hamburger (CTAs da página) ──────────────────────────────────────

function DistributionActionsMenu({
  onTest,
  testing,
  onRetry,
  retrying,
  canRetry,
  hasFilters,
  onClearFilters,
}: {
  onTest: () => void;
  testing: boolean;
  onRetry: () => void;
  retrying: boolean;
  canRetry: boolean;
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  return (
    <PageActionsMenu
      items={[
        {
          icon: testing ? (
            <IconLoader2 size={13} className="animate-spin" />
          ) : (
            <IconPlayerPlay size={13} />
          ),
          label: testing ? "Testando…" : "Testar distribuição",
          onClick: onTest,
          disabled: testing,
          primary: true,
        },
        {
          icon: retrying ? (
            <IconLoader2 size={13} className="animate-spin" />
          ) : (
            <IconRefresh size={13} />
          ),
          label: retrying ? "Reprocessando…" : "Reprocessar fila",
          onClick: onRetry,
          disabled: retrying || !canRetry,
        },
        {
          icon: <IconX size={13} />,
          label: "Limpar filtros",
          onClick: onClearFilters,
          disabled: !hasFilters,
          divider: true,
        },
      ]}
    />
  );
}

// ── Painel de simulação ─────────────────────────────────────────────────

function SimulationPanel({
  result,
  onClose,
}: {
  result: DistributionResult;
  onClose: () => void;
}) {
  return (
    <div className="shrink-0 rounded-[var(--radius-xl)] border border-[var(--brand-primary)]/25 bg-[var(--brand-primary)]/[0.06] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconPlayerPlay size={18} className="text-[var(--brand-primary)]" />
          <div>
            <p className="font-display text-[14px] font-bold text-[var(--text-primary)]">
              Resultado da simulação
            </p>
            <p className="font-body text-[13px] text-[var(--text-secondary)]">
              {result.success
                ? `O lead seria atribuído a ${result.selectedUserName ?? "—"}.`
                : result.reason === "NO_ELIGIBLE_RESPONSIBLE"
                  ? "Nenhum responsável elegível no momento."
                  : "Módulo de Distribuição não habilitado."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-full p-1 text-[var(--text-muted)] hover:bg-[var(--glass-bg-overlay)]"
          aria-label="Fechar"
        >
          <IconX size={16} />
        </button>
      </div>
      {result.evaluated.length > 0 && (
        <p className="mt-2 font-body text-[12px] text-[var(--text-muted)]">
          {result.evaluated.filter((e) => e.eligible).length} de{" "}
          {result.evaluated.length} responsáveis elegíveis (simulação não atribui
          nem registra log).
        </p>
      )}
    </div>
  );
}

// ── Fila de espera (aba complementar) ────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} d`;
}

function PendingQueueCards({
  pending,
  onRetry,
  retrying,
  loading = false,
}: {
  pending: PendingDistributionDto[];
  onRetry: () => void;
  retrying: boolean;
  loading?: boolean;
}) {
  if (pending.length === 0) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] shadow-[var(--glass-shadow)] backdrop-blur-md">
        <EmptyState
          icon={<IconCircleCheck size={28} />}
          title="Nenhum atendimento aguardando"
          description={
            loading
              ? "Carregando fila…"
              : "Todos os atendimentos recebidos foram distribuídos."
          }
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 flex-col gap-2 rounded-[var(--radius-xl)] border border-[var(--color-warn)]/40 bg-[var(--color-warn-bg)]/80 p-3.5 shadow-[var(--glass-shadow-sm)] backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:p-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-warn-bg)] text-[var(--color-warn)]">
            <IconClockExclamation size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-display text-[14.5px] font-extrabold text-[var(--text-primary)]">
              Aguardando distribuição ({pending.length})
            </p>
            <p className="mt-0.5 text-pretty font-body text-[12px] leading-snug text-[var(--text-muted)]">
              Atendimentos sem responsável elegível. São redistribuídos quando alguém fica online.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex w-full shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[var(--color-warn)]/50 bg-[var(--color-warn-bg)] px-3 py-1.5 font-display text-[12px] font-bold text-[var(--color-warn)] transition-colors hover:brightness-95 disabled:opacity-50 sm:w-auto"
        >
          {retrying ? (
            <IconLoader2 size={14} className="animate-spin" />
          ) : (
            <IconRefresh size={14} />
          )}
          Reprocessar agora
        </button>
      </div>

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pr-0.5 [-webkit-overflow-scrolling:touch]">
        {pending.map((p) => (
          <div
            key={p.id}
            className="flex min-w-0 items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-4 py-3 shadow-[var(--glass-shadow-sm)] backdrop-blur-md"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-warn-bg,rgba(217,119,6,0.10))] text-[var(--color-warn,#d97706)]">
              <IconClockExclamation size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[13.5px] font-bold text-[var(--text-primary)]">
                {p.label}
              </p>
              <p className="truncate font-body text-[11.5px] text-[var(--text-muted)]">
                {p.distributionType ? (
                  <span className="font-semibold text-[var(--text-secondary)]">
                    {p.distributionType}
                  </span>
                ) : null}
                {p.distributionType ? " · " : ""}
                {p.attempts > 1 ? `${p.attempts} tentativas · ` : ""}
                {relativeTime(p.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Diálogo de edição (admin/manager) ───────────────────────────────────

function EditResponsibleDialog({
  responsible,
  onClose,
}: {
  responsible: DistributionResponsibleDto;
  onClose: () => void;
}) {
  const updateMut = useUpdateResponsible();
  const deptsQuery = useDepartments();
  const [participates, setParticipates] = useState(responsible.participates);
  const [paused, setPaused] = useState(responsible.paused);
  const [volume, setVolume] = useState(String(responsible.queueLimit));
  const [type, setType] = useState(responsible.type ?? "");
  const [deptIds, setDeptIds] = useState<string[]>(
    responsible.departments?.map((d) => d.id) ?? [],
  );

  const toggleDept = (id: string) =>
    setDeptIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const limit = Math.max(0, Math.floor(Number(volume) || 0));
    updateMut.mutate(
      {
        userId: responsible.userId,
        input: {
          participates,
          paused,
          queueLimit: limit,
          type: type.trim() || null,
          departmentIds: deptIds,
        },
      },
      {
        onSuccess: () => {
          toast.success("Responsável atualizado.");
          onClose();
        },
        onError: (err) => toast.error(err.message || "Erro ao atualizar."),
      },
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSave}
        className="w-full max-w-md rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-6 shadow-[var(--glass-shadow)]"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-[17px] font-bold text-[var(--text-primary)]">
              Editar responsável
            </h2>
            <p className="font-body text-[13px] text-[var(--text-muted)]">
              {responsible.name ?? responsible.email ?? "—"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full p-1 text-[var(--text-muted)] hover:bg-[var(--glass-bg-overlay)]"
            aria-label="Fechar"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <ToggleField
            label="Participa da distribuição"
            hint="Desligado = inativo (não recebe leads)."
            checked={participates}
            onChange={setParticipates}
          />
          <ToggleField
            label="Em pausa"
            hint="Pausa temporária — não recebe leads enquanto ativa."
            checked={paused}
            onChange={setPaused}
          />

          <label className="flex flex-col gap-1">
            <span className="font-body text-[12px] font-semibold text-[var(--text-secondary)]">
              Limite de fila (conversas aguardando resposta)
            </span>
            <input
              type="number"
              min={0}
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              className="rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-2 font-body text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
            />
            <span className="text-[11px] text-[var(--text-muted)]">
              Máximo de conversas aguardando a resposta do consultor (fila de não
              iniciados). Ao atingir, ele para de receber novos até responder. 0 =
              sem limite.
            </span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-body text-[12px] font-semibold text-[var(--text-secondary)]">
              Tipo / segmento (opcional)
            </span>
            <input
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="ex.: inbound, vendas, suporte"
              className="rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-2 font-body text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="font-body text-[12px] font-semibold text-[var(--text-secondary)]">
              Departamentos (o que este consultor recebe)
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">
              O consultor só recebe leads roteados para os departamentos marcados.
            </span>
            {deptsQuery.isLoading ? (
              <p className="py-1 text-[12px] text-[var(--text-muted)]">Carregando…</p>
            ) : (deptsQuery.data?.length ?? 0) === 0 ? (
              <p className="py-1 text-[12px] text-[var(--text-muted)]">
                Nenhum departamento cadastrado.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {deptsQuery.data?.map((d) => {
                  const on = deptIds.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDept(d.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-display text-[12px] font-bold transition-colors",
                        on
                          ? "border-[var(--brand-primary)] bg-[var(--color-primary-soft)] text-[var(--brand-primary)]"
                          : "border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-overlay)]",
                      )}
                    >
                      {on && <IconCheck size={12} stroke={2.4} />}
                      {d.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full border border-[var(--glass-border)] px-4 py-2 font-body text-[13px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--glass-bg-overlay)]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={updateMut.isPending}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--brand-primary)] px-4 py-2 font-display text-[13px] font-bold text-white disabled:opacity-50"
          >
            {updateMut.isPending && <IconLoader2 size={15} className="animate-spin" />}
            Salvar
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

function ToggleField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-body text-[13px] font-semibold text-[var(--text-primary)]">{label}</p>
        <p className="text-[11px] text-[var(--text-muted)]">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors",
          checked
            ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]"
            : "border-[var(--text-muted)]/40 bg-[var(--text-muted)]/25",
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-black/10 bg-white shadow-sm transition-all",
            checked ? "right-0.5" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}

// ── Painel: distribuição automática por departamento ─────────────────────

function DepartmentsDistributionPanel() {
  const deptsQuery = useDepartments();
  const updateMut = useUpdateDepartment();
  const depts = deptsQuery.data ?? [];

  if (deptsQuery.isLoading || depts.length === 0) return null;

  const toggle = (id: string, next: boolean) => {
    updateMut.mutate(
      { id, distributionEnabled: next },
      {
        onError: (e) =>
          toast.error(
            e instanceof Error ? e.message : "Erro ao atualizar departamento.",
          ),
      },
    );
  };

  return (
    <div className="shrink-0 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-4 shadow-[var(--glass-shadow-sm)] backdrop-blur-md">
      <div className="mb-1 flex items-center gap-2">
        <IconUsers size={16} className="text-[var(--brand-primary)]" />
        <p className="font-display text-[13.5px] font-bold text-[var(--text-primary)]">
          Departamentos · distribuição automática
        </p>
      </div>
      <p className="mb-3 font-body text-[12px] text-[var(--text-muted)]">
        Ligue para o departamento distribuir automaticamente entre seus membros os
        leads roteados a ele. Desligado = leads desse departamento ficam na fila de
        espera.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {depts.map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate font-display text-[13px] font-bold text-[var(--text-primary)]">
                {d.name}
              </p>
              <p className="font-body text-[11px] text-[var(--text-muted)]">
                {d._count?.members ?? 0} membro(s)
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!!d.distributionEnabled}
              disabled={updateMut.isPending}
              onClick={() => toggle(d.id, !d.distributionEnabled)}
              className={cn(
                "relative h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors disabled:opacity-50",
                d.distributionEnabled
                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]"
                  : "border-[var(--text-muted)]/40 bg-[var(--text-muted)]/25",
              )}
            >
              <span
                className={cn(
                  "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-black/10 bg-white shadow-sm transition-all",
                  d.distributionEnabled ? "right-0.5" : "left-0.5",
                )}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Estados auxiliares ──────────────────────────────────────────────────

function NotEnabledState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-12 text-center shadow-[var(--glass-shadow-sm)] backdrop-blur-md">
      <IconRoute size={36} className="text-[var(--text-muted)]" />
      <p className="font-display text-[16px] font-bold text-[var(--text-primary)]">
        Módulo de Distribuição não habilitado
      </p>
      <p className="max-w-md font-body text-[13px] text-[var(--text-muted)]">
        A Distribuição Inteligente é um módulo instalável. Ative-o na Central de
        Widgets para liberar esta área.
      </p>
      <a
        href="/widgets"
        className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-primary)] px-4 py-2 font-display text-[13px] font-bold text-white transition-all hover:-translate-y-px"
      >
        Ir para a Central de Widgets
      </a>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--color-danger)]/20 bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] p-6 text-center font-body text-[13px] text-[var(--color-danger-text)]">
      {message || "Erro ao carregar a distribuição."}
    </div>
  );
}

function SkeletonState() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-md"
        />
      ))}
    </div>
  );
}
