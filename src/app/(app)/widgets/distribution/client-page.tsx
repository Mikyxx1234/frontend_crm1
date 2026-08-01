"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  IconAdjustmentsHorizontal,
  IconAlertTriangle,
  IconArrowsShuffle,
  IconCheck,
  IconChevronDown,
  IconCircleCheck,
  IconClockExclamation,
  IconExternalLink,
  IconEye,
  IconEyeOff,
  IconLoader2,
  IconPencil,
  IconPhone,
  IconPlayerPlay,
  IconRefresh,
  IconRobot,
  IconRotateClockwise,
  IconSearch,
  IconSettings,
  IconTag,
  IconUserCheck,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { NavRailSpacer } from "@/components/crm/nav-rail-spacer";
import { UserAvatar } from "@/components/crm/user-avatar";
import { AgentStatusDot } from "@/components/crm/agent-status-dot";
import type { AgentOnlineStatus } from "@/components/crm/agent-status";
import {
  SystemPresenceIndicator,
  sortByPresence,
} from "@/components/crm/system-presence-indicator";
import { DistributionIcon } from "@/components/icons/distribution-icon";
import { RestrictedScreen } from "@/components/crm/restricted-screen";
import { useRequireManager } from "@/hooks/use-user-role";
import { PageHeader } from "@/components/crm/page-header";
import { PageActionsMenu, PageSegmentedControl } from "@/components/crm/page-toolbar";
import { PageDemoBanner } from "@/components/crm/page-demo-banner";
import { EmptyState } from "@/components/crm/empty-state";
import { ListColumnLabel, listTableHeadRowClass } from "@/components/crm/sortable-header";
import { FormDialog } from "@/components/ui/form-dialog";
import { cn } from "@/lib/utils";
import { useWidgets } from "@/features/widgets/hooks";
import {
  useDistributionLogs,
  useDistributionResponsibles,
  useDistributionSettings,
  usePendingDistributions,
  useRedistributeResponsible,
  useRetryPending,
  useSetAgentStatus,
  useSimulateDistribution,
  useUpdateDistributionSettings,
  useUpdateResponsible,
} from "@/features/distribution/hooks";
import {
  BLOCK_REASON_LABELS,
  type DistributionResponsibleDto,
  type DistributionResult,
  type PendingDistributionDto,
  type RedistributeMode,
  type RedistributeQueueScope,
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

type DistributionView = "team" | "queue" | "logs";

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
  const currentUserImage = session?.user?.image ?? null;
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
  const [redistributing, setRedistributing] =
    useState<DistributionResponsibleDto | null>(null);
  const [simResult, setSimResult] = useState<DistributionResult | null>(null);
  const [deptConfigOpen, setDeptConfigOpen] = useState(false);

  // ── Estado de UI: aba, busca, filtros ──
  const [view, setView] = useState<DistributionView>("team");
  const [search, setSearch] = useState("");
  const [presence, setPresence] = useState<PresenceKey[]>([]);
  const [eligibility, setEligibility] = useState<("eligible" | "blocked")[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  /** ADMINs ficam ocultos na lista por padrão (não poluem a equipe). */
  const [showAdmins, setShowAdmins] = useState(false);

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

  const adminCount = useMemo(
    () => responsibles.filter((r) => r.role === "ADMIN").length,
    [responsibles],
  );
  const teamListCount = showAdmins
    ? responsibles.length
    : Math.max(0, responsibles.length - adminCount);

  const hasFilters =
    search.trim().length > 0 ||
    presence.length > 0 ||
    eligibility.length > 0 ||
    types.length > 0;

  const filteredResponsibles = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = responsibles.filter((r) => {
      if (!showAdmins && r.role === "ADMIN") return false;
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
    // Ordena por presença de USO (CRM aberto) — quem está no sistema agora sobe.
    // Não interfere na elegibilidade da Distribuição — é só ordem de exibição.
    return sortByPresence(filtered);
  }, [responsibles, search, presence, eligibility, types, showAdmins]);

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
          icon={<DistributionIcon size={22} />}
          title="Distribuição"
          center={
            smartInstalled && view === "team" ? (
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
                        <SegLabel label="Equipe" count={teamListCount} />
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
                    {
                      value: "logs",
                      label: <span>Logs</span>,
                    },
                  ]}
                  value={view}
                  onChange={(v) => setView(v as DistributionView)}
                />
                {adminCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAdmins((v) => !v)}
                    className={cn(
                      "inline-flex size-8 cursor-pointer items-center justify-center rounded-full border transition-colors",
                      showAdmins
                        ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                        : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                    )}
                    title={
                      showAdmins
                        ? `Ocultar ${adminCount} admin(s)`
                        : `Mostrar ${adminCount} admin(s) oculto(s)`
                    }
                    aria-label={
                      showAdmins ? "Ocultar administradores" : "Mostrar administradores"
                    }
                    aria-pressed={showAdmins}
                  >
                    {showAdmins ? <IconEye size={16} /> : <IconEyeOff size={16} />}
                  </button>
                )}
                <DistributionActionsMenu
                  onTest={handleTest}
                  testing={simulateMut.isPending}
                  onRetry={handleRetry}
                  retrying={retryMut.isPending}
                  canRetry={pending.length > 0}
                  hasFilters={hasFilters}
                  onClearFilters={clearFilters}
                  onDepartmentsConfig={
                    canManage && !useDemo
                      ? () => setDeptConfigOpen(true)
                      : undefined
                  }
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

              {view === "team" ? (
                <ResponsiblesCardList
                  responsibles={filteredResponsibles}
                  total={teamListCount}
                  hasFilters={hasFilters}
                  onClearFilters={clearFilters}
                  currentUserId={currentUserId}
                  currentUserImage={currentUserImage}
                  canManage={canManage}
                  onEdit={(r) => setEditing(r)}
                  onRedistribute={(r) => setRedistributing(r)}
                />
              ) : view === "queue" ? (
                <PendingQueueCards
                  pending={pending}
                  onRetry={handleRetry}
                  retrying={retryMut.isPending}
                  loading={pendingQuery.isLoading}
                />
              ) : (
                <DistributionLogsList
                  enabled={isAuthenticated && (isPageMockMode() || smartInstalled)}
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

      {redistributing && (
        <RedistributeDialog
          source={redistributing}
          candidates={responsibles.filter((r) => r.userId !== redistributing.userId)}
          onClose={() => setRedistributing(null)}
        />
      )}

      <FormDialog
        open={deptConfigOpen}
        onOpenChange={setDeptConfigOpen}
        title="Departamentos · distribuição automática"
        description="Configure se a distribuição respeita o departamento da conversa e quais departamentos distribuem automaticamente."
        icon={<IconUsers size={20} />}
        size="lg"
      >
        <DepartmentsDistributionPanel />
      </FormDialog>
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

// 6 colunas: responsável, presença (+ horário), fila, volume, elegibilidade, ações
const RESP_GRID =
  "grid-cols-[minmax(260px,2.6fr)_minmax(200px,1.5fr)_minmax(56px,0.55fr)_minmax(64px,0.65fr)_minmax(170px,1.35fr)_minmax(168px,1.1fr)]";

function ResponsiblesCardList({
  responsibles,
  total,
  hasFilters,
  onClearFilters,
  currentUserId,
  currentUserImage,
  canManage,
  onEdit,
  onRedistribute,
}: {
  responsibles: DistributionResponsibleDto[];
  total: number;
  hasFilters: boolean;
  onClearFilters: () => void;
  currentUserId: string | null;
  currentUserImage: string | null;
  canManage: boolean;
  onEdit: (r: DistributionResponsibleDto) => void;
  onRedistribute: (r: DistributionResponsibleDto) => void;
}) {
  if (total === 0) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] shadow-[var(--glass-shadow)] backdrop-blur-md">
        <EmptyState
          icon={<DistributionIcon size={28} />}
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
      <div className="flex min-w-[1040px] flex-col gap-1.5">
        <div className={listTableHeadRowClass(cn(RESP_GRID, "gap-2.5 border border-transparent px-3 py-1.5"))}>
          <ListColumnLabel>Responsável</ListColumnLabel>
          <ListColumnLabel>Presença</ListColumnLabel>
          <ListColumnLabel className="text-center">Fila</ListColumnLabel>
          <ListColumnLabel className="text-center">Volume</ListColumnLabel>
          <ListColumnLabel>Elegibilidade</ListColumnLabel>
          <ListColumnLabel align="right">Ações</ListColumnLabel>
        </div>
        {responsibles.map((r) => (
          <ResponsibleCard
            key={r.userId}
            r={r}
            isCurrentUser={r.userId === currentUserId}
            currentUserImage={currentUserImage}
            canManage={canManage}
            onEdit={onEdit}
            onRedistribute={onRedistribute}
          />
        ))}
      </div>
    </div>
  );
}

function ResponsibleCard({
  r,
  isCurrentUser,
  currentUserImage,
  canManage,
  onEdit,
  onRedistribute,
}: {
  r: DistributionResponsibleDto;
  isCurrentUser: boolean;
  currentUserImage: string | null;
  canManage: boolean;
  onEdit: (r: DistributionResponsibleDto) => void;
  onRedistribute: (r: DistributionResponsibleDto) => void;
}) {
  const statusMut = useSetAgentStatus();
  const isOnline = (r.status ?? "OFFLINE") === "ONLINE";
  // Próprio usuário ou admin/manager — mesmo botão simples de produção.
  const canTogglePresence = isCurrentUser || canManage;

  const togglePresence = () => {
    statusMut.mutate(
      { userId: r.userId, status: isOnline ? "OFFLINE" : "ONLINE" },
      { onError: (e) => toast.error(e.message || "Erro ao alterar status.") },
    );
  };

  return (
    <div
      className={cn(
        "grid items-center gap-2.5 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-3 py-2 shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-all hover:-translate-y-px hover:shadow-[var(--glass-shadow)]",
        RESP_GRID,
      )}
    >
      {/* Responsável */}
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="relative isolate shrink-0">
          <UserAvatar
            name={r.name ?? r.email}
            imageUrl={r.avatarUrl ?? (isCurrentUser ? currentUserImage : null)}
            size={36}
          />
          <AgentStatusDot
            status={
              (!r.participates
                ? "OFFLINE"
                : r.paused || r.status === "AWAY"
                  ? "AWAY"
                  : isOnline
                    ? "ONLINE"
                    : "OFFLINE") satisfies AgentOnlineStatus
            }
            size={12}
            borderWidth={2}
            borderColor="var(--glass-bg-base)"
          />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-display text-[13px] font-bold leading-tight text-[var(--text-primary)]">
            <span className="truncate">{r.name ?? "Sem nome"}</span>
            {/* Bolinha azul = CRM aberto (não confundir com Online da Distribuição). */}
            <SystemPresenceIndicator
              systemOnline={r.systemOnline}
              lastSeenAt={r.lastSeenAt}
            />
          </p>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 whitespace-nowrap text-[10.5px] leading-tight">
            <span className="min-w-0 truncate font-body text-[var(--text-muted)]">
              {r.email ?? "—"}
            </span>
            <span className="shrink-0 font-mono text-[9.5px] text-[var(--text-secondary)]">
              · {r.role}
            </span>
            <span
              className="min-w-0 truncate border-l border-[var(--glass-border)] pl-1.5 font-display font-semibold text-[var(--text-secondary)]"
              title={
                r.departments && r.departments.length > 0
                  ? r.departments.map((d) => d.name).join(", ")
                  : "Sem departamento"
              }
            >
              {r.departments && r.departments.length > 0
                ? r.departments.map((d) => d.name).join(", ")
                : "Sem departamento"}
            </span>
          </div>
        </div>
      </div>

      {/* Presença + resumo de expediente/almoço */}
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex min-w-0 flex-nowrap items-center gap-1.5">
          <PresenceBadge status={r.status} paused={r.paused} participates={r.participates} />
          {canTogglePresence && r.participates && (
            <button
              type="button"
              onClick={togglePresence}
              disabled={statusMut.isPending}
              className="shrink-0 cursor-pointer rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-2 py-0.5 font-display text-[10.5px] font-bold text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)] disabled:opacity-50"
            >
              {statusMut.isPending ? "…" : isOnline ? "Ficar offline" : "Ficar online"}
            </button>
          )}
        </div>
        <SchedulePresenceHint schedule={r.schedule} preLunchStopMinutes={r.preLunchStopMinutes} />
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
      <div className="flex min-w-0 flex-col gap-0.5">
        {r.eligible ? (
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[var(--color-success-bg)] px-2 py-0.5 font-display text-[11px] font-bold text-[var(--color-success-dark,#0f7a5a)]">
            <IconCircleCheck size={13} /> Elegível
          </span>
        ) : (
          <>
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[var(--color-danger-bg)] px-2 py-0.5 font-display text-[11px] font-bold text-[var(--color-danger-text)]">
              <IconAlertTriangle size={13} /> Indisponível
            </span>
            {r.blockedReasons.length > 0 && (
              <span
                className="min-w-0 truncate pl-0.5 font-body text-[10.5px] leading-tight text-[var(--text-muted)]"
                title={r.blockedReasons.map((b) => BLOCK_REASON_LABELS[b]).join(" · ")}
              >
                {r.blockedReasons.map((b) => BLOCK_REASON_LABELS[b]).join(" · ")}
              </span>
            )}
          </>
        )}
      </div>

      {/* Ações */}
      <div className="flex justify-end gap-1.5">
        {canManage && r.queueCount > 0 && (
          <button
            type="button"
            onClick={() => onRedistribute(r)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-2.5 py-1 font-display text-[11.5px] font-bold text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)]"
            title="Redistribuir fila deste consultor"
          >
            <IconArrowsShuffle size={13} /> Redistribuir
          </button>
        )}
        {canManage && (
          <button
            type="button"
            onClick={() => onEdit(r)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-2.5 py-1 font-display text-[11.5px] font-bold text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)]"
          >
            <IconPencil size={13} /> Editar
          </button>
        )}
      </div>
    </div>
  );
}

function SchedulePresenceHint({
  schedule,
  preLunchStopMinutes,
}: {
  schedule: DistributionResponsibleDto["schedule"];
  preLunchStopMinutes?: number;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (!schedule) return null;

  const alert = resolveSchedulePresenceAlert({
    schedule,
    preMinutes: preLunchStopMinutes ?? 30,
    now,
  });
  if (!alert) return null;

  return (
    <span
      className="min-w-0 truncate font-body text-[10px] font-semibold leading-tight text-[var(--brand-primary)]"
      title={alert.title}
    >
      {alert.label}
    </span>
  );
}

type SchedulePresenceAlert = { label: string; title: string };

/**
 * Mostra aviso só perto do pré-corte:
 * - 10 min antes do pré-almoço → "N min para o almoço"
 * - dentro do pré-corte/almoço → "N min almoço"
 * - 10 min antes do pré-fim → "N min para a saída"
 * - dentro do pré-fim → "N min para a saída"
 * Fora dessas janelas: oculto (lista fica limpa).
 */
function resolveSchedulePresenceAlert(input: {
  schedule: NonNullable<DistributionResponsibleDto["schedule"]>;
  preMinutes: number;
  now: Date;
}): SchedulePresenceAlert | null {
  const { schedule, now } = input;
  const pre = Math.max(0, Math.floor(input.preMinutes));
  const WARN_AHEAD = 10;

  const current = localMinutesInTimezone(schedule.timezone, now);
  if (current == null) return null;
  if (!isScheduleWeekday(schedule, now)) return null;

  const lunchStart = parseHhmmToMinutes(schedule.lunchStart);
  const lunchEnd = parseHhmmToMinutes(schedule.lunchEnd);
  const endTime = parseHhmmToMinutes(schedule.endTime);
  if (lunchStart == null || lunchEnd == null || endTime == null) return null;

  const lunchPreStart = lunchStart - pre;
  const lunchWarnStart = lunchPreStart - WARN_AHEAD;
  const endPreStart = endTime - pre;
  const endWarnStart = endPreStart - WARN_AHEAD;

  // Almoço tem prioridade sobre fim do expediente.
  if (pre > 0 && current >= lunchWarnStart && current < lunchPreStart) {
    const left = lunchPreStart - current;
    return {
      label: `${left} min para o almoço`,
      title: `Pré-corte de ${pre} min começa em ${left} min (almoço ${hhmm(schedule.lunchStart)}–${hhmm(schedule.lunchEnd)})`,
    };
  }
  if (current >= lunchPreStart && current < lunchEnd) {
    if (pre > 0 && current < lunchStart) {
      return {
        label: `${pre} min almoço`,
        title: `Pré-corte ativo — para de receber leads até o fim do almoço (${hhmm(schedule.lunchEnd)})`,
      };
    }
    return {
      label: "Pausa almoço",
      title: `Em almoço até ${hhmm(schedule.lunchEnd)} — sem receber leads`,
    };
  }

  if (pre > 0 && current >= endWarnStart && current < endPreStart) {
    const left = endPreStart - current;
    return {
      label: `${left} min para a saída`,
      title: `Pré-corte de ${pre} min antes do fim (${hhmm(schedule.endTime)}) começa em ${left} min`,
    };
  }
  if (pre > 0 && current >= endPreStart && current < endTime) {
    return {
      label: `${pre} min para a saída`,
      title: `Pré-fim de expediente ativo — para de receber leads até ${hhmm(schedule.endTime)}`,
    };
  }

  return null;
}

function hhmm(v: string): string {
  return (v || "").slice(0, 5);
}

function parseHhmmToMinutes(v: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec((v || "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return h * 60 + min;
}

function localMinutesInTimezone(timezone: string, now: Date): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "NaN");
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "NaN");
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    // Intl pode devolver "24" em alguns engines à meia-noite.
    const h = hour === 24 ? 0 : hour;
    return h * 60 + minute;
  } catch {
    return null;
  }
}

function isScheduleWeekday(
  schedule: NonNullable<DistributionResponsibleDto["schedule"]>,
  now: Date,
): boolean {
  try {
    const weekdayStr = new Intl.DateTimeFormat("en-US", {
      timeZone: schedule.timezone || "America/Sao_Paulo",
      weekday: "short",
    }).format(now);
    const map: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    const day = map[weekdayStr];
    if (day == null) return true;
    return (schedule.weekdays ?? []).includes(day);
  } catch {
    return true;
  }
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
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--text-muted)]/12 px-2 py-0.5 text-[11.5px] font-semibold text-[var(--text-muted)]">
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
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold"
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
  onDepartmentsConfig,
}: {
  onTest: () => void;
  testing: boolean;
  onRetry: () => void;
  retrying: boolean;
  canRetry: boolean;
  hasFilters: boolean;
  onClearFilters: () => void;
  onDepartmentsConfig?: () => void;
}) {
  return (
    <PageActionsMenu
      items={[
        ...(onDepartmentsConfig
          ? [
              {
                icon: <IconSettings size={13} />,
                label: "Configurações",
                onClick: onDepartmentsConfig,
                primary: true as const,
              },
            ]
          : []),
        {
          icon: retrying ? (
            <IconLoader2 size={13} className="animate-spin" />
          ) : (
            <IconRefresh size={13} />
          ),
          label: retrying ? "Reprocessando…" : "Reprocessar fila",
          onClick: onRetry,
          disabled: retrying || !canRetry,
          primary: !onDepartmentsConfig,
        },
        {
          icon: <IconX size={13} />,
          label: "Limpar filtros",
          onClick: onClearFilters,
          disabled: !hasFilters,
          divider: true,
        },
        {
          icon: testing ? (
            <IconLoader2 size={13} className="animate-spin" />
          ) : (
            <IconPlayerPlay size={13} />
          ),
          label: testing ? "Testando…" : "Testar distribuição",
          onClick: onTest,
          disabled: testing,
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
  if (min < 1) return "há minutos";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} d`;
}

/** Rótulo + cor (CSS var) por canal de origem da conversa. */
const CHANNEL_META: Record<string, { label: string; color: string }> = {
  WHATSAPP: { label: "WhatsApp", color: "var(--color-success)" },
  INSTAGRAM: { label: "Instagram", color: "var(--brand-primary)" },
  FACEBOOK: { label: "Facebook", color: "var(--brand-secondary)" },
  EMAIL: { label: "E-mail", color: "var(--color-warn)" },
  WEBCHAT: { label: "Webchat", color: "var(--text-muted)" },
};

function channelMeta(channel: string): { label: string; color: string } | null {
  if (!channel) return null;
  const key = channel.toUpperCase();
  return (
    CHANNEL_META[key] ?? {
      label: channel.charAt(0) + channel.slice(1).toLowerCase(),
      color: "var(--text-muted)",
    }
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  const meta = channelMeta(channel);
  if (!meta) return null;
  return (
    <span
      className="hidden shrink-0 items-center rounded-full px-2 py-0.5 font-display text-[11px] font-semibold sm:inline-flex"
      style={{
        backgroundColor: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
        color: meta.color,
      }}
    >
      {meta.label}
    </span>
  );
}

function isAiAgentTrigger(triggerSource: string | null | undefined): boolean {
  if (!triggerSource) return false;
  return triggerSource
    .split("+")
    .map((s) => s.trim().toUpperCase())
    .some((p) => p === "AI_AGENT" || p === "AI");
}

function AiAgentBadge() {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-display text-[11px] font-semibold"
      style={{
        backgroundColor:
          "color-mix(in srgb, var(--brand-primary) 14%, transparent)",
        color: "var(--brand-primary)",
      }}
      title="Distribuição solicitada pelo agente de IA"
    >
      <IconRobot size={12} stroke={2} />
      Agente IA
    </span>
  );
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
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] shadow-[var(--glass-shadow-sm)] backdrop-blur-md">
      {/* Header */}
      <div className="flex shrink-0 flex-col gap-3 border-b border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--color-warn)_15%,transparent)] text-[var(--color-warn)]">
            <IconClockExclamation size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-display text-[14px] font-bold text-[var(--text-primary)]">
              Aguardando distribuição
              <span className="rounded-full bg-[color-mix(in_srgb,var(--color-warn)_15%,transparent)] px-2 py-0.5 font-display text-[11px] font-bold text-[var(--color-warn)] tabular-nums">
                {pending.length}
              </span>
            </h2>
            <p className="mt-0.5 text-pretty font-body text-[12px] leading-snug text-[var(--text-muted)]">
              Atendimentos sem responsável elegível. Redistribuídos automaticamente quando alguém fica elegível, libera capacidade ou pelo job de segurança.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying || pending.length === 0}
          className="inline-flex w-full shrink-0 cursor-pointer items-center justify-center gap-1.5 self-start rounded-full border border-[var(--color-warn)]/50 bg-[color-mix(in_srgb,var(--color-warn)_8%,transparent)] px-3 py-1.5 font-display text-[12px] font-bold text-[var(--color-warn)] transition-colors hover:brightness-95 disabled:opacity-50 sm:w-auto sm:self-auto"
        >
          {retrying ? (
            <IconLoader2 size={14} className="animate-spin" />
          ) : (
            <IconRefresh size={14} />
          )}
          Reprocessar agora
        </button>
      </div>

      {/* Lista / vazio */}
      {pending.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-[var(--glass-bg-strong)] text-[var(--text-muted)]">
            <IconPhone size={24} />
          </div>
          <p className="font-display text-[13.5px] font-bold text-[var(--text-primary)]">
            {loading ? "Carregando fila…" : "Nenhum atendimento na fila"}
          </p>
          <p className="font-body text-[12px] text-[var(--text-muted)]">
            {loading
              ? "Buscando atendimentos sem responsável."
              : "Tudo distribuído. Novos contatos aparecerão aqui."}
          </p>
        </div>
      ) : (
        <ul className="scrollbar-thin flex min-h-0 flex-1 flex-col divide-y divide-[var(--glass-border)] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          {pending.map((p) => (
            <li key={p.id}>
              <Link
                href={`/inbox?c=${encodeURIComponent(p.id)}`}
                className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--glass-bg-overlay)]"
                title="Abrir conversa no inbox"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-warn)_10%,transparent)] text-[var(--color-warn)]">
                  <IconClockExclamation size={16} />
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-[13px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)]">
                  {p.label}
                </span>
                {isAiAgentTrigger(p.triggerSource) ? <AiAgentBadge /> : null}
                <ChannelBadge channel={p.channel} />
                <span className="ml-auto shrink-0 font-body text-[11px] tabular-nums text-[var(--text-muted)]">
                  {p.attempts > 1 ? `${p.attempts}x · ` : ""}
                  {relativeTime(p.createdAt)}
                </span>
                <IconExternalLink
                  size={14}
                  className="shrink-0 text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Logs de distribuição ────────────────────────────────────────────────

const DIST_REASON_LABELS: Record<string, string> = {
  ASSIGNED: "Distribuído",
  NO_ELIGIBLE_RESPONSIBLE: "Sem responsável disponível",
  NO_DEPARTMENT: "Sem departamento habilitado",
  SMART_DISTRIBUTION_NOT_ENABLED: "Módulo desabilitado",
};

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type LogResultFilter = "all" | "success" | "failure";
type LogPeriodFilter = "all" | "today" | "7d";

function DistributionLogsList({ enabled }: { enabled: boolean }) {
  const q = useDistributionLogs(enabled);
  const items = useMemo(
    () => q.data?.pages.flatMap((p) => p.items) ?? [],
    [q.data],
  );
  const loading = q.isLoading;
  const [logSearch, setLogSearch] = useState("");
  const [result, setResult] = useState<LogResultFilter>("all");
  const [period, setPeriod] = useState<LogPeriodFilter>("all");
  const [origin, setOrigin] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const origins = useMemo(() => {
    const set = new Set<string>();
    for (const log of items) {
      const raw = log.triggerSource?.trim();
      if (!raw) continue;
      // Logs juntados ("AUTOMATION+SYSTEM") entram nos filtros base.
      for (const part of raw.split("+")) {
        const p = part.trim();
        if (p) set.add(p);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = logSearch.trim().toLocaleLowerCase("pt-BR");
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;

    return items.filter((log) => {
      const searchable = [
        log.contactPhone,
        log.contactName,
        log.selectedUserName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR");
      if (query && !searchable.includes(query)) return false;
      if (result === "success" && !log.success) return false;
      if (result === "failure" && log.success) return false;
      if (origin !== "all") {
        const parts = (log.triggerSource || "")
          .split("+")
          .map((s) => s.trim())
          .filter(Boolean);
        if (!parts.includes(origin) && log.triggerSource !== origin) return false;
      }

      const createdAt = new Date(log.createdAt).getTime();
      if (period === "today" && createdAt < startOfToday) return false;
      if (period === "7d" && createdAt < sevenDaysAgo) return false;
      return true;
    });
  }, [items, logSearch, origin, period, result]);

  const hasActiveFilters =
    Boolean(logSearch) ||
    result !== "all" ||
    period !== "all" ||
    origin !== "all";

  const clearFilters = () => {
    setLogSearch("");
    setResult("all");
    setPeriod("all");
    setOrigin("all");
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] shadow-[var(--glass-shadow-sm)] backdrop-blur-md">
      <div className="flex shrink-0 flex-col gap-3 border-b border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--color-primary)_15%,transparent)] text-[var(--color-primary)]">
            <DistributionIcon size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-[14px] font-bold text-[var(--text-primary)]">
              Logs de distribuição
            </h2>
            <p className="mt-0.5 text-pretty font-body text-[12px] leading-snug text-[var(--text-muted)]">
              Histórico operacional com resultado, responsável, origem e horário.
            </p>
          </div>
          {!loading && items.length > 0 && (
            <span className="ml-auto shrink-0 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-2.5 py-1 font-body text-[10.5px] font-semibold tabular-nums text-[var(--text-muted)]">
              {filteredItems.length} de {items.length}
            </span>
          )}
        </div>

        {!loading && items.length > 0 && (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-[minmax(220px,1fr)_160px_150px_170px_auto]">
            <label className="relative col-span-2 lg:col-span-1">
              <span className="sr-only">Buscar nos logs</span>
              <IconSearch
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                type="search"
                value={logSearch}
                onChange={(event) => setLogSearch(event.target.value)}
                placeholder="Telefone, contato ou responsável"
                className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] pl-9 pr-3 font-body text-[12px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--input-ring-focus)]"
              />
            </label>
            <LogFilterSelect
              label="Resultado"
              value={result}
              onChange={(value) => setResult(value as LogResultFilter)}
              options={[
                { value: "all", label: "Todos os resultados" },
                { value: "success", label: "Sucesso" },
                { value: "failure", label: "Falha" },
              ]}
            />
            <LogFilterSelect
              label="Período"
              value={period}
              onChange={(value) => setPeriod(value as LogPeriodFilter)}
              options={[
                { value: "all", label: "Todo o período" },
                { value: "today", label: "Hoje" },
                { value: "7d", label: "Últimos 7 dias" },
              ]}
            />
            <LogFilterSelect
              label="Origem"
              value={origin}
              onChange={setOrigin}
              options={[
                { value: "all", label: "Todas as origens" },
                ...origins.map((value) => ({ value, label: value })),
              ]}
            />
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[var(--radius-md)] px-3 font-display text-[11.5px] font-bold text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-35"
            >
              <IconRotateClockwise size={13} />
              Limpar
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center px-4 py-16 text-center">
          <IconLoader2 size={22} className="animate-spin text-[var(--text-muted)]" />
        </div>
      ) : q.error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-center">
          <IconAlertTriangle size={24} className="text-[var(--color-warn)]" />
          <p className="font-body text-[12px] text-[var(--text-muted)]">
            {q.error instanceof Error ? q.error.message : "Erro ao carregar logs."}
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-[var(--glass-bg-strong)] text-[var(--text-muted)]">
            <DistributionIcon size={24} />
          </div>
          <p className="font-display text-[13.5px] font-bold text-[var(--text-primary)]">
            Nenhuma distribuição registrada
          </p>
          <p className="font-body text-[12px] text-[var(--text-muted)]">
            Assim que a Distribuição Inteligente rodar, o histórico aparece aqui.
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-center">
          <IconSearch size={24} className="text-[var(--text-muted)]" />
          <p className="font-display text-[13.5px] font-bold text-[var(--text-primary)]">
            Nenhum log encontrado
          </p>
          <p className="font-body text-[12px] text-[var(--text-muted)]">
            Ajuste os filtros ou limpe a busca para ver outros registros.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-1 font-display text-[12px] font-bold text-[var(--brand-primary)] hover:underline"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <table className="w-full min-w-[820px] border-collapse">
            <thead className="sticky top-0 z-10 bg-[var(--glass-bg-modal,#fff)] shadow-[0_1px_0_var(--glass-border)]">
              <tr>
                {["Contato", "Resultado", "Responsável / motivo", "Origem", "Quando"].map(
                  (label) => (
                    <th
                      key={label}
                      scope="col"
                      className="px-4 py-2.5 text-left font-display text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]"
                    >
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((log) => {
                const expanded = expandedId === log.id;
                const resultLabel =
                  DIST_REASON_LABELS[log.reason] ??
                  (log.success ? "Distribuído" : log.reason);
                return (
                  <LogTableRows
                    key={log.id}
                    log={log}
                    expanded={expanded}
                    resultLabel={resultLabel}
                    onToggle={() => setExpandedId(expanded ? null : log.id)}
                  />
                );
              })}
            </tbody>
          </table>

          {q.hasNextPage && (
            <div className="flex shrink-0 justify-center border-t border-[var(--glass-border)] p-3">
              <button
                type="button"
                onClick={() => q.fetchNextPage()}
                disabled={q.isFetchingNextPage}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] px-3 py-1.5 font-display text-[12px] font-bold text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-overlay)] disabled:opacity-50"
              >
                {q.isFetchingNextPage ? (
                  <IconLoader2 size={14} className="animate-spin" />
                ) : (
                  <IconRefresh size={14} />
                )}
                Carregar mais
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function LogFilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full appearance-none rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-3 pr-8 font-body text-[12px] text-[var(--text-secondary)] outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--input-ring-focus)]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <IconChevronDown
        size={13}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
      />
    </label>
  );
}

function LogTableRows({
  log,
  expanded,
  resultLabel,
  onToggle,
}: {
  log: {
    id: string;
    createdAt: string;
    success: boolean;
    reason: string;
    triggerSource: string;
    selectedUserName: string | null;
    contactName: string | null;
    contactPhone: string | null;
    conversationId: string | null;
  };
  expanded: boolean;
  resultLabel: string;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className={cn(
          "cursor-pointer border-b border-[var(--glass-border)] transition-colors hover:bg-[var(--glass-bg-overlay)]",
          expanded && "bg-[var(--glass-bg-overlay)]",
        )}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full",
                log.success
                  ? "bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] text-[var(--color-success)]"
                  : "bg-[color-mix(in_srgb,var(--color-warn)_12%,transparent)] text-[var(--color-warn)]",
              )}
            >
              {log.success ? (
                <IconUserCheck size={14} />
              ) : (
                <IconClockExclamation size={14} />
              )}
            </span>
            <div className="min-w-0">
              <p className="max-w-[230px] truncate font-mono text-[12px] font-semibold text-[var(--text-primary)]">
                {log.contactPhone || log.contactName || "Atendimento"}
              </p>
              {log.contactPhone && log.contactName && (
                <p className="max-w-[230px] truncate font-body text-[10.5px] text-[var(--text-muted)]">
                  {log.contactName}
                </p>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-display text-[10.5px] font-bold",
              log.success
                ? "bg-[color-mix(in_srgb,var(--color-success)_12%,transparent)] text-[var(--color-success)]"
                : "bg-[color-mix(in_srgb,var(--color-warn)_12%,transparent)] text-[var(--color-warn)]",
            )}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {resultLabel}
          </span>
        </td>
        <td className="max-w-[260px] px-4 py-3 font-body text-[11.5px] text-[var(--text-secondary)]">
          <span className="block truncate">
            {log.success
              ? log.selectedUserName ?? "Responsável"
              : resultLabel}
          </span>
        </td>
        <td className="max-w-[180px] px-4 py-3">
          <span className="block truncate font-body text-[11px] text-[var(--text-muted)]">
            {log.triggerSource || "—"}
          </span>
        </td>
        <td className="whitespace-nowrap px-4 py-3">
          <span className="inline-flex items-center gap-2 font-body text-[11px] tabular-nums text-[var(--text-muted)]">
            {fmtDateTime(log.createdAt)}
            <IconChevronDown
              size={13}
              className={cn(
                "transition-transform duration-200",
                expanded && "rotate-180",
              )}
            />
          </span>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]">
          <td colSpan={5} className="px-4 py-3">
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.2fr_auto]">
              <LogDetail label="Motivo técnico" value={log.reason} mono />
              <LogDetail
                label="Origem / trigger"
                value={log.triggerSource || "—"}
              />
              <LogDetail label="ID do log" value={log.id} mono />
              {log.conversationId ? (
                <Link
                  href={`/inbox?c=${encodeURIComponent(log.conversationId)}`}
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-3 font-display text-[11.5px] font-bold text-[var(--brand-primary)] transition-colors hover:bg-[var(--glass-bg-strong)]"
                >
                  Abrir conversa
                  <IconExternalLink size={13} />
                </Link>
              ) : (
                <LogDetail label="Conversa" value="Não vinculada" />
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function LogDetail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-3 py-2">
      <p className="font-display text-[9.5px] font-bold uppercase tracking-[0.05em] text-[var(--text-muted)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 truncate text-[11.5px] font-semibold text-[var(--text-primary)]",
          mono ? "font-mono" : "font-body",
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

// ── Diálogo de edição (admin/manager) ───────────────────────────────────

function RedistributeDialog({
  source,
  candidates,
  onClose,
}: {
  source: DistributionResponsibleDto;
  candidates: DistributionResponsibleDto[];
  onClose: () => void;
}) {
  const mut = useRedistributeResponsible();
  const [mode, setMode] = useState<RedistributeMode>("equal");
  const [queueScope, setQueueScope] = useState<RedistributeQueueScope>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [recipientSearch, setRecipientSearch] = useState("");

  const onlineCandidates = useMemo(
    () =>
      candidates.filter(
        (c) =>
          c.participates &&
          !c.paused &&
          (c.status ?? "OFFLINE") === "ONLINE",
      ),
    [candidates],
  );

  const filteredCandidates = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase();
    const list = [...candidates].sort((a, b) => {
      const aOn = (a.status ?? "OFFLINE") === "ONLINE" ? 0 : 1;
      const bOn = (b.status ?? "OFFLINE") === "ONLINE" ? 0 : 1;
      if (aOn !== bOn) return aOn - bOn;
      return (a.name ?? a.email ?? "").localeCompare(b.name ?? b.email ?? "", "pt-BR");
    });
    if (!q) return list;
    return list.filter(
      (c) =>
        (c.name ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q),
    );
  }, [candidates, recipientSearch]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const toggleRecipient = (id: string) =>
    setSelectedIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );

  const canSubmit =
    source.queueCount > 0 &&
    (mode === "equal"
      ? onlineCandidates.length > 0
      : mode === "to_pending"
        ? true
        : selectedIds.length > 0) &&
    !mut.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    mut.mutate(
      {
        userId: source.userId,
        input: {
          mode,
          queueScope,
          ...(mode === "specific" ? { recipientUserIds: selectedIds } : {}),
        },
      },
      {
        onSuccess: ({ result }) => {
          if (result.moved === 0) {
            toast.message("Nenhum lead movido.", {
              description:
                result.total === 0
                  ? "Não havia conversas na fila selecionada."
                  : `${result.skipped} conversa(s) não puderam ser reatribuídas.`,
            });
          } else if (mode === "to_pending") {
            toast.success(
              `${result.moved} lead(s) enviados para a Fila de espera.`,
              {
                description:
                  "Serão distribuídos automaticamente quando um consultor ficar online.",
              },
            );
          } else {
            const detail = result.recipients
              .filter((r) => r.received > 0)
              .map((r) => `${r.name ?? "Consultor"}: ${r.received}`)
              .join(" · ");
            toast.success(
              `${result.moved} lead(s) redistribuído(s).`,
              detail ? { description: detail } : undefined,
            );
          }
          onClose();
        },
        onError: (err) => toast.error(err.message || "Erro ao redistribuir."),
      },
    );
  };

  const scopeOptions: { value: RedistributeQueueScope; label: string; hint: string }[] = [
    {
      value: "all",
      label: "Fila completa",
      hint: `${source.queueCount} lead(s) na fila atual`,
    },
    {
      value: "entrada",
      label: "Entrada",
      hint: "Sem resposta humana ainda",
    },
    {
      value: "aguardando",
      label: "Aguardando",
      hint: "Cliente falou por último",
    },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-6 shadow-[var(--glass-shadow)]"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-[17px] font-bold text-[var(--text-primary)]">
              Redistribuir fila
            </h2>
            <p className="font-body text-[13px] text-[var(--text-muted)]">
              De {source.name ?? source.email ?? "consultor"} · {source.queueCount}{" "}
              na fila
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

        <div className="flex flex-col gap-5">
          <fieldset>
            <legend className="mb-2 font-display text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Qual fila mover
            </legend>
            <div className="grid gap-2">
              {scopeOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 transition-colors",
                    queueScope === opt.value
                      ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/8"
                      : "border-[var(--glass-border)] hover:bg-[var(--glass-bg-overlay)]",
                  )}
                >
                  <input
                    type="radio"
                    name="queueScope"
                    className="mt-0.5"
                    checked={queueScope === opt.value}
                    onChange={() => setQueueScope(opt.value)}
                  />
                  <span>
                    <span className="block font-display text-[13px] font-bold text-[var(--text-primary)]">
                      {opt.label}
                    </span>
                    <span className="block font-body text-[12px] text-[var(--text-muted)]">
                      {opt.hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 font-display text-[12px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Destino
            </legend>
            <div className="grid gap-2">
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 transition-colors",
                  mode === "equal"
                    ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/8"
                    : "border-[var(--glass-border)] hover:bg-[var(--glass-bg-overlay)]",
                )}
              >
                <input
                  type="radio"
                  name="mode"
                  className="mt-0.5"
                  checked={mode === "equal"}
                  onChange={() => setMode("equal")}
                />
                <span>
                  <span className="block font-display text-[13px] font-bold text-[var(--text-primary)]">
                    Distribuir por igual (online)
                  </span>
                  <span className="block font-body text-[12px] text-[var(--text-muted)]">
                    {onlineCandidates.length > 0
                      ? `${onlineCandidates.length} consultor(es) online elegível(is)`
                      : "Nenhum consultor online no momento"}
                  </span>
                </span>
              </label>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 transition-colors",
                  mode === "specific"
                    ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/8"
                    : "border-[var(--glass-border)] hover:bg-[var(--glass-bg-overlay)]",
                )}
              >
                <input
                  type="radio"
                  name="mode"
                  className="mt-0.5"
                  checked={mode === "specific"}
                  onChange={() => setMode("specific")}
                />
                <span>
                  <span className="block font-display text-[13px] font-bold text-[var(--text-primary)]">
                    Escolher consultor(es)
                  </span>
                  <span className="block font-body text-[12px] text-[var(--text-muted)]">
                    Um ou mais destinatários específicos (round-robin)
                  </span>
                </span>
              </label>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 transition-colors",
                  mode === "to_pending"
                    ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/8"
                    : "border-[var(--glass-border)] hover:bg-[var(--glass-bg-overlay)]",
                )}
              >
                <input
                  type="radio"
                  name="mode"
                  className="mt-0.5"
                  checked={mode === "to_pending"}
                  onChange={() => setMode("to_pending")}
                />
                <span>
                  <span className="block font-display text-[13px] font-bold text-[var(--text-primary)]">
                    Enviar para Fila de espera
                  </span>
                  <span className="block font-body text-[12px] text-[var(--text-muted)]">
                    Remove o responsável e deixa aguardando o próximo consultor online
                    {onlineCandidates.length === 0
                      ? " (útil quando ninguém está ativo)"
                      : ""}
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          {mode === "specific" && (
            <div className="flex flex-col gap-2">
              <div className="relative">
                <IconSearch
                  size={14}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  type="search"
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  placeholder="Buscar consultor…"
                  className="w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] py-2 pl-8 pr-3 font-body text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
                />
              </div>
              <div className="max-h-48 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--glass-border)]">
                {filteredCandidates.length === 0 ? (
                  <p className="px-3 py-4 text-center font-body text-[12px] text-[var(--text-muted)]">
                    Nenhum consultor encontrado.
                  </p>
                ) : (
                  filteredCandidates.map((c) => {
                    const checked = selectedIds.includes(c.userId);
                    const presence = classifyPresence(c);
                    return (
                      <label
                        key={c.userId}
                        className={cn(
                          "flex cursor-pointer items-center gap-2.5 border-b border-[var(--glass-border-subtle)] px-3 py-2 last:border-b-0 hover:bg-[var(--glass-bg-overlay)]",
                          checked && "bg-[var(--brand-primary)]/6",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRecipient(c.userId)}
                        />
                        <UserAvatar
                          name={c.name ?? c.email}
                          imageUrl={c.avatarUrl}
                          size={28}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-display text-[12.5px] font-bold text-[var(--text-primary)]">
                            {c.name ?? c.email ?? "—"}
                          </span>
                          <span className="block truncate font-body text-[11px] text-[var(--text-muted)]">
                            {presence === "ONLINE"
                              ? "Online"
                              : presence === "AWAY"
                                ? "Ausente"
                                : presence === "INACTIVE"
                                  ? "Inativo"
                                  : "Offline"}
                            {" · "}
                            fila {c.queueCount}/{c.queueLimit || "∞"}
                          </span>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              {selectedIds.length > 0 && (
                <p className="font-body text-[12px] text-[var(--text-muted)]">
                  {selectedIds.length} selecionado(s)
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3.5 py-2 font-display text-[12.5px] font-bold text-[var(--text-secondary)] hover:bg-[var(--glass-bg-strong)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--brand-primary)] px-3.5 py-2 font-display text-[12.5px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mut.isPending ? (
                <>
                  <IconLoader2 size={14} className="animate-spin" /> Redistribuindo…
                </>
              ) : (
                <>
                  <IconArrowsShuffle size={14} /> Confirmar
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body,
  );
}

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
  const [lunchStart, setLunchStart] = useState(
    responsible.schedule?.lunchStart ?? "12:00",
  );
  const [lunchEnd, setLunchEnd] = useState(
    responsible.schedule?.lunchEnd ?? "13:00",
  );
  const [startTime, setStartTime] = useState(
    responsible.schedule?.startTime ?? "08:00",
  );
  const [endTime, setEndTime] = useState(
    responsible.schedule?.endTime ?? "18:00",
  );
  const [preLunchStop, setPreLunchStop] = useState(
    String(responsible.preLunchStopMinutes ?? 30),
  );
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
    const preMins = Math.min(
      180,
      Math.max(0, Math.floor(Number(preLunchStop) || 0)),
    );
    const toHhmm = (v: string) => v.slice(0, 5);
    updateMut.mutate(
      {
        userId: responsible.userId,
        input: {
          participates,
          paused,
          queueLimit: limit,
          type: type.trim() || null,
          departmentIds: deptIds,
          preLunchStopMinutes: preMins,
          schedule: {
            lunchStart: toHhmm(lunchStart),
            lunchEnd: toHhmm(lunchEnd),
            startTime: toHhmm(startTime),
            endTime: toHhmm(endTime),
            timezone: responsible.schedule?.timezone ?? "America/Sao_Paulo",
            weekdays: responsible.schedule?.weekdays ?? [1, 2, 3, 4, 5],
          },
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
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-6 shadow-[var(--glass-shadow)]"
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
            label="Ativo na distribuição"
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

          <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)]/40 p-3">
            <span className="font-body text-[12px] font-semibold text-[var(--text-secondary)]">
              Expediente
            </span>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-[var(--text-muted)]">Início</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-2 font-body text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
                  required
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-[var(--text-muted)]">Saída</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-2 font-body text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
                  required
                />
              </label>
            </div>
            <span className="font-body text-[12px] font-semibold text-[var(--text-secondary)]">
              Almoço
            </span>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-[var(--text-muted)]">Início</span>
                <input
                  type="time"
                  value={lunchStart}
                  onChange={(e) => setLunchStart(e.target.value)}
                  className="rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-2 font-body text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
                  required
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-[var(--text-muted)]">Fim</span>
                <input
                  type="time"
                  value={lunchEnd}
                  onChange={(e) => setLunchEnd(e.target.value)}
                  className="rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-2 font-body text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
                  required
                />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-[var(--text-muted)]">
                Parar de receber leads (min antes do almoço e da saída)
              </span>
              <input
                type="number"
                min={0}
                max={180}
                value={preLunchStop}
                onChange={(e) => setPreLunchStop(e.target.value)}
                className="rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-2 font-body text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
              />
              <span className="text-[11px] text-[var(--text-muted)]">
                Default 30. Ex.: almoço 12:00 e saída 18:00 com 30 min → para às
                11:30 e às 17:30. 0 = só no intervalo de almoço (sem pré-corte).
              </span>
            </label>
          </div>

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

/** Switch reutilizável no mesmo visual dos toggles de departamento. */
function GlassSwitch({
  checked,
  disabled,
  onClick,
}: {
  checked: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors disabled:opacity-50",
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
  );
}

function DepartmentsDistributionPanel() {
  const deptsQuery = useDepartments();
  const updateMut = useUpdateDepartment();
  const settingsQuery = useDistributionSettings();
  const updateSettings = useUpdateDistributionSettings();
  const depts = deptsQuery.data ?? [];
  const respectDepartment = settingsQuery.data?.respectDepartment ?? false;
  const saturdayEnabled = settingsQuery.data?.saturdayEnabled ?? false;
  const [satStart, setSatStart] = useState("09:00");
  const [satEnd, setSatEnd] = useState("13:00");
  useEffect(() => {
    if (settingsQuery.data) {
      setSatStart(settingsQuery.data.saturdayStart || "09:00");
      setSatEnd(settingsQuery.data.saturdayEnd || "13:00");
    }
  }, [settingsQuery.data]);

  if (deptsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-[var(--text-muted)]">
        <IconLoader2 size={18} className="animate-spin" />
        <span className="font-body text-[13px]">Carregando departamentos…</span>
      </div>
    );
  }

  if (depts.length === 0) {
    return (
      <p className="font-body text-[13px] text-[var(--text-muted)]">
        Nenhum departamento cadastrado. Crie em Configurações → Equipe →
        Departamentos.
      </p>
    );
  }

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

  const toggleRespect = () => {
    updateSettings.mutate(
      { respectDepartment: !respectDepartment },
      {
        onError: (e) =>
          toast.error(
            e instanceof Error ? e.message : "Erro ao salvar configuração.",
          ),
      },
    );
  };

  const toggleSaturday = () => {
    updateSettings.mutate(
      { saturdayEnabled: !saturdayEnabled, saturdayStart: satStart, saturdayEnd: satEnd },
      {
        onError: (e) =>
          toast.error(
            e instanceof Error ? e.message : "Erro ao salvar configuração.",
          ),
      },
    );
  };

  const saveSaturdayHours = () => {
    if (satEnd <= satStart) {
      toast.error("O fim do sábado deve ser após o início.");
      return;
    }
    updateSettings.mutate(
      { saturdayEnabled, saturdayStart: satStart, saturdayEnd: satEnd },
      {
        onSuccess: () => toast.success("Expediente de sábado salvo."),
        onError: (e) =>
          toast.error(
            e instanceof Error ? e.message : "Erro ao salvar configuração.",
          ),
      },
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Toggle mestre: respeitar o departamento da conversa quando houver. */}
      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-2.5">
        <div className="min-w-0">
          <p className="font-display text-[13px] font-bold text-[var(--text-primary)]">
            Respeitar departamento da conversa
          </p>
          <p className="font-body text-[11.5px] text-[var(--text-muted)]">
            {respectDepartment
              ? "Ligado: conversas com departamento vão só para os membros dele. Sem departamento → distribui para todos os elegíveis."
              : "Desligado: distribuição clássica — todos os atendimentos vão para todos os elegíveis, ignorando departamento."}
          </p>
        </div>
        <GlassSwitch
          checked={respectDepartment}
          disabled={updateSettings.isPending || settingsQuery.isLoading}
          onClick={toggleRespect}
        />
      </div>

      <p className="font-body text-[12px] text-[var(--text-muted)]">
        Ligue para o departamento distribuir automaticamente entre seus membros os
        leads roteados a ele. Desligado = leads desse departamento ficam na fila de
        espera.
      </p>
      <div
        className={cn(
          "grid gap-2 sm:grid-cols-2 transition-opacity",
          respectDepartment ? "" : "pointer-events-none opacity-50",
        )}
      >
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

      {/* Expediente de sábado (nível da org — todos os consultores). */}
      <div className="mt-1 flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-[13px] font-bold text-[var(--text-primary)]">
              Expediente de sábado
            </p>
            <p className="font-body text-[11.5px] text-[var(--text-muted)]">
              {saturdayEnabled
                ? `Ligado: sábado das ${satStart} às ${satEnd} para todos os consultores.`
                : "Desligado: sábado fica fora do expediente (ninguém elegível)."}
            </p>
          </div>
          <GlassSwitch
            checked={saturdayEnabled}
            disabled={updateSettings.isPending || settingsQuery.isLoading}
            onClick={toggleSaturday}
          />
        </div>
        <div
          className={cn(
            "flex flex-wrap items-center gap-2 transition-opacity",
            saturdayEnabled ? "" : "pointer-events-none opacity-50",
          )}
        >
          <label className="font-body text-[12px] text-[var(--text-muted)]">Das</label>
          <input
            type="time"
            value={satStart}
            onChange={(e) => setSatStart(e.target.value)}
            className="rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-2 py-1 font-body text-[13px] text-[var(--text-primary)]"
          />
          <label className="font-body text-[12px] text-[var(--text-muted)]">às</label>
          <input
            type="time"
            value={satEnd}
            onChange={(e) => setSatEnd(e.target.value)}
            className="rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-2 py-1 font-body text-[13px] text-[var(--text-primary)]"
          />
          <button
            type="button"
            onClick={saveSaturdayHours}
            disabled={updateSettings.isPending}
            className="ml-auto rounded-full bg-[var(--brand-primary)] px-3 py-1.5 font-display text-[12px] font-bold text-white transition-all hover:-translate-y-px disabled:opacity-50"
          >
            Salvar horário
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Estados auxiliares ──────────────────────────────────────────────────

function NotEnabledState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-12 text-center shadow-[var(--glass-shadow-sm)] backdrop-blur-md">
      <DistributionIcon size={36} className="text-[var(--text-muted)]" />
      <p className="font-display text-[16px] font-bold text-[var(--text-primary)]">
        Módulo de Distribuição não habilitado
      </p>
      <p className="max-w-md font-body text-[13px] text-[var(--text-muted)]">
        A Distribuição Inteligente é um módulo instalável. Ative-o na Central de
        Widgets para liberar esta área.
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
