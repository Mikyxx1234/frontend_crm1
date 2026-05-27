/*
 * Adapters Pipeline v2 — convertem BoardStageDto/BoardDealDto do
 * backend para os tipos visuais que o pacote v0
 * (components/crm/kanban-column.tsx + deal-card.tsx) espera.
 */

import type { ColumnColor } from "@/components/crm/kanban-column";
import type { AvatarColor, Deal, TagType } from "@/components/crm/deal-card";

import type { BoardDealDto, BoardStageDto } from "./api";
import {
  avatarInitials,
  formatRelative,
} from "@/features/inbox-v2/adapters";

// ─────────────────────────────────────────────────────────────────
// Cores de avatar (9 do v0). Hash determinístico do nome.
// ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "green",
  "blue",
  "orange",
  "purple",
  "pink",
  "coral",
  "teal",
  "mint",
  "gray",
] as const satisfies readonly AvatarColor[];

function colorFromName(name: string | null | undefined): AvatarColor {
  const safe = (name ?? "").trim();
  if (!safe) return "gray";
  let sum = 0;
  for (let i = 0; i < safe.length; i += 1) sum += safe.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

// ─────────────────────────────────────────────────────────────────
// Colunas: mapeia o NOME do stage → uma das 5 paletas do v0.
// Estágios fora do mapa caem em "novo" (neutro).
// ─────────────────────────────────────────────────────────────────

const STAGE_NAME_TO_COLOR: Record<string, ColumnColor> = {
  novo: "novo",
  lead: "novo",
  entrada: "novo",
  qualificado: "quali",
  qualificacao: "quali",
  proposta: "proposta",
  apresentacao: "proposta",
  negociacao: "nego",
  negociação: "nego",
  fechamento: "fecha",
  ganho: "fecha",
  ganhos: "fecha",
};

export function stageColorFromName(name: string): ColumnColor {
  const key = name.trim().toLowerCase();
  return STAGE_NAME_TO_COLOR[key] ?? "novo";
}

// ─────────────────────────────────────────────────────────────────
// Tags: mapeia nome → TagType do v0.
// ─────────────────────────────────────────────────────────────────

function tagTypeFromName(name: string): TagType {
  const k = name.trim().toLowerCase();
  if (k.includes("quente") || k === "hot") return "hot";
  if (k.includes("morn") || k === "warm") return "warm";
  if (k.includes("frio") || k === "cold") return "cold";
  if (k === "vip") return "vip";
  if (k.includes("parceir") || k === "partner") return "partner";
  if (k.includes("indica") || k === "ref" || k === "referral") return "ref";
  return "warm"; // fallback (visual ambar — neutro positivo)
}

// ─────────────────────────────────────────────────────────────────
// Helpers locais
// ─────────────────────────────────────────────────────────────────

function formatDateBr(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function dealValueNumber(value: number | string): number {
  const n =
    typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : 0;
}

function formatCurrencyBR(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// ─────────────────────────────────────────────────────────────────
// Adapters
// ─────────────────────────────────────────────────────────────────

/** BoardDealDto → Deal (DealCard). */
export function toDealCard(deal: BoardDealDto): Deal {
  const contactName = deal.contact?.name?.trim() || deal.title || "Sem nome";
  const ownerName = deal.owner?.name?.trim() || "Sem responsavel";
  const lastMessage = deal.lastMessage;
  return {
    id: deal.id,
    name: contactName,
    subtitle: deal.title || deal.productName || "",
    initials: avatarInitials(contactName),
    avatarColor: colorFromName(contactName),
    online: undefined,
    dealNumber: deal.number != null ? `#${deal.number}` : `#${deal.id.slice(0, 4)}`,
    date: formatDateBr(deal.updatedAt ?? deal.createdAt),
    timeAgo: deal.expectedClose ? formatRelative(deal.expectedClose) : undefined,
    message: lastMessage
      ? {
          text: lastMessage.content,
          time: formatRelative(lastMessage.createdAt),
        }
      : undefined,
    tags: (deal.tags ?? []).map((t) => ({
      label: t.name,
      type: tagTypeFromName(t.name),
    })),
    owner: {
      initials: avatarInitials(ownerName),
      name: ownerName,
      avatarColor: colorFromName(ownerName),
    },
  };
}

/** Estrutura pronta para passar pra `<KanbanColumn>` na renderizacao. */
export interface KanbanColumnView {
  stageId: string;
  title: string;
  color: ColumnColor;
  count: number;
  total: string;
  deals: Deal[];
}

/** BoardStageDto → props do `<KanbanColumn>`. */
export function toKanbanColumn(stage: BoardStageDto): KanbanColumnView {
  const totalValue = stage.deals.reduce(
    (acc, d) => acc + dealValueNumber(d.value),
    0,
  );
  return {
    stageId: stage.id,
    title: stage.name,
    color: stageColorFromName(stage.name),
    count: stage.totalCount ?? stage.deals.length,
    total: formatCurrencyBR(totalValue),
    deals: stage.deals.map(toDealCard),
  };
}

/** Helper: array do board completo → array de KanbanColumnView. */
export function toKanbanColumns(stages: BoardStageDto[]): KanbanColumnView[] {
  return [...stages]
    .sort((a, b) => a.position - b.position)
    .map(toKanbanColumn);
}
