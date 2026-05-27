"use client";

/*
 * Menu de ações ("...") + handler do botão "Ganhar" do header do
 * DealDetailPanel. PUT /api/deals/:id/status via useSetDealStatus.
 */

import { useEffect, useRef, useState } from "react";

import { useSetDealStatus } from "@/features/pipeline-v2/hooks";
import type { DealStatus, StatusFilter } from "@/features/pipeline-v2/api";

interface DealActionsMenuProps {
  dealId: string | null;
  currentStatus: DealStatus | string;
  pipelineId: string | null;
  statusFilter?: StatusFilter;
  trigger: React.ReactNode;
}

export function DealActionsMenu({
  dealId,
  currentStatus,
  pipelineId,
  statusFilter = "OPEN",
  trigger,
}: DealActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const setStatus = useSetDealStatus(pipelineId, statusFilter);

  useEffect(() => {
    if (!open) return;
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

      {open && (
        <div
          className="absolute right-0 top-full z-30 mt-1 w-48 rounded-[var(--radius-lg)] border p-1 backdrop-blur-md"
          style={{
            background: "var(--glass-bg-strong)",
            borderColor: "var(--glass-border)",
            boxShadow: "var(--glass-shadow)",
          }}
          role="menu"
        >
          {currentStatus !== "LOST" && (
            <button
              type="button"
              disabled={setStatus.isPending}
              onClick={() => {
                const reason = window.prompt("Motivo da perda?") ?? "";
                if (!reason.trim()) return;
                apply("LOST", reason.trim());
              }}
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-left text-[12.5px] text-[var(--color-danger)] hover:bg-white/10"
            >
              Marcar como perdido
            </button>
          )}
          {currentStatus !== "WON" && (
            <button
              type="button"
              disabled={setStatus.isPending}
              onClick={() => apply("WON")}
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-left text-[12.5px] text-[var(--color-success)] hover:bg-white/10"
            >
              Marcar como ganho
            </button>
          )}
          {currentStatus !== "OPEN" && (
            <button
              type="button"
              disabled={setStatus.isPending}
              onClick={() => apply("OPEN")}
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-left text-[12.5px] text-[var(--text-primary)] hover:bg-white/10"
            >
              Reabrir
            </button>
          )}
        </div>
      )}
    </div>
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
    <button
      type="button"
      disabled={!dealId || setStatus.isPending}
      onClick={handleClick}
      className="inline-flex"
      title={isWon ? "Reabrir negocio" : "Marcar como ganho"}
    >
      {trigger}
    </button>
  );
}
