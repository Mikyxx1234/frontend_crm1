"use client";

/*
 * Dropdown de pipelines para o PipelineHeader. Renderiza via portal
 * pra escapar do stacking-context interno do header glassmorfico.
 */

import { createPortal } from "react-dom";
import { IconChevronDown, IconCheck } from "@tabler/icons-react";

import { usePipelines } from "@/features/pipeline-v2/hooks";
import {
  computePopoverPosition,
  usePortalPopover,
} from "./use-portal-popover";

interface PipelineSwitcherProps {
  selectedId: string | null;
  onChange: (id: string) => void;
}

export function PipelineSwitcher({ selectedId, onChange }: PipelineSwitcherProps) {
  const { data: pipelines = [] } = usePipelines();
  const { open, rect, triggerRef, popoverRef, toggle, close } =
    usePortalPopover();

  const selected = pipelines.find((p) => p.id === selectedId);
  const label = selected?.name ?? "Pipeline";

  const pos = open && rect ? computePopoverPosition(rect, 320) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => toggle()}
        className="inline-flex items-center gap-1 cursor-pointer font-display text-[14px] font-semibold text-[var(--text-primary)] hover:text-[var(--brand-primary)] transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {label}
        <IconChevronDown size={14} className="opacity-60" />
      </button>

      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popoverRef}
              className="fixed z-[9999] w-64 rounded-[var(--radius-lg)] border p-1 shadow-2xl"
              style={{
                top: pos.top,
                left: pos.left,
                background: "rgba(255, 255, 255, 0.98)",
                borderColor: "var(--glass-border, rgba(0,0,0,0.08))",
                isolation: "isolate",
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2 py-1 font-display text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted,#718096)]">
                Selecione um pipeline
              </div>
              {pipelines.length === 0 ? (
                <div className="px-2 py-2 text-[12px] text-[var(--text-muted,#718096)]">
                  Nenhum pipeline encontrado.
                </div>
              ) : (
                pipelines.map((p) => {
                  const active = p.id === selectedId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        onChange(p.id);
                        close();
                      }}
                      className="flex w-full items-center justify-between rounded-[var(--radius-sm)] px-2.5 py-1.5 text-left text-[12.5px] hover:bg-black/5"
                      style={{
                        color: active
                          ? "var(--brand-primary, #5b6ff5)"
                          : "var(--text-primary, #1a202c)",
                        fontWeight: active ? 600 : 500,
                      }}
                    >
                      <span className="truncate">{p.name}</span>
                      {active ? <IconCheck size={14} /> : null}
                    </button>
                  );
                })
              )}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
