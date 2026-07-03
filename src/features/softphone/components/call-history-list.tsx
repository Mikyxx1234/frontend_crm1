"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { IconPhone, IconPhoneIncoming, IconPhoneOff, IconPlayerPlay } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { listCalls } from "../api/extensions";
import type { CallRecord, ListCallsFilters } from "../api/types";

function formatDuration(sec: number | null) {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface CallHistoryListProps {
  filters?: ListCallsFilters;
  onFiltersChange?: (f: ListCallsFilters) => void;
  contactId?: string;
  embedded?: boolean;
}

export function CallHistoryList({
  filters: externalFilters,
  onFiltersChange,
  contactId,
  embedded,
}: CallHistoryListProps) {
  const [internalFilters, setInternalFilters] = useState<ListCallsFilters>({ page: 1, perPage: 25 });

  const filters = externalFilters ?? { ...internalFilters, contactId };

  const { data, isLoading } = useQuery({
    queryKey: ["calls", filters],
    queryFn: () => listCalls(filters),
  });

  const calls = data?.calls ?? [];

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-8", !embedded && "flex-1")}>
        <span className="text-sm text-[var(--text-muted)] animate-pulse">Carregando…</span>
      </div>
    );
  }

  if (!calls.length) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-2 py-8", !embedded && "flex-1")}>
        <IconPhone size={28} className="text-[var(--text-muted)] opacity-40" />
        <p className="text-sm text-[var(--text-muted)]">Nenhuma chamada encontrada.</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1 overflow-auto", !embedded && "flex-1")}>
      {calls.map((call) => (
        <CallRow key={call.id} call={call} />
      ))}

      {data && data.total > (filters.perPage ?? 25) && (
        <div className="flex items-center justify-center gap-3 py-3">
          <button
            type="button"
            disabled={filters.page === 1}
            onClick={() => {
              const f = { ...filters, page: (filters.page ?? 1) - 1 };
              onFiltersChange ? onFiltersChange(f) : setInternalFilters(f);
            }}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30"
          >
            ← Anterior
          </button>
          <span className="text-xs text-[var(--text-muted)]">
            {filters.page}/{Math.ceil(data.total / (filters.perPage ?? 25))}
          </span>
          <button
            type="button"
            disabled={(filters.page ?? 1) >= Math.ceil(data.total / (filters.perPage ?? 25))}
            onClick={() => {
              const f = { ...filters, page: (filters.page ?? 1) + 1 };
              onFiltersChange ? onFiltersChange(f) : setInternalFilters(f);
            }}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}

function CallRow({ call }: { call: CallRecord }) {
  const isMissed = call.status === "MISSED" || call.status === "FAILED";
  const isInbound = call.direction === "INBOUND";

  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 transition-colors hover:bg-[var(--glass-bg-subtle)]">
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          isMissed ? "bg-red-500/10 text-[var(--color-danger)]" : "bg-emerald-500/10 text-emerald-400",
        )}
      >
        {isMissed ? (
          <IconPhoneOff size={13} />
        ) : isInbound ? (
          <IconPhoneIncoming size={13} />
        ) : (
          <IconPhone size={13} />
        )}
      </span>

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-[var(--text-primary)]">
          {call.contact?.name ?? call.phone}
        </span>
        <span className="text-xs text-[var(--text-muted)]">
          {isInbound ? "Recebida" : "Realizada"} · {formatDate(call.startedAt)}
        </span>
      </div>

      <span className="text-xs tabular-nums text-[var(--text-muted)]">
        {formatDuration(call.durationSeconds)}
      </span>

      {call.recordUrl && (
        <a
          href={call.recordUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <IconPlayerPlay size={12} />
        </a>
      )}
    </div>
  );
}
