"use client";

/*
 * ActiveBotsButton — ícone flutuante ao lado da composer (inbox e deal).
 * Ao clicar, abre um card (estilo Kommo "Bots ativos") com duas seções:
 *  - Ativas: automações vivas (RUNNING/PAUSED) do contato, cada uma com
 *    opção de INTERROMPER.
 *  - Histórico: execuções encerradas (concluídas/expiradas), carregadas
 *    sob demanda ao abrir.
 * Vínculo por contato (AutomationContext não referencia conversa).
 * Atualiza em tempo real via SSE `automation_state`.
 */

import { createPortal } from "react-dom";
import { IconRobot, IconPlayerStopFilled, IconHistory } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { TooltipGlass } from "@/components/crm/tooltip-glass";
import {
  useCancelAutomation,
  useContactActiveAutomations,
  useContactAutomationHistory,
} from "@/features/inbox-v2/hooks";
import {
  computePopoverPosition,
  usePortalPopover,
} from "@/features/pipeline-v2/extras/use-portal-popover";

interface ActiveBotsButtonProps {
  contactId: string | null;
  /**
   * `inline` = renderiza como um botão comum na barra do composer (ao lado
   * do enviar). Sem `inline` = overlay absoluto (uso legado). O popover
   * usa portal com posição calculada, então funciona nos dois modos.
   */
  inline?: boolean;
  /** Ajuste fino de posicionamento/estilo do wrapper. */
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

export function ActiveBotsButton({ contactId, inline, className }: ActiveBotsButtonProps) {
  const { open, rect, triggerRef, popoverRef, toggle, close } = usePortalPopover();
  const { data: active = [], isLoading } = useContactActiveAutomations(contactId);
  // Histórico só carrega quando o card abre (evita request em toda conversa).
  const { data: history = [], isLoading: loadingHistory } =
    useContactAutomationHistory(contactId, open);
  const cancel = useCancelAutomation(contactId);

  const count = active.length;
  const hasActive = count > 0;
  const pos = computePopoverPosition(rect, 360, 320);

  return (
    <div
      className={cn(
        inline ? "relative shrink-0" : "absolute bottom-[4.75rem] right-6 z-20",
        className,
      )}
    >
      <TooltipGlass label="Automações" side="top">
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
          className={cn(
            "relative flex cursor-pointer items-center justify-center rounded-full border transition-all",
            inline
              ? "h-9 w-9"
              : "h-10 w-10 shadow-(--glass-shadow-sm) backdrop-blur-md hover:scale-[1.06]",
            hasActive
              ? "border-violet-500/30 bg-violet-500/15 text-violet-600 v2-dark:text-violet-300"
              : "border-(--glass-border) bg-(--glass-bg-overlay) text-(--text-muted) hover:text-(--brand-primary)",
          )}
        >
          <IconRobot size={19} />
          {hasActive && (
            <>
              <span className="absolute -right-0.5 -top-0.5 flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-500 opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-500" />
              </span>
              <span className="absolute -bottom-1 -right-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-violet-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-(--glass-bg-overlay)">
                {count}
              </span>
            </>
          )}
        </button>
      </TooltipGlass>

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
                top: pos.top,
                left: pos.left,
                width: 360,
                isolation: "isolate",
              }}
              className="z-(--z-popover) rounded-lg border border-(--glass-border) bg-(--glass-bg-modal) p-3 shadow-(--glass-shadow-lg) backdrop-blur-xl"
            >
              <div className="mb-2 flex items-center gap-2">
                <IconRobot size={16} className="text-violet-500" />
                <span className="font-display text-[13px] font-bold text-(--text-primary)">
                  Automações
                </span>
                {hasActive && (
                  <span className="rounded-full bg-violet-500/15 px-1.5 py-px text-[10px] font-bold text-violet-600 v2-dark:text-violet-300">
                    {count} ativa{count > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* ── Ativas ── */}
              {isLoading && (
                <p className="px-1 py-3 text-[12.5px] text-(--text-muted)">
                  Carregando…
                </p>
              )}

              {!isLoading && !hasActive && (
                <p className="px-1 py-2 text-[12.5px] text-(--text-muted)">
                  Nenhuma automação em execução.
                </p>
              )}

              {!isLoading && hasActive && (
                <ul className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
                  {active.map((bot) => (
                    <li
                      key={bot.contextId}
                      className="flex items-center gap-2 rounded-md border border-(--glass-border-subtle) bg-(--glass-bg-overlay) px-2.5 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[12.5px] font-semibold text-(--text-primary)">
                            {bot.name}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wide",
                              bot.status === "PAUSED"
                                ? "bg-amber-500/15 text-amber-600 v2-dark:text-amber-400"
                                : "bg-emerald-500/15 text-emerald-600 v2-dark:text-emerald-400",
                            )}
                          >
                            {bot.status === "PAUSED" ? "Pausada" : "Rodando"}
                          </span>
                        </div>
                        {bot.stepLabel && (
                          <p className="truncate text-[11px] text-(--text-muted)">
                            {bot.stepLabel}
                          </p>
                        )}
                      </div>
                      <TooltipGlass label="Interromper automação" side="top">
                        <button
                          type="button"
                          disabled={cancel.isPending}
                          onClick={() => cancel.mutate(bot.contextId)}
                          aria-label={`Interromper ${bot.name}`}
                          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-(--color-warning) transition-colors hover:bg-(--color-warning)/12 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <IconPlayerStopFilled size={14} />
                        </button>
                      </TooltipGlass>
                    </li>
                  ))}
                </ul>
              )}

              {cancel.isError && (
                <p className="mt-2 px-1 text-[11px] text-(--color-warning)">
                  {cancel.error?.message ?? "Erro ao interromper a automação."}
                </p>
              )}

              {/* ── Histórico ── */}
              <div className="mt-3 mb-1.5 flex items-center gap-1.5 border-t border-(--glass-border-subtle) pt-2.5">
                <IconHistory size={13} className="text-(--text-muted)" />
                <span className="font-display text-[11px] font-bold uppercase tracking-wide text-(--text-muted)">
                  Histórico
                </span>
              </div>

              {loadingHistory && (
                <p className="px-1 py-2 text-[12px] text-(--text-muted)">
                  Carregando histórico…
                </p>
              )}

              {!loadingHistory && history.length === 0 && (
                <p className="px-1 py-1 text-[12px] text-(--text-muted)">
                  Sem execuções anteriores.
                </p>
              )}

              {!loadingHistory && history.length > 0 && (
                <ul className="flex max-h-44 flex-col gap-1 overflow-y-auto">
                  {history.map((h) => (
                    <li
                      key={h.contextId}
                      className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-medium text-(--text-secondary)">
                          {h.name}
                        </span>
                        <span className="text-[10.5px] text-(--text-muted)">
                          {formatWhen(h.finishedAt)}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wide",
                          h.status === "TIMED_OUT"
                            ? "bg-amber-500/12 text-amber-600 v2-dark:text-amber-400"
                            : "bg-slate-500/12 text-slate-500 v2-dark:text-slate-300",
                        )}
                      >
                        {h.status === "TIMED_OUT" ? "Expirada" : "Concluída"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={close}
                className="mt-2 w-full rounded-md px-2 py-1.5 text-[12px] font-medium text-(--text-muted) transition-colors hover:bg-(--glass-bg-strong) hover:text-(--text-secondary)"
              >
                Fechar
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
