"use client";

import { Plus } from "lucide-react";

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

/**
 * NodePalette — sidebar direita do editor de automação com os blocos
 * arrastáveis. Visual premium glassmorphism + ícones vibrantes por
 * tipo (mesma palette `stepColor` usada no AddStepNode e ActionNode,
 * pra coerência visual entre arrastar / dropar / ver no canvas).
 */
export function NodePalette({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "scrollbar-thin flex flex-col gap-4 overflow-y-auto border-l border-slate-100 bg-white/85 p-4 backdrop-blur-xl",
        className
      )}
    >
      <div className="border-b border-slate-100 pb-3">
        <p className="font-heading text-[15px] font-extrabold tracking-tighter text-slate-900">
          Blocos
        </p>
        <p className="mt-0.5 text-[11px] font-medium tracking-tight text-slate-500">
          Arraste para o canvas
        </p>
      </div>
      {GROUPS.map((g) => (
        <div key={g.title}>
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ink-muted)]">
            {g.title}
          </p>
          <ul className="flex flex-col gap-1">
            {g.items.map(({ type }) => {
              const Icon = stepIcon[type] ?? Plus;
              const color = stepColor[type] ?? "text-slate-500";
              return (
                <li key={type}>
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(PALETTE_DRAG_TYPE, type);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    className="group/item flex w-full cursor-grab items-center gap-2.5 rounded-xl border border-slate-100 bg-white px-2.5 py-2 text-left transition-all duration-200 hover:-translate-y-px hover:border-primary/30 hover:bg-[#eef4ff]/40 hover:shadow-[var(--shadow-indigo-glow)] active:cursor-grabbing"
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bg-subtle)] ring-1 ring-slate-100 transition-all group-hover/item:scale-105 group-hover/item:bg-white group-hover/item:ring-primary/20",
                        color
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="truncate text-[13px] font-bold tracking-tight text-foreground">
                      {stepTypeLabel(type)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

export { PALETTE_DRAG_TYPE };
