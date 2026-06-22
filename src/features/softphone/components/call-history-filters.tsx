"use client";

import { IconFilter } from "@tabler/icons-react";
import type { ListCallsFilters, CallDirection, CallStatus } from "../api/types";

interface CallHistoryFiltersProps {
  filters: ListCallsFilters;
  onChange: (f: ListCallsFilters) => void;
}

export function CallHistoryFilters({ filters, onChange }: CallHistoryFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      <IconFilter size={14} className="text-[var(--text-muted)]" />

      <select
        value={filters.direction ?? ""}
        onChange={(e) =>
          onChange({ ...filters, direction: (e.target.value || undefined) as CallDirection | undefined, page: 1 })
        }
        className="h-7 rounded-[var(--radius-sm)] border border-[var(--glass-border)] bg-transparent px-2 text-xs text-[var(--text-primary)]"
      >
        <option value="">Todas direções</option>
        <option value="INBOUND">Recebidas</option>
        <option value="OUTBOUND">Realizadas</option>
      </select>

      <select
        value={filters.status ?? ""}
        onChange={(e) =>
          onChange({ ...filters, status: (e.target.value || undefined) as CallStatus | undefined, page: 1 })
        }
        className="h-7 rounded-[var(--radius-sm)] border border-[var(--glass-border)] bg-transparent px-2 text-xs text-[var(--text-primary)]"
      >
        <option value="">Todos status</option>
        <option value="COMPLETED">Completadas</option>
        <option value="MISSED">Perdidas</option>
        <option value="ANSWERED">Atendidas</option>
        <option value="BUSY">Ocupado</option>
        <option value="FAILED">Falhou</option>
      </select>
    </div>
  );
}
