"use client";

import type { ComponentType } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  BotMessageSquare,
  CheckCircle2,
  Image,
  Mail,
  MessageSquare,
  MousePointerClick,
  Pencil,
  Tag,
  Trash2,
  UserPlus,
  Webhook,
} from "lucide-react";

import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { stepColor } from "./add-step-node";

export type ActionNodeData = {
  stepType: string;
  label: string;
  summary: string;
  stepIndex?: number;
  /** Step sem config mínima pra executar — destaca em âmbar. */
  incomplete?: boolean;
  onDelete?: () => void;
  stats?: { success: number; failed: number; skipped: number };
  onStatsClick?: () => void;
};

const iconMap: Record<string, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  send_email: Mail,
  move_stage: ArrowRightLeft,
  assign_owner: UserPlus,
  add_tag: Tag,
  remove_tag: Tag,
  update_field: Pencil,
  create_activity: Activity,
  send_whatsapp_message: MessageSquare,
  send_whatsapp_template: MessageSquare,
  send_whatsapp_media: Image,
  send_whatsapp_interactive: MousePointerClick,
  webhook: Webhook,
  update_lead_score: Activity,
  transfer_to_ai_agent: BotMessageSquare,
};

/**
 * Mapa stepType → tinta de fundo do ícone (bg + ring claros). Espelha
 * `stepColor` (text-{cor}-{tom}) pro ícone e seu container ficarem na
 * mesma família semântica. Mantém intenção (WhatsApp = verde, Email =
 * azul, etc.) sem usar opacity arbitrária do Tailwind dinamicamente.
 */
const iconBgMap: Record<string, string> = {
  send_email: "bg-blue-50 ring-blue-100",
  move_stage: "bg-indigo-50 ring-indigo-100",
  assign_owner: "bg-teal-50 ring-teal-100",
  add_tag: "bg-emerald-50 ring-emerald-100",
  remove_tag: "bg-red-50 ring-red-100",
  update_field: "bg-amber-50 ring-amber-100",
  create_activity: "bg-violet-50 ring-violet-100",
  send_whatsapp_message: "bg-green-50 ring-green-100",
  send_whatsapp_template: "bg-green-50 ring-green-100",
  send_whatsapp_media: "bg-green-50 ring-green-100",
  send_whatsapp_interactive: "bg-violet-50 ring-violet-100",
  webhook: "bg-slate-50 ring-slate-100",
  update_lead_score: "bg-pink-50 ring-pink-100",
  transfer_to_ai_agent: "bg-violet-50 ring-violet-100",
};

function StepIcon({ type }: { type: string }) {
  const Icon = iconMap[type] ?? Activity;
  return <Icon className="size-4" strokeWidth={2.4} aria-hidden />;
}

export function ActionNode({ data, selected }: NodeProps<ActionNodeData>) {
  const s = data.stats;
  const hasStats = s && (s.success > 0 || s.failed > 0);
  const iconColor = stepColor[data.stepType] ?? "text-brand-blue";
  const iconBg = iconBgMap[data.stepType] ?? "bg-brand-blue/10 ring-brand-blue/15";

  return (
    <div
      className={cn(
        "group/node relative min-w-[230px] max-w-[290px] rounded-2xl border bg-white transition-all duration-200",
        selected
          ? "border-brand-blue/50 shadow-blue-glow ring-2 ring-brand-blue/25"
          : data.incomplete
            ? "border-amber-300/70 shadow-[0_4px_16px_-8px_rgba(245,158,11,0.25)] ring-1 ring-amber-200/60 hover:-translate-y-px hover:border-amber-400/80"
            : "border-slate-100 shadow-[0_4px_16px_-8px_rgba(13,27,62,0.08)] hover:-translate-y-px hover:border-brand-blue/30 hover:shadow-blue-glow"
      )}
    >
      {data.stepIndex != null && (
        <span className="absolute -left-2.5 -top-2.5 z-10 flex size-[24px] items-center justify-center rounded-full bg-linear-to-br from-brand-navy to-[#1e3a8a] text-[10px] font-black tabular-nums text-white shadow-md ring-2 ring-white">
          {data.stepIndex}
        </span>
      )}
      {data.incomplete && (
        <TooltipHost label="Configuração incompleta — esse passo vai falhar em runtime" side="top">
          <span className="absolute -right-1.5 -top-1.5 z-10 flex size-5 items-center justify-center rounded-full bg-amber-500 text-white shadow-md ring-2 ring-white">
            <AlertTriangle className="size-3" strokeWidth={2.6} />
          </span>
        </TooltipHost>
      )}
      <Handle
        type="target"
        position={Position.Left}
        className="size-3! border-2! border-white! bg-slate-300!"
      />
      <div className="flex items-start gap-3 px-3.5 py-3">
        <span
          className={cn(
            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ring-1",
            iconBg,
            iconColor
          )}
        >
          <StepIcon type={data.stepType} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-black tracking-tighter leading-tight text-slate-900">
            {data.label}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[12px] font-medium tracking-tight text-slate-500">
            {data.summary}
          </p>
        </div>
        {data.onDelete && (
          <TooltipHost label="Remover passo" side="top">
            <button
              type="button"
              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-400 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover/node:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                data.onDelete?.();
              }}
              aria-label="Remover passo"
            >
              <Trash2 className="size-3.5" strokeWidth={2.2} />
            </button>
          </TooltipHost>
        )}
      </div>
      {hasStats && (
        <TooltipHost label="Ver eventos" side="bottom">
          <button
            type="button"
            className="flex w-full items-center gap-2 border-t border-slate-100 px-3.5 py-2 transition-colors hover:bg-slate-50/60"
            onClick={(e) => {
              e.stopPropagation();
              data.onStatsClick?.();
            }}
            aria-label="Ver eventos"
          >
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black tabular-nums text-emerald-700 ring-1 ring-emerald-100">
              <CheckCircle2 className="size-3" />
              {s.success}
            </span>
            {s.failed > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black tabular-nums text-rose-700 ring-1 ring-rose-100">
                <AlertTriangle className="size-3" />
                {s.failed}
              </span>
            )}
          </button>
        </TooltipHost>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="size-3! border-2! border-white! bg-brand-blue! shadow-blue-glow!"
      />
    </div>
  );
}
