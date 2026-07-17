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

export type DealListColumnKey =
  | "dealTitle"
  | "contactName"
  | "value"
  | "stageName"
  | "ownerName"
  | "createdAt"
  | "status";

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

export const DEAL_LIST_COLUMNS: {
  key: DealListColumnKey;
  label: string;
  fr: string;
  locked?: boolean;
}[] = [
  { key: "dealTitle", label: "Negócio", fr: "1.6fr", locked: true },
  { key: "contactName", label: "Contato", fr: "1.6fr" },
  { key: "value", label: "Valor", fr: "0.9fr" },
  { key: "stageName", label: "Etapa", fr: "1.2fr" },
  { key: "ownerName", label: "Responsável", fr: "1.1fr" },
  { key: "createdAt", label: "Criado em", fr: "1fr" },
  { key: "status", label: "Status", fr: "0.9fr" },
];

export const DEFAULT_DEAL_LIST_COLUMN_KEYS: DealListColumnKey[] =
  DEAL_LIST_COLUMNS.map((c) => c.key);

type SortKey = DealListColumnKey;

interface DealListTableProps {
  deals: DealListRow[];
  statusTab?: DealListTab;
  visibleColumns?: DealListColumnKey[];
  onRowClick?: (id: string) => void;
  className?: string;
}

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

function resolveColumns(keys?: DealListColumnKey[]) {
  const ordered = keys?.length
    ? DEAL_LIST_COLUMNS.filter((c) => keys.includes(c.key) || c.locked)
    : DEAL_LIST_COLUMNS;
  // garante Negócio sempre presente e na ordem canônica
  const seen = new Set(ordered.map((c) => c.key));
  if (!seen.has("dealTitle")) {
    return [DEAL_LIST_COLUMNS[0], ...ordered];
  }
  return ordered;
}

export function DealListTable({
  deals,
  statusTab = "abertos",
  visibleColumns,
  onRowClick,
  className,
}: DealListTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const columns = useMemo(() => resolveColumns(visibleColumns), [visibleColumns]);
  const gridTemplate = useMemo(
    () => ["42px", ...columns.map((c) => c.fr)].join(" "),
    [columns],
  );

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

  function renderCell(d: DealListRow, key: DealListColumnKey) {
    switch (key) {
      case "dealTitle":
        return (
          <div className="min-w-0 leading-tight">
            <span className="block truncate font-display text-[14px] font-bold text-[var(--text-primary)]">
              {d.dealTitle}
            </span>
          </div>
        );
      case "contactName":
        return (
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
        );
      case "value":
        return (
          <span className="truncate font-display text-[13px] font-semibold text-[var(--text-secondary)]">
            {d.value}
          </span>
        );
      case "stageName":
        return (
          <div className="min-w-0">
            <StageDot color={d.stageColor} label={d.stageName} />
          </div>
        );
      case "ownerName":
        return (
          <span className="truncate font-display text-[13px] text-[var(--text-muted)]">
            {d.ownerName ?? "—"}
          </span>
        );
      case "createdAt":
        return (
          <span className="truncate font-display text-[13px] text-[var(--text-muted)]">
            {d.createdAt}
          </span>
        );
      case "status": {
        const badge = statusBadge[d.status];
        return (
          <div>
            <BadgeGlass variant={badge.variant}>{badge.label}</BadgeGlass>
          </div>
        );
      }
      default:
        return null;
    }
  }

  return (
    <div
      className={cn(
        "scrollbar-thin flex min-h-0 flex-1 flex-col overflow-auto overscroll-contain pb-1 [-webkit-overflow-scrolling:touch]",
        className,
      )}
    >
      <div className="flex w-full min-w-0 flex-col gap-2">
        <div
          className={listTableHeadRowClass("grid gap-3 border border-transparent px-4 py-2")}
          style={{ gridTemplateColumns: gridTemplate }}
        >
          <span>
            <CheckboxGlass
              checked={allChecked}
              indeterminate={!allChecked && someChecked}
              onChange={toggleAll}
              aria-label="Selecionar todos"
            />
          </span>
          {columns.map((col) => (
            <SortableHeader
              key={col.key}
              label={col.label}
              sort={sortFor(col.key)}
              onSort={() => handleSort(col.key)}
            />
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="py-10 text-center font-body text-[13px] text-[var(--text-muted)]">
            Nenhum negócio neste status nesta página.
          </p>
        ) : (
          filtered.map((d) => {
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
                style={{ gridTemplateColumns: gridTemplate }}
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
                {columns.map((col) => (
                  <div key={col.key} className="min-w-0">
                    {renderCell(d, col.key)}
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
