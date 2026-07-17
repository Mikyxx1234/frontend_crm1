"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  IconPhone,
  IconPhoneIncoming,
  IconPhoneX,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/crm/empty-state";
import { PaginationGlass } from "@/components/crm/pagination-glass";
import { ListColumnLabel, listTableHeadRowClass } from "@/components/crm/sortable-header";
import { listCalls } from "../api/extensions";
import type { CallRecord, ListCallsFilters } from "../api/types";

const COLS = "grid-cols-[36px_minmax(180px,2fr)_90px_100px_70px_minmax(130px,1.1fr)_80px]";

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
    case "ANSWERED":
      return { label: status === "COMPLETED" ? "Completada" : "Atendida", color: "text-[var(--color-success-text)] bg-[var(--color-success-bg)]" };
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
  const [playingId, setPlayingId] = useState<string | null>(null);

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
    <div className={cn("flex min-h-0 flex-col gap-4", !embedded && "flex-1")}>
      {/* Tabela */}
      <div className="flex w-full min-w-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-1.5 shadow-[var(--glass-shadow)] backdrop-blur-md">
        {/* Scroll horizontal cobre header + rows em sincronia */}
        <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
          <div className="min-w-[780px]">
            {/* Cabeçalho */}
            <div className={listTableHeadRowClass(`${COLS} gap-3 px-3 py-2`)}>
              <ListColumnLabel> </ListColumnLabel>
              <ListColumnLabel>Contato / Telefone</ListColumnLabel>
              <ListColumnLabel>Direção</ListColumnLabel>
              <ListColumnLabel>Status</ListColumnLabel>
              <ListColumnLabel>Duração</ListColumnLabel>
              <ListColumnLabel>Data e hora</ListColumnLabel>
              <ListColumnLabel align="right">Gravação</ListColumnLabel>
            </div>

            {/* Linhas */}
            <div className="flex flex-col">
              {calls.map((call) => (
                <CallTableRow
                  key={call.id}
                  call={call}
                  isPlaying={playingId === call.id}
                  onPlay={() => setPlayingId(playingId === call.id ? null : call.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Paginação */}
      {!embedded && (
        <PaginationGlass
          label={`${total.toLocaleString("pt-BR")} chamada${total !== 1 ? "s" : ""} — página ${page} de ${lastPage}`}
          canPrev={page > 1}
          canNext={page < lastPage}
          onPrev={() => onFiltersChange?.({ ...filters, page: Math.max(1, page - 1) })}
          onNext={() => onFiltersChange?.({ ...filters, page: Math.min(lastPage, page + 1) })}
          perPage={perPage}
          onPerPageChange={(value) => onFiltersChange?.({ ...filters, perPage: value, page: 1 })}
        />
      )}
    </div>
  );
}

// ── Linha da tabela ─────────────────────────────────────────────────────────

interface CallTableRowProps {
  call: CallRecord;
  isPlaying: boolean;
  onPlay: () => void;
}

function CallTableRow({ call, isPlaying, onPlay }: CallTableRowProps) {
  const isMissed = call.status === "MISSED" || call.status === "FAILED";
  const isInbound = call.direction === "INBOUND";
  const { label: sLabel, color: sColor } = statusLabel(call.status);

  return (
    <div className="flex flex-col border-b border-[var(--glass-border-subtle)] last:border-b-0">
      <div className={`grid ${COLS} items-center gap-3 px-3 py-2.5 transition-colors hover:bg-[var(--glass-bg-overlay)]`}>
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
            <IconPhoneX size={13} />
          ) : isInbound ? (
            <IconPhoneIncoming size={13} />
          ) : (
            <IconPhone size={13} />
          )}
        </span>

        {/* Contato / Telefone */}
        <div className="min-w-0 leading-tight">
          {call.contact ? (
            <Link
              href={`/contacts/${call.contact.id}`}
              className="block truncate font-display text-[13px] font-semibold text-[var(--text-primary)] transition-colors hover:text-[var(--brand-primary)]"
            >
              {call.contact.name ?? call.phone}
            </Link>
          ) : (
            <span className="block truncate font-display text-[13px] font-semibold text-[var(--text-primary)]">
              {call.phone}
            </span>
          )}
          {call.contact?.phone && call.contact.phone !== call.phone && (
            <div className="truncate font-display text-[11.5px] text-[var(--text-muted)]">
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
        <span className={cn("inline-flex w-fit items-center rounded-full px-2 py-0.5 font-display text-[11px] font-semibold", sColor)}>
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

        {/* Botão de gravação */}
        <div className="flex justify-end">
          {call.recordUrl ? (
            <button
              type="button"
              onClick={onPlay}
              title={isPlaying ? "Pausar gravação" : "Ouvir gravação"}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all",
                isPlaying
                  ? "bg-[var(--brand-primary)] text-white shadow-[0_4px_12px_rgba(91,111,245,0.35)]"
                  : "bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white hover:shadow-[0_4px_12px_rgba(91,111,245,0.35)]",
              )}
            >
              {isPlaying ? <IconPlayerPauseFilled size={14} /> : <IconPlayerPlayFilled size={14} />}
            </button>
          ) : (
            <span className="h-8 w-8" />
          )}
        </div>
      </div>

      {/* Mini player inline — expande abaixo da linha quando ativo */}
      {isPlaying && call.recordUrl && (
        <AudioPlayer src={call.recordUrl} onEnded={onPlay} />
      )}
    </div>
  );
}

// ── Mini player de áudio ────────────────────────────────────────────────────
// Layout alinhado à grid da tabela:
//   • padding-left offset = 36px (col ícone) + 0.75rem (gap-3) pula o ícone
//     e inicia no mesmo ponto da coluna "Contato/Telefone"
//   • padding-right = px-3 (mesmo das linhas da tabela)

export function AudioPlayer({ src, onEnded }: { src: string; onEnded: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().catch(() => setPlaying(false));
    return () => { audio.pause(); };
  }, [src]);

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    setCurrentTime(audio.currentTime);
    setDuration(audio.duration);
    setProgress((audio.currentTime / audio.duration) * 100);
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio) return;
    const t = (Number(e.target.value) / 100) * audio.duration;
    audio.currentTime = t;
    setProgress(Number(e.target.value));
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) { audio.play(); setPlaying(true); }
    else { audio.pause(); setPlaying(false); }
  }

  function fmtTime(s: number) {
    if (!s || Number.isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  return (
    <div
      className="flex items-center gap-2 border-t border-[var(--glass-border-subtle)] bg-[color-mix(in_srgb,var(--brand-primary)_4%,transparent)] py-1.5 pr-3"
      style={{ paddingLeft: "calc(36px + 0.75rem + 0.75rem)" }}
    >
      {/* audio element oculto — sem controls, só API */}
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onEnded={onEnded}
        preload="auto"
        className="hidden"
      />

      {/* Play/Pause */}
      <button
        type="button"
        onClick={togglePlay}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white shadow-[0_2px_6px_rgba(91,111,245,0.3)] transition-transform hover:scale-105"
      >
        {playing ? <IconPlayerPauseFilled size={11} /> : <IconPlayerPlayFilled size={11} />}
      </button>

      {/* Tempo atual */}
      <span className="w-8 shrink-0 text-right font-display text-[10.5px] tabular-nums text-[var(--text-muted)]">
        {fmtTime(currentTime)}
      </span>

      {/* Barra de progresso */}
      <div className="relative flex-1">
        <div className="h-1 overflow-hidden rounded-full bg-[var(--glass-border)]">
          <div
            className="h-full rounded-full bg-[var(--brand-primary)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={progress}
          onChange={handleSeek}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="Posição da gravação"
        />
      </div>

      {/* Duração total */}
      <span className="w-8 shrink-0 font-display text-[10.5px] tabular-nums text-[var(--text-muted)]">
        {fmtTime(duration)}
      </span>
    </div>
  );
}
