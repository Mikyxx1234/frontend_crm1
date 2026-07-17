"use client";

/*
 * ActiveBotsButton — ícone flutuante no canto inferior direito, ao lado
 * da composer (inbox e deal). Ao clicar, abre um painel (estilo Kommo
 * "Bots ativos") listando as automações vivas do contato, cada uma com
 * opção de INTERROMPER. Vínculo por contato (AutomationContext não
 * referencia conversa). Atualiza em tempo real via SSE `automation_state`.
 */

import { createPortal } from "react-dom";
import { IconRobot, IconPlayerStopFilled } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { TooltipGlass } from "@/components/crm/tooltip-glass";
import {
  useCancelAutomation,
  useContactActiveAutomations,
} from "@/features/inbox-v2/hooks";
import {
  computePopoverPosition,
  usePortalPopover,
} from "@/features/pipeline-v2/extras/use-portal-popover";

interface ActiveBotsButtonProps {
  contactId: string | null;
  /** Ajuste fino de posicionamento absoluto (default: canto inf. direito). */
  className?: string;
}

export function ActiveBotsButton({ contactId, className }: ActiveBotsButtonProps) {
  const { open, rect, triggerRef, popoverRef, toggle, close } = usePortalPopover();
  const { data: bots = [], isLoading } = useContactActiveAutomations(contactId);
  const cancel = useCancelAutomation(contactId);

  const count = bots.length;
  const hasBots = count > 0;
  const pos = computePopoverPosition(rect, 320, 300);

  return (
    <div className={cn("absolute bottom-[4.75rem] right-5 z-20", className)}>
      <TooltipGlass label="Robôs ativos" side="left">
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
            hasBots ? `${count} robô(s) em execução` : "Nenhum robô ativo"
          }
          className={cn(
            "relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-all hover:scale-[1.06]",
            hasBots
              ? "border-violet-500/30 bg-violet-500/15 text-violet-600 v2-dark:text-violet-300"
              : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)] hover:text-[var(--brand-primary)]",
          )}
        >
          <IconRobot size={19} />
          {hasBots && (
            <>
              <span className="absolute -right-0.5 -top-0.5 flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-500 opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-500" />
              </span>
              <span className="absolute -bottom-1 -right-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-violet-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[var(--glass-bg-overlay)]">
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
              aria-label="Robôs ativos"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width: 320,
                isolation: "isolate",
              }}
              className="z-(--z-popover) rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-modal)] p-3 shadow-[var(--glass-shadow-lg)] backdrop-blur-xl"
            >
              <div className="mb-2 flex items-center gap-2">
                <IconRobot size={16} className="text-violet-500" />
                <span className="font-display text-[13px] font-bold text-[var(--text-primary)]">
                  Robôs ativos
                </span>
                {hasBots && (
                  <span className="rounded-full bg-violet-500/15 px-1.5 py-px text-[10px] font-bold text-violet-600 v2-dark:text-violet-300">
                    {count}
                  </span>
                )}
              </div>

              {isLoading && (
                <p className="px-1 py-3 text-[12.5px] text-[var(--text-muted)]">
                  Carregando…
                </p>
              )}

              {!isLoading && !hasBots && (
                <p className="px-1 py-3 text-[12.5px] text-[var(--text-muted)]">
                  Nenhum robô ativo no momento.
                </p>
              )}

              {!isLoading && hasBots && (
                <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
                  {bots.map((bot) => (
                    <li
                      key={bot.contextId}
                      className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-2.5 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[12.5px] font-semibold text-[var(--text-primary)]">
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
                            {bot.status === "PAUSED" ? "Pausado" : "Rodando"}
                          </span>
                        </div>
                        {bot.stepLabel && (
                          <p className="truncate text-[11px] text-[var(--text-muted)]">
                            {bot.stepLabel}
                          </p>
                        )}
                      </div>
                      <TooltipGlass label="Interromper robô" side="top">
                        <button
                          type="button"
                          disabled={cancel.isPending}
                          onClick={() => cancel.mutate(bot.contextId)}
                          aria-label={`Interromper ${bot.name}`}
                          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--color-warning)] transition-colors hover:bg-[var(--color-warning)]/12 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <IconPlayerStopFilled size={14} />
                        </button>
                      </TooltipGlass>
                    </li>
                  ))}
                </ul>
              )}

              {cancel.isError && (
                <p className="mt-2 px-1 text-[11px] text-[var(--color-warning)]">
                  {cancel.error?.message ?? "Erro ao interromper o robô."}
                </p>
              )}

              <button
                type="button"
                onClick={close}
                className="mt-2 w-full rounded-[var(--radius-md)] px-2 py-1.5 text-[12px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-secondary)]"
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
