"use client";

import { format } from "date-fns";
import { DropdownGlass } from "@/components/crm/dropdown-glass";
import { DateRangePicker, type DateRange } from "@/components/crm/date-range-picker";
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
  const rangeValue: DateRange = {
    from: filters.dateFrom ? new Date(filters.dateFrom) : null,
    to: filters.dateTo ? new Date(filters.dateTo) : null,
  };

  function handleRangeChange(range: DateRange) {
    onChange({
      ...filters,
      dateFrom: range.from ? format(range.from, "yyyy-MM-dd") : undefined,
      dateTo: range.to ? format(range.to, "yyyy-MM-dd") : undefined,
      page: 1,
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
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

      <DateRangePicker value={rangeValue} onChange={handleRangeChange} />
    </div>
  );
}
