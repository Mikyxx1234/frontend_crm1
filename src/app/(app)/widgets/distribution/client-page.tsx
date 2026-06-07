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

import { NavRail } from "@/components/crm/nav-rail";
import { PageHeader } from "@/components/crm/page-header";
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

const SMART_DISTRIBUTION_SLUG = "smart_distribution";

interface DistributionClientPageProps {
  navRail?: React.ReactNode;
}

export default function DistributionClientPage({
  navRail,
}: DistributionClientPageProps = {}) {
  const { data: session, status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";
  const currentUserId = session?.user?.id ?? null;
  const role = session?.user?.role;
  const canManage = role === "ADMIN" || role === "MANAGER";

  const widgetsQuery = useWidgets(isAuthenticated);
  const smartInstalled =
    widgetsQuery.data?.items.find((w) => w.slug === SMART_DISTRIBUTION_SLUG)
      ?.installed ?? false;

  const respQuery = useDistributionResponsibles(isAuthenticated && smartInstalled);
  const pendingQuery = usePendingDistributions(isAuthenticated && smartInstalled);
  const simulateMut = useSimulateDistribution();
  const retryMut = useRetryPending();

  const [editing, setEditing] = useState<DistributionResponsibleDto | null>(null);
  const [simResult, setSimResult] = useState<DistributionResult | null>(null);

  const responsibles = respQuery.data?.responsibles ?? [];
  const pending = pendingQuery.data?.pending ?? [];

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

  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      {navRail ?? <NavRail />}

      <main className="flex min-w-0 flex-col gap-4 overflow-y-auto pr-1">
        <PageHeader
          icon={<IconRoute size={22} />}
          title="Distribuição"
          description="Distribua leads entre consultores com regras de disponibilidade, fila e equilíbrio"
          actions={
            smartInstalled ? (
              <button
                type="button"
                onClick={handleTest}
                disabled={simulateMut.isPending}
                className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--brand-primary)] px-4 py-2 font-display text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(91,111,245,0.35)] transition-all hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
              >
                {simulateMut.isPending ? (
                  <IconLoader2 size={16} className="animate-spin" />
                ) : (
                  <IconPlayerPlay size={16} />
                )}
                Testar distribuição
              </button>
            ) : undefined
          }
        />

        {widgetsQuery.isLoading ? (
          <SkeletonState />
        ) : !smartInstalled ? (
          <NotEnabledState />
        ) : respQuery.isLoading ? (
          <SkeletonState />
        ) : respQuery.error ? (
          <ErrorState message={respQuery.error.message} />
        ) : (
          <>
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
    <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] shadow-[var(--glass-shadow-sm)] backdrop-blur-md">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[var(--glass-border)] font-body text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
            <th className="px-4 py-3 font-semibold">Responsável</th>
            <th className="px-4 py-3 font-semibold">Presença</th>
            <th className="px-4 py-3 text-center font-semibold">Fila</th>
            <th className="px-4 py-3 text-center font-semibold">Volume</th>
            <th className="px-4 py-3 font-semibold">Elegibilidade</th>
            {canManage && <th className="px-4 py-3 text-right font-semibold">Ações</th>}
          </tr>
        </thead>
        <tbody>
          {responsibles.map((r) => (
            <ResponsibleRow
              key={r.userId}
              r={r}
              isCurrentUser={r.userId === currentUserId}
              canManage={canManage}
              onEdit={onEdit}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResponsibleRow({
  r,
  isCurrentUser,
  canManage,
  onEdit,
}: {
  r: DistributionResponsibleDto;
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

  const toggleOwnStatus = () => {
    statusMut.mutate(
      { userId: r.userId, status: isOnline ? "OFFLINE" : "ONLINE" },
      {
        onError: (e) => toast.error(e.message || "Erro ao alterar status."),
      },
    );
  };

  return (
    <tr className="border-b border-[var(--glass-border)] last:border-0 font-body text-[13px] text-[var(--text-primary)]">
      {/* Responsável */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)]/12 font-display text-[12px] font-bold text-[var(--brand-primary)]">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{r.name ?? "Sem nome"}</p>
            <p className="truncate text-[12px] text-[var(--text-muted)]">
              {r.email ?? "—"} · {r.role}
            </p>
          </div>
        </div>
      </td>

      {/* Presença */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <PresenceBadge status={r.status} paused={r.paused} participates={r.participates} />
          {isCurrentUser && (
            <button
              type="button"
              onClick={toggleOwnStatus}
              disabled={statusMut.isPending}
              className="cursor-pointer rounded-full border border-[var(--glass-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] disabled:opacity-50"
            >
              {statusMut.isPending
                ? "..."
                : isOnline
                  ? "Ficar offline"
                  : "Ficar online"}
            </button>
          )}
        </div>
      </td>

      {/* Fila — leads atuais com o responsável */}
      <td className="px-4 py-3 text-center font-display font-bold">{r.queueCount}</td>

      {/* Volume — limite de leads (∞ = sem limite) */}
      <td className="px-4 py-3 text-center text-[var(--text-muted)]">
        {r.queueLimit > 0 ? r.queueLimit : "∞"}
      </td>

      {/* Elegibilidade */}
      <td className="px-4 py-3">
        {r.eligible ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-online)]/12 px-2.5 py-1 text-[12px] font-semibold text-[var(--color-online)]">
            <IconCircleCheck size={14} /> Elegível
          </span>
        ) : (
          <span className="flex flex-col items-start gap-1">
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[var(--color-danger)]/10 px-2.5 py-1 text-[12px] font-semibold text-[var(--color-danger-text)]">
              <IconAlertTriangle size={14} /> Indisponível
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">
              {r.blockedReasons.map((b) => BLOCK_REASON_LABELS[b]).join(" · ")}
            </span>
          </span>
        )}
      </td>

      {/* Ações */}
      {canManage && (
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={() => onEdit(r)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[var(--glass-border)] px-3 py-1.5 text-[12px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-overlay)]"
          >
            <IconPencil size={14} /> Editar
          </button>
        </td>
      )}
    </tr>
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
        "rounded-[var(--radius-xl)] border p-4 backdrop-blur-md",
        isEmpty
          ? "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] shadow-[var(--glass-shadow-sm)]"
          : "border-amber-400/30 bg-amber-400/[0.06] shadow-[var(--glass-shadow-sm)]"
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconClockExclamation
            size={18}
            className={isEmpty ? "text-[var(--text-muted)]" : "text-amber-500"}
          />
          <div>
            <p className="font-display text-[14px] font-bold text-[var(--text-primary)]">
              Aguardando distribuição ({pending.length})
            </p>
            <p className="font-body text-[12px] text-[var(--text-muted)]">
              Leads sem responsável elegível. São redistribuídos quando alguém
              fica online.
            </p>
          </div>
        </div>
        {!isEmpty && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-amber-400/40 px-3 py-1.5 font-display text-[12px] font-bold text-amber-600 transition-colors hover:bg-amber-400/10 disabled:opacity-50"
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
        <p className="font-body text-[13px] text-[var(--text-muted)]">
          {loading
            ? "Carregando fila…"
            : "Nenhum lead aguardando. Todos os leads recebidos foram distribuídos."}
        </p>
      ) : (
      <ul className="flex flex-col gap-1.5">
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
