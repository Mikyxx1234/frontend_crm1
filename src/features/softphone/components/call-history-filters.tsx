"use client";

import { DropdownGlass } from "@/components/crm/dropdown-glass";
import type { ListCallsFilters, CallDirection, CallStatus } from "../api/types";

const DIRECTION_OPTIONS = [
  { value: "", label: "Todas direções" },
  { value: "INBOUND", label: "Recebidas" },
  { value: "OUTBOUND", label: "Realizadas" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Todos status" },
  { value: "COMPLETED", label: "Completadas" },
  { value: "MISSED", label: "Perdidas" },
  { value: "ANSWERED", label: "Atendidas" },
  { value: "BUSY", label: "Ocupado" },
  { value: "FAILED", label: "Falhou" },
];

interface CallHistoryFiltersProps {
  filters: ListCallsFilters;
  onChange: (f: ListCallsFilters) => void;
}

export function CallHistoryFilters({ filters, onChange }: CallHistoryFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownGlass
        options={DIRECTION_OPTIONS}
        value={filters.direction ?? ""}
        onValueChange={(v) =>
          onChange({ ...filters, direction: (v || undefined) as CallDirection | undefined, page: 1 })
        }
        placeholder="Todas direções"
        triggerClassName="min-w-[148px]"
      />

      <DropdownGlass
        options={STATUS_OPTIONS}
        value={filters.status ?? ""}
        onValueChange={(v) =>
          onChange({ ...filters, status: (v || undefined) as CallStatus | undefined, page: 1 })
        }
        placeholder="Todos status"
        triggerClassName="min-w-[148px]"
      />

      {/* Separador visual */}
      <div className="h-5 w-px bg-[var(--glass-border)]" aria-hidden />

      {/* Período — De */}
      <label className="flex items-center gap-2">
        <span className="font-display text-[12px] font-semibold text-[var(--text-muted)]">De</span>
        <input
          type="date"
          value={filters.dateFrom ?? ""}
          onChange={(e) =>
            onChange({ ...filters, dateFrom: e.target.value || undefined, page: 1 })
          }
          className="h-10 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 font-display text-[13px] text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)] outline-none backdrop-blur-sm transition-colors hover:bg-[var(--glass-bg-strong)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/40"
        />
      </label>

      {/* Período — Até */}
      <label className="flex items-center gap-2">
        <span className="font-display text-[12px] font-semibold text-[var(--text-muted)]">Até</span>
        <input
          type="date"
          value={filters.dateTo ?? ""}
          min={filters.dateFrom}
          onChange={(e) =>
            onChange({ ...filters, dateTo: e.target.value || undefined, page: 1 })
          }
          className="h-10 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 font-display text-[13px] text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)] outline-none backdrop-blur-sm transition-colors hover:bg-[var(--glass-bg-strong)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/40"
        />
      </label>

      {/* Limpar período */}
      {(filters.dateFrom || filters.dateTo) && (
        <button
          type="button"
          onClick={() => onChange({ ...filters, dateFrom: undefined, dateTo: undefined, page: 1 })}
          className="font-display text-[12px] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--color-danger)]"
        >
          Limpar período
        </button>
      )}
    </div>
  );
}
