"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import type { BoardDeal } from "@/components/pipeline/kanban-types";
import type { BoardStage } from "@/components/pipeline/kanban-board";
import {
  cn,
  dealNumericValue,
  formatDate,
  pipelineDealMatchesSearch,
  resolveContactAvatarDisplayUrl,
} from "@/lib/utils";
import { ds } from "@/lib/design-system";
import { ChatAvatar, type ChatAvatarChannel } from "@/components/inbox/chat-avatar";

function normalizeChannel(raw: string | null | undefined): ChatAvatarChannel {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v === "whatsapp" || v === "instagram" || v === "email" || v === "meta") {
    return v as ChatAvatarChannel;
  }
  return null;
}

type SortField = "title" | "contact" | "value" | "stage" | "owner" | "createdAt" | "status";
type SortDir = "asc" | "desc";

type FlatDeal = BoardDeal & { stageName: string; stageColor: string; stagePosition: number };

type PipelineListViewProps = {
  stages: BoardStage[];
  selectedDeals: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onDealClick: (dealId: string) => void;
  searchQuery?: string;
  filterAgent?: string;
  filterStage?: string;
  filterMsg?: "all" | "unread" | "no-reply";
  filterOverdue?: boolean;
  filter?: "mine" | "urgent" | "vip" | null;
  currentUserId?: string;
};

function flattenDeals(stages: BoardStage[]): FlatDeal[] {
  const result: FlatDeal[] = [];
  for (const s of stages) {
    for (const d of s.deals) {
      result.push({ ...d, stageName: s.name, stageColor: s.color, stagePosition: s.position });
    }
  }
  return result;
}

function applyFilters(
  deals: FlatDeal[],
  opts: Pick<PipelineListViewProps, "searchQuery" | "filterAgent" | "filterStage" | "filterMsg" | "filterOverdue" | "filter" | "currentUserId">,
): FlatDeal[] {
  const q = (opts.searchQuery ?? "").trim().toLowerCase();
  return deals.filter((d) => {
    if (opts.filter === "mine" && d.owner?.id !== opts.currentUserId) return false;
    if (opts.filter === "urgent" && !(d.priority === "HIGH" || d.isRotting)) return false;
    if (opts.filter === "vip" && !d.tags?.some((t) => t.name.toLowerCase() === "vip")) return false;

    if (opts.filterStage && opts.filterStage !== "all" && d.stageName !== opts.filterStage) {
      const stageMatch = d.stageName === opts.filterStage;
      if (!stageMatch) return false;
    }
    if (opts.filterAgent && opts.filterAgent !== "all") {
      if (opts.filterAgent === "none" && d.owner) return false;
      if (opts.filterAgent !== "none" && d.owner?.id !== opts.filterAgent) return false;
    }
    if (opts.filterMsg === "unread" && (d.unreadCount ?? 0) === 0) return false;
    // FIX: padroniza com `kanban-board.tsx` que usa `"in"` (valor real
    // armazenado em `Message.direction` no banco). Antes estava
    // comparando com `"INBOUND"`, ent\u00e3o este filtro nunca matchava
    // nada na Lista \u2014 inconsist\u00eancia silenciosa entre as views.
    if (opts.filterMsg === "no-reply" && d.lastMessage?.direction !== "in") return false;
    if (opts.filterOverdue && !d.hasOverdueActivity) return false;

    if (q) {
      const ok = pipelineDealMatchesSearch(opts.searchQuery ?? "", {
        title: d.title,
        contactName: d.contact?.name,
        contactEmail: d.contact?.email,
        contactPhone: d.contact?.phone,
        ownerName: d.owner?.name,
        productName: d.productName,
        tagNames: d.tags?.map((t) => t.name),
        dealNumber: d.number,
      });
      if (!ok) return false;
    }
    return true;
  });
}

export function PipelineListView({
  stages,
  selectedDeals,
  onSelectionChange,
  onDealClick,
  searchQuery,
  filterAgent,
  filterStage,
  filterMsg,
  filterOverdue,
  filter,
  currentUserId,
}: PipelineListViewProps) {
  const [sortField, setSortField] = React.useState<SortField>("createdAt");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");

  const allDeals = React.useMemo(() => flattenDeals(stages), [stages]);

  const filtered = React.useMemo(
    () => applyFilters(allDeals, { searchQuery, filterAgent, filterStage, filterMsg, filterOverdue, filter, currentUserId }),
    [allDeals, searchQuery, filterAgent, filterStage, filterMsg, filterOverdue, filter, currentUserId],
  );

  const sorted = React.useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "title":
          cmp = (a.title ?? "").localeCompare(b.title ?? "");
          break;
        case "contact":
          cmp = (a.contact?.name ?? "").localeCompare(b.contact?.name ?? "");
          break;
        case "value":
          cmp = dealNumericValue(a.value) - dealNumericValue(b.value);
          break;
        case "stage":
          cmp = a.stagePosition - b.stagePosition;
          break;
        case "owner":
          cmp = (a.owner?.name ?? "").localeCompare(b.owner?.name ?? "");
          break;
        case "createdAt":
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
      }
      return cmp * dir;
    });
    return arr;
  }, [filtered, sortField, sortDir]);

  const allSelected = sorted.length > 0 && sorted.every((d) => selectedDeals.has(d.id));
  const someSelected = sorted.some((d) => selectedDeals.has(d.id));

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(sorted.map((d) => d.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedDeals);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  // DNA Chat: ícones de sort em slate, ativo em blue (não cyan).
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="size-3 text-slate-300" strokeWidth={2} />;
    return sortDir === "asc"
      ? <ArrowUp className="size-3 text-blue-600" strokeWidth={2} />
      : <ArrowDown className="size-3 text-blue-600" strokeWidth={2} />;
  };

  const formatCurrency = (val: number | string) => {
    const n = dealNumericValue(val);
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // Status como tokens do design-system: chips soft idênticos em
  // forma/spacing/tipografia ao chat e ao card do sales-hub.
  const statusLabel = (s: string) => {
    if (s === "WON") return { text: "Ganho", cls: ds.chip.success };
    if (s === "LOST") return { text: "Perdido", cls: ds.chip.danger };
    return { text: "Aberto", cls: ds.chip.soft };
  };

  return (
    <div className="h-full overflow-auto bg-white">
      <table className="w-full min-w-[900px] text-left text-[13px]">
        <thead className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
          <tr>
            <th className="w-10 px-4 py-3">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = !allSelected && someSelected; }}
                onChange={toggleAll}
                className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
              />
            </th>
            {([
              ["title", "Negócio"],
              ["contact", "Contato"],
              ["value", "Valor"],
              ["stage", "Etapa"],
              ["owner", "Responsável"],
              ["createdAt", "Criado em"],
              ["status", "Status"],
            ] as [SortField, string][]).map(([field, label]) => (
              <th key={field} className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => handleSort(field)}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-wide text-[var(--color-ink-muted)] hover:text-foreground"
                >
                  {label}
                  <SortIcon field={field} />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-16 text-center text-[13px] text-[var(--color-ink-muted)]">
                Nenhum negócio encontrado
              </td>
            </tr>
          ) : (
            sorted.map((deal) => {
              const sl = statusLabel(deal.status);
              const owner = deal.owner?.name;
              return (
                <tr
                  key={deal.id}
                  className={cn(
                    "cursor-pointer border-b border-slate-100 transition-colors hover:bg-[var(--color-bg-subtle)]",
                    selectedDeals.has(deal.id) && "bg-blue-50/50 hover:bg-blue-50/70",
                  )}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedDeals.has(deal.id)}
                      onChange={() => toggleOne(deal.id)}
                      className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
                    />
                  </td>
                  <td
                    className="max-w-[220px] truncate px-4 py-3 text-[13px] font-medium text-slate-900"
                    onClick={() => onDealClick(deal.number?.toString() ?? deal.id)}
                  >
                    {deal.title || "Sem título"}
                  </td>
                  <td
                    className="max-w-[200px] px-4 py-3"
                    onClick={() => onDealClick(deal.number?.toString() ?? deal.id)}
                  >
                    {deal.contact?.name ? (
                      <div className="flex min-w-0 items-center gap-2">
                        <ChatAvatar
                          user={{
                            id: deal.contact.id,
                            name: deal.contact.name,
                            imageUrl: resolveContactAvatarDisplayUrl(
                              deal.contact.avatarUrl ?? null,
                            ),
                          }}
                          phone={deal.contact.phone ?? undefined}
                          channel={normalizeChannel(deal.channel)}
                          size={28}
                        />
                        <span className="min-w-0 truncate text-[13px] font-medium text-foreground">
                          {deal.contact.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[13px] text-[var(--color-ink-muted)]">—</span>
                    )}
                  </td>
                  <td
                    className="px-4 py-3 text-[13px] font-medium tabular-nums text-foreground"
                    onClick={() => onDealClick(deal.number?.toString() ?? deal.id)}
                  >
                    {formatCurrency(deal.value)}
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={() => onDealClick(deal.number?.toString() ?? deal.id)}
                  >
                    <span className={ds.chip.softer}>
                      <span
                        className={ds.chip.dot}
                        style={{ backgroundColor: deal.stageColor }}
                      />
                      {deal.stageName}
                    </span>
                  </td>
                  <td
                    className="max-w-[160px] px-4 py-3"
                    onClick={() => onDealClick(deal.number?.toString() ?? deal.id)}
                  >
                    {owner ? (
                      <div className="flex items-center gap-2">
                        {/* Mesmo padrão do chat / kanban / inbox: avatar
                            do agente HERDA a foto cadastrada em
                            `/settings/profile` (`User.avatarUrl`).
                            `channel={null}` + `hideCartoon` deixa o
                            chip limpo, sem badge whatsapp e sem
                            ilustração de cliente. */}
                        <ChatAvatar
                          user={{
                            id: deal.owner?.id,
                            name: owner,
                            imageUrl: deal.owner?.avatarUrl ?? null,
                          }}
                          size={24}
                          channel={null}
                          hideCartoon
                        />
                        <span className="min-w-0 truncate text-[13px] text-foreground">{owner}</span>
                      </div>
                    ) : (
                      <span className="text-[13px] text-[var(--color-ink-muted)]">—</span>
                    )}
                  </td>
                  <td
                    className="px-4 py-3 text-[12px] tabular-nums text-slate-500"
                    onClick={() => onDealClick(deal.number?.toString() ?? deal.id)}
                  >
                    {formatDate(deal.createdAt)}
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={() => onDealClick(deal.number?.toString() ?? deal.id)}
                  >
                    <span className={sl.cls}>{sl.text}</span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
