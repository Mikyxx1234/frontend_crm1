"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type RightTabValue = "conversations" | "activities" | "notes" | "timeline";

type TabDef = {
  value: RightTabValue;
  label: string;
  count?: number;
};

type WorkspaceTabsProps = {
  value: RightTabValue;
  onChange: (v: RightTabValue) => void;
  conversationsCount: number;
  activitiesCount: number;
  notesCount: number;
  /** @deprecated Tabs do workspace usam barra inferior; ignorado. */
  compact?: boolean;
};

export function WorkspaceTabs({
  value,
  onChange,
  conversationsCount,
  activitiesCount,
  notesCount,
}: WorkspaceTabsProps) {
  const tabs: TabDef[] = [
    { value: "conversations", label: "Principal", count: conversationsCount },
    { value: "activities", label: "Atividades", count: activitiesCount },
    { value: "notes", label: "Notas", count: notesCount },
    { value: "timeline", label: "Timeline" },
  ];

  return (
    <div className="relative shrink-0 border-b border-border bg-white">
      <div
        role="tablist"
        aria-label="Painel do negocio"
        className="scrollbar-none flex h-auto w-full shrink-0 overflow-x-auto"
      >
        {tabs.map((t) => {
          const active = t.value === value;
          const count = typeof t.count === "number" ? t.count : 0;
          return (
            <button
              key={t.value}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => onChange(t.value)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[11px] font-medium transition-colors",
                active
                  ? "border-b-2 border-primary font-semibold text-primary"
                  : "border-b-2 border-transparent text-[var(--color-ink-soft)] hover:text-foreground",
              )}
            >
              <span className="truncate">{t.label}</span>
              {count > 0 ? (
                <span
                  className={cn(
                    "rounded px-1 text-[10px] font-semibold tabular-nums leading-[16px]",
                    active
                      ? "bg-[var(--color-primary-soft)] text-primary"
                      : "bg-[var(--color-bg-subtle)] text-[var(--color-ink-muted)]",
                  )}
                >
                  {count > 9 ? "9+" : count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent" />
    </div>
  );
}
