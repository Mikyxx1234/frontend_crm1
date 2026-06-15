"use client";

/*
 * Menu de ações ("...") + handler do botão "Ganhar" do header do
 * DealDetailPanel. PUT /api/deals/:id/status via useSetDealStatus.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconTrash } from "@tabler/icons-react";
import { TooltipGlass } from "@/components/crm/tooltip-glass";

import { LossReasonDialog } from "@/components/pipeline/loss-reason-dialog";
import { useDeleteDeal, useSetDealStatus } from "@/features/pipeline-v2/hooks";
import type { DealStatus, StatusFilter } from "@/features/pipeline-v2/api";

interface DealActionsMenuProps {
  dealId: string | null;
  currentStatus: DealStatus | string;
  pipelineId: string | null;
  statusFilter?: StatusFilter;
  trigger: React.ReactNode;
  /** Notifica o caller para fechar o detail panel apos exclusao. */
  onDeleted?: () => void;
}

export function DealActionsMenu({
  dealId,
  currentStatus,
  pipelineId,
  statusFilter = "OPEN",
  trigger,
  onDeleted,
}: DealActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);

  const setStatus = useSetDealStatus(pipelineId, statusFilter);
  const deleteDealMut = useDeleteDeal(pipelineId, statusFilter);

  useEffect(() => {
    if (!open) return;
    // Calcula posição fixed a partir do trigger para escapar de overflow:hidden
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    }
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function apply(status: DealStatus, lostReason?: string) {
    if (!dealId) return;
    setStatus.mutate(
      { dealId, status, lostReason },
      { onSuccess: () => setOpen(false) },
    );
  }

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        disabled={!dealId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </button>

      {open && dropdownPos && typeof document !== "undefined" && createPortal(
        <div
          className="w-52 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] py-1 shadow-[0_8px_32px_rgba(15,20,40,0.16)] backdrop-blur-xl"
          style={{ position: "fixed", top: dropdownPos.top, right: dropdownPos.right, zIndex: 9999 }}
          role="menu"
        >
          {currentStatus !== "LOST" && (
            <button
              type="button"
              disabled={setStatus.isPending}
              onClick={() => {
                setOpen(false);
                setLostDialogOpen(true);
              }}
              className="flex w-full items-center gap-2 px-3.5 py-2 text-left font-display text-[12.5px] font-semibold text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger)]/8 disabled:opacity-50"
            >
              Marcar como perdido
            </button>
          )}
          {currentStatus !== "WON" && (
            <button
              type="button"
              disabled={setStatus.isPending}
              onClick={() => apply("WON")}
              className="flex w-full items-center gap-2 px-3.5 py-2 text-left font-display text-[12.5px] font-semibold text-[var(--color-success)] transition-colors hover:bg-[var(--color-success)]/8 disabled:opacity-50"
            >
              Marcar como ganho
            </button>
          )}
          {currentStatus !== "OPEN" && (
            <button
              type="button"
              disabled={setStatus.isPending}
              onClick={() => apply("OPEN")}
              className="flex w-full items-center gap-2 px-3.5 py-2 text-left font-display text-[12.5px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg-overlay)] disabled:opacity-50"
            >
              Reabrir
            </button>
          )}
          <div className="mx-3.5 my-1 h-px bg-[var(--glass-border)]" />
          <button
            type="button"
            disabled={!dealId || deleteDealMut.isPending}
            onClick={() => {
              if (!dealId) return;
              const ok = window.confirm(
                "Excluir este negocio? Esta acao nao pode ser desfeita.",
              );
              if (!ok) return;
              deleteDealMut.mutate(
                { dealId },
                {
                  onSuccess: () => {
                    setOpen(false);
                    onDeleted?.();
                  },
                },
              );
            }}
            className="flex w-full items-center gap-2 px-3.5 py-2 text-left font-display text-[12.5px] font-semibold text-[var(--color-danger)] transition-colors hover:bg-[var(--color-danger)]/8 disabled:opacity-60"
          >
            Excluir negocio
          </button>
        </div>,
        document.body,
      )}

      {/* Tabulação do motivo da perda (catálogo + "Outro") */}
      <LossReasonDialog
        open={lostDialogOpen}
        onOpenChange={setLostDialogOpen}
        isPending={setStatus.isPending}
        onConfirm={(reason) => {
          apply("LOST", reason);
          setLostDialogOpen(false);
        }}
      />
    </div>
  );
}

interface DealDeleteButtonProps {
  dealId: string | null;
  pipelineId: string | null;
  statusFilter?: StatusFilter;
  /** Notifica o caller para fechar o detail panel apos exclusao. */
  onDeleted?: () => void;
  trigger: React.ReactNode;
}

/**
 * Botão dedicado "Excluir negócio" do header — atalho direto (sem
 * abrir o menu "..."). Reusa useDeleteDeal e pede confirmação.
 */
export function DealDeleteButton({
  dealId,
  pipelineId,
  statusFilter = "OPEN",
  onDeleted,
  trigger,
}: DealDeleteButtonProps) {
  const deleteDealMut = useDeleteDeal(pipelineId, statusFilter);

  function handleClick() {
    if (!dealId) return;
    const ok = window.confirm(
      "Excluir este negócio? Esta ação não pode ser desfeita.",
    );
    if (!ok) return;
    deleteDealMut.mutate(
      { dealId },
      { onSuccess: () => onDeleted?.() },
    );
  }

  return (
    <TooltipGlass label="Excluir negócio" side="bottom">
      <button
        type="button"
        disabled={!dealId || deleteDealMut.isPending}
        onClick={handleClick}
        className="inline-flex disabled:opacity-60"
        aria-label="Excluir negócio"
      >
        {trigger}
      </button>
    </TooltipGlass>
  );
}

interface WinButtonProps {
  dealId: string | null;
  currentStatus: DealStatus | string;
  pipelineId: string | null;
  statusFilter?: StatusFilter;
  trigger: React.ReactNode;
}

/** Botão dedicado "Ganhar" do header — sem dropdown. */
export function WinButton({
  dealId,
  currentStatus,
  pipelineId,
  statusFilter = "OPEN",
  trigger,
}: WinButtonProps) {
  const setStatus = useSetDealStatus(pipelineId, statusFilter);

  const isWon = currentStatus === "WON";

  function handleClick() {
    if (!dealId) return;
    setStatus.mutate({
      dealId,
      status: isWon ? "OPEN" : "WON",
    });
  }

  return (
    <TooltipGlass label={isWon ? "Reabrir negócio" : "Marcar como ganho"} side="top">
      <button
        type="button"
        disabled={!dealId || setStatus.isPending}
        onClick={handleClick}
        className="inline-flex"
      >
        {trigger}
      </button>
    </TooltipGlass>
  );
}
