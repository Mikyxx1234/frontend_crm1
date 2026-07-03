"use client";

import { useMemo, useState } from "react";

import { IconBrandWhatsapp } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

import { BadgeGlass } from "./badge-glass";
import { CheckboxGlass } from "./checkbox-glass";
import { SortableHeader, type SortDir, listTableHeadRowClass } from "./sortable-header";
import { StageDot } from "./stage-dot";

export type DealListStatus = "OPEN" | "WON" | "LOST";
export type DealListTab = "abertos" | "ganhos" | "perdidos" | "todos";

export interface DealListRow {
  id: string;
  dealTitle: string;
  contactName: string;
  contactInitials: string;
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
  statusTab?: DealListTab;
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

export function DealListTable({
  deals,
  statusTab = "abertos",
  onRowClick,
  className,
}: DealListTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const base =
      statusTab === "todos"
        ? deals
        : deals.filter((d) => statusToTab[d.status] === statusTab);
    const sorted = [...base].sort((a, b) => {
      const av = String(a[sortKey] ?? "");
      const bv = String(b[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return sorted;
  }, [deals, statusTab, sortKey, sortDir]);

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
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-1.5 backdrop-blur-md shadow-[var(--glass-shadow)]",
        className,
      )}
    >
      <div className={listTableHeadRowClass(cn(DEAL_GRID, "gap-3 px-3 py-2"))}>
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

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="py-10 text-center font-body text-[13px] text-[var(--text-muted)]">
            Nenhum negócio neste status nesta página.
          </p>
        ) : (
          filtered.map((d) => {
          const badge = statusBadge[d.status];
          const isChecked = selected.has(d.id);
          return (
            <div
              key={d.id}
              role="button"
              tabIndex={0}
              onClick={() => onRowClick?.(d.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onRowClick?.(d.id);
                }
              }}
              className={cn(
                "grid cursor-pointer items-center gap-3 border-b border-[var(--glass-border-subtle)] px-3 py-2.5 transition-colors last:border-b-0 hover:bg-[var(--glass-bg-overlay)]",
                DEAL_GRID,
                isChecked && "bg-[var(--color-primary-soft)]",
              )}
            >
              <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                <CheckboxGlass
                  checked={isChecked}
                  onChange={() => toggleOne(d.id)}
                  aria-label={`Selecionar ${d.dealTitle}`}
                />
              </span>
              <span className="truncate font-display text-sm font-bold text-[var(--text-primary)]">
                {d.dealTitle}
              </span>
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="relative shrink-0">
                  <div
                    className={cn(
                      d.avatarColor,
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-[10px] font-bold text-white",
                    )}
                  >
                    {d.contactInitials}
                  </div>
                  {d.channel === "whatsapp" && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-[1.5px] border-[var(--glass-bg-base)] bg-[var(--channel-whatsapp)]">
                      <IconBrandWhatsapp size={8} className="text-white" />
                    </span>
                  )}
                </div>
                <span className="truncate font-display text-[13px] font-semibold text-[var(--text-primary)]">
                  {d.contactName}
                </span>
              </div>
              <span className="truncate font-display text-[13px] text-[var(--text-secondary)]">
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
          })
        )}
      </div>
    </div>
  );
}
