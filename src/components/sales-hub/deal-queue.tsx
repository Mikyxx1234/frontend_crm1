"use client";

import { apiUrl } from "@/lib/api";
/**
 * DealQueue — Fila unificada de deals (Sales Hub).
 * ───────────────────────────────────────────────────────────────
 * Todos os cards seguem o MESMO layout — sem mais a noção de
 * "expansão". Tudo o que o operador precisa pra qualificar/mover
 * o deal está visível direto no card:
 *
 *   ▸ Lead ID + data de criação (sem badge de temperatura — a
 *     classificação frio/morno/quente foi removida até a regra
 *     ser configurável por workspace).
 *   ▸ Avatar + nome + tags ao lado (até 2 + chip "+N").
 *   ▸ Dica "Você respondeu há Xmin" quando a última mensagem foi
 *     outbound — comunica "bola está com o cliente" sem balão.
 *   ▸ Pílulas de contato (telefone, email).
 *   ▸ Linha de ETAPA clicável (ícone funil + nome) → abre popover
 *     pra mudar etapa direto.
 *   ▸ Linha de PRODUTO consolidada — com produto: nome + valor à
 *     direita; sem produto: CTA inline "+ Adicionar produto"
 *     (popover com busca no catálogo).
 *
 * O footer "Abrir detalhes / Recolher" continua existindo para
 * sinalizar qual deal está em FOCO no chat ao lado, mas não há
 * mais conteúdo expansível — o card é o mesmo nos dois estados.
 */

import { useState, useCallback, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Link2,
  Phone,
  Mail,
  Package,
  Plus,
  Loader2,
  X,
  Filter,
  ChevronDown,
  Check,
  CornerUpLeft,
  UserMinus,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatCurrency, formatDate, resolveContactAvatarDisplayUrl } from "@/lib/utils";
import type { BoardDeal } from "@/components/pipeline/kanban-types";
import type { BoardStage } from "@/components/pipeline/kanban-board";
import { useMoveMutation } from "@/components/sales-hub/deal-actions";
import { SUBTLE_SPRING, CARD_ACTIVE_SHADOW, ds } from "@/lib/design-system";
import { ChatAvatar, type ChatAvatarChannel } from "@/components/inbox/chat-avatar";
import { DealCustomFieldsSection } from "@/components/pipeline/deal-custom-fields-section";
import { TooltipHost } from "@/components/ui/tooltip";

/** Mapeia o `Conversation.channel` cru pro tipo aceito pelo `ChatAvatar`. */
function normalizeChannel(raw: string | null | undefined): ChatAvatarChannel {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v === "whatsapp" || v === "instagram" || v === "email" || v === "meta") {
    return v as ChatAvatarChannel;
  }
  return null;
}

// Alias local pra legibilidade. Use sempre o token CARD_ACTIVE_SHADOW
// do design-system em qualquer card novo do app.
const ACTIVE_CARD_SHADOW = CARD_ACTIVE_SHADOW;

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
  /**
   * Controle de ordenação visível no header da fila. O pai
   * (`SalesHubView`) mantém o estado pra aplicar o sort no array
   * de deals ANTES de passar pra cá — este componente só renderiza
   * o dropdown e propaga a escolha.
   */
  sortMode?: DealQueueSortMode;
  onSortModeChange?: (mode: DealQueueSortMode) => void;
};

function dealName(deal: BoardDeal): string {
  return deal.contact?.name ?? deal.title;
}

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
    if (!open) {
      setPos(null);
      return;
    }
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
}: {
  deal: BoardDeal & { stageId: string };
  pipelineId: string;
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

  // Estado: produto JÁ vinculado → linha consolidada (ícone + nome +
  // valor à direita). Substitui a antiga "InfoRow Interesse" + a caixa
  // "VALOR DO NEGÓCIO" separada, otimizando altura do card.
  if (deal.productName) {
    return (
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
          <Package className="size-4" strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-bold tracking-tight text-slate-800">
          {deal.productName}
        </span>
        <span className="shrink-0 text-[13px] font-black tabular-nums tracking-tight text-slate-900">
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
          open &&
            "border-solid border-blue-600 shadow-[0_0_0_3px_rgba(37,99,235,0.12)]",
        )}
      >
        <Plus
          className="size-3.5 shrink-0 text-slate-400 transition-colors group-hover:text-slate-600"
          strokeWidth={2.5}
        />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors group-hover:text-slate-600">
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
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_48px_-16px_rgba(15,23,42,0.28)]"
          >
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
              <Search
                className="size-3.5 shrink-0 text-slate-400"
                strokeWidth={2.5}
              />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produto..."
                className="w-full bg-transparent text-[12px] text-slate-800 outline-none placeholder:text-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
            <ul className="scrollbar-thin max-h-[240px] overflow-y-auto py-1">
              {catalogLoading && catalog.length === 0 ? (
                <li className="flex items-center justify-center gap-2 px-3 py-4 text-[11px] font-semibold text-slate-400">
                  <Loader2 className="size-3 animate-spin" />
                  Carregando...
                </li>
              ) : catalog.length === 0 ? (
                <li className="px-3 py-4 text-center text-[11px] font-semibold text-slate-400">
                  Nenhum produto encontrado
                </li>
              ) : (
                catalog.map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      disabled={addMutation.isPending}
                      onClick={() => addMutation.mutate(product.id)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-slate-50 disabled:opacity-60"
                    >
                      <Package
                        className="size-3.5 shrink-0 text-slate-400"
                        strokeWidth={2.5}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] font-bold tracking-tight text-slate-800">
                          {product.name}
                        </div>
                        {product.sku && (
                          <div className="truncate font-mono text-[10px] text-slate-400">
                            {product.sku}
                          </div>
                        )}
                      </div>
                      <span className="shrink-0 text-[11px] font-black tabular-nums text-slate-600">
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

// ── Subcomponentes visuais reutilizados em TODOS os cards ────────

function ContactPill({
  icon: Icon,
  value,
  mono,
}: {
  icon: typeof Phone;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-[0_1px_0_rgba(15,23,42,0.02)]">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
        <Icon className="size-3" strokeWidth={2.5} />
      </span>
      <span
        className={cn(
          "min-w-0 truncate text-[11px] font-bold tracking-tight text-slate-700",
          mono && "font-mono tabular-nums",
        )}
      >
        {value || (
          <span className="font-sans font-normal text-slate-400">—</span>
        )}
      </span>
    </span>
  );
}

// ── StageInlinePicker ───────────────────────────────────────────────
// Linha "Etapa" do card — clicável. Usa o `useMoveMutation`
// compartilhado (mesma lógica do `DealStageSelector` em `deal-actions`)
// e renderiza um trigger compacto: ícone funil + nome da etapa atual +
// chevron. Clicar abre o popover de etapas (mesma UX do dropdown
// completo). Substitui o `InfoRow Etapa atual` + `DealStageSelector`
// expandido — agora é uma única affordance presente em todo card.
function StageInlinePicker({
  deal,
  stages,
  pipelineId,
  statusFilter,
  onMoved,
}: {
  deal: BoardDeal & { stageId: string };
  stages: BoardStage[];
  pipelineId: string;
  statusFilter: StatusFilter;
  onMoved?: (dealId: string) => void;
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
          "group flex w-full items-center gap-3 rounded-lg border border-transparent px-1 py-1 text-left transition-all hover:border-slate-200 hover:bg-slate-50",
          open &&
            "border-blue-600 bg-white shadow-[0_0_0_3px_rgba(37,99,235,0.12)]",
          moveMutation.isPending && "cursor-wait opacity-60",
        )}
      >
        {/* Ícone funil — substitui o antigo GitBranch + label
            "ETAPA ATUAL". O funil já comunica "fase de pipeline". */}
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500"
          style={{
            backgroundColor: `${stageColor}14`,
            color: stageColor,
          }}
        >
          <Filter className="size-4" strokeWidth={2.2} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-bold tracking-tight text-slate-800">
          {currentStage?.name ?? "—"}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-slate-400 transition-transform group-hover:text-slate-600",
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
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_48px_-16px_rgba(15,23,42,0.28)]"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Mover para
              </span>
              <span className="text-[10px] font-bold tabular-nums text-slate-400">
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
                        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12px] font-bold tracking-tight text-slate-700 transition-colors hover:bg-slate-50",
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
// Card único — mesma estrutura idle/ativo. O `isActive` muda só
// sombra e bordas; o conteúdo é idêntico (sem mais bloco
// expandido). Estrutura:
//
//   ┌──────────────────────────────────────────────┐
//   │  ▌ (barrinha de cor da etapa)                 │
//   │  #23  18 abr   [👤 owner] [● Quente]          │
//   │                                               │
//   │  [avatar] Nome do Lead  [tag1] [tag2] +N      │
//   │          ↳ Você respondeu há 12 min           │
//   │                                               │
//   │  [📞 phone]  [✉ email]                         │
//   │                                               │
//   │  ─────────────────────────────────            │
//   │  ▾ Proposta Enviada                           │
//   │  📦 Administração EAD            R$ 7.800,00 │
//   │     (ou) [ + ADICIONAR PRODUTO ]              │
//   │                                               │
//   │  ABRIR DETALHES →   (ou) RECOLHER  ↑          │
//   └──────────────────────────────────────────────┘
function DealCard({
  deal,
  stages,
  isActive,
  onSelectDeal,
  onDeselect,
  wasRecentlyMoved,
  onCopyLink,
  copied,
  pipelineId,
  statusFilter,
  onMoved,
}: {
  deal: BoardDeal & { stageId: string };
  stages: BoardStage[];
  isActive: boolean;
  onSelectDeal: (dealId: string) => void;
  onDeselect?: () => void;
  wasRecentlyMoved: boolean;
  onCopyLink: (deal: BoardDeal, e: React.MouseEvent) => void;
  copied: boolean;
  pipelineId: string;
  statusFilter: StatusFilter;
  onMoved?: (dealId: string) => void;
}) {
  // Estado da seção de campos personalizados — colapsada por padrão.
  // Lazy: o `<DealCustomFieldsSection>` só monta (e dispara a query)
  // quando `customFieldsOpen` vira true, evitando N requests pra
  // /api/deals/.../custom-fields ao renderizar a fila inteira.
  const [customFieldsOpen, setCustomFieldsOpen] = useState(false);

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

  // Click fora do CARD recolhe os campos personalizados — comportamento
  // padrão de "popover/painel acessório": se o operador clicou em
  // qualquer lugar fora deste card, está sinalizando que terminou de
  // mexer aqui. Mantém o popover de owner com seu próprio click-outside
  // (acima); este aqui é específico do painel de custom fields.
  const cardRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!customFieldsOpen) return;
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setCustomFieldsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [customFieldsOpen]);

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

  // Click em área "vazia" do card → SELECIONA o deal (vira o focus
  // do chat ao lado). Não mexe nos campos personalizados — eles têm
  // affordance própria (chevron azul + footer "Abrir detalhes").
  // Controles internos (etapa, owner, popovers, footer, custom fields)
  // já chamam `stopPropagation`, então só áreas neutras disparam isso.
  const toggleSelection = () => {
    if (isActive) onDeselect?.();
    else onSelectDeal(deal.id);
  };

  // Click em área neutra do card:
  // - Se os campos personalizados estão abertos → primeiro recolhe
  //   eles (operador pediu: "clicar no topo deve recolher os
  //   campos"). Não troca a seleção do deal nesse caso pra não
  //   perder o contexto do chat.
  // - Senão → toggla a seleção (abre o chat / volta pra fila).
  const handleCardClick = () => {
    if (customFieldsOpen) {
      setCustomFieldsOpen(false);
      return;
    }
    toggleSelection();
  };

  // Footer "Abrir detalhes" → abre/recolhe os campos personalizados
  // INLINE no próprio card (mesma ação que o chevron azul ao lado do
  // owner). Antes esse botão fazia toggle de seleção, mas isso era
  // redundante (o click no card inteiro já faz isso) e o operador
  // pediu pra usar como "expandir detalhes do deal" — que é
  // exatamente o que os custom fields representam.
  const handleFooterClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomFieldsOpen((v) => !v);
  };

  return (
    <motion.div
      layout
      ref={cardRef}
      initial={{ opacity: 0, y: -4 }}
      animate={{
        opacity: 1,
        y: 0,
        boxShadow: wasRecentlyMoved
          ? [
              "0 0 0 0 rgba(0, 209, 255, 0)",
              "0 0 0 4px rgba(0, 209, 255, 0.35)",
              "0 0 0 0 rgba(0, 209, 255, 0)",
            ]
          : isActive
            ? ACTIVE_CARD_SHADOW
            : "0 1px 2px rgba(15,23,42,0.04)",
      }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -1 }}
      transition={
        wasRecentlyMoved
          ? { ...SUBTLE_SPRING, boxShadow: { duration: 1.2, ease: "easeOut" } }
          : SUBTLE_SPRING
      }
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
      aria-label={
        customFieldsOpen
          ? `Recolher detalhes de ${deal.contact?.name ?? `Deal #${deal.number ?? ""}`}`
          : isActive
            ? `Recolher card de ${deal.contact?.name ?? `Deal #${deal.number ?? ""}`}`
            : `Abrir card de ${deal.contact?.name ?? `Deal #${deal.number ?? ""}`}`
      }
      className={cn(
        // IMPORTANTE: NÃO usar `overflow-hidden` aqui. O popover de
        // troca de responsável (`ownerPickerOpen`) usa posicionamento
        // absoluto pra "sair" pra baixo do card — `overflow-hidden`
        // cortaria a lista de usuários e o operador veria só o
        // header "RESPONSÁVEL · REMOVER". Pra preservar os cantos
        // arredondados sem o overflow, a barrinha de cor do topo
        // ganha `rounded-t-2xl` e o footer ganha `rounded-b-2xl`.
        "group relative cursor-pointer select-none rounded-2xl border bg-white text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
        isActive ? "border-slate-200" : "border-slate-200/80 hover:border-slate-300",
        wasRecentlyMoved && "border-cyan-300",
      )}
    >
      {/* ── Bloco do CONTATO — destaque visual sutil ────────────
          Agrupa #ID/data, identidade e pílulas de contato em um
          wrapper com fundo levemente azulado (`#f6f8fc`). Cor
          escolhida pra ter "presença" sem competir com a paleta
          da marca: é uma lavagem do `slate-50` puxada pro tom
          do `#507df1` (1-2% de azul), o que cria a sensação de
          "esta é a região do CONTATO" sem usar gradiente nem
          peso de cor real. O `border-t` da seção seguinte
          (Qualificação) faz a separação visual sem precisar de
          divisor extra dentro do wrapper. `rounded-t-2xl` segue
          o canto do card (que NÃO usa `overflow-hidden` por causa
          do popover de responsável — ver comentário no `motion.div`). */}
      <div className="rounded-t-2xl bg-[#f6f8fc] pb-3 pt-3">
        {/* Cabeçalho: #ID + data de criação + copy-link.
            REMOVIDO (operador): a barrinha de acento colorida (vinha
            da `stageColor` da etapa) e o badge de temperatura
            ("FRIO/MORNO/QUENTE"). A barrinha não tinha leitura clara
            fora do board (o operador já vê a etapa no header da fila),
            e a temperatura era uma heurística fixa que vai virar
            configuração de workspace mais tarde — exibir o badge
            antes da regra estar definida confunde o operador. O
            avatar do responsável já está no footer (mesmo padrão do
            Kanban). Aqui no topo só sobra metadado puro: #ID, data
            e o copy-link (ativo apenas no card focado). */}
        <div className="flex items-center gap-2 px-4">
          <span className="text-[11px] font-black tabular-nums text-slate-700">
            #{deal.number ?? "—"}
          </span>
          {deal.createdAt && (
            <span className="text-[11px] tabular-nums text-slate-400">
              {formatDate(deal.createdAt)}
            </span>
          )}
          {/* Copy link aparece apenas no ATIVO — evita ruído na lista
              compacta. Posição fixa no topo pra sempre ficar acessível. */}
          {isActive && (
            <TooltipHost label={copied ? "Link copiado" : "Copiar link do deal"} side="left" className="ml-auto">
              <button
                type="button"
                onClick={(ev) => {
                  ev.stopPropagation();
                  onCopyLink(deal, ev);
                }}
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest transition-all",
                  copied
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-white/70 text-slate-500 hover:bg-white hover:text-slate-700",
                )}
                aria-label="Copiar link do deal"
              >
                <Link2 className="size-2.5" strokeWidth={2.5} />
                {copied ? "Copiado" : ""}
              </button>
            </TooltipHost>
          )}
        </div>

        {/* Identidade do contato — DNA Chat: avatar à esquerda, nome no
            centro e até 2 tags imediatamente ao lado do nome (qualquer
            excedente vira chip "+N"). Mantém a tipografia do
            `ConversationItem` (16px / 800 / tracking-tight / slate-900). */}
        <div className="mt-1.5 flex items-start gap-3 px-4">
          <ChatAvatar
            user={{
              id: deal.contact?.id,
              name: dealName(deal),
              imageUrl: resolveContactAvatarDisplayUrl(
                deal.contact?.avatarUrl ?? null,
              ),
            }}
            phone={deal.contact?.phone ?? undefined}
            channel={normalizeChannel(deal.channel)}
            size={44}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3
                className="min-w-0 max-w-full truncate text-[16px] leading-tight tracking-tight text-slate-900"
                style={{ fontWeight: 800 }}
              >
                {dealName(deal)}
              </h3>
              {deal.tags && deal.tags.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  {deal.tags.slice(0, 2).map((tag) => (
                    <TooltipHost key={tag.id} label={tag.name} side="top">
                      <span
                        className={ds.tag.solid}
                        style={{ backgroundColor: tag.color }}
                      >
                        <span className="truncate">{tag.name}</span>
                      </span>
                    </TooltipHost>
                  ))}
                  {deal.tags.length > 2 && (
                    <span className={ds.tag.more}>+{deal.tags.length - 2}</span>
                  )}
                </span>
              )}
            </div>
            {/* Dica "Você respondeu há…" — só aparece quando a última
                mensagem do deal foi outbound (agente). Sem balão, só
                uma linha discreta com ícone — comunica "bola está com
                o cliente, não esquenta a inbox sem necessidade". */}
            {deal.lastMessage?.direction === "out" && (
              <div className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-tight text-slate-400">
                <CornerUpLeft className="size-3" strokeWidth={2.5} />
                <span>
                  Você respondeu {formatRelativeShort(deal.lastMessage.createdAt)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Pílulas de contato — telefone e email com ícones circulares.
            Sobre o fundo `#f6f8fc` do wrapper, as pílulas que antes
            eram brancas continuam contrastando bem (o branco "salta"
            do fundo levemente azulado). */}
        <div className="mt-3 flex flex-wrap items-center gap-2 px-4">
          <ContactPill icon={Phone} value={deal.contact?.phone} mono />
          <ContactPill icon={Mail} value={deal.contact?.email} />
        </div>
      </div>

      {/* Bloco central — etapa (clicável) + produto/valor consolidados.
          Sem labels "ETAPA ATUAL"/"INTERESSE": ícone + valor já
          comunicam. Etapa abre popover para mover; produto abre
          popover para vincular (ou mostra nome + valor se já
          vinculado). Sem `mt-3` aqui porque o wrapper do bloco
          de contato acima já fecha com `pb-3` — manter os dois
          dava gap duplo. O `border-t` ainda separa visualmente
          a região do contato (com fundo) da região operacional. */}
      <div className="space-y-1.5 border-t border-slate-100 px-3 py-3">
        <StageInlinePicker
          deal={deal}
          stages={stages}
          pipelineId={pipelineId}
          statusFilter={statusFilter}
          onMoved={onMoved}
        />
        <div className="px-1">
          <DealProductLine deal={deal} pipelineId={pipelineId} />
        </div>
      </div>

      {/* Linha do RESPONSÁVEL — UM ÚNICO botão, faixa inteira clicável.
          Layout estilo "spec sheet": label "RESPONSÁVEL" à esquerda
          (texto secundário, ALL CAPS), avatar + nome à DIREITA
          (peso visual). Click em qualquer ponto da faixa abre o
          popover com a equipe (renderizado via Portal — ver abaixo). */}
      <button
        ref={ownerAnchorRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={ownerPickerOpen}
        aria-label={
          deal.owner
            ? `Trocar responsável (atual: ${deal.owner.name})`
            : "Atribuir responsável"
        }
        onClick={(e) => {
          e.stopPropagation();
          setOwnerPickerOpen((v) => !v);
        }}
        disabled={ownerMutation.isPending}
        className={cn(
          "flex w-full items-center gap-3 border-t border-slate-100 px-4 py-2.5 text-left transition-colors",
          "hover:bg-slate-50",
          ownerPickerOpen && "bg-slate-50",
          ownerMutation.isPending && "opacity-60",
        )}
      >
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Responsável
        </span>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          {ownerMutation.isPending && (
            <Loader2 className="size-3.5 shrink-0 animate-spin text-slate-400" />
          )}
          <span className="min-w-0 truncate text-[13px] font-semibold tracking-tight text-slate-700">
            {deal.owner?.name ?? "Sem responsável"}
          </span>
          {deal.owner ? (
            <ChatAvatar
              user={{
                id: deal.owner.id,
                name: deal.owner.name,
                imageUrl: deal.owner.avatarUrl ?? null,
              }}
              size={24}
              channel={null}
              hideCartoon
              className="ring-2 ring-white shadow-sm"
            />
          ) : (
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-[10px] font-semibold text-slate-400">
              ?
            </div>
          )}
        </div>
      </button>

      {/* Popover de seleção de responsável renderizado via Portal —
          escapa do `overflow-y-auto` do scroller pai (DealQueue) que
          cortava a lista quando o popover saía pra fora do card.
          Posição calculada via `getBoundingClientRect()` do âncora
          e atualizada em scroll/resize. Larga mínima 280px pra
          acomodar nomes longos da equipe sem truncar. */}
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
            className="max-h-72 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-premium"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Responsável
              </span>
              {deal.owner && (
                <button
                  type="button"
                  onClick={() => ownerMutation.mutate(null)}
                  disabled={ownerMutation.isPending}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                >
                  <UserMinus className="size-3" strokeWidth={2.5} />
                  Remover
                </button>
              )}
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {ownerCandidatesLoading ? (
                <div className="flex items-center gap-2 px-3 py-3 text-[12px] text-slate-500">
                  <Loader2 className="size-3.5 animate-spin" />
                  Carregando equipe…
                </div>
              ) : ownerCandidates.length === 0 ? (
                <div className="px-3 py-3 text-[12px] text-slate-500">
                  Nenhum agente disponível.
                </div>
              ) : (
                ownerCandidates.map((u) => {
                  const isCurrent = u.id === deal.owner?.id;
                  const status = u.agentStatus?.status ?? "OFFLINE";
                  const dotColor =
                    status === "ONLINE"
                      ? "bg-green-500"
                      : status === "AWAY"
                        ? "bg-amber-400"
                        : "bg-slate-300";
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
                        isCurrent ? "bg-blue-50/60" : "hover:bg-slate-50",
                      )}
                    >
                      <div className="relative">
                        <ChatAvatar
                          user={{ id: u.id, name: u.name, imageUrl: u.avatarUrl ?? null }}
                          size={28}
                          channel={null}
                          hideCartoon
                        />
                        <span
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-white",
                            dotColor,
                          )}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold tracking-tight text-slate-800">
                          {u.name}
                        </p>
                        {u.email && (
                          <p className="truncate text-[11px] text-slate-400">{u.email}</p>
                        )}
                      </div>
                      {isCurrent && (
                        <Check className="size-4 shrink-0 text-blue-600" strokeWidth={2.5} />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}

      {/* Painel expansível — DealCustomFieldsSection (mesmo componente
          usado no DealDetail/sidebar). Lazy: só monta quando
          `customFieldsOpen` é true, evitando query antes da hora.
          Vazio (deal sem custom fields configurados) → componente
          retorna null por design e mostramos um empty state pra
          o operador entender que precisa configurar em Settings. */}
      <AnimatePresence initial={false}>
        {customFieldsOpen && (
          <motion.div
            key="custom-fields-panel"
            id={`deal-custom-fields-${deal.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="overflow-hidden border-t border-slate-100 bg-slate-50/40"
          >
            <div className="px-4 py-3">
              <DealCustomFieldsExpand dealId={deal.id} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer — toggle dos campos personalizados. Antes era um
          rótulo "ABRIR DETALHES →" em ALL CAPS que competia visualmente
          com a label "RESPONSÁVEL" logo acima (dois rótulos uppercase
          empilhados poluíam o card). Agora é uma faixa fina com APENAS
          o chevron azul, centralizado — affordance puramente icônica,
          igual aos players de áudio/cards do Drive. Quando aberto, o
          chevron vira pra cima (e o fundo ganha um wash azul sutil
          pra reforçar o estado). `rounded-b-2xl` fecha o canto
          inferior do card no lugar do antigo `overflow-hidden`. */}
      <button
        type="button"
        onClick={handleFooterClick}
        aria-expanded={customFieldsOpen}
        aria-controls={`deal-custom-fields-${deal.id}`}
        aria-label={customFieldsOpen ? "Recolher detalhes" : "Abrir detalhes"}
        className={cn(
          "flex w-full items-center justify-center rounded-b-2xl border-t border-slate-100 py-2 transition-colors",
          customFieldsOpen
            ? "bg-blue-50/40 hover:bg-blue-50/70"
            : "hover:bg-slate-50",
        )}
      >
        <ChevronDown
          className={cn(
            "size-4 text-[#507df1] transition-transform duration-200",
            customFieldsOpen && "rotate-180",
          )}
          strokeWidth={2.5}
        />
      </button>
    </motion.div>
  );
}

/**
 * DealCustomFieldsExpand — wrapper local do `DealCustomFieldsSection`
 * que cobre os 2 estados que o componente original não trata bem
 * dentro de um card colapsável:
 *
 *   • LOADING: o original mostra "Carregando campos…" sem skeleton.
 *   • EMPTY:   o original retorna `null` (acaba escondendo a UI
 *              de expansão sem sinalizar nada pro operador, que fica
 *              sem feedback do porquê o painel "abriu" e nada
 *              apareceu).
 *
 * Aqui usamos a MESMA queryKey (`["deal-custom-fields", dealId]`)
 * que o componente filho consome, então é um único request por
 * deal — o React Query deduplica os dois `useQuery`s sem custo extra.
 */
function DealCustomFieldsExpand({ dealId }: { dealId: string }) {
  const { data: fields, isLoading } = useQuery({
    queryKey: ["deal-custom-fields", dealId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/deals/${dealId}/custom-fields`));
      if (!res.ok) throw new Error("Erro ao carregar campos");
      return (await res.json()) as { fieldId: string }[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-[12px] text-slate-400">
        <Loader2 className="size-3.5 animate-spin" />
        Carregando campos…
      </div>
    );
  }

  if (!fields || fields.length === 0) {
    return (
      <p className="text-[12px] text-slate-400">
        Nenhum campo personalizado configurado.{" "}
        <span className="text-slate-500">
          Configure em <span className="font-semibold">Configurações → Campos personalizados</span>.
        </span>
      </p>
    );
  }

  return <DealCustomFieldsSection dealId={dealId} />;
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
  sortMode = "message_new",
  onSortModeChange,
}: DealQueueProps) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
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

  const handleCopyLink = useCallback(
    (deal: BoardDeal, e: React.MouseEvent) => {
      e.stopPropagation();
      const param = deal.number ?? deal.id;
      const url = `${window.location.origin}${pathname}?deal=${param}`;
      navigator.clipboard.writeText(url);
      setCopiedId(deal.id);
      setTimeout(() => setCopiedId(null), 2000);
    },
    [pathname],
  );

  const filtered = search.trim()
    ? deals.filter((d) => {
        const q = search.toLowerCase();
        return (
          dealName(d).toLowerCase().includes(q) ||
          (d.contact?.email ?? "").toLowerCase().includes(q) ||
          (d.contact?.phone ?? "").toLowerCase().includes(q) ||
          d.title.toLowerCase().includes(q)
        );
      })
    : deals;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 pb-4 pt-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Fila
            </h2>
            <p className="text-[10px] text-muted-foreground">
              {filtered.length} deal{filtered.length !== 1 && "s"}
            </p>
          </div>
          {/* Controle de ordenação — dropdown compacto. Substitui o
              antigo rótulo fixo "mais antigos primeiro" (que nem
              sempre era verdade: o pai reordenava por última mensagem).
              Agora o operador escolhe explicitamente entre ordenar por
              criação ou por mensagem — ambas as direções. */}
          {onSortModeChange && (
            <div className="relative shrink-0">
              <button
                ref={sortButtonRef}
                type="button"
                onClick={() => setSortOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={sortOpen}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold tracking-tight text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50",
                  sortOpen &&
                    "border-blue-500 ring-2 ring-blue-500/20",
                )}
                title="Ordenar a fila"
              >
                <ArrowUpDown className="size-3.5 text-slate-500" strokeWidth={2.2} />
                <span className="max-w-[160px] truncate">
                  {SORT_LABELS[sortMode]}
                </span>
                <ChevronDown
                  className={cn(
                    "size-3 text-slate-400 transition-transform",
                    sortOpen && "rotate-180",
                  )}
                  strokeWidth={2.5}
                />
              </button>
              {sortOpen && (
                <div
                  ref={sortMenuRef}
                  role="listbox"
                  className="absolute right-0 z-30 mt-1 w-[240px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_20px_48px_-16px_rgba(15,23,42,0.28)]"
                >
                  {(Object.keys(SORT_LABELS) as DealQueueSortMode[]).map(
                    (mode) => {
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
                            isActive ? "bg-blue-50" : "hover:bg-slate-50",
                          )}
                        >
                          <Check
                            className={cn(
                              "mt-0.5 size-3.5 shrink-0",
                              isActive ? "text-blue-600" : "text-transparent",
                            )}
                            strokeWidth={2.5}
                          />
                          <div className="min-w-0">
                            <div
                              className={cn(
                                "truncate text-[12px] font-semibold tracking-tight",
                                isActive ? "text-blue-700" : "text-slate-800",
                              )}
                            >
                              {SORT_LABELS[mode]}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {SORT_HINTS[mode]}
                            </div>
                          </div>
                        </button>
                      );
                    },
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar deal..."
            className={cn(
              "flex h-9 w-full rounded-lg border border-input bg-muted/40 pl-9 pr-3 text-xs shadow-sm transition-all outline-none placeholder:text-muted-foreground",
              "focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-background",
            )}
          />
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="scrollbar-thin flex-1 overflow-y-auto px-3 py-3"
      >
        <div className="flex flex-col gap-2.5">
          <AnimatePresence initial={false} mode="popLayout">
            {filtered.map((deal) => {
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
                    onCopyLink={handleCopyLink}
                    copied={copiedId === deal.id}
                    pipelineId={pipelineId}
                    statusFilter={statusFilter}
                    onMoved={onMoved}
                  />
                </div>
              );
            })}
          </AnimatePresence>
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum deal encontrado
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
