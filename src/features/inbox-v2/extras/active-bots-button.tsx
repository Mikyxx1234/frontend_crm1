"use client";

/*
 * ActiveBotsButton — ícone ao lado da composer (inbox e deal).
 * Abre um card com as automações do contato (ativas + histórico),
 * accordion por item com mini-fluxo, métricas e histórico.
 * Ações: adicionar (picker), interromper, reexecutar e editar.
 * Vínculo por contato; SSE `automation_state` invalida a lista.
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  IconRobot,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPencil,
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconPlus,
  IconTrendingUp,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api";
import { TooltipGlass } from "@/components/crm/tooltip-glass";
import {
  blockChipStyle,
  blockKeyForStepType,
  getBlockMeta,
} from "@/components/crm/flow-block-icon";
import {
  useCancelAutomation,
  useContactActiveAutomations,
  useContactAutomationHistory,
  contactActiveAutomationsKey,
  contactAutomationHistoryKey,
} from "@/features/inbox-v2/hooks";
import type {
  ActiveAutomationDto,
  AutomationHistoryDto,
} from "@/features/inbox-v2/api/conversations";
import { useAutomation, useAutomationStats } from "@/features/automations-v2/hooks";
import { usePortalPopover } from "@/features/pipeline-v2/extras/use-portal-popover";
import { AgentAutomationPickerModal } from "./agent-automation-picker-modal";

const POPOVER_W = 400;
const POPOVER_GAP = 8;
const POPOVER_MARGIN = 8;

/**
 * Ancora o card acima do robô (`side="top"`) alinhado à direita do
 * trigger (`align="end"`). Usa `bottom` em vez de altura estimada —
 * o accordion varia e um `top` com 440px fictícios afastava o painel
 * para o alto da tela.
 */
function computeAboveEndPosition(
  rect: DOMRect | null,
  popoverWidth: number,
): { bottom: number; left: number } {
  if (!rect) return { bottom: 0, left: 0 };
  const viewportW = typeof window !== "undefined" ? window.innerWidth : 1200;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 800;

  const bottom = Math.max(POPOVER_MARGIN, viewportH - rect.top + POPOVER_GAP);
  let left = rect.right - popoverWidth;
  left = Math.max(
    POPOVER_MARGIN,
    Math.min(left, viewportW - popoverWidth - POPOVER_MARGIN),
  );
  return { bottom, left };
}

type RowStatus = "RUNNING" | "PAUSED" | "COMPLETED" | "TIMED_OUT";

type PanelRow = {
  key: string;
  automationId: string;
  name: string;
  status: RowStatus;
  contextId: string | null;
  stepLabel: string | null;
};

interface ActiveBotsButtonProps {
  contactId: string | null;
  conversationId?: string | null;
  /**
   * `inline` = botão na barra do composer (ao lado do enviar).
   * Sem `inline` = overlay absoluto (uso legado).
   */
  inline?: boolean;
  className?: string;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} ${hh}:${mi}`;
}

function formatDuration(startIso: string, endIso: string): string {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return "";
  const totalSec = Math.round((end - start) / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const totalMin = Math.floor(totalSec / 60);
  if (totalMin < 60) {
    const sec = totalSec % 60;
    return sec ? `${totalMin}min ${sec}s` : `${totalMin}min`;
  }
  const hours = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  return min ? `${hours}h ${min}min` : `${hours}h`;
}

function badgeFor(status: RowStatus): { label: string; className: string; dot?: boolean } {
  switch (status) {
    case "RUNNING":
      return {
        label: "RODANDO",
        className:
          "bg-(--color-success-bg) text-(--color-success-text)",
        dot: true,
      };
    case "PAUSED":
      return {
        label: "PAUSADA",
        className:
          "bg-(--color-warn-bg) text-(--color-warn)",
      };
    case "COMPLETED":
      return {
        label: "CONCLUÍDA",
        className: "bg-(--color-success-bg) text-(--color-success-text)",
      };
    case "TIMED_OUT":
      return {
        label: "COM ERRO",
        className:
          "bg-(--color-danger-bg) text-(--color-danger-text)",
      };
  }
}

function subtextFor(row: PanelRow): string {
  switch (row.status) {
    case "RUNNING":
      return row.stepLabel || "Em execução";
    case "PAUSED":
      return row.stepLabel || "Aguardando";
    case "COMPLETED":
      return "Fluxo concluído";
    case "TIMED_OUT":
      return "Tempo esgotado";
  }
}

function buildRows(
  active: ActiveAutomationDto[],
  history: AutomationHistoryDto[],
): PanelRow[] {
  const activeIds = new Set(active.map((a) => a.automationId));
  const rows: PanelRow[] = active.map((bot) => ({
    key: bot.contextId,
    automationId: bot.automationId,
    name: bot.name,
    status: bot.status,
    contextId: bot.contextId,
    stepLabel: bot.stepLabel,
  }));

  const latestByAuto = new Map<string, AutomationHistoryDto>();
  for (const h of history) {
    if (activeIds.has(h.automationId)) continue;
    const prev = latestByAuto.get(h.automationId);
    if (!prev || h.finishedAt > prev.finishedAt) latestByAuto.set(h.automationId, h);
  }
  for (const h of latestByAuto.values()) {
    rows.push({
      key: h.contextId,
      automationId: h.automationId,
      name: h.name,
      status: h.status,
      contextId: null,
      stepLabel: null,
    });
  }
  return rows;
}

async function runAutomation(
  automationId: string,
  payload: { contactId: string; conversationId?: string | null },
): Promise<{ automationName?: string }> {
  const res = await fetch(apiUrl(`/api/automations/${automationId}/run`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contactId: payload.contactId,
      conversationId: payload.conversationId ?? undefined,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    automationName?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(typeof json?.message === "string" ? json.message : "Falha ao executar");
  }
  return { automationName: json.automationName };
}

export function ActiveBotsButton({
  contactId,
  conversationId = null,
  inline,
  className,
}: ActiveBotsButtonProps) {
  const { open, rect, triggerRef, popoverRef, toggle, close } = usePortalPopover();
  const { data: active = [], isLoading } = useContactActiveAutomations(contactId);
  const { data: history = [], isLoading: loadingHistory } =
    useContactAutomationHistory(contactId, open);
  const cancel = useCancelAutomation(contactId);
  const qc = useQueryClient();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);

  const rows = useMemo(() => buildRows(active, history), [active, history]);

  useEffect(() => {
    if (!open) {
      setExpandedId(null);
      return;
    }
    setExpandedId((prev) => {
      if (prev && rows.some((r) => r.key === prev)) return prev;
      const running = rows.find((r) => r.status === "RUNNING");
      return running?.key ?? rows[0]?.key ?? null;
    });
  }, [open, rows]);

  const count = active.length;
  const hasActive = count > 0;
  const pos = computeAboveEndPosition(rect, POPOVER_W);

  function openPicker() {
    close();
    setPickerOpen(true);
  }

  async function handleReplay(row: PanelRow) {
    if (!contactId || runningId) return;
    setRunningId(row.automationId);
    try {
      const result = await runAutomation(row.automationId, {
        contactId,
        conversationId,
      });
      toast.success(`Automação disparada: ${result.automationName ?? row.name}`);
      qc.invalidateQueries({ queryKey: contactActiveAutomationsKey(contactId) });
      qc.invalidateQueries({ queryKey: contactAutomationHistoryKey(contactId) });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao executar automação");
    } finally {
      setRunningId(null);
    }
  }

  const button = (
    <button
      ref={triggerRef}
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggle();
      }}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={
        hasActive ? `${count} automação(ões) em execução` : "Automações"
      }
      title="Automações"
      className={cn(
        "flex cursor-pointer items-center justify-center rounded-full border transition-all",
        inline
          ? "absolute inset-0"
          : "relative h-10 w-10 shadow-(--glass-shadow-sm) backdrop-blur-md hover:scale-[1.06]",
        hasActive
          ? "border-violet-500/30 bg-violet-500/15 text-violet-600 v2-dark:text-violet-300"
          : "border-(--glass-border) bg-(--glass-bg-overlay) text-(--text-muted) hover:text-(--brand-primary)",
      )}
    >
      <IconRobot
        size={inline ? 24 : 19}
        stroke={1.75}
        className={inline ? "block shrink-0" : undefined}
      />
    </button>
  );

  const badges = hasActive ? (
    <>
      <span className="pointer-events-none absolute -right-0.5 -top-0.5 z-10 flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-500 opacity-70" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-500" />
      </span>
      <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 z-10 grid min-h-3.5 min-w-3.5 place-items-center rounded-full bg-violet-600 px-0.5 text-[9px] font-bold leading-none text-white ring-2 ring-(--glass-bg-strong)">
        {count}
      </span>
    </>
  ) : null;

  return (
    <div
      className={cn(
        inline
          ? "relative flex size-9 shrink-0 items-center justify-center self-center overflow-visible"
          : "absolute bottom-[4.75rem] right-6 z-20",
        className,
      )}
    >
      {inline ? (
        button
      ) : (
        <TooltipGlass label="Automações" side="top">
          {button}
        </TooltipGlass>
      )}
      {badges}

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popoverRef}
              role="dialog"
              aria-label="Automações"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "fixed",
                bottom: pos.bottom,
                left: pos.left,
                width: POPOVER_W,
                isolation: "isolate",
              }}
              className="z-(--z-popover) overflow-hidden rounded-[var(--radius-lg)] border border-(--glass-border) bg-(--glass-bg-modal) shadow-(--glass-shadow-lg) backdrop-blur-xl"
            >
              <div className="flex items-center gap-2 border-b border-(--glass-border-subtle) px-3.5 py-2.5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-(--color-primary-soft) text-(--brand-primary)">
                  <IconRobot size={15} stroke={2} />
                </span>
                <span className="font-display text-[13px] font-bold text-(--text-primary)">
                  Automações
                </span>
                {hasActive && (
                  <span className="rounded-full bg-(--color-primary-soft) px-1.5 py-px text-[10px] font-bold text-(--brand-primary-dark) v2-dark:text-(--brand-primary-light)">
                    {count} ativa{count === 1 ? "" : "s"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={openPicker}
                  className="ml-auto inline-flex cursor-pointer items-center gap-0.5 text-[12.5px] font-semibold text-(--brand-primary) transition-colors hover:text-(--brand-primary-dark)"
                >
                  <IconPlus size={13} stroke={2.4} />
                  Adicionar
                </button>
              </div>

              <div className="max-h-[min(420px,60vh)] overflow-y-auto">
                {(isLoading || (open && loadingHistory && rows.length === 0)) && (
                  <p className="px-3.5 py-4 text-[12.5px] text-(--text-muted)">
                    Carregando…
                  </p>
                )}

                {!isLoading && rows.length === 0 && !loadingHistory && (
                  <div className="flex flex-col items-center px-5 py-7 text-center">
                    <span className="mb-2.5 flex size-10 items-center justify-center rounded-2xl bg-(--color-primary-soft) text-(--brand-primary)">
                      <IconRobot size={20} stroke={1.8} />
                    </span>
                    <p className="text-[13px] font-semibold text-(--text-primary)">
                      Nenhuma automação neste contato
                    </p>
                    <p className="mt-1 text-[12px] leading-snug text-(--text-muted)">
                      Dispare um fluxo para acompanhar passos, execuções e histórico aqui.
                    </p>
                    <button
                      type="button"
                      onClick={openPicker}
                      className="mt-3 inline-flex cursor-pointer items-center gap-1 rounded-full bg-(--brand-primary) px-3 py-1.5 text-[12px] font-semibold text-white shadow-(--glass-shadow-sm) transition-opacity hover:opacity-90"
                    >
                      <IconPlus size={13} stroke={2.4} />
                      Adicionar
                    </button>
                  </div>
                )}

                {rows.length > 0 && (
                  <ul>
                    {rows.map((row, i) => (
                      <AutomationRow
                        key={row.key}
                        row={row}
                        history={history.filter(
                          (h) => h.automationId === row.automationId,
                        )}
                        expanded={expandedId === row.key}
                        onToggle={() =>
                          setExpandedId((id) => (id === row.key ? null : row.key))
                        }
                        showDivider={i < rows.length - 1}
                        cancelPending={cancel.isPending}
                        runningReplay={runningId === row.automationId}
                        onPause={() => {
                          if (row.contextId) cancel.mutate(row.contextId);
                        }}
                        onPlay={() => void handleReplay(row)}
                      />
                    ))}
                  </ul>
                )}

                {cancel.isError && (
                  <p className="px-3.5 py-2 text-[11px] text-(--color-warning)">
                    {cancel.error?.message ?? "Erro ao interromper a automação."}
                  </p>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}

      <AgentAutomationPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        conversationId={conversationId}
        contactId={contactId}
      />
    </div>
  );
}

function AutomationRow({
  row,
  history,
  expanded,
  onToggle,
  showDivider,
  cancelPending,
  runningReplay,
  onPause,
  onPlay,
}: {
  row: PanelRow;
  history: AutomationHistoryDto[];
  expanded: boolean;
  onToggle: () => void;
  showDivider: boolean;
  cancelPending: boolean;
  runningReplay: boolean;
  onPause: () => void;
  onPlay: () => void;
}) {
  const badge = badgeFor(row.status);
  const isLive = row.status === "RUNNING" || row.status === "PAUSED";
  const Chevron = expanded ? IconChevronUp : IconChevronDown;

  return (
    <li className={cn(showDivider && "border-b border-(--glass-border-subtle)")}>
      <div className="flex items-start gap-1.5 px-2.5 py-2.5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? `Recolher ${row.name}` : `Expandir ${row.name}`}
          className="mt-0.5 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-(--text-muted) transition-colors hover:bg-(--glass-bg-strong) hover:text-(--text-secondary)"
        >
          <Chevron size={14} stroke={2.2} />
        </button>

        <button
          type="button"
          onClick={onToggle}
          className="min-w-0 flex-1 cursor-pointer text-left"
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[13px] font-bold text-(--text-primary)">
              {row.name}
            </span>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wide",
                badge.className,
              )}
            >
              {badge.dot && (
                <span className="size-1.5 rounded-full bg-(--color-success)" />
              )}
              {badge.label}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11.5px] text-(--text-muted)">
            {subtextFor(row)}
          </p>
        </button>

        <div className="flex shrink-0 items-center gap-0.5 pt-0.5">
          {isLive ? (
            <TooltipGlass label="Interromper automação" side="top">
              <button
                type="button"
                disabled={cancelPending}
                onClick={onPause}
                aria-label={`Interromper ${row.name}`}
                className="flex size-7 cursor-pointer items-center justify-center rounded-full bg-(--color-warning-soft) text-(--color-warning) transition-colors hover:bg-(--color-warning)/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <IconPlayerPauseFilled size={13} />
              </button>
            </TooltipGlass>
          ) : (
            <TooltipGlass label="Executar novamente" side="top">
              <button
                type="button"
                disabled={runningReplay}
                onClick={onPlay}
                aria-label={`Executar ${row.name}`}
                className="flex size-7 cursor-pointer items-center justify-center rounded-full bg-(--color-warning-soft) text-(--color-warning) transition-colors hover:bg-(--color-warning)/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <IconPlayerPlayFilled size={13} />
              </button>
            </TooltipGlass>
          )}
          <TooltipGlass label="Editar automação" side="top">
            <Link
              href={`/automations/${row.automationId}`}
              aria-label={`Editar ${row.name}`}
              className="flex size-7 items-center justify-center rounded-md text-(--text-muted) transition-colors hover:bg-(--glass-bg-strong) hover:text-(--text-secondary)"
            >
              <IconPencil size={14} stroke={1.8} />
            </Link>
          </TooltipGlass>
        </div>
      </div>

      {expanded && (
        <ExpandedBody
          automationId={row.automationId}
          history={history}
          stepLabel={row.stepLabel}
          live={isLive}
        />
      )}
    </li>
  );
}

function ExpandedBody({
  automationId,
  history,
  stepLabel,
  live,
}: {
  automationId: string;
  history: AutomationHistoryDto[];
  stepLabel: string | null;
  live: boolean;
}) {
  const { data, isLoading } = useAutomation(automationId);
  const { data: stats } = useAutomationStats(automationId, true);
  const stepTypes = useMemo(() => {
    const types = data?.steps?.map((s) => s.type) ?? data?.stepTypes ?? [];
    return types.map((t) => blockKeyForStepType(t));
  }, [data]);
  const activeIndex = live ? findActiveStepIndex(stepTypes, stepLabel) : -1;
  const metrics = useMemo(
    () => buildPanelMetrics(stepTypes.length || data?.stepCount, history, stats),
    [data?.stepCount, history, stats, stepTypes.length],
  );

  return (
    <div className="space-y-3 px-3.5 pb-3 pl-10">
      <section>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-(--text-muted)">
          Fluxo
        </p>
        {isLoading ? (
          <p className="text-[11.5px] text-(--text-muted)">Carregando fluxo…</p>
        ) : stepTypes.length === 0 ? (
          <p className="text-[11.5px] text-(--text-muted)">Sem passos definidos.</p>
        ) : (
          <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <FlowStrip stepTypes={stepTypes} activeIndex={activeIndex} />
          </div>
        )}
      </section>

      <div className="grid grid-cols-3 overflow-hidden rounded-lg bg-(--glass-bg-overlay) text-center">
        <MetricCell value={metrics.steps} label="Passos" />
        <MetricCell
          value={metrics.runs}
          label="Execuções"
          className="border-x border-(--glass-border-subtle)"
        />
        <MetricCell
          value={metrics.rate == null ? "—" : `${metrics.rate}%`}
          label="Taxa de sucesso"
          icon={
            metrics.rate != null && metrics.rate >= 70 ? (
              <IconTrendingUp size={11} className="text-(--color-success)" />
            ) : undefined
          }
        />
      </div>

      <section>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-(--text-muted)">
          Histórico
        </p>
        {history.length === 0 ? (
          <p className="text-[11.5px] text-(--text-muted)">Sem execuções anteriores.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {history.slice(0, 5).map((h) => {
              const failed = h.status === "TIMED_OUT";
              const duration = formatDuration(h.startedAt, h.finishedAt);
              return (
                <li
                  key={h.contextId}
                  className="flex items-center justify-between gap-2 py-0.5"
                >
                  <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-(--text-muted)">
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        failed ? "bg-(--color-danger)" : "bg-(--color-success)",
                      )}
                    />
                    <span className="tabular-nums">{formatWhen(h.finishedAt)}</span>
                    {duration && (
                      <span className="inline-flex items-center gap-0.5 tabular-nums">
                        <IconClock size={10} stroke={1.75} />
                        {duration}
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wide",
                      failed
                        ? "bg-(--color-danger-bg) text-(--color-danger-text)"
                        : "bg-(--color-success-bg) text-(--color-success-text)",
                    )}
                  >
                    {failed ? "COM ERRO" : "CONCLUÍDA"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function MetricCell({
  value,
  label,
  icon,
  className,
}: {
  value: string | number;
  label: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-0.5 px-1.5 py-2", className)}>
      <span className="inline-flex items-center gap-0.5 font-display text-[13px] font-bold tabular-nums text-(--text-primary)">
        {icon}
        {value}
      </span>
      <span className="text-[9px] font-semibold uppercase tracking-wider text-(--text-muted)">
        {label}
      </span>
    </div>
  );
}

function buildPanelMetrics(
  stepCount: number | undefined,
  history: AutomationHistoryDto[],
  stats: { trigger?: Record<string, number> } | undefined,
) {
  const steps = stepCount && stepCount > 0 ? stepCount : "—";
  const t = stats?.trigger ?? {};
  const completed = t.COMPLETED ?? 0;
  const failed =
    (t.FAILED ?? 0) + (t.TIMED_OUT ?? 0) + (t.COMPLETED_WITH_ERRORS ?? 0);
  const started = t.STARTED ?? 0;
  const fromStats = completed + failed + started;
  const runs = fromStats > 0 ? fromStats : history.length;
  const ok = fromStats > 0 ? completed : history.filter((h) => h.status === "COMPLETED").length;
  const rate = runs > 0 ? Math.round((ok / runs) * 100) : null;
  return { steps, runs, rate };
}

function findActiveStepIndex(stepTypes: string[], stepLabel: string | null): number {
  if (!stepLabel) return -1;
  const needle = normalizeLabel(stepLabel);
  if (!needle) return -1;
  const exact = stepTypes.findIndex((t) => normalizeLabel(getBlockMeta(t).label) === needle);
  if (exact >= 0) return exact;
  return stepTypes.findIndex((t) => {
    const label = normalizeLabel(getBlockMeta(t).label);
    return label.length >= 5 && (needle.includes(label) || label.includes(needle));
  });
}

function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Faixa circular de ícones do fluxo (definição da automação). */
function FlowStrip({
  stepTypes,
  activeIndex,
}: {
  stepTypes: string[];
  activeIndex: number;
}) {
  const visible = stepTypes.slice(0, 8);
  const overflow = stepTypes.length - visible.length;
  return (
    <div className="flex items-center">
      {visible.map((type, i) => {
        const meta = getBlockMeta(type);
        const Icon = meta.Icon;
        const active = i === activeIndex;
        return (
          <div key={`${type}-${i}`} className="flex items-center">
            <TooltipGlass label={meta.label} side="top">
              <span className="relative flex">
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border border-(--glass-border-subtle) transition-shadow",
                    active && "ring-2 ring-(--brand-primary) ring-offset-1 ring-offset-(--glass-bg-modal)",
                  )}
                  style={blockChipStyle(type)}
                >
                  <Icon size={13} stroke={2} />
                </span>
                <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-slate-500 px-0.5 text-[8px] font-bold leading-none text-white">
                  {i + 1}
                </span>
              </span>
            </TooltipGlass>
            {(i < visible.length - 1 || overflow > 0) && (
              <span
                className="mx-0.5 h-px w-2.5 shrink-0 bg-(--glass-border)"
                aria-hidden
              />
            )}
          </div>
        );
      })}
      {overflow > 0 && (
        <span className="flex h-7 min-w-7 items-center justify-center rounded-full border border-(--glass-border-subtle) bg-(--glass-bg-overlay) px-1.5 text-[10px] font-semibold text-(--text-muted)">
          +{overflow}
        </span>
      )}
    </div>
  );
}
