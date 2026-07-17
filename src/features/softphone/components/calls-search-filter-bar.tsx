"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import {
  IconAdjustmentsHorizontal,
  IconCheck,
  IconPhoneIncoming,
  IconPhoneOutgoing,
  IconRotateClockwise,
  IconSearch,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { DateRangePicker, type DateRange } from "@/components/crm/date-range-picker";
import type { CallDirection, CallStatus, ListCallsFilters } from "../api/types";

export type CallsFilterState = Pick<
  ListCallsFilters,
  "direction" | "status" | "dateFrom" | "dateTo"
>;

const DIRECTION_OPTIONS: { value: "" | CallDirection; label: string; icon: React.ReactNode }[] = [
  { value: "", label: "Todas as direções", icon: null },
  { value: "INBOUND", label: "Recebidas", icon: <IconPhoneIncoming size={14} /> },
  { value: "OUTBOUND", label: "Realizadas", icon: <IconPhoneOutgoing size={14} /> },
];

const STATUS_OPTIONS: { value: "" | CallStatus; label: string }[] = [
  { value: "", label: "Todos os status" },
  { value: "ANSWERED", label: "Atendidas" },
  { value: "COMPLETED", label: "Completadas" },
  { value: "MISSED", label: "Perdidas" },
  { value: "BUSY", label: "Ocupado" },
  { value: "FAILED", label: "Falhou" },
];

function countActive(f: CallsFilterState): number {
  let n = 0;
  if (f.direction) n++;
  if (f.status) n++;
  if (f.dateFrom || f.dateTo) n++;
  return n;
}

function FilterCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-primary)] px-1 font-display text-[10px] font-bold leading-none text-white">
      {count}
    </span>
  );
}

interface CallsSearchFilterBarProps {
  search: string;
  onSearch: (v: string) => void;
  filters: CallsFilterState;
  onFiltersChange: (f: CallsFilterState) => void;
}

/**
 * Busca + painel de filtros — padrão Contatos/Empresas:
 * input pill com botão de ajustes à direita que abre o popover.
 */
export function CallsSearchFilterBar({
  search,
  onSearch,
  filters,
  onFiltersChange,
}: CallsSearchFilterBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CallsFilterState>(filters);

  const activeCount = countActive(filters);
  const draftCount = countActive(draft);

  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const rangeValue: DateRange = {
    from: draft.dateFrom ? new Date(draft.dateFrom) : null,
    to: draft.dateTo ? new Date(draft.dateTo) : null,
  };

  function handleClear() {
    const empty: CallsFilterState = {
      direction: undefined,
      status: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    };
    setDraft(empty);
    onFiltersChange(empty);
  }

  function handleApply() {
    onFiltersChange(draft);
    setOpen(false);
  }

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
        placeholder="Pesquisar e filtrar..."
        aria-label="Buscar e filtrar chamadas"
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
        <div className="absolute left-0 top-[calc(100%+8px)] z-40 flex w-[min(100vw-2rem,360px)] flex-col overflow-hidden rounded-[22px] border border-[var(--glass-border)] bg-[var(--glass-bg-modal,#fff)] text-left shadow-[var(--glass-shadow-lg)] backdrop-blur-md">
          <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
            <div className="flex items-center gap-2">
              <span className="font-display text-[14px] font-bold text-[var(--text-primary)]">
                Filtros
              </span>
              <FilterCountBadge count={draftCount || activeCount} />
            </div>
            <button
              type="button"
              onClick={handleClear}
              disabled={draftCount === 0 && activeCount === 0}
              className="flex items-center gap-1 font-display text-[12px] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--brand-primary)] disabled:opacity-40"
            >
              <IconRotateClockwise size={13} /> Limpar
            </button>
          </div>

          <div className="flex max-h-[min(70vh,480px)] flex-col gap-4 overflow-y-auto px-4 pb-3">
            {/* Direção */}
            <div>
              <p className="mb-2 font-display text-[12px] font-semibold text-[var(--text-muted)]">
                Direção
              </p>
              <div className="flex flex-col gap-1.5" role="listbox" aria-label="Direção">
                {DIRECTION_OPTIONS.map((opt) => {
                  const selected = (draft.direction ?? "") === opt.value;
                  return (
                    <button
                      key={opt.value || "all-dir"}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          direction: opt.value || undefined,
                        }))
                      }
                      className={cn(
                        "flex w-full items-center gap-3 rounded-[14px] border px-3.5 py-2.5 text-left font-display text-[13px] font-semibold transition-colors",
                        selected
                          ? "border-[var(--brand-primary)] bg-[var(--color-primary-soft)] text-[var(--text-primary)]"
                          : "border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-overlay)]",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                          selected
                            ? "border-[var(--brand-primary)]"
                            : "border-[var(--glass-border)]",
                        )}
                      >
                        {selected && (
                          <span className="h-2 w-2 rounded-full bg-[var(--brand-primary)]" />
                        )}
                      </span>
                      {opt.icon ? (
                        <span className={selected ? "text-[var(--brand-primary)]" : undefined}>
                          {opt.icon}
                        </span>
                      ) : (
                        <span className="w-3.5 shrink-0" aria-hidden />
                      )}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status */}
            <div>
              <p className="mb-2 font-display text-[12px] font-semibold text-[var(--text-muted)]">
                Status
              </p>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((opt) => {
                  const selected = (draft.status ?? "") === opt.value;
                  return (
                    <button
                      key={opt.value || "all-st"}
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          status: opt.value || undefined,
                        }))
                      }
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-display text-[12px] font-bold transition-colors",
                        selected
                          ? "border-[var(--brand-primary)] bg-[var(--color-primary-soft)] text-[var(--brand-primary)]"
                          : "border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg-overlay)]",
                      )}
                    >
                      {selected && <IconCheck size={12} stroke={2.4} />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Período */}
            <div>
              <p className="mb-2 font-display text-[12px] font-semibold text-[var(--text-muted)]">
                Período
              </p>
              <DateRangePicker
                value={rangeValue}
                onChange={(range) =>
                  setDraft((prev) => ({
                    ...prev,
                    dateFrom: range.from ? format(range.from, "yyyy-MM-dd") : undefined,
                    dateTo: range.to ? format(range.to, "yyyy-MM-dd") : undefined,
                  }))
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--glass-border-subtle)] px-4 py-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full px-4 py-2 font-display text-[13px] font-bold text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--text-secondary)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="rounded-full bg-[var(--brand-primary)] px-4 py-2 font-display text-[13px] font-bold text-white shadow-[0_4px_14px_rgba(91,111,245,0.35)] transition-all hover:-translate-y-px hover:bg-[var(--brand-primary-dark)]"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
