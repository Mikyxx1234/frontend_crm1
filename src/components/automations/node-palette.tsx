"use client";

import { useState } from "react";
import { PanelRightClose, PanelRightOpen, Plus } from "lucide-react";

import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ActionStepType } from "@/lib/automation-workflow";
import { stepTypeLabel } from "@/lib/automation-workflow";

import { stepColor, stepIcon } from "./add-step-node";

const PALETTE_DRAG_TYPE = "application/x-automation-step";

export function readPaletteDragType(
  dataTransfer: DataTransfer | null
): ActionStepType | null {
  if (!dataTransfer) return null;
  const raw = dataTransfer.getData(PALETTE_DRAG_TYPE);
  if (!raw) return null;
  return raw as ActionStepType;
}

type PaletteItem = { type: ActionStepType };

const GROUPS: { title: string; items: PaletteItem[] }[] = [
  {
    title: "Ações",
    items: [
      { type: "send_email" },
      { type: "move_stage" },
      { type: "assign_owner" },
      { type: "add_tag" },
      { type: "remove_tag" },
      { type: "update_field" },
      { type: "create_activity" },
      { type: "update_lead_score" },
    ],
  },
  {
    title: "Salesbot",
    items: [
      { type: "question" },
      { type: "wait_for_reply" },
      { type: "set_variable" },
      { type: "goto" },
      { type: "transfer_automation" },
      { type: "finish_conversation" },
      { type: "finish" },
    ],
  },
  {
    title: "Lógica",
    items: [{ type: "delay" }, { type: "condition" }],
  },
  {
    title: "WhatsApp",
    items: [
      { type: "send_whatsapp_message" },
      { type: "send_whatsapp_template" },
      { type: "send_whatsapp_media" },
      { type: "send_whatsapp_interactive" },
    ],
  },
  {
    title: "Integrações",
    items: [{ type: "webhook" }],
  },
  {
    title: "IA",
    items: [{ type: "transfer_to_ai_agent" }, { type: "ask_ai_agent" }],
  },
];

/** Handler de dragstart compartilhado entre os dois modos (expandido / recolhido). */
function makeDragStart(type: ActionStepType) {
  return (e: React.DragEvent<HTMLButtonElement>) => {
    e.dataTransfer.setData(PALETTE_DRAG_TYPE, type);
    e.dataTransfer.effectAllowed = "copy";
  };
}

/**
 * NodePalette — sidebar direita do editor de automação com os blocos
 * arrastáveis. Segue o DS V2 (glass tokens: `--glass-bg-*`,
 * `--glass-border`, `--radius-*`) e suporta recolher/expandir: no modo
 * recolhido vira uma trilha estreita só de ícones (com tooltip), e
 * expande pra 240px com grupos rotulados. Os ícones/cores por tipo são
 * os mesmos do AddStepNode/ActionNode pra coerência visual.
 */
export function NodePalette({ className }: { className?: string }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col overflow-hidden border-l border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] backdrop-blur-xl transition-[width] duration-300 ease-out",
        collapsed ? "w-[60px]" : "w-[244px]",
        className
      )}
    >
      {/* Header — padrão DS V2 */}
      <header
        className={cn(
          "flex items-center gap-2 border-b border-[var(--glass-border-subtle)] px-3 py-3",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-heading text-[15px] font-extrabold tracking-tighter text-[var(--color-ink-strong,theme(colors.slate.900))]">
              Blocos
            </p>
            <p className="mt-0.5 truncate text-[11px] font-medium tracking-tight text-[var(--color-ink-muted)]">
              Arraste para o canvas
            </p>
          </div>
        )}
        <TooltipHost label={collapsed ? "Expandir blocos" : "Recolher blocos"} side="left">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expandir painel de blocos" : "Recolher painel de blocos"}
            aria-expanded={!collapsed}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-subtle)] text-[var(--color-ink-soft)] transition-all hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
          >
            {collapsed ? (
              <PanelRightOpen className="size-4" />
            ) : (
              <PanelRightClose className="size-4" />
            )}
          </button>
        </TooltipHost>
      </header>

      {/* Lista de blocos */}
      <div className="scrollbar-thin flex flex-1 flex-col gap-4 overflow-y-auto p-3">
        {GROUPS.map((g) => (
          <div key={g.title}>
            {!collapsed && (
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ink-muted)]">
                {g.title}
              </p>
            )}
            <ul className={cn("flex flex-col", collapsed ? "items-center gap-1.5" : "gap-1")}>
              {g.items.map(({ type }) => {
                const Icon = stepIcon[type] ?? Plus;
                const color = stepColor[type] ?? "text-slate-500";
                const label = stepTypeLabel(type);

                if (collapsed) {
                  return (
                    <li key={type}>
                      <TooltipHost label={label} side="left">
                        <button
                          type="button"
                          draggable
                          onDragStart={makeDragStart(type)}
                          aria-label={label}
                          className={cn(
                            "flex size-9 cursor-grab items-center justify-center rounded-lg border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-subtle)] ring-1 ring-transparent transition-all hover:-translate-y-px hover:border-primary/30 hover:bg-[var(--glass-bg-strong)] hover:shadow-[var(--glass-shadow-sm)] active:cursor-grabbing",
                            color
                          )}
                        >
                          <Icon className="size-4" />
                        </button>
                      </TooltipHost>
                    </li>
                  );
                }

                return (
                  <li key={type}>
                    <button
                      type="button"
                      draggable
                      onDragStart={makeDragStart(type)}
                      className="group/item flex w-full cursor-grab items-center gap-2.5 rounded-xl border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-subtle)] px-2.5 py-2 text-left transition-all duration-200 hover:-translate-y-px hover:border-primary/30 hover:bg-[var(--glass-bg-strong)] hover:shadow-[var(--glass-shadow-sm)] active:cursor-grabbing"
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--glass-bg-strong)] ring-1 ring-[var(--glass-border-subtle)] transition-all group-hover/item:scale-105 group-hover/item:ring-primary/20",
                          color
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="truncate text-[13px] font-bold tracking-tight text-foreground">
                        {label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}

export { PALETTE_DRAG_TYPE };
