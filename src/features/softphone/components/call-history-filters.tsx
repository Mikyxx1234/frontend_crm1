"use client";

import { SelectNative } from "@/components/ui/select";
import type { ListCallsFilters, CallDirection, CallStatus } from "../api/types";

interface CallHistoryFiltersProps {
  filters: ListCallsFilters;
  onChange: (f: ListCallsFilters) => void;
}

export function CallHistoryFilters({ filters, onChange }: CallHistoryFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      <SelectNative
        value={filters.direction ?? ""}
        onChange={(e) =>
          onChange({ ...filters, direction: (e.target.value || undefined) as CallDirection | undefined, page: 1 })
        }
      >
        <option value="">Todas direções</option>
        <option value="INBOUND">Recebidas</option>
        <option value="OUTBOUND">Realizadas</option>
      </SelectNative>

      <SelectNative
        value={filters.status ?? ""}
        onChange={(e) =>
          onChange({ ...filters, status: (e.target.value || undefined) as CallStatus | undefined, page: 1 })
        }
      >
        <option value="">Todos status</option>
        <option value="COMPLETED">Completadas</option>
        <option value="MISSED">Perdidas</option>
        <option value="ANSWERED">Atendidas</option>
        <option value="BUSY">Ocupado</option>
        <option value="FAILED">Falhou</option>
      </SelectNative>
    </div>
  );
}
