"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  IconPhone,
  IconPhoneIncoming,
  IconPhoneMissed,
  IconPhoneOff,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/crm/empty-state";
import { PaginationGlass } from "@/components/crm/pagination-glass";
import { ListColumnLabel, listTableHeadRowClass } from "@/components/crm/sortable-header";
import { listCalls } from "../api/extensions";
import type { CallRecord, ListCallsFilters } from "../api/types";

const COLS = "grid-cols-[36px_2.2fr_1fr_0.9fr_0.8fr_1.1fr_40px]";

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
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: string): { label: string; color: string } {
  switch (status) {
    case "COMPLETED":
      return { label: "Completada", color: "text-[var(--color-success-text)] bg-[var(--color-success-bg)]" };
    case "ANSWERED":
      return { label: "Atendida", color: "text-[var(--color-success-text)] bg-[var(--color-success-bg)]" };
    case "MISSED":
      return { label: "Perdida", color: "text-[var(--color-danger-text)] bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)]" };
    case "BUSY":
      return { label: "Ocupado", color: "text-[var(--color-warning-text)] bg-[var(--color-warn-bg)]" };
    case "FAILED":
      return { label: "Falhou", color: "text-[var(--color-danger-text)] bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)]" };
    case "RINGING":
      return { label: "Chamando", color: "text-[var(--text-muted)] bg-[var(--glass-bg-subtle)]" };
    default:
      return { label: status, color: "text-[var(--text-muted)] bg-[var(--glass-bg-subtle)]" };
  }
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
  const filters = externalFilters ?? { page: 1, perPage: 25, contactId };

  const { data, isLoading } = useQuery({
    queryKey: ["calls", filters],
    queryFn: () => listCalls(filters),
  });

  const calls = data?.calls ?? [];
  const total = data?.total ?? 0;
  const page = filters.page ?? 1;
  const perPage = filters.perPage ?? 25;
  const lastPage = Math.max(1, Math.ceil(total / perPage));

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-md"
          />
        ))}
      </div>
    );
  }

  if (!calls.length) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] backdrop-blur-md shadow-[var(--glass-shadow)]">
        <EmptyState
          icon={<IconPhone size={28} />}
          title="Nenhuma chamada encontrada"
          description="Sem chamadas para os filtros selecionados."
        />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", !embedded && "flex-1")}>
      {/* Tabela */}
      <div className="flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-1.5 shadow-[var(--glass-shadow)] backdrop-blur-md">
        {/* Cabeçalho */}
        <div className={listTableHeadRowClass(`${COLS} gap-3 px-3 py-2`)}>
          <ListColumnLabel> </ListColumnLabel>
          <ListColumnLabel>Contato / Telefone</ListColumnLabel>
          <ListColumnLabel>Direção</ListColumnLabel>
          <ListColumnLabel>Status</ListColumnLabel>
          <ListColumnLabel>Duração</ListColumnLabel>
          <ListColumnLabel>Data e hora</ListColumnLabel>
          <ListColumnLabel align="right">Rec.</ListColumnLabel>
        </div>

        {/* Linhas */}
        <div className="flex min-h-0 flex-col overflow-y-auto">
          {calls.map((call) => (
            <CallTableRow key={call.id} call={call} />
          ))}
        </div>
      </div>

      {/* Paginação */}
      {!embedded && (
        <PaginationGlass
          label={`${total.toLocaleString("pt-BR")} chamada${total !== 1 ? "s" : ""} — página ${page} de ${lastPage}`}
          canPrev={page > 1}
          canNext={page < lastPage}
          onPrev={() => {
            const f = { ...filters, page: Math.max(1, page - 1) };
            onFiltersChange?.(f);
          }}
          onNext={() => {
            const f = { ...filters, page: Math.min(lastPage, page + 1) };
            onFiltersChange?.(f);
          }}
          perPage={perPage}
          onPerPageChange={(value) => {
            onFiltersChange?.({ ...filters, perPage: value, page: 1 });
          }}
        />
      )}
    </div>
  );
}

function CallTableRow({ call }: { call: CallRecord }) {
  const isMissed = call.status === "MISSED" || call.status === "FAILED";
  const isInbound = call.direction === "INBOUND";
  const { label: sLabel, color: sColor } = statusLabel(call.status);

  return (
    <div
      className={`grid ${COLS} items-center gap-3 border-b border-[var(--glass-border-subtle)] px-3 py-2.5 transition-colors last:border-b-0 hover:bg-[var(--glass-bg-overlay)]`}
    >
      {/* Ícone de direção/status */}
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          isMissed
            ? "bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)] text-[var(--color-danger)]"
            : "bg-[color-mix(in_srgb,var(--color-success)_10%,transparent)] text-[var(--color-success)]",
        )}
      >
        {isMissed ? (
          <IconPhoneMissed size={13} />
        ) : isInbound ? (
          <IconPhoneIncoming size={13} />
        ) : (
          <IconPhoneOff size={13} style={{ transform: "scaleX(-1)" }} />
        )}
      </span>

      {/* Contato / Telefone */}
      <div className="min-w-0 leading-tight">
        {call.contact ? (
          <Link
            href={`/contacts/${call.contact.id}`}
            className="truncate font-display text-[14px] font-bold text-[var(--text-primary)] transition-colors hover:text-[var(--brand-primary)]"
          >
            {call.contact.name ?? call.phone}
          </Link>
        ) : (
          <span className="truncate font-display text-[14px] font-bold text-[var(--text-primary)]">
            {call.phone}
          </span>
        )}
        {call.contact?.phone && call.contact.phone !== call.phone && (
          <div className="truncate font-body text-[12px] text-[var(--text-muted)]">
            {call.phone}
          </div>
        )}
      </div>

      {/* Direção */}
      <span
        className={cn(
          "inline-flex w-fit items-center rounded-full px-2 py-0.5 font-display text-[11px] font-semibold",
          isInbound
            ? "bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] text-[var(--brand-primary)]"
            : "bg-[var(--glass-bg-subtle)] text-[var(--text-secondary)]",
        )}
      >
        {isInbound ? "Recebida" : "Realizada"}
      </span>

      {/* Status */}
      <span
        className={cn(
          "inline-flex w-fit items-center rounded-full px-2 py-0.5 font-display text-[11px] font-semibold",
          sColor,
        )}
      >
        {sLabel}
      </span>

      {/* Duração */}
      <span className="font-display text-[13px] tabular-nums text-[var(--text-muted)]">
        {formatDuration(call.durationSeconds)}
      </span>

      {/* Data e hora */}
      <span className="font-display text-[13px] tabular-nums text-[var(--text-secondary)]">
        {formatDate(call.startedAt)}
      </span>

      {/* Gravação */}
      <div className="flex justify-end">
        {call.recordUrl ? (
          <a
            href={call.recordUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Ouvir gravação"
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--brand-primary)]"
          >
            <IconPlayerPlay size={13} />
          </a>
        ) : (
          <span className="h-7 w-7" />
        )}
      </div>
    </div>
  );
}
