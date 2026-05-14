"use client";

import { apiUrl } from "@/lib/api";
/**
 * DealQueue — Fila unificada de deals (Sales Hub).
 * ───────────────────────────────────────────────────────────────
 * Cards ultra-compactos (~44px) com expansão inline ao clicar:
 *
 *   ▸ Colapsado: avatar 36px, nome, até 3 tags (+N), preview 12px,
 *     tempo relativo, badge de não lidas.
 *   ▸ Expandido: dois cards compactos (estágio + produto; contato +
 *     responsável), fundo sutil; `StageInlinePicker`, `DealProductLine`,
 *     popover de responsável; ícone para abrir deal completo.
 *
 * Ganho/Perdido só na barra do chat (`DealChatActionBar`).
 * Clique no card alterna seleção (foco do chat) e o estado expandido.
 */

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Package,
  Plus,
  Loader2,
  X,
  ChevronDown,
  Phone,
  Check,
  UserMinus,
  ArrowUpDown,
  Mic,
  Image,
  FileText,
  Paperclip,
  Video,
  ExternalLink,
  Settings2,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatCurrency, tagPillStyle } from "@/lib/utils";
import type { BoardDeal } from "@/components/pipeline/kanban-types";
import type { BoardStage } from "@/components/pipeline/kanban-board";
import { useMoveMutation } from "@/components/sales-hub/deal-actions";
import { SUBTLE_SPRING } from "@/lib/design-system";
import { ChatAvatar, type ChatAvatarChannel } from "@/components/inbox/chat-avatar";
import { SidebarField } from "@/components/ui/sidebar-field";
import { TooltipHost } from "@/components/ui/tooltip";
import { dt } from "@/lib/design-tokens";
import { useFieldLayout } from "@/hooks/use-field-layout";

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
              "inline-flex items-center justify-center rounded-lg border border-border bg-white font-semibold tracking-tight text-foreground shadow-[var(--shadow-sm)] transition-colors hover:border-border hover:bg-slate-50",
              iconOnly
                ? "size-8 shrink-0 p-0"
                : cn(
                    compact ? "gap-1 px-2 py-1 text-[10px]" : "gap-1.5 px-2.5 py-1.5 text-[12px]",
                  ),
              sortOpen && "border-primary ring-[3px] ring-primary/15",
            )}
          >
            <ArrowUpDown
              className={cn(
                "text-[var(--color-ink-muted)]",
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
                    "size-3 text-[var(--color-ink-muted)] transition-transform",
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
            className="absolute right-0 z-30 mt-1 w-[240px] overflow-hidden rounded-xl border border-border bg-white shadow-[var(--shadow-lg)]"
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
                    isActive ? "bg-[var(--color-primary-soft)]" : "hover:bg-[var(--color-bg-subtle)]",
                  )}
                >
                  <Check
                    className={cn(
                      "mt-0.5 size-3.5 shrink-0",
                      isActive ? "text-primary" : "text-transparent",
                    )}
                    strokeWidth={2.5}
                  />
                  <div className="min-w-0">
                    <div
                      className={cn(
                        "truncate text-[13px] font-semibold tracking-tight",
                        isActive ? "text-[var(--color-primary-dark)]" : "text-[var(--color-ink-soft)]",
                      )}
                    >
                      {SORT_LABELS[mode]}
                    </div>
                    <div className="text-[10px] text-[var(--color-ink-muted)]">{SORT_HINTS[mode]}</div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
    </div>
  );
}

/** Linha do `/api/users` usada apenas para o popover de troca de
 *  responsável dentro do `DealCard`. Mantém só os campos que o popover
 *  realmente renderiza — não derivamos do tipo do `kanban-board` para
 *  evitar acoplamento entre os dois módulos. */
type OwnerCandidate = {
  id: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  agentStatus?: {
    status: "ONLINE" | "OFFLINE" | "AWAY";
  } | null;
};

type DealQueueProps = {
  deals: (BoardDeal & { stageId: string })[];
  stages: BoardStage[];
  activeDealId: string | null;
  onSelectDeal: (dealId: string) => void;
  /**
   * Callback disparado ao clicar em "Recolher" no card ativo —
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
  /**
   * Props necessários para o `StageInlinePicker` (linha de etapa
   * clicável) e o `DealProductLine` (linha de produto/valor). Ambos
   * moram dentro de TODOS os cards (não só do ativo). `pipelineId`
   * é a chave do cache otimista `pipeline-board`; `statusFilter`
   * invalida só a view atual; `onMoved` dispara o highlight
   * temporário do card recém-movido.
   */
  pipelineId: string;
  statusFilter?: StatusFilter;
  onMoved?: (dealId: string) => void;
  /** Abre o workspace / deal completo (Pipeline). */
  onOpenFullDeal?: (dealId: string) => void;
};

function dealValue(deal: BoardDeal): number {
  if (typeof deal.value === "number") return deal.value;
  const n = Number(deal.value);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Temperatura do deal (FRIO/MORNO/QUENTE) foi REMOVIDA do card por
 * decisão de produto: a heurística inicial (rotting/priority/overdue)
 * exibia um critério antes de ele estar formalizado. A regra real
 * será definida por workspace (`WorkspaceUrgencyRule` no Prisma +
 * UI em /settings/automations). Quando voltar, o badge entra de
 * novo no header do card — até lá, sem indicador.
 */

/**
 * Tempo relativo curto pt-BR — "agora", "há 5 min", "há 2 h", "há 3 d".
 * Usado pela dica "Você respondeu há…" quando a última mensagem do
 * deal é outbound (agente). Sem dependência externa pra evitar bundle.
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
    return <span className="italic text-slate-300">Sem mensagens</span>;
  }

  const content = m.content.trim();
  const isOut = m.direction === "out";
  const prefix = isOut ? "Você: " : "";

  if (/\.(ogg|mp3|m4a|aac|opus|wav|amr)$/i.test(content) || content === "🎵" || content.toLowerCase().includes("audio")) {
    return (
      <span className="flex items-center gap-1 text-[var(--color-ink-muted)]">
        {isOut ? <span className="text-[var(--color-ink-muted)]">Você: </span> : null}
        <Mic className="size-3 shrink-0 text-[#a855f7]" />
        <span>Áudio</span>
      </span>
    );
  }

  if (/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(content) || content === "📷" || content.toLowerCase() === "[imagem]") {
    return (
      <span className="flex items-center gap-1 text-[var(--color-ink-muted)]">
        {isOut ? <span className="text-[var(--color-ink-muted)]">Você: </span> : null}
        <Image className="size-3 shrink-0 text-[#3b82f6]" />
        <span>Imagem</span>
      </span>
    );
  }

  if (/\.(mp4|mov|avi|mkv|webm)$/i.test(content)) {
    return (
      <span className="flex items-center gap-1 text-[var(--color-ink-muted)]">
        {isOut ? <span className="text-[var(--color-ink-muted)]">Você: </span> : null}
        <Video className="size-3 shrink-0 text-[#ec4899]" />
        <span>Vídeo</span>
      </span>
    );
  }

  if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|csv|txt)$/i.test(content)) {
    return (
      <span className="flex items-center gap-1 text-[var(--color-ink-muted)]">
        {isOut ? <span className="text-[var(--color-ink-muted)]">Você: </span> : null}
        <FileText className="size-3 shrink-0 text-[#f97316]" />
        <span>Documento</span>
      </span>
    );
  }

  if (/\.\w{2,5}$/.test(content) && !content.includes(" ")) {
    return (
      <span className="flex items-center gap-1 text-[var(--color-ink-muted)]">
        {isOut ? <span className="text-[var(--color-ink-muted)]">Você: </span> : null}
        <Paperclip className="size-3 shrink-0 text-[var(--color-ink-muted)]" />
        <span>Arquivo</span>
      </span>
    );
  }

  const line = content.split("\n")[0].slice(0, 120);
  return (
    <span className="text-[var(--color-ink-muted)]">
      {prefix}
      {line}
    </span>
  );
}

// ── useAnchoredPopover ─────────────────────────────────────────
// Hook compartilhado pelos popovers do card (etapa, produto,
// responsável). Encapsula o problema do "popover cortado pelo
// scroller pai":
//
// O `DealQueue` usa `overflow-y-auto` pra rolar a lista de cards;
// se o popover for posicionado com `absolute` dentro do card, ele
// vira filho desse scroller e qualquer parte que extravase é
// cortada (foi exatamente o que aconteceu com `MOVER PARA` na
// imagem do operador — a lista de etapas ficava parcialmente
// escondida pelo card de baixo).
//
// Solução: renderizar o popover via `createPortal` no `<body>`
// com `position: fixed`, calculando `top/left/width` a partir do
// `getBoundingClientRect()` do botão âncora. O hook recalcula em
// scroll/resize pra manter o popover "grudado" no botão, e
// fecha em click-outside ou Esc.
//
// Retorna o estado, refs e helpers necessários para um popover
// ancorado, e quem usa só precisa renderizar o conteúdo dentro
// do `createPortal(...)` quando `open` estiver true.
function useAnchoredPopover() {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  useLayoutEffect(() => {
    // Sem `setPos(null)` ao fechar: evita setState síncrono no effect (eslint)
    // e o portal só renderiza com `open && pos`; ao reabrir, `update()` reposiciona.
    if (!open) return;
    const update = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (!r) return;
      setPos({ top: r.bottom + 6, left: r.left, width: r.width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return { open, setOpen, anchorRef, popoverRef, pos };
}

// ── DealProductLine ─────────────────────────────────────────────────
// Linha "Produto" do card — sempre presente. Dois estados:
//   • Com produto vinculado → ícone Package + nome do produto à
//     esquerda + valor formatado à direita (consolidação que
//     SUBSTITUI a antiga caixa "VALOR DO NEGÓCIO" separada).
//   • Sem produto → CTA inline "+ Adicionar produto" que abre um
//     popover com busca no catálogo (`/api/products`).
type CatalogProduct = {
  id: string;
  name: string;
  sku: string | null;
  type: "PRODUCT" | "SERVICE";
  price: number;
};

function DealProductLine({
  deal,
  pipelineId,
  compactCta = false,
}: {
  deal: BoardDeal & { stageId: string };
  pipelineId: string;
  /** CTA “Adicionar produto” em linha única compacta (card expandido). */
  compactCta?: boolean;
}) {
  const queryClient = useQueryClient();
  const { open, setOpen, anchorRef, popoverRef, pos } = useAnchoredPopover();
  const [search, setSearch] = useState("");

  const { data: catalog = [], isLoading: catalogLoading } = useQuery({
    queryKey: ["products-catalog-sh", search],
    queryFn: async () => {
      const params = new URLSearchParams({ perPage: "12" });
      if (search) params.set("search", search);
      const res = await fetch(apiUrl(`/api/products?${params}`));
      if (!res.ok) return [];
      const data = await res.json();
      return (data.products ?? []) as CatalogProduct[];
    },
    enabled: open,
  });

  const addMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch(apiUrl(`/api/deals/${deal.id}/products`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message ?? "Erro ao adicionar produto");
      }
    },
    onSuccess: () => {
      toast.success("Produto adicionado", { duration: 1800 });
      queryClient.invalidateQueries({ queryKey: ["pipeline-board", pipelineId] });
      queryClient.invalidateQueries({ queryKey: ["deal-products", deal.id] });
      setOpen(false);
      setSearch("");
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Erro ao adicionar produto");
    },
  });

  // Estado: produto vinculado — só texto 12px, sem ícone de caixa.
  if (deal.productName) {
    return (
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-[13px] font-normal text-[var(--color-ink-soft)]">
          {deal.productName}
        </span>
        <span className="shrink-0 text-[13px] font-normal tabular-nums text-[var(--color-ink-soft)]">
          {formatCurrency(dealValue(deal))}
        </span>
      </div>
    );
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "group flex w-full items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-left transition-all hover:border-slate-400",
          compactCta &&
            "inline-flex w-auto max-w-full justify-end border-0 bg-transparent px-0 py-0 shadow-none hover:border-0",
          open &&
            "border-solid border-blue-600 shadow-[0_0_0_3px_rgba(37,99,235,0.12)]",
          compactCta &&
            open &&
            "rounded-md border border-dashed border-slate-300 px-2 py-1",
        )}
      >
        <Plus
          className={cn(
            "shrink-0 text-[var(--color-ink-muted)] transition-colors group-hover:text-[var(--color-ink-soft)]",
            compactCta ? "size-3" : "size-3.5",
          )}
          strokeWidth={2.5}
        />
        <span
          className={cn(
            "transition-colors group-hover:text-[var(--color-ink-soft)]",
            compactCta
              ? "text-[12px] font-normal text-[var(--color-ink-muted)] group-hover:text-[var(--color-info)]"
              : "text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ink-muted)]",
          )}
        >
          Adicionar produto
        </span>
      </button>

      {/* Popover renderizado via Portal — escapa do `overflow-y-auto`
          do scroller pai (DealQueue) que cortava a lista quando ela
          extravasava o card. Posição calculada pelo hook a partir
          do `getBoundingClientRect()` do âncora e atualizada em
          scroll/resize. `width` segue a do botão (mín. 280px pra
          comportar nomes de produto sem truncar feio). */}
      {open && pos && typeof window !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: Math.max(pos.width, 280),
              zIndex: 9999,
            }}
            className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_20px_48px_-16px_rgba(15,23,42,0.28)]"
          >
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
              <Search
                className="size-3.5 shrink-0 text-[var(--color-ink-muted)]"
                strokeWidth={2.5}
              />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produto..."
                className="w-full bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-[var(--color-ink-muted)]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)]"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
            <ul className="scrollbar-thin max-h-[240px] overflow-y-auto py-1">
              {catalogLoading && catalog.length === 0 ? (
                <li className="flex items-center justify-center gap-2 px-3 py-4 text-[12px] font-semibold text-[var(--color-ink-muted)]">
                  <Loader2 className="size-3 animate-spin" />
                  Carregando...
                </li>
              ) : catalog.length === 0 ? (
                <li className="px-3 py-4 text-center text-[12px] font-semibold text-[var(--color-ink-muted)]">
                  Nenhum produto encontrado
                </li>
              ) : (
                catalog.map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      disabled={addMutation.isPending}
                      onClick={() => addMutation.mutate(product.id)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[var(--color-bg-subtle)] disabled:opacity-60"
                    >
                      <Package
                        className="size-3.5 shrink-0 text-[var(--color-ink-muted)]"
                        strokeWidth={2.5}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-bold tracking-tight text-slate-800">
                          {product.name}
                        </div>
                        {product.sku && (
                          <div className="truncate font-mono text-[10px] text-[var(--color-ink-muted)]">
                            {product.sku}
                          </div>
                        )}
                      </div>
                      <span className="shrink-0 text-[12px] font-bold tabular-nums text-[var(--color-ink-soft)]">
                        {formatCurrency(product.price)}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}

// ── StageInlinePicker ───────────────────────────────────────────────
// Trigger: ● cor da etapa + nome truncado + chevron (sem ícone de funil).
function StageInlinePicker({
  deal,
  stages,
  pipelineId,
  statusFilter,
  onMoved,
  triggerClassName,
  pill,
}: {
  deal: BoardDeal & { stageId: string };
  stages: BoardStage[];
  pipelineId: string;
  statusFilter: StatusFilter;
  onMoved?: (dealId: string) => void;
  /** Estilo do botão (ex.: pill azul na tabela expandida). */
  triggerClassName?: string;
  /** Trigger compacto estilo pílula (ícone menor, tipografia reduzida). */
  pill?: boolean;
}) {
  const { open, setOpen, anchorRef, popoverRef, pos } = useAnchoredPopover();
  const moveMutation = useMoveMutation({
    pipelineId,
    statusFilter,
    stages,
    onMoved,
  });

  const currentStage = stages.find((s) => s.id === deal.stageId) ?? null;
  const stageColor = currentStage?.color ?? "#94a3b8";

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        ref={anchorRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        disabled={moveMutation.isPending}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "group flex w-full items-center gap-1.5 rounded-lg border border-transparent px-1 py-1 text-left transition-all hover:border-border hover:bg-[var(--color-bg-subtle)]",
          pill &&
            "border border-[var(--color-primary-soft)] bg-[var(--color-primary-soft)] px-2 py-1 shadow-none hover:brightness-[0.98]",
          open && "border-primary bg-white ring-[3px] ring-primary/15",
          pill && open && "border-primary bg-white ring-[3px] ring-primary/15",
          moveMutation.isPending && "cursor-wait opacity-60",
          triggerClassName,
        )}
      >
        <span
          className={cn("shrink-0 rounded-full", pill ? "size-2" : "size-1.5")}
          style={{ backgroundColor: stageColor }}
          aria-hidden
        />
        <span
          className={cn(
            "min-w-0 flex-1 truncate font-semibold",
            pill ? "text-[13px] text-[var(--color-primary)]" : "text-[12px]",
          )}
          style={pill ? undefined : { color: stageColor }}
        >
          {currentStage?.name ?? "—"}
        </span>
        <ChevronDown
          className={cn(
            "shrink-0 text-[var(--color-ink-muted)] transition-transform group-hover:text-[var(--color-ink-soft)]",
            pill ? "size-3" : "size-3.5",
            open && "rotate-180 text-blue-600",
          )}
          strokeWidth={2.5}
        />
      </button>

      {/* Popover renderizado via Portal — escapa do `overflow-y-auto`
          do scroller pai (DealQueue) que cortava a lista de etapas
          quando o card focado estava no fundo da fila. Posição fixa
          calculada pelo hook a partir do `getBoundingClientRect()`
          do âncora (botão da etapa atual). Largura mínima de 280px
          pra não truncar nomes de etapa longos. */}
      {open && pos && typeof window !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: Math.max(pos.width, 280),
              zIndex: 9999,
            }}
            className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_20px_48px_-16px_rgba(15,23,42,0.28)]"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ink-muted)]">
                Mover para
              </span>
              <span className="text-[10px] font-bold tabular-nums text-[var(--color-ink-muted)]">
                {stages.length} etapas
              </span>
            </div>
            <ul
              role="listbox"
              className="scrollbar-thin max-h-[280px] overflow-y-auto py-1"
            >
              {stages.map((stage) => {
                const isCurrent = stage.id === deal.stageId;
                return (
                  <li key={stage.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isCurrent}
                      onClick={() => {
                        if (!isCurrent) {
                          moveMutation.mutate({
                            dealId: deal.id,
                            fromStageId: deal.stageId,
                            toStageId: stage.id,
                          });
                        }
                        setOpen(false);
                      }}
                      disabled={isCurrent}
                      className={cn(
                        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-normal text-foreground transition-colors hover:bg-[var(--color-bg-subtle)]",
                        isCurrent &&
                          "cursor-default bg-blue-50/60 text-blue-700",
                      )}
                    >
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: stage.color ?? "#94a3b8" }}
                      />
                      <span className="truncate">{stage.name}</span>
                      {isCurrent && (
                        <Check
                          className="ml-auto size-3.5 text-blue-600"
                          strokeWidth={2.5}
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}

// ── DealCard ────────────────────────────────────────────────────
// Card compacto (~44px) com expansão inline (cards compactos); clique
// alterna seleção (chat) e o estado expandido.
function DealCard({
  deal,
  stages,
  isActive,
  onSelectDeal,
  onDeselect,
  wasRecentlyMoved,
  pipelineId,
  statusFilter,
  onMoved,
  onOpenFullDeal,
}: {
  deal: BoardDeal & { stageId: string };
  stages: BoardStage[];
  isActive: boolean;
  onSelectDeal: (dealId: string) => void;
  onDeselect?: () => void;
  wasRecentlyMoved: boolean;
  pipelineId: string;
  statusFilter: StatusFilter;
  onMoved?: (dealId: string) => void;
  /** Abre workspace / modal do deal completo. */
  onOpenFullDeal?: (dealId: string) => void;
}) {
  /** Acordeão acompanha o deal em foco: ativo = expandido (sem effect de sync). */
  const expanded = isActive;
  const [contactOpen, setContactOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState(false);
  const { sections, isAdmin, hasAgentOverride, saveAdmin, saveAdminPending, saveAgent, resetAgent } =
    useFieldLayout("deal_workspace");

  // Popover de troca de responsável — usa o hook compartilhado
  // `useAnchoredPopover` (mesmo padrão do StageInlinePicker e
  // DealProductLine). Renderizado via Portal pra escapar do
  // `overflow-y-auto` do scroller pai. Posição/scroll/resize/Esc/
  // click-outside já cuidados dentro do hook.
  const {
    open: ownerPickerOpen,
    setOpen: setOwnerPickerOpen,
    anchorRef: ownerAnchorRef,
    popoverRef: ownerPopoverRef,
    pos: ownerPopoverPos,
  } = useAnchoredPopover();

  useEffect(() => {
    if (!isActive) {
      setOwnerPickerOpen(false);
      setContactOpen(false);
    }
  }, [isActive, setOwnerPickerOpen]);

  const cardRef = useRef<HTMLDivElement | null>(null);

  const ownerQueryClient = useQueryClient();
  // `users` só é buscado quando o popover abre — `enabled: ownerPickerOpen`.
  // Cache de 60s evita uma chamada por card aberto na fila. `staleTime`
  // alinhado com `sales-hub-view.tsx` e `kanban-board.tsx`.
  const { data: ownerCandidates = [], isLoading: ownerCandidatesLoading } = useQuery<OwnerCandidate[]>({
    queryKey: ["users", "deal-owner-picker"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/users"));
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        throw new Error(typeof data?.message === "string" ? data.message : "Erro ao listar equipe");
      }
      return Array.isArray(data) ? data : [];
    },
    enabled: ownerPickerOpen,
    staleTime: 60_000,
  });

  const ownerMutation = useMutation({
    mutationFn: async (ownerId: string | null) => {
      const res = await fetch(apiUrl(`/api/deals/${deal.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { message?: string } | null;
        throw new Error(data?.message ?? "Erro ao alterar responsável");
      }
    },
    onSuccess: () => {
      // Invalida tudo que renderiza owner — Sales Hub, Kanban, deals API.
      ownerQueryClient.invalidateQueries({ queryKey: ["sales-hub"] });
      ownerQueryClient.invalidateQueries({ queryKey: ["pipeline-board"] });
      ownerQueryClient.invalidateQueries({ queryKey: ["deal", deal.id] });
      setOwnerPickerOpen(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao alterar responsável");
    },
  });

  const toggleSelection = () => {
    if (isActive) onDeselect?.();
    else onSelectDeal(deal.id);
  };

  const handleCardClick = () => {
    if (ownerPickerOpen) {
      setOwnerPickerOpen(false);
      return;
    }
    toggleSelection();
  };

  const contactTitle = deal.contact?.name ?? `#${deal.number ?? "—"}`;
  const headline = deal.contact?.name ?? deal.title;
  const contactAvatarColor =
    (deal.contact as { avatarColor?: string } | null | undefined)?.avatarColor ?? "#6366f1";
  const timeLabel = formatRelativeShort(deal.lastMessage?.createdAt ?? deal.createdAt);
  const stageRawIdx = stages.findIndex((s) => s.id === deal.stageId);
  const stageProgressPct =
    stages.length > 0 && stageRawIdx >= 0
      ? Math.round(((stageRawIdx + 1) / stages.length) * 100)
      : 0;
  const stageBarColor = stageRawIdx >= 0 ? stages[stageRawIdx].color : "var(--color-primary)";
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
      onClick={handleCardClick}
      onKeyDown={(ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          handleCardClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      aria-expanded={expanded}
      aria-label={
        expanded
          ? `Recolher detalhes de ${contactTitle}`
          : isActive
            ? `Recolher card de ${contactTitle}`
            : `Abrir card de ${contactTitle}`
      }
      className={cn(
        // NÃO usar `overflow-hidden`: o popover de responsável precisa
        // escapar do card. Ativo = rail azul + fundo blue-50 (WhatsApp refinado).
        "group relative cursor-pointer select-none bg-white text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-500/40",
        isActive ? "border-l-2 border-l-blue-500 bg-blue-50" : "hover:bg-slate-50",
        wasRecentlyMoved && "ring-2 ring-inset ring-cyan-400/45",
      )}
    >
      {/* ── Card colapsado — sempre visível ── */}
      <div className="flex gap-3 px-3 py-2.5">
        <div className="relative mt-0.5 shrink-0 self-start">
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
              size={36}
            />
          ) : (
            <div
              className="flex size-9 items-center justify-center rounded-full text-[12px] font-bold text-white ring-2 ring-white"
              style={{ background: contactAvatarColor }}
              aria-hidden
            >
              {(deal.title ?? "?").slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-[13px] font-semibold text-slate-900">{headline}</p>
            <span className="shrink-0 text-[10px] tabular-nums text-slate-400">{timeLabel}</span>
          </div>

          {!expanded ? (
            <p className="mt-0.5 truncate text-[12px] text-slate-400">
              <PreviewLastMessage deal={deal} />
            </p>
          ) : null}

          {!expanded && tagList.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {tagList.slice(0, 3).map((t) => (
                <span
                  key={t.id}
                  className={dt.pill.sm}
                  style={tagPillStyle(t.name, t.color)}
                >
                  {t.name}
                </span>
              ))}
              {tagList.length > 3 ? (
                <span className="text-[10px] text-slate-400">+{tagList.length - 3}</span>
              ) : null}
            </div>
          ) : null}
        </div>

        {deal.owner ? (
          <div className="mt-0.5 shrink-0 self-start">
            <ChatAvatar
              user={{
                id: deal.owner.id,
                name: deal.owner.name,
                imageUrl: deal.owner.avatarUrl ?? null,
              }}
              size={20}
              channel={null}
              hideCartoon
            />
          </div>
        ) : null}
      </div>

      {/* ── Expansão inline — acordeão com motion ── */}
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            <div
              className="border-t border-slate-100 bg-white"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
            >
              <div className="border-b border-slate-100 bg-slate-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all"
                      style={{ width: `${stageProgressPct}%`, backgroundColor: stageBarColor }}
                    />
                  </div>
                  <StageInlinePicker
                    deal={deal}
                    stages={stages}
                    pipelineId={pipelineId}
                    statusFilter={statusFilter}
                    onMoved={onMoved}
                    triggerClassName="whitespace-nowrap shrink-0 border-0 bg-transparent px-0 py-0 text-[12px] font-semibold shadow-none hover:bg-transparent"
                  />
                </div>
              </div>

              <div className="relative">
                {onOpenFullDeal ? (
                  <div className="absolute right-2 top-2 z-10">
                    <TooltipHost label="Abrir deal completo" side="left">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenFullDeal(deal.id);
                        }}
                        className="inline-flex size-6 items-center justify-center rounded text-slate-300 transition-colors hover:text-blue-500"
                        aria-label="Abrir deal completo"
                      >
                        <ExternalLink className="size-3" strokeWidth={2.25} />
                      </button>
                    </TooltipHost>
                  </div>
                ) : null}

                {/* Botão Layout */}
                <div className="flex items-center justify-end px-3 pt-2">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setLayoutMode((v) => !v); }}
                    className={cn(
                      "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
                      hasAgentOverride ? "text-primary/70 hover:text-primary" : "text-slate-400 hover:text-slate-600",
                      "hover:bg-slate-100",
                    )}
                  >
                    <Settings2 className="size-3" />
                    Layout
                  </button>
                </div>

                {layoutMode ? (
                  <div className="flex flex-col gap-1 px-3 py-2">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-700">
                        {isAdmin ? "Padrão da org" : "Meu layout"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {hasAgentOverride ? (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); resetAgent(); setLayoutMode(false); }}
                            className="rounded-md px-2 py-0.5 text-[10px] text-slate-400 hover:bg-slate-100"
                          >
                            Resetar
                          </button>
                        ) : null}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); saveAdmin(sections); setLayoutMode(false); }}
                            disabled={saveAdminPending}
                            className="rounded-md border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/10 disabled:opacity-50"
                          >
                            Salvar padrão
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); saveAgent(sections); setLayoutMode(false); }}
                          className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-primary/90"
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setLayoutMode(false); }}
                          className="rounded-md px-2 py-0.5 text-[10px] text-slate-400 hover:bg-slate-100"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                    {sections.filter((s) => !s.fixed).map((section) => (
                      <div
                        key={section.id}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2",
                          section.hidden && "opacity-40",
                        )}
                      >
                        <span className="flex-1 text-[12px] font-medium text-slate-700">{section.label}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); }}
                          className="flex size-5 items-center justify-center rounded text-slate-400 hover:bg-slate-100"
                        >
                          {section.hidden
                            ? <EyeOff className="size-3" />
                            : <Eye className="size-3" />
                          }
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                {deal.productName ? (
                  <SidebarField
                    label="Produto"
                    icon="ShoppingBag"
                    size="sm"
                    className={onOpenFullDeal ? "pr-8" : undefined}
                    value={`${deal.productName}${dealValue(deal) > 0 ? ` · ${formatCurrency(dealValue(deal))}` : ""}`}
                  />
                ) : (
                  <SidebarField
                    label="Produto"
                    icon="ShoppingBag"
                    size="sm"
                    className={onOpenFullDeal ? "pr-8" : undefined}
                  >
                    <div className="flex min-w-0 flex-1 justify-end" onClick={(e) => e.stopPropagation()}>
                      <DealProductLine deal={deal} pipelineId={pipelineId} compactCta />
                    </div>
                  </SidebarField>
                )}

                <SidebarField label="Responsável" icon="User" size="sm" className={onOpenFullDeal ? "pr-8" : undefined}>
                  <button
                    ref={ownerAnchorRef}
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={ownerPickerOpen}
                    aria-label={
                      deal.owner ? `Trocar responsável (atual: ${deal.owner.name})` : "Atribuir responsável"
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      setOwnerPickerOpen((v) => !v);
                    }}
                    disabled={ownerMutation.isPending}
                    className={cn(
                      "flex items-center gap-1.5 text-left transition-opacity",
                      ownerMutation.isPending && "opacity-60",
                    )}
                  >
                    {ownerMutation.isPending ? (
                      <Loader2 className="size-3.5 shrink-0 animate-spin text-slate-400" />
                    ) : deal.owner ? (
                      <>
                        <ChatAvatar
                          user={{
                            id: deal.owner.id,
                            name: deal.owner.name,
                            imageUrl: deal.owner.avatarUrl ?? null,
                          }}
                          size={20}
                          channel={null}
                          hideCartoon
                        />
                        <span className="text-[11px] font-medium text-slate-700">{deal.owner.name}</span>
                      </>
                    ) : (
                      <span className="text-[11px] italic text-slate-300">Sem responsável</span>
                    )}
                    <ChevronDown className="size-3 shrink-0 text-slate-300" strokeWidth={2.5} />
                  </button>
                </SidebarField>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setContactOpen((v) => !v);
                  }}
                  className={cn(dt.card.rowSm, "w-full")}
                >
                  <div className="flex items-center gap-1.5">
                    <Phone className="size-3 text-slate-400" aria-hidden />
                    <span className="text-[11px] text-slate-400">Contato</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!contactOpen && deal.contact?.phone ? (
                      <span className="text-[10px] text-slate-300 tabular-nums">
                        {deal.contact.phone.length > 9
                          ? `${deal.contact.phone.slice(0, 9)}···`
                          : deal.contact.phone}
                      </span>
                    ) : null}
                    <ChevronDown
                      className={cn("size-3 text-slate-300 transition-transform", contactOpen && "rotate-180")}
                      aria-hidden
                    />
                  </div>
                </button>

                {contactOpen ? (
                  <>
                    {deal.contact?.phone ? (
                      <SidebarField
                        label="Telefone"
                        icon="Phone"
                        size="sm"
                        value={deal.contact.phone}
                        href={`tel:${String(deal.contact.phone).replace(/\s/g, "")}`}
                      />
                    ) : null}
                    {deal.contact?.email ? (
                      <TooltipHost label={deal.contact.email} side="top">
                        <SidebarField
                          label="E-mail"
                          icon="Mail"
                          size="sm"
                          value={deal.contact.email}
                          href={`mailto:${deal.contact.email}`}
                        />
                      </TooltipHost>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {ownerPickerOpen && ownerPopoverPos && typeof window !== "undefined" &&
        createPortal(
          <div
            ref={ownerPopoverRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: ownerPopoverPos.top,
              left: ownerPopoverPos.left,
              width: Math.max(ownerPopoverPos.width, 280),
              zIndex: 9999,
            }}
            className="max-h-72 overflow-hidden rounded-2xl border border-border bg-white shadow-[var(--shadow-lg)]"
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ink-muted)]">
                Responsável
              </span>
              {deal.owner && (
                <button
                  type="button"
                  onClick={() => ownerMutation.mutate(null)}
                  disabled={ownerMutation.isPending}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-foreground"
                >
                  <UserMinus className="size-3" strokeWidth={2.5} />
                  Remover
                </button>
              )}
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {ownerCandidatesLoading ? (
                <div className="flex items-center gap-2 px-3 py-3 text-[13px] text-[var(--color-ink-muted)]">
                  <Loader2 className="size-3.5 animate-spin" />
                  Carregando equipe…
                </div>
              ) : ownerCandidates.length === 0 ? (
                <div className="px-3 py-3 text-[13px] text-[var(--color-ink-muted)]">
                  Nenhum agente disponível.
                </div>
              ) : (
                ownerCandidates.map((u) => {
                  const isCurrent = u.id === deal.owner?.id;
                  const status = u.agentStatus?.status ?? "OFFLINE";
                  const dotBg =
                    status === "ONLINE"
                      ? "var(--color-success)"
                      : status === "AWAY"
                        ? "var(--color-warning)"
                        : "var(--color-ink-muted)";
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        if (!isCurrent) ownerMutation.mutate(u.id);
                        else setOwnerPickerOpen(false);
                      }}
                      disabled={ownerMutation.isPending}
                      className={cn(
                        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors",
                        isCurrent ? "bg-primary/10" : "hover:bg-[var(--color-bg-subtle)]",
                      )}
                    >
                      <div className="relative">
                        <ChatAvatar
                          user={{ id: u.id, name: u.name, imageUrl: u.avatarUrl ?? null }}
                          size={24}
                          channel={null}
                          hideCartoon
                        />
                        <span
                          className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-white"
                          style={{ backgroundColor: dotBg }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold tracking-tight text-[var(--color-ink-soft)]">
                          {u.name}
                        </p>
                        {u.email && (
                          <p className="truncate text-[12px] text-[var(--color-ink-muted)]">{u.email}</p>
                        )}
                      </div>
                      {isCurrent && (
                        <Check className="size-4 shrink-0 text-primary" strokeWidth={2.5} />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </motion.div>
  );
}

// ── Main Queue ───────────────────────────────────────────────────

export function DealQueue({
  deals,
  stages,
  activeDealId,
  onSelectDeal,
  onDeselect,
  recentlyMovedDealId,
  pipelineId,
  statusFilter = "OPEN",
  onMoved,
  onOpenFullDeal,
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
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div
        ref={scrollerRef}
        className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2 py-2"
      >
        <div className="flex flex-col divide-y divide-border">
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
                    stages={stages}
                    isActive={isActive}
                    onSelectDeal={onSelectDeal}
                    onDeselect={onDeselect}
                    wasRecentlyMoved={wasRecentlyMoved}
                    pipelineId={pipelineId}
                    statusFilter={statusFilter}
                    onMoved={onMoved}
                    onOpenFullDeal={onOpenFullDeal}
                  />
                </div>
              );
            })}
          </AnimatePresence>
          {deals.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum deal encontrado
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
