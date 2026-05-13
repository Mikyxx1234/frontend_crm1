"use client";

import * as React from "react";
import { Calendar, Clock, FileText, MessageSquare, type LucideIcon } from "lucide-react";

import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Tabs no padrao §5 da ui-fidelity:
//  - container `rounded-full bg-[#f1f5f9] p-1 shadow-inner ring-1 ring-slate-200/50`
//  - ativa: h-10 bg-[#507df1] text-white shadow-blue-glow, font-semibold
//  - inativa: h-10 (icone-only), font-medium
//  - SEM `motion layout` (rule §5 inegociavel)
//  - badges de count em `bg-white/25` (ativa) / `ring-2 ring-[#f1f5f9]` (inativa)

export type RightTabValue = "conversations" | "activities" | "notes" | "timeline";

type TabDef = {
  value: RightTabValue;
  label: string;
  Icon: LucideIcon;
  count?: number;
};

type WorkspaceTabsProps = {
  value: RightTabValue;
  onChange: (v: RightTabValue) => void;
  conversationsCount: number;
  activitiesCount: number;
  notesCount: number;
};

export function WorkspaceTabs({
  value,
  onChange,
  conversationsCount,
  activitiesCount,
  notesCount,
}: WorkspaceTabsProps) {
  const tabs: TabDef[] = [
    { value: "conversations", label: "Conversas", Icon: MessageSquare, count: conversationsCount },
    { value: "activities", label: "Atividades", Icon: Calendar, count: activitiesCount },
    { value: "notes", label: "Notas", Icon: FileText, count: notesCount },
    { value: "timeline", label: "Timeline", Icon: Clock },
  ];

  return (
    <div
      role="tablist"
      aria-label="Painel do negocio"
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-[#f1f5f9] p-1",
        "shadow-inner ring-1 ring-slate-200/50",
      )}
    >
      {tabs.map((t) => {
        const active = t.value === value;
        const button = (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              "relative inline-flex h-10 items-center justify-center gap-2 rounded-full",
              "transition-colors duration-150 active:scale-[0.97]",
              active
                ? "flex-1 bg-[#507df1] px-5 text-[14px] font-semibold text-white shadow-blue-glow"
                : "w-11 text-slate-500 hover:text-slate-800",
            )}
          >
            <t.Icon
              className="size-[18px]"
              strokeWidth={active ? 2.2 : 2}
            />
            {active ? (
              <>
                <span className="tracking-tight">{t.label}</span>
                {typeof t.count === "number" && t.count > 0 ? (
                  <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-[11px] font-bold tabular-nums">
                    {t.count}
                  </span>
                ) : null}
              </>
            ) : (
              typeof t.count === "number" && t.count > 0 ? (
                <span
                  className={cn(
                    "absolute -top-1 -right-1 inline-flex size-[17px] items-center justify-center",
                    "rounded-full bg-[#507df1] text-[10px] font-bold tabular-nums text-white",
                    "ring-2 ring-[#f1f5f9]",
                  )}
                >
                  {t.count > 9 ? "9+" : t.count}
                </span>
              ) : null
            )}
          </button>
        );

        return active ? (
          button
        ) : (
          <TooltipHost key={t.value} label={t.label} side="bottom">
            {button}
          </TooltipHost>
        );
      })}
    </div>
  );
}
