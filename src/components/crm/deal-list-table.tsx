"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { ChatAvatar } from "@/components/inbox/chat-avatar";
import { AVATAR_SIZE } from "@/lib/avatar";

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

/** Mesmo template do header e dos cards — evita desalinhamento. */
const DEAL_GRID_TEMPLATE =
  "42px 1.6fr 1.6fr 0.9fr 1.2fr 1.1fr 1fr 0.9fr";

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
        "scrollbar-thin flex min-h-0 flex-1 flex-col overflow-auto overscroll-contain pb-1 [-webkit-overflow-scrolling:touch]",
        className,
      )}
    >
      <div className="flex w-full min-w-0 flex-col gap-2">
        {/* Header — mesmo padrão visual da lista Cards de Contatos */}
        <div
          className={listTableHeadRowClass("grid gap-3 border border-transparent px-4 py-2")}
          style={{ gridTemplateColumns: DEAL_GRID_TEMPLATE }}
        >
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
                style={{ gridTemplateColumns: DEAL_GRID_TEMPLATE }}
                className={cn(
                  "group grid cursor-pointer items-center gap-3 rounded-[var(--radius-xl)] border px-4 py-3 shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:shadow-[var(--glass-shadow)]",
                  isChecked
                    ? "border-[var(--brand-primary)] bg-[var(--color-primary-soft)]"
                    : "border-[var(--glass-border)] bg-[var(--glass-bg-base)]",
                )}
              >
                <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                  <CheckboxGlass
                    checked={isChecked}
                    onChange={() => toggleOne(d.id)}
                    aria-label={`Selecionar ${d.dealTitle}`}
                  />
                </span>
                <div className="min-w-0 leading-tight">
                  <span className="block truncate font-display text-[14px] font-bold text-[var(--text-primary)]">
                    {d.dealTitle}
                  </span>
                </div>
                <div className="flex min-w-0 items-center gap-2.5">
                  <ChatAvatar
                    user={{ id: d.id, name: d.contactName }}
                    channel={d.channel ?? null}
                    size={AVATAR_SIZE.md}
                  />
                  <span className="truncate font-display text-[14px] font-bold text-[var(--text-primary)]">
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
          })
        )}
      </div>
    </div>
  );
}
