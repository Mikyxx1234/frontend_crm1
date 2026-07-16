"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconClockExclamation,
  IconLoader2,
  IconPencil,
  IconPlayerPlay,
  IconRefresh,
  IconRoute,
  IconX,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { RestrictedScreen } from "@/components/crm/restricted-screen";
import { useRequireManager } from "@/hooks/use-user-role";
import { PageHeader } from "@/components/crm/page-header";
import { PagePrimaryButton } from "@/components/crm/page-toolbar";
import { PageDemoBanner } from "@/components/crm/page-demo-banner";
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
  MOCK_DISTRIBUTION_PENDING,
  MOCK_DISTRIBUTION_RESPONSIBLES,
} from "@/features/distribution/mock";
import { isPageMockMode, shouldAutoDemoEmpty } from "@/lib/page-mock-mode";

const SMART_DISTRIBUTION_SLUG = "smart_distribution";

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

  return (
    <div className="v2-screen grid grid-cols-[var(--nav-rail-w,72px)_1fr] gap-4 overflow-hidden p-4">
      {navRail ?? <NavRailV2 />}

      <main className="flex min-w-0 flex-col gap-4 overflow-y-auto pr-1">
        <PageHeader
          icon={<IconRoute size={22} />}
          title="Distribuição"
          description="Distribua leads entre consultores com regras de disponibilidade, fila e equilíbrio"
          actions={
            smartInstalled ? (
              <PagePrimaryButton
                onClick={handleTest}
                disabled={simulateMut.isPending}
              >
                {simulateMut.isPending ? (
                  <IconLoader2 size={16} className="animate-spin" />
                ) : (
                  <IconPlayerPlay size={16} />
                )}
                Testar distribuição
              </PagePrimaryButton>
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
          <>
            {useDemo && (
              <PageDemoBanner>
                Dados de exemplo — equipe, fila e elegibilidade ilustrativas para o módulo de distribuição.
              </PageDemoBanner>
            )}
            {simResult && (
              <SimulationPanel
                result={simResult}
                onClose={() => setSimResult(null)}
              />
            )}
            <PendingQueueBlock
              pending={pending}
              onRetry={handleRetry}
              retrying={retryMut.isPending}
              loading={pendingQuery.isLoading}
            />
            <ResponsiblesTable
              responsibles={responsibles}
              currentUserId={currentUserId}
              canManage={canManage}
              onEdit={(r) => setEditing(r)}
            />
          </>
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

// ── Tabela de responsáveis ──────────────────────────────────────────────

const RESP_GRID = "grid-cols-[2.4fr_1.4fr_0.7fr_0.8fr_1.2fr_0.9fr]";

/* Paleta de avatares: rotaciona pelo índice do responsável */
const AVATAR_PALETTES = [
  "bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]",
  "bg-[var(--color-success-bg)] text-[var(--color-success-dark,#0f7a5a)]",
  "bg-[var(--color-warn-bg,rgba(217,119,6,0.10))] text-[var(--color-warn,#d97706)]",
  "bg-[color-mix(in_srgb,var(--brand-secondary)_16%,transparent)] text-[var(--brand-secondary)]",
] as const;

function ResponsiblesTable({
  responsibles,
  currentUserId,
  canManage,
  onEdit,
}: {
  responsibles: DistributionResponsibleDto[];
  currentUserId: string | null;
  canManage: boolean;
  onEdit: (r: DistributionResponsibleDto) => void;
}) {
  if (responsibles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-12 text-center shadow-[var(--glass-shadow-sm)] backdrop-blur-md">
        <IconRoute size={32} className="text-[var(--text-muted)]" />
        <p className="font-display text-[15px] font-semibold text-[var(--text-primary)]">
          Nenhum responsável disponível
        </p>
        <p className="font-body text-[13px] text-[var(--text-muted)]">
          Adicione consultores à organização para distribuir leads.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-1.5 shadow-[var(--glass-shadow)] backdrop-blur-md">
      <div className={listTableHeadRowClass(cn(RESP_GRID, "gap-3 px-3 py-2"))}>
        <ListColumnLabel>Responsável</ListColumnLabel>
        <ListColumnLabel>Presença</ListColumnLabel>
        <ListColumnLabel className="text-center">Fila</ListColumnLabel>
        <ListColumnLabel className="text-center">Volume</ListColumnLabel>
        <ListColumnLabel>Elegibilidade</ListColumnLabel>
        <ListColumnLabel align="right">Ações</ListColumnLabel>
      </div>
      {responsibles.map((r, idx) => (
        <ResponsibleRow
          key={r.userId}
          r={r}
          idx={idx}
          isCurrentUser={r.userId === currentUserId}
          canManage={canManage}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}

function ResponsibleRow({
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
      {
        onError: (e) => toast.error(e.message || "Erro ao alterar status."),
      },
    );
  };

  return (
    <div className={cn("grid items-center gap-3 border-b border-[var(--glass-border-subtle)] px-3 py-2.5 transition-colors last:border-b-0 hover:bg-[var(--glass-bg-overlay)]", RESP_GRID)}>
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
        </div>
      </div>

      {/* Presença */}
      <div className="flex items-center gap-2">
        <PresenceBadge status={r.status} paused={r.paused} participates={r.participates} />
        {isCurrentUser && (
          <button
            type="button"
            onClick={toggleOwnStatus}
            disabled={statusMut.isPending}
            className="cursor-pointer rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-2.5 py-1 font-display text-[11px] font-bold text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)] disabled:opacity-50"
          >
            {statusMut.isPending
              ? "…"
              : isOnline
                ? "Ficar offline"
                : "Ficar online"}
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
      <div className="flex flex-col gap-1">
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
              <span className="pl-0.5 font-body text-[11px] text-[var(--text-muted)]">
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

// ── Painel de simulação ─────────────────────────────────────────────────

function SimulationPanel({
  result,
  onClose,
}: {
  result: DistributionResult;
  onClose: () => void;
}) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--brand-primary)]/25 bg-[var(--brand-primary)]/[0.06] p-4">
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

// ── Fila de espera (leads sem responsável elegível) ─────────────────────

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

function PendingQueueBlock({
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
  const isEmpty = pending.length === 0;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius-xl)] border backdrop-blur-md",
        isEmpty
          ? "border-[var(--glass-border)] bg-[var(--glass-bg-base,rgba(255,255,255,0.82))] shadow-[var(--glass-shadow)]"
          : "border-[var(--color-warn)]/40 bg-[var(--color-warn-bg)]/80 shadow-[var(--glass-shadow)]",
      )}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Ícone */}
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
            isEmpty
              ? "bg-[var(--color-success-bg)] text-[var(--color-success)]"
              : "bg-[var(--color-warn-bg)] text-[var(--color-warn)]",
          )}
        >
          {isEmpty ? (
            <IconCircleCheck size={18} />
          ) : (
            <IconClockExclamation size={18} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-display text-[14.5px] font-extrabold text-[var(--text-primary)]">
            Aguardando distribuição ({pending.length})
          </p>
          <p className="mt-0.5 font-body text-[12px] text-[var(--text-muted)]">
            Leads sem responsável elegível. São redistribuídos quando alguém fica online.
          </p>
        </div>

        {!isEmpty && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-[var(--color-warn)]/50 bg-[var(--color-warn-bg)] px-3 py-1.5 font-display text-[12px] font-bold text-[var(--color-warn)] transition-colors hover:bg-[var(--color-warn-bg)] disabled:opacity-50"
          >
            {retrying ? (
              <IconLoader2 size={14} className="animate-spin" />
            ) : (
              <IconRefresh size={14} />
            )}
            Reprocessar agora
          </button>
        )}
      </div>

      {isEmpty ? (
        <div className="mx-4 mb-4 flex items-center gap-2.5 rounded-[var(--radius-lg)] border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-4 py-3 font-body text-[13px] text-[var(--text-muted)]">
          <IconCircleCheck size={15} className="shrink-0 text-[var(--color-success)]" />
          {loading
            ? "Carregando fila…"
            : "Nenhum lead aguardando. Todos os leads recebidos foram distribuídos."}
        </div>
      ) : (
        <ul className="mx-4 mb-4 flex flex-col gap-1.5">
          {pending.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-[var(--glass-bg-overlay)] px-3 py-2 font-body text-[13px]"
            >
              <span className="min-w-0 truncate font-semibold text-[var(--text-primary)]">
                {p.label}
                {p.distributionType && (
                  <span className="ml-2 font-normal text-[var(--text-muted)]">
                    · {p.distributionType}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-[12px] text-[var(--text-muted)]">
                {p.attempts > 1 ? `${p.attempts} tentativas · ` : ""}
                {relativeTime(p.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
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
  const [participates, setParticipates] = useState(responsible.participates);
  const [paused, setPaused] = useState(responsible.paused);
  const [volume, setVolume] = useState(String(responsible.queueLimit));
  const [type, setType] = useState(responsible.type ?? "");

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
    // "Volume" = limite de leads (0 = sem limite). Persistido em queueLimit,
    // que é o campo que o motor usa para bloquear (QUEUE_LIMIT_REACHED).
    const limit = Math.max(0, Math.floor(Number(volume) || 0));
    updateMut.mutate(
      {
        userId: responsible.userId,
        input: {
          participates,
          paused,
          queueLimit: limit,
          type: type.trim() || null,
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
              Volume (limite de leads)
            </span>
            <input
              type="number"
              min={0}
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              className="rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-2 font-body text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
            />
            <span className="text-[11px] text-[var(--text-muted)]">
              Máximo de leads que o responsável pode acumular. 0 = sem limite.
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
          "relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors",
          checked ? "bg-[var(--brand-primary)]" : "bg-[var(--glass-border)]",
        )}
      >
        {/* Thumb ancorado às bordas (left/right) em vez de translate-x fixo —
            assim a bolinha nunca vaza pra fora da trilha. */}
        <span
          className={cn(
            "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-all",
            checked ? "right-0.5" : "left-0.5",
          )}
        />
      </button>
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
