"use client";

/**
 * DealQueue — Fila unificada de deals (Sales Hub).
 * ───────────────────────────────────────────────────────────────
 * Cards ultra-compactos (~44px). Seleção = highlight visual apenas.
 * Campos CRM (produto / responsável / contato / etapa / layout)
 * moram no DealDetailPanel da Sheet à direita — nunca na coluna da fila.
 *
 * Ganho/Perdido só na barra do chat (`DealOutcomeButtons`).
 * Clique no card seleciona o deal (foco do chat).
 */

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  IconArrowsUpDown as ArrowUpDown,
  IconCheck as Check,
  IconChevronDown as ChevronDown,
  IconMicrophone as Mic,
  IconPhoto as ImageIcon,
  IconFileText as FileText,
  IconPaperclip as Paperclip,
  IconVideo as Video,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { BoardDeal } from "@/components/pipeline/kanban-types";
import type { BoardStage } from "@/components/pipeline/kanban-board";
import { SUBTLE_SPRING } from "@/lib/design-system";
import { ChatAvatar, type ChatAvatarChannel } from "@/components/inbox/chat-avatar";
import { AvatarGlass } from "@/components/crm/avatar-glass";
import { TagChip } from "@/components/crm/tag-chip";
import { TooltipHost } from "@/components/ui/tooltip";

type StatusFilter = "OPEN" | "WON" | "LOST" | "ALL";
export type DealQueueSortMode =
  | "message_new"
  | "message_old"
  | "created_new"
  | "created_old";

const SORT_LABELS: Record<DealQueueSortMode, string> = {
  message_new: "Mensagem mais recente",
  message_old: "Mensagem mais antiga",
  created_new: "Criação mais recente",
  created_old: "Criação mais antiga",
};

const SORT_HINTS: Record<DealQueueSortMode, string> = {
  message_new: "Quem respondeu por último no topo",
  message_old: "Quem está esperando há mais tempo no topo",
  created_new: "Leads novos no topo",
  created_old: "Leads mais antigos no topo",
};

/** Filtro local da fila (nome, e-mail, telefone, título do negócio). */
export function filterDealsForQueueSearch(
  deals: (BoardDeal & { stageId: string })[],
  q: string,
): (BoardDeal & { stageId: string })[] {
  const t = q.trim().toLowerCase();
  if (!t) return deals;
  return deals.filter((d) => {
    const name = (d.contact?.name ?? d.title).toLowerCase();
    return (
      name.includes(t) ||
      (d.contact?.email ?? "").toLowerCase().includes(t) ||
      (d.contact?.phone ?? "").toLowerCase().includes(t) ||
      d.title.toLowerCase().includes(t)
    );
  });
}

/**
 * Dropdown de ordenação da fila (Pipeline Ágil).
 * `iconOnly` — botão quadrado só com ícone (ex.: ao lado da busca na coluna).
 * `compact` — rótulo curto no header (legado); ignorado se `iconOnly`.
 */
export function DealQueueSortMenu({
  sortMode,
  onSortModeChange,
  compact = false,
  iconOnly = false,
}: {
  sortMode: DealQueueSortMode;
  onSortModeChange: (mode: DealQueueSortMode) => void;
  compact?: boolean;
  iconOnly?: boolean;
}) {
  const [sortOpen, setSortOpen] = useState(false);
  const sortButtonRef = useRef<HTMLButtonElement | null>(null);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sortOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (sortButtonRef.current?.contains(target)) return;
      if (sortMenuRef.current?.contains(target)) return;
      setSortOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSortOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", onKey);
    };
  }, [sortOpen]);

  return (
    <div className="relative shrink-0">
        <TooltipHost label={`Ordenar — ${SORT_LABELS[sortMode]}`} side="top">
          <button
            ref={sortButtonRef}
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={sortOpen}
            aria-label={`Ordenar fila: ${SORT_LABELS[sortMode]}`}
            className={cn(
              "inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] font-semibold tracking-tight text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg-strong)]",
              iconOnly
                ? "size-8 shrink-0 p-0"
                : cn(
                    compact ? "gap-1 px-2 py-1 text-[10px]" : "gap-1.5 px-2.5 py-1.5 text-[12px]",
                  ),
              sortOpen && "border-[var(--brand-primary)]/40 ring-[3px] ring-[var(--brand-primary)]/15",
            )}
          >
            <ArrowUpDown
              className={cn(
                "text-[var(--text-muted)]",
                iconOnly ? "size-3.5" : compact ? "size-3" : "size-3.5",
              )}
              strokeWidth={2.2}
            />
            {!iconOnly ? (
              <>
                <span
                  className={cn(
                    "truncate",
                    compact ? "max-w-[120px] sm:max-w-[160px]" : "max-w-[160px] sm:max-w-[200px]",
                  )}
                >
                  {SORT_LABELS[sortMode]}
                </span>
                <ChevronDown
                  className={cn(
                    "size-3 text-[var(--text-muted)] transition-transform",
                    sortOpen && "rotate-180",
                  )}
                  strokeWidth={2.5}
                />
              </>
            ) : null}
          </button>
        </TooltipHost>
        {sortOpen ? (
          <div
            ref={sortMenuRef}
            role="listbox"
            className="absolute right-0 z-30 mt-1 w-[240px] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-modal)] shadow-[0_12px_32px_rgba(15,23,42,0.18)] backdrop-blur-xl"
          >
            {(Object.keys(SORT_LABELS) as DealQueueSortMode[]).map((mode) => {
              const isActive = mode === sortMode;
              return (
                <button
                  key={mode}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onSortModeChange(mode);
                    setSortOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-2 px-3 py-2 text-left transition-colors",
                    isActive
                      ? "bg-[var(--color-enterprise-bg)]"
                      : "hover:bg-[var(--glass-bg-strong)]",
                  )}
                >
                  <Check
                    className={cn(
                      "mt-0.5 size-3.5 shrink-0",
                      isActive ? "text-[var(--brand-primary)]" : "text-transparent",
                    )}
                    strokeWidth={2.5}
                  />
                  <div className="min-w-0">
                    <div
                      className={cn(
                        "truncate font-display text-[13px] font-semibold tracking-tight",
                        isActive
                          ? "text-[var(--brand-primary)]"
                          : "text-[var(--text-primary)]",
                      )}
                    >
                      {SORT_LABELS[mode]}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)]">{SORT_HINTS[mode]}</div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
    </div>
  );
}

type DealQueueProps = {
  deals: (BoardDeal & { stageId: string })[];
  stages: BoardStage[];
  activeDealId: string | null;
  onSelectDeal: (dealId: string) => void;
  /**
   * Callback disparado ao clicar de novo no card ativo —
   * desmarca a seleção. Em `SalesHubView` isso volta ao estado
   * "nenhum deal em foco" (a área do chat mostra o placeholder).
   */
  onDeselect?: () => void;
  /**
   * ID do deal recém-movido. Renderizado com highlight sutil por
   * ~1.5s pra ajudar o operador a localizar visualmente o card que
   * "pulou" de etapa quando o quick-move é disparado dos botões.
   */
  recentlyMovedDealId?: string | null;
  /** Mantidos na API pública (host / SalesHubView); CRM vive na Sheet. */
  pipelineId: string;
  statusFilter?: StatusFilter;
  onMoved?: (dealId: string) => void;
  onOpenFullDeal?: (dealId: string) => void;
};

/**
 * Tempo relativo curto pt-BR — "agora", "há 5 min", "há 2 h", "há 3 d".
 */
function formatRelativeShort(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "agora";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "agora";
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d} d`;
  const w = Math.floor(d / 7);
  if (w < 4) return `há ${w} sem`;
  const mo = Math.floor(d / 30);
  return `há ${mo} mês${mo > 1 ? "es" : ""}`;
}

function PreviewLastMessage({ deal }: { deal: BoardDeal }) {
  const m = deal.lastMessage;

  if (!m?.content?.trim()) {
    return <span className="italic text-[var(--text-muted)]">Sem mensagens</span>;
  }

  const content = m.content.trim();
  const isOut = m.direction === "out";
  const prefix = isOut ? "Você: " : "";

  if (/\.(ogg|mp3|m4a|aac|opus|wav|amr)$/i.test(content) || content === "🎵" || content.toLowerCase().includes("audio")) {
    return (
      <span className="flex items-center gap-1 text-[var(--text-muted)]">
        {isOut ? <span className="text-[var(--text-muted)]">Você: </span> : null}
        <Mic className="size-3 shrink-0 text-[var(--brand-secondary)]" />
        <span>Áudio</span>
      </span>
    );
  }

  if (/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(content) || content === "📷" || content.toLowerCase() === "[imagem]") {
    return (
      <span className="flex items-center gap-1 text-[var(--text-muted)]">
        {isOut ? <span className="text-[var(--text-muted)]">Você: </span> : null}
        <ImageIcon className="size-3 shrink-0 text-[var(--brand-primary)]" />
        <span>Imagem</span>
      </span>
    );
  }

  if (/\.(mp4|mov|avi|mkv|webm)$/i.test(content)) {
    return (
      <span className="flex items-center gap-1 text-[var(--text-muted)]">
        {isOut ? <span className="text-[var(--text-muted)]">Você: </span> : null}
        <Video className="size-3 shrink-0 text-[var(--brand-accent)]" />
        <span>Vídeo</span>
      </span>
    );
  }

  if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|csv|txt)$/i.test(content)) {
    return (
      <span className="flex items-center gap-1 text-[var(--text-muted)]">
        {isOut ? <span className="text-[var(--text-muted)]">Você: </span> : null}
        <FileText className="size-3 shrink-0 text-[var(--color-warning)]" />
        <span>Documento</span>
      </span>
    );
  }

  if (/\.\w{2,5}$/.test(content) && !content.includes(" ")) {
    return (
      <span className="flex items-center gap-1 text-[var(--text-muted)]">
        {isOut ? <span className="text-[var(--text-muted)]">Você: </span> : null}
        <Paperclip className="size-3 shrink-0 text-[var(--text-muted)]" />
        <span>Arquivo</span>
      </span>
    );
  }

  const line = content.split("\n")[0].slice(0, 120);
  return (
    <span className="text-[var(--text-muted)]">
      {prefix}
      {line}
    </span>
  );
}

// ── DealCard ────────────────────────────────────────────────────
// Card compacto (~44px). Seleção = highlight; sem expansão inline.
function DealCard({
  deal,
  isActive,
  onSelectDeal,
  onDeselect,
  wasRecentlyMoved,
}: {
  deal: BoardDeal & { stageId: string };
  isActive: boolean;
  onSelectDeal: (dealId: string) => void;
  onDeselect?: () => void;
  wasRecentlyMoved: boolean;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  const toggleSelection = () => {
    if (isActive) onDeselect?.();
    else onSelectDeal(deal.id);
  };

  const contactTitle = deal.contact?.name ?? `#${deal.number ?? "—"}`;
  const headline = deal.contact?.name ?? deal.title;
  const contactAvatarColor =
    (deal.contact as { avatarColor?: string } | null | undefined)?.avatarColor ?? "var(--brand-primary)";
  const timeLabel = formatRelativeShort(deal.lastMessage?.createdAt ?? deal.createdAt);
  const tagList = deal.tags ?? [];

  useEffect(() => {
    if (isActive && cardRef.current) {
      cardRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [isActive]);

  return (
    <motion.div
      layout
      ref={cardRef}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={SUBTLE_SPRING}
      onClick={toggleSelection}
      onKeyDown={(ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          toggleSelection();
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      aria-label={
        isActive
          ? `Desmarcar ${contactTitle}`
          : `Selecionar ${contactTitle}`
      }
      className={cn(
        // Espelha `ConversationCard` (Inbox v2): cards glass com ring de seleção.
        "group relative cursor-pointer select-none rounded-[var(--radius-lg)] border border-transparent px-3 py-2 text-left shadow-[0_1px_3px_rgba(15,23,42,0.04)] outline-none transition-all duration-200",
        "bg-[color-mix(in_srgb,var(--glass-bg-overlay)_60%,rgba(148,163,184,0.10))]",
        "hover:bg-[var(--glass-bg-overlay)]",
        "focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/40",
        isActive &&
          "border-[var(--brand-primary)]/55 bg-white ring-2 ring-inset ring-[var(--brand-primary)]/30 shadow-[0_2px_8px_rgba(91,111,245,0.12)] hover:bg-white",
        wasRecentlyMoved &&
          !isActive &&
          "ring-2 ring-inset ring-[var(--brand-primary)]/25",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="relative shrink-0">
          {deal.contact ? (
            <ChatAvatar
              user={{
                id: deal.contact.id,
                name: deal.contact.name,
                imageUrl: deal.contact.avatarUrl ?? null,
              }}
              phone={deal.contact.phone ?? undefined}
              unreadCount={deal.unreadCount ?? 0}
              channel={(deal.channel as ChatAvatarChannel) ?? "whatsapp"}
              size={28}
            />
          ) : (
            <div
              className="flex size-7 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-[var(--avatar-ring,white)]"
              style={{ background: contactAvatarColor }}
              aria-hidden
            >
              {(deal.title ?? "?").slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="min-w-0 flex-1 truncate font-display text-[13px] font-bold text-[var(--text-primary)]">
              {headline}
            </p>
            <span className="shrink-0 text-[10px] tabular-nums text-[var(--text-muted)]">
              {timeLabel}
            </span>
            {deal.owner ? (
              <AvatarGlass
                name={deal.owner.name}
                seed={deal.owner.id}
                imageUrl={deal.owner.avatarUrl ?? null}
                size="sm"
                className="!h-5 !w-5 !text-[9px]"
              />
            ) : null}
          </div>

          <p className="mt-0.5 truncate text-[12px] text-[var(--text-muted)]">
            <PreviewLastMessage deal={deal} />
          </p>

          {tagList.length > 0 ? (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {tagList.slice(0, 2).map((t) => (
                <TagChip
                  key={t.id}
                  name={t.name}
                  color={t.color}
                  className="h-5 max-w-[7rem]"
                />
              ))}
              {tagList.length > 2 ? (
                <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                  +{tagList.length - 2}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Queue ───────────────────────────────────────────────────

export function DealQueue({
  deals,
  activeDealId,
  onSelectDeal,
  onDeselect,
  recentlyMovedDealId,
}: DealQueueProps) {
  // Mantem o card ativo sempre visivel na fila — quando a selecao
  // muda, rola suave pro card novo ficar no viewport.
  const scrollerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLElement>());

  useEffect(() => {
    if (!activeDealId) return;
    const el = itemRefs.current.get(activeDealId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeDealId]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[var(--glass-bg)]">
      <div
        ref={scrollerRef}
        className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5"
      >
        <div className="flex flex-col gap-1.5">
          <AnimatePresence initial={false} mode="popLayout">
            {deals.map((deal) => {
              const isActive = activeDealId === deal.id;
              const wasRecentlyMoved = recentlyMovedDealId === deal.id;

              return (
                <div
                  key={deal.id}
                  ref={(el) => {
                    if (el) itemRefs.current.set(deal.id, el);
                    else itemRefs.current.delete(deal.id);
                  }}
                >
                  <DealCard
                    deal={deal}
                    isActive={isActive}
                    onSelectDeal={onSelectDeal}
                    onDeselect={onDeselect}
                    wasRecentlyMoved={wasRecentlyMoved}
                  />
                </div>
              );
            })}
          </AnimatePresence>
          {deals.length === 0 && (
            <p className="px-2 py-8 text-center text-xs text-[var(--text-muted)]">
              Nenhum deal encontrado
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
