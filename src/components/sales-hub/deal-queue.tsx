"use client";

/**
 * DealQueue — Fila unificada de deals (Sales Hub).
 * ───────────────────────────────────────────────────────────────
 * Os itens da fila são o MESMO `DealCard` do kanban do `/pipeline`
 * (`components/crm/deal-card`), alimentado pelo mesmo adapter
 * (`toDealCard`). Antes a fila desenhava um card próprio, minimalista,
 * que destoava visualmente dos cards de negócio.
 *
 * Seleção = highlight visual apenas (`isSelected` do próprio DealCard).
 * Campos CRM (produto / responsável / contato / etapa / layout) moram no
 * DealDetailPanel da Sheet à direita — nunca na coluna da fila.
 */

import { useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  IconArrowsUpDown as ArrowUpDown,
  IconCheck as Check,
  IconChevronDown as ChevronDown,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { BoardDeal } from "@/components/pipeline/kanban-types";
import type { BoardStage } from "@/components/pipeline/kanban-board";
import { SUBTLE_SPRING } from "@/lib/design-system";
import { DealCard } from "@/components/crm/deal-card";
import { TagChip } from "@/components/crm/tag-chip";
import { toDealCard } from "@/features/pipeline-v2/adapters";
import type { BoardDealDto } from "@/features/pipeline-v2/api";
import { TooltipHost } from "@/components/ui/tooltip";
import {
  computePopoverPosition,
  usePortalPopover,
} from "@/features/pipeline-v2/extras/use-portal-popover";

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
  const { open, rect, triggerRef, popoverRef, toggle, close } =
    usePortalPopover();
  const position = computePopoverPosition(rect, 220, 240);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <div className="relative shrink-0">
      <TooltipHost label={`Ordenar — ${SORT_LABELS[sortMode]}`} side="top">
        <button
          ref={triggerRef}
          type="button"
          onClick={toggle}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Ordenar fila: ${SORT_LABELS[sortMode]}`}
          className={cn(
            "inline-flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] font-semibold tracking-tight text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg-strong)]",
            iconOnly
              ? "size-8 shrink-0 p-0"
              : cn(
                  compact
                    ? "gap-1 px-2 py-1 text-[10px]"
                    : "gap-1.5 px-2.5 py-1.5 text-[12px]",
                ),
            open &&
              "border-[var(--brand-primary)]/40 ring-[3px] ring-[var(--brand-primary)]/15",
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
                  compact
                    ? "max-w-[120px] sm:max-w-[160px]"
                    : "max-w-[160px] sm:max-w-[200px]",
                )}
              >
                {SORT_LABELS[sortMode]}
              </span>
              <ChevronDown
                className={cn(
                  "size-3 text-[var(--text-muted)] transition-transform",
                  open && "rotate-180",
                )}
                strokeWidth={2.5}
              />
            </>
          ) : null}
        </button>
      </TooltipHost>
      {open && rect && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popoverRef}
              role="listbox"
              className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-white shadow-[0_12px_32px_rgba(15,23,42,0.18)] v2-dark:bg-[#1a1f2e] v2-dark:shadow-[0_12px_32px_rgba(0,0,0,0.55)]"
              style={{
                position: "fixed",
                top: position.top,
                left: position.left,
                width: 240,
                zIndex: "var(--z-popover)",
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
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
                      close();
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
                        isActive
                          ? "text-[var(--brand-primary)]"
                          : "text-transparent",
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
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {SORT_HINTS[mode]}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
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
  /** Quando muda, a fila volta ao topo para a nova ordem ficar visível. */
  sortMode?: DealQueueSortMode;
  /** Mantidos na API pública (host / SalesHubView); CRM vive na Sheet. */
  pipelineId: string;
  statusFilter?: StatusFilter;
  onMoved?: (dealId: string) => void;
  onOpenFullDeal?: (dealId: string) => void;
};

// ── Item da fila ────────────────────────────────────────────────
// Wrapper fino em volta do `DealCard` real do kanban: adiciona só a
// animação de entrada/saída da fila, o realce de "recém-movido" e o
// badge de não-lidas (que no kanban vive no header da coluna, não no
// card).
function DealQueueItem({
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
  const toggleSelection = () => {
    if (isActive) onDeselect?.();
    else onSelectDeal(deal.id);
  };

  const vm = toDealCard(deal as unknown as BoardDealDto);
  const tagList = deal.tags ?? [];
  const unread = deal.unreadCount ?? 0;

  // Não scrollIntoView aqui: com AnimatePresence/popLayout a reordenação
  // remonta o item ativo e o effect rodaria de novo, pulando a fila para
  // o card selecionado em vez de mostrar o topo da nova ordem. O scroll
  // intencional fica em DealQueue (só quando activeDealId muda).

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={SUBTLE_SPRING}
      className={cn(
        "relative rounded-xl",
        wasRecentlyMoved && !isActive && "ring-2 ring-[var(--brand-primary)]/25",
      )}
    >
      <DealCard
        deal={vm}
        isSelected={isActive}
        onClick={toggleSelection}
        // Flow: uma linha só (nowrap). Nunca `two-col` — grid cria 2 linhas e infla o card.
        tagsWrap={false}
        tagsSlot={
          tagList.length > 0 ? (
            <>
              {tagList.slice(0, 2).map((t) => (
                <TagChip
                  key={t.id}
                  name={t.name}
                  color={t.color}
                  className="min-w-0 max-w-[46%] shrink truncate whitespace-nowrap"
                />
              ))}
              {tagList.length > 2 ? (
                <span className="inline-flex shrink-0 items-center whitespace-nowrap text-[10px] font-semibold text-[var(--text-muted)]">
                  +{tagList.length - 2}
                </span>
              ) : null}
            </>
          ) : undefined
        }
      />
      {unread > 0 ? (
        <span
          className="pointer-events-none absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1 py-0.5 text-[10px] font-bold leading-none text-primary-foreground shadow-[var(--shadow-sm)] tabular-nums"
          aria-label={`${unread} mensagens não lidas`}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
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
  sortMode,
}: DealQueueProps) {
  // Mantem o card ativo sempre visivel na fila — quando a selecao
  // muda, rola suave pro card novo ficar no viewport.
  const scrollerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLElement>());

  // Troca de ordenação: lista do topo (ordem nova), sem pular pro deal ativo.
  useEffect(() => {
    if (sortMode === undefined) return;
    if (scrollerRef.current) scrollerRef.current.scrollTop = 0;
  }, [sortMode]);

  useEffect(() => {
    if (!activeDealId) return;
    const el = itemRefs.current.get(activeDealId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeDealId]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-transparent">
      <div
        ref={scrollerRef}
        className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain p-2"
      >
        <div className="flex flex-col gap-2">
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
                  <DealQueueItem
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
