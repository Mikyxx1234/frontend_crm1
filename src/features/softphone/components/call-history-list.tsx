"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  IconPhone,
  IconPhoneIncoming,
  IconPhoneOutgoing,
  IconPhoneX,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { formatPhoneDisplay } from "@/lib/phone";
import { ChatAvatar } from "@/components/inbox/chat-avatar";
import { AVATAR_SIZE } from "@/lib/avatar";
import { EmptyState } from "@/components/crm/empty-state";
import { PaginationGlass } from "@/components/crm/pagination-glass";
import {
  ListColumnLabel,
  SortableHeader,
  listTableHeadRowClass,
  type SortDir,
} from "@/components/crm/sortable-header";
import { listCalls } from "../api/extensions";
import type {
  CallRecord,
  CallsSortField,
  ListCallsFilters,
} from "../api/types";

const COLS =
  "grid-cols-[36px_minmax(220px,2fr)_100px_110px_80px_minmax(140px,1.1fr)_minmax(88px,240px)]";

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

/** Rótulo do grupo por dia: Hoje / Ontem / dd/mm. */
function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Hoje";
  if (sameDay(d, yesterday)) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/** Agrupa chamadas por dia, do dia mais recente ao mais antigo (e chamadas
 * mais recentes primeiro dentro de cada dia). */
function groupByDay(calls: CallRecord[]): [string, CallRecord[]][] {
  const map = new Map<string, CallRecord[]>();
  for (const c of calls) {
    const key = dayLabel(c.startedAt);
    const arr = map.get(key);
    if (arr) arr.push(c);
    else map.set(key, [c]);
  }
  const byRecent = (a: CallRecord, b: CallRecord) =>
    new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
  return Array.from(map.entries())
    .map(([key, arr]) => [key, [...arr].sort(byRecent)] as [string, CallRecord[]])
    .sort(
      ([, a], [, b]) =>
        new Date(b[0].startedAt).getTime() - new Date(a[0].startedAt).getTime(),
    );
}

function statusLabel(status: string): { label: string; color: string } {
  switch (status) {
    case "COMPLETED":
    case "ANSWERED":
      return { label: status === "COMPLETED" ? "Completada" : "Atendida", color: "text-[var(--color-success-text)] bg-[var(--color-success-bg)]" };
    case "MISSED":
      return { label: "Perdida", color: "text-[var(--color-danger-text)] bg-[var(--color-danger-bg)]" };
    case "BUSY":
      return { label: "Ocupado", color: "text-[var(--color-warning-text)] bg-[var(--color-warn-bg)]" };
    case "FAILED":
      return { label: "Falhou", color: "text-[var(--color-danger-text)] bg-[var(--color-danger-bg)]" };
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
  /** Agrupa as linhas por dia (Hoje / Ontem / dd/mm), como no log de chamadas real.
   *  Só é aplicado quando `filters.sortBy === "startedAt"` (default). */
  groupByDay?: boolean;
  /** Conteúdo renderizado dentro do card, acima da tabela (banner, toolbar de filtros…). */
  header?: ReactNode;
}

export function CallHistoryList({
  filters: externalFilters,
  onFiltersChange,
  contactId,
  embedded,
  groupByDay: groupedRequested = false,
  header,
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
      <div className="flex flex-col gap-3">
        {header}
        <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-1.5 backdrop-blur-md shadow-[var(--glass-shadow)]">
          <EmptyState
            icon={<IconPhone size={28} />}
            title="Nenhuma chamada encontrada"
            description="Sem chamadas para os filtros selecionados."
          />
        </div>
      </div>
    );
  }

  // Layout em cards (padrão Contatos/Empresas): cabeçalho solto + linhas
  // individuais com gap. Em contexto embutido (inbox/pipeline) mantém tabela densa.
  const useCards = !embedded;

  // Ordenação — resolvida a partir de `filters` (default startedAt/desc). Só
  // agrupamos por dia quando a ordem é a padrão (startedAt/desc); em outras
  // ordens a lista renderiza plana para respeitar a ordenação do usuário.
  const currentSortBy: CallsSortField = filters.sortBy ?? "startedAt";
  const currentSortDir = filters.sortDir ?? "desc";
  const groupingActive =
    groupedRequested && currentSortBy === "startedAt" && currentSortDir === "desc";

  const sortFor = (field: CallsSortField): SortDir =>
    currentSortBy === field ? currentSortDir : null;

  const toggleSort = (field: CallsSortField) => {
    if (!onFiltersChange) return;
    let nextDir: CallsSortDir;
    if (currentSortBy === field) {
      nextDir = currentSortDir === "asc" ? "desc" : "asc";
    } else {
      // Data e Duração começam desc (mais recente/maior primeiro); demais asc.
      nextDir = field === "startedAt" || field === "durationSeconds" ? "desc" : "asc";
    }
    onFiltersChange({ ...filters, sortBy: field, sortDir: nextDir, page: 1 });
  };

  const HeadRow = (
    <>
      <span />
      <ListColumnLabel>Contato / Telefone</ListColumnLabel>
      <SortableHeader
        label="Direção"
        sort={sortFor("direction")}
        onSort={() => toggleSort("direction")}
      />
      <SortableHeader
        label="Status"
        sort={sortFor("status")}
        onSort={() => toggleSort("status")}
      />
      <SortableHeader
        label="Duração"
        sort={sortFor("durationSeconds")}
        onSort={() => toggleSort("durationSeconds")}
      />
      <SortableHeader
        label="Data e hora"
        sort={sortFor("startedAt")}
        onSort={() => toggleSort("startedAt")}
      />
      <ListColumnLabel align="right">Gravação</ListColumnLabel>
    </>
  );

  return (
    <div className={cn("flex min-h-0 flex-col gap-3", !embedded && "flex-1")}>
      {header}

      {useCards ? (
        <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
          <div className="flex min-w-[820px] flex-col gap-2">
            <div className={listTableHeadRowClass(`${COLS} gap-3 border border-transparent px-4 py-2`)}>
              {HeadRow}
            </div>

            {groupingActive
              ? groupByDay(calls).map(([label, rows]) => (
                  <div key={label} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between px-1 pt-1">
                      <span className="shrink-0 font-display text-[11px] font-bold text-[var(--text-secondary)]">
                        {label}
                      </span>
                      <span className="shrink-0 font-display text-[11px] font-medium text-[var(--text-muted)]">
                        {rows.length} ligaç{rows.length !== 1 ? "ões" : "ão"}
                      </span>
                    </div>
                    {rows.map((call) => (
                      <CallTableRow
                        key={call.id}
                        call={call}
                        isPlaying={playingId === call.id}
                        onPlay={() =>
                          setPlayingId(playingId === call.id ? null : call.id)
                        }
                        variant="card"
                      />
                    ))}
                  </div>
                ))
              : calls.map((call) => (
                  <CallTableRow
                    key={call.id}
                    call={call}
                    isPlaying={playingId === call.id}
                    onPlay={() => setPlayingId(playingId === call.id ? null : call.id)}
                    variant="card"
                  />
                ))}
          </div>
        </div>
      ) : (
        <div className="flex w-full min-w-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-1.5 shadow-[var(--glass-shadow)] backdrop-blur-md">
          <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
            <div className="min-w-[820px]">
              <div className={listTableHeadRowClass(`${COLS} gap-3 px-3 py-2.5`)}>
                {HeadRow}
              </div>
              <div className="flex flex-col">
                {calls.map((call) => (
                  <CallTableRow
                    key={call.id}
                    call={call}
                    isPlaying={playingId === call.id}
                    onPlay={() => setPlayingId(playingId === call.id ? null : call.id)}
                    variant="dense"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
  /** "card" = linhas separadas (padrão Contatos); "dense" = tabela embutida. */
  variant?: "card" | "dense";
}

function CallTableRow({ call, isPlaying, onPlay, variant = "dense" }: CallTableRowProps) {
  const isMissed = call.status === "MISSED" || call.status === "FAILED";
  const isInbound = call.direction === "INBOUND";
  const { label: sLabel, color: sColor } = statusLabel(call.status);

  return (
    <div
      className={cn(
        `grid ${COLS} items-center gap-3 transition-all`,
        variant === "card"
          ? "rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-4 py-3 shadow-[var(--glass-shadow-sm)] backdrop-blur-md hover:-translate-y-0.5 hover:shadow-[var(--glass-shadow)]"
          : "border-b border-[var(--glass-border-subtle)] px-3 py-2.5 last:border-b-0 hover:bg-[var(--glass-bg-overlay)]",
      )}
    >
        {/* Ícone de direção/status — protótipo: ⤫ perdida/falhou (danger),
            ↙ recebida (success), ↗ realizada (brand) */}
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
            isMissed
              ? "bg-[var(--color-danger-bg)] text-[var(--color-danger)]"
              : isInbound
                ? "bg-[var(--color-success-bg)] text-[var(--color-success)]"
                : "bg-[var(--color-primary-soft)] text-[var(--brand-primary-dark)]",
          )}
        >
          {isMissed ? (
            <IconPhoneX size={13} />
          ) : isInbound ? (
            <IconPhoneIncoming size={13} />
          ) : (
            <IconPhoneOutgoing size={13} />
          )}
        </span>

        {/* Contato / Telefone — avatar circular (padrão Contatos) + nome
            bold + telefone mono na mesma linha. Sem nome, apenas o telefone
            com um avatar neutro (?) para preservar alinhamento. */}
        <div className="flex min-w-0 items-center gap-2.5">
          <ChatAvatar
            user={{
              id: call.contact?.id ?? call.phone,
              name: call.contact?.name ?? null,
              imageUrl: null,
            }}
            channel={null}
            hideCartoon
            size={AVATAR_SIZE.sm}
          />
          <div className="min-w-0 truncate leading-tight">
            {call.contact?.name ? (
              <>
                <Link
                  href={`/contacts/${call.contact.id}`}
                  className="font-display text-[13px] font-bold text-[var(--text-primary)] transition-colors hover:text-[var(--brand-primary)]"
                >
                  {call.contact.name}
                </Link>{" "}
                <span className="font-mono text-[11px] tabular-nums text-[var(--text-muted)]">
                  {formatPhoneDisplay(call.phone)}
                </span>
              </>
            ) : call.contact ? (
              <Link
                href={`/contacts/${call.contact.id}`}
                className="font-mono text-[12.5px] font-semibold tabular-nums text-[var(--text-primary)] transition-colors hover:text-[var(--brand-primary)]"
              >
                {formatPhoneDisplay(call.phone)}
              </Link>
            ) : (
              <span className="font-mono text-[12.5px] font-semibold tabular-nums text-[var(--text-primary)]">
                {formatPhoneDisplay(call.phone)}
              </span>
            )}
          </div>
        </div>

        {/* Direção — Recebida = brand-soft; Realizada = azul mais claro
            (mesma família, cinza foi trocado por azul conforme padrão do DS). */}
        <span
          className={cn(
            "inline-flex w-fit items-center rounded-full px-2.5 py-[3px] font-display text-[11px] font-bold",
            isInbound
              ? "bg-[var(--color-primary-soft)] text-[var(--brand-primary-dark)]"
              : "bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] text-[var(--brand-primary)]",
          )}
        >
          {isInbound ? "Recebida" : "Realizada"}
        </span>

        {/* Status */}
        <span className={cn("inline-flex w-fit items-center rounded-full px-2.5 py-[3px] font-display text-[11px] font-bold", sColor)}>
          {sLabel}
        </span>

        {/* Duração */}
        <span className="font-mono text-[12.5px] tabular-nums text-[var(--text-secondary)]">
          {formatDuration(call.durationSeconds)}
        </span>

        {/* Data e hora */}
        <span className="whitespace-nowrap font-mono text-[12px] tabular-nums text-[var(--text-muted)]">
          {formatDate(call.startedAt)}
        </span>

        {/* Gravação — botão play; quando ativo, vira um player COMPACTO
            inline (barra menor ao lado do botão), sem expandir abaixo. */}
        <div className="flex min-w-0 items-center justify-end">
          {call.recordUrl ? (
            isPlaying ? (
              <CompactAudioPlayer
                src={call.recordUrl}
                fallbackDuration={call.durationSeconds}
                onEnded={onPlay}
              />
            ) : (
              <button
                type="button"
                onClick={onPlay}
                title="Ouvir gravação"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)] text-[var(--brand-primary)] transition-all hover:bg-[var(--brand-primary)] hover:text-white hover:shadow-[0_4px_12px_rgba(91,111,245,0.35)]"
              >
                <IconPlayerPlayFilled size={14} />
              </button>
            )
          ) : (
            <span className="h-8 w-8" />
          )}
        </div>
    </div>
  );
}

// ── Mini player COMPACTO inline ─────────────────────────────────────────────
// Ocupa a própria célula de "Gravação" (não expande abaixo): botão play/pause
// + barra arrastável (avançar/retroceder) + tempo atual / duração total.
function fmtClock(s: number) {
  if (!s || Number.isNaN(s) || !Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function CompactAudioPlayer({
  src,
  fallbackDuration,
  onEnded,
}: {
  src: string;
  fallbackDuration?: number | null;
  onEnded: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(fallbackDuration ?? 0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().catch(() => setPlaying(false));
    return () => {
      audio.pause();
    };
  }, [src]);

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
    if (audio.duration && Number.isFinite(audio.duration)) {
      setDuration(audio.duration);
      setProgress((audio.currentTime / audio.duration) * 100);
    }
  }

  function handleLoadedMetadata() {
    const audio = audioRef.current;
    if (audio?.duration && Number.isFinite(audio.duration)) {
      setDuration(audio.duration);
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio || !audio.duration || !Number.isFinite(audio.duration)) return;
    audio.currentTime = (Number(e.target.value) / 100) * audio.duration;
    setProgress(Number(e.target.value));
    setCurrentTime(audio.currentTime);
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  return (
    <div className="flex min-w-0 items-center justify-end gap-1.5">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={onEnded}
        preload="metadata"
        className="hidden"
      />
      <button
        type="button"
        onClick={togglePlay}
        title={playing ? "Pausar gravação" : "Retomar gravação"}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white shadow-[0_2px_6px_rgba(91,111,245,0.3)] transition-transform hover:scale-105"
      >
        {playing ? (
          <IconPlayerPauseFilled size={13} />
        ) : (
          <IconPlayerPlayFilled size={13} />
        )}
      </button>
      <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-[var(--text-secondary)]">
        {fmtClock(currentTime)}
      </span>
      <div className="group relative min-w-[36px] flex-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--glass-border)]">
          <div
            className="h-full rounded-full bg-[var(--brand-primary)]"
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
      <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-[var(--text-muted)]">
        {fmtClock(duration)}
      </span>
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
