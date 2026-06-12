"use client";

import { useMemo, useState } from "react";

import {
  IconBrandWhatsapp,
  IconCircleCheck,
  IconCircleX,
  IconClock,
  IconGridDots,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";

import { BadgeGlass } from "./badge-glass";
import { CheckboxGlass } from "./checkbox-glass";
import { SortableHeader, type SortDir } from "./sortable-header";
import { StageDot } from "./stage-dot";

/**
 * Visão "Lista" do pipeline — adaptada do DS do ZIP para consumir dados
 * vindos do backend (cabeada em `features/pipeline-v2/api/list.ts`).
 *
 * Diferenças vs. o componente do ZIP:
 *  - sem dependência de `lib/pipeline-data` (mocks): a tabela é
 *    inteiramente data-driven via prop `deals`
 *  - tabs filtram por `status` (OPEN/WON/LOST) — mesmos literais do enum
 *    Prisma `DealStatus`
 *  - ordenação client-side por chave; pode ser elevada para o server
 *    quando o backend expor `sortBy/sortOrder` (já documentado nos
 *    query params de `/api/deals`)
 */

export type DealListStatus = "OPEN" | "WON" | "LOST";
export type DealListTab = "abertos" | "ganhos" | "perdidos" | "todos";

export interface DealListRow {
  id: string;
  dealTitle: string;
  contactName: string;
  contactInitials: string;
  /** Slug de cor (av-blue, av-green, av-orange, av-purple, av-pink, av-coral, av-teal, av-mint, av-gray). */
  avatarColor: string;
  channel?: "whatsapp" | null;
  value: string;
  stageName: string;
  stageColor: string;
  ownerName?: string | null;
  createdAt: string;
  status: DealListStatus;
}

type SortKey =
  | "dealTitle"
  | "contactName"
  | "value"
  | "stageName"
  | "ownerName"
  | "createdAt"
  | "status";

interface DealListTableProps {
  deals: DealListRow[];
  onRowClick?: (id: string) => void;
  className?: string;
}

const DEAL_GRID =
  "grid-cols-[42px_1.6fr_1.6fr_0.9fr_1.2fr_1.1fr_1fr_0.9fr]";

const statusToTab: Record<DealListStatus, Exclude<DealListTab, "todos">> = {
  OPEN: "abertos",
  WON: "ganhos",
  LOST: "perdidos",
};

const statusBadge: Record<
  DealListStatus,
  { variant: "enterprise" | "success" | "lead"; label: string }
> = {
  OPEN: { variant: "enterprise", label: "Aberto" },
  WON: { variant: "success", label: "Ganho" },
  LOST: { variant: "lead", label: "Perdido" },
};

export function DealListTable({ deals, onRowClick, className }: DealListTableProps) {
  const [tab, setTab] = useState<DealListTab>("abertos");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const tabs: { id: DealListTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "abertos", label: "Abertos", icon: <IconClock size={14} /> },
    { id: "ganhos", label: "Ganhos", icon: <IconCircleCheck size={14} /> },
    { id: "perdidos", label: "Perdidos", icon: <IconCircleX size={14} /> },
    { id: "todos", label: "Todos", icon: <IconGridDots size={14} />, count: deals.length },
  ];

  const filtered = useMemo(() => {
    const base = tab === "todos" ? deals : deals.filter((d) => statusToTab[d.status] === tab);
    const sorted = [...base].sort((a, b) => {
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return sorted;
  }, [deals, tab, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortFor = (key: SortKey): SortDir => (sortKey === key ? sortDir : null);

  const allChecked = filtered.length > 0 && filtered.every((d) => selected.has(d.id));
  const someChecked = filtered.some((d) => selected.has(d.id));

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        filtered.forEach((d) => next.delete(d.id));
      } else {
        filtered.forEach((d) => next.add(d.id));
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] backdrop-blur-md shadow-[var(--glass-shadow)]",
        className,
      )}
    >
      <div className="flex items-center gap-0.5 border-b border-[var(--glass-border-subtle)] px-4 pt-2.5">
        {tabs.map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "-mb-px inline-flex cursor-pointer items-center gap-1.5 border-b-2 bg-transparent px-3.5 py-2.5 font-display text-[12px] font-bold tracking-[0.03em] transition-all",
                isActive
                  ? "border-[var(--brand-primary)] text-[var(--brand-primary)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
              )}
            >
              {t.icon}
              {t.label}
              {t.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-px font-display text-[10px] font-bold",
                    isActive
                      ? "bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]"
                      : "bg-[var(--glass-bg-overlay)] text-[var(--text-muted)]",
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className={cn("mb-2.5 grid items-center gap-3 border-b border-[var(--glass-border-subtle)] px-3.5 pb-2.5", DEAL_GRID)}>
          <span>
            <CheckboxGlass
              checked={allChecked}
              indeterminate={!allChecked && someChecked}
              onChange={toggleAll}
              aria-label="Selecionar todos"
            />
          </span>
          <SortableHeader label="Negócio" sort={sortFor("dealTitle")} onSort={() => handleSort("dealTitle")} />
          <SortableHeader label="Contato" sort={sortFor("contactName")} onSort={() => handleSort("contactName")} />
          <SortableHeader label="Valor" sort={sortFor("value")} onSort={() => handleSort("value")} />
          <SortableHeader label="Etapa" sort={sortFor("stageName")} onSort={() => handleSort("stageName")} />
          <SortableHeader label="Responsável" sort={sortFor("ownerName")} onSort={() => handleSort("ownerName")} />
          <SortableHeader label="Criado em" sort={sortFor("createdAt")} onSort={() => handleSort("createdAt")} />
          <SortableHeader label="Status" sort={sortFor("status")} onSort={() => handleSort("status")} />
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
          {filtered.map((d) => {
            const badge = statusBadge[d.status];
            const isChecked = selected.has(d.id);
            return (
              <div
                key={d.id}
                onClick={() => onRowClick?.(d.id)}
                className={cn(
                  "grid cursor-pointer items-center gap-3 rounded-[var(--radius-lg)] border bg-[var(--glass-bg-overlay)] px-3.5 py-2.5 shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-all duration-200 hover:bg-[var(--glass-bg-base)]",
                  DEAL_GRID,
                  isChecked
                    ? "border-[var(--brand-primary)]/40 bg-[var(--glass-bg-base)] shadow-[0_6px_20px_rgba(91,111,245,0.18)]"
                    : "border-[var(--glass-border-subtle)]",
                )}
              >
                <span onClick={(e) => e.stopPropagation()}>
                  <CheckboxGlass
                    checked={isChecked}
                    onChange={() => toggleOne(d.id)}
                    aria-label={`Selecionar ${d.dealTitle}`}
                  />
                </span>
                <span className="truncate font-display text-[13px] font-bold text-[var(--text-primary)]">
                  {d.dealTitle}
                </span>
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="relative shrink-0">
                    <div
                      className={cn(
                        d.avatarColor,
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[var(--glass-bg-base)] font-display text-[10px] font-bold text-white",
                      )}
                    >
                      {d.contactInitials}
                    </div>
                    {d.channel === "whatsapp" && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-[1.5px] border-[var(--glass-bg-base)] bg-[#25D366]">
                        <IconBrandWhatsapp size={8} className="text-white" />
                      </span>
                    )}
                  </div>
                  <span className="truncate font-display text-[13px] font-semibold text-[var(--text-primary)]">
                    {d.contactName}
                  </span>
                </div>
                <span className="truncate font-display text-[13px] font-semibold text-[var(--text-secondary)]">
                  {d.value}
                </span>
                <div className="min-w-0">
                  <StageDot color={d.stageColor} label={d.stageName} />
                </div>
                <span className="truncate font-display text-[13px] text-[var(--text-muted)]">
                  {d.ownerName ?? "—"}
                </span>
                <span className="truncate font-display text-[13px] text-[var(--text-muted)]">
                  {d.createdAt}
                </span>
                <div>
                  <BadgeGlass variant={badge.variant}>{badge.label}</BadgeGlass>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
