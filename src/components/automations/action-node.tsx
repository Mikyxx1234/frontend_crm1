"use client";

import type { ComponentType } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { IconActivity as Activity, IconAlertTriangle as AlertTriangle, IconArrowsLeftRight as ArrowRightLeft, IconRobotFace as BotMessageSquare, IconCircleCheck as CheckCircle2, IconPhoto as Image, IconMail as Mail, IconMessage as MessageSquare, IconClick as MousePointerClick, IconPencil as Pencil, IconTag as Tag, IconTrash as Trash2, IconUserPlus as UserPlus, IconWebhook as Webhook } from "@tabler/icons-react";

import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { stepColor } from "./add-step-node";
import { NodeInlineConfig } from "./node-inline-config";

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
  /** Edição inline (populado por buildNodes no workflow-canvas). */
  config?: Record<string, unknown>;
  stepOptions?: Array<{ value: string; label: string }>;
  onConfigChange?: (next: Record<string, unknown>) => void;
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
  send_email: "bg-[var(--brand-primary)]/10 ring-[var(--brand-primary)]/15",
  move_stage: "bg-[var(--brand-primary)]/10 ring-[var(--brand-primary)]/15",
  assign_owner: "bg-teal-50 ring-teal-100",
  add_tag: "bg-[var(--color-success-bg)] ring-[var(--color-success)]/15",
  remove_tag: "bg-[var(--color-danger-bg)] ring-[var(--color-danger)]/15",
  update_field: "bg-[var(--color-warn-bg)] ring-[var(--color-warning)]/15",
  create_activity: "bg-[var(--brand-secondary)]/10 ring-[var(--brand-secondary)]/15",
  send_whatsapp_message: "bg-[var(--color-success-bg)] ring-[var(--color-success)]/15",
  send_whatsapp_template: "bg-[var(--color-success-bg)] ring-[var(--color-success)]/15",
  send_whatsapp_media: "bg-[var(--color-success-bg)] ring-[var(--color-success)]/15",
  send_whatsapp_interactive: "bg-[var(--brand-secondary)]/10 ring-[var(--brand-secondary)]/15",
  webhook: "bg-[var(--color-bg-subtle)] ring-[var(--glass-border-subtle)]",
  update_lead_score: "bg-[var(--brand-accent)]/10 ring-[var(--brand-accent)]/15",
  transfer_to_ai_agent: "bg-[var(--brand-secondary)]/10 ring-[var(--brand-secondary)]/15",
};

function StepIcon({ type }: { type: string }) {
  const Icon = iconMap[type] ?? Activity;
  return <Icon className="size-4" strokeWidth={2.4} aria-hidden />;
}

export function ActionNode({ data, selected }: NodeProps<ActionNodeData>) {
  const s = data.stats;
  const hasStats = s && (s.success > 0 || s.failed > 0);
  const iconColor = stepColor[data.stepType] ?? "text-primary";
  const iconBg = iconBgMap[data.stepType] ?? "bg-primary/10 ring-primary/15";

  return (
    <div
      className={cn(
        "group/node relative rounded-lg border bg-[var(--color-bg-card)] transition-all duration-200",
        // Webhook abre o construtor visual (parâmetros + catálogo) —
        // precisa de card mais largo que os demais passos.
        selected
          ? data.stepType === "webhook"
            ? "min-w-[480px] max-w-[560px]"
            : "min-w-[340px] max-w-[400px]"
          : "min-w-[230px] max-w-[290px]",
        selected
          ? "border-primary/50 shadow-[var(--shadow-indigo-glow)] ring-2 ring-primary/25"
          : data.incomplete
            ? "border-[var(--color-warning)]/70 shadow-[0_4px_16px_-8px_rgba(245,158,11,0.25)] ring-1 ring-[var(--color-warning)]/20 hover:-translate-y-px hover:border-[var(--color-warning)]/80"
            : "border-[var(--glass-border-subtle)] shadow-[0_4px_16px_-8px_rgba(13,27,62,0.08)] hover:-translate-y-px hover:border-primary/30 hover:shadow-[var(--shadow-indigo-glow)]"
      )}
    >
      {data.stepIndex != null && (
        <span className="absolute -left-2.5 -top-2.5 z-10 flex size-[24px] items-center justify-center rounded-full bg-linear-to-br from-primary to-[var(--brand-gradient-end)] text-[10px] font-bold tabular-nums text-white shadow-md ring-2 ring-white">
          {data.stepIndex}
        </span>
      )}
      {data.incomplete && (
        <TooltipHost label="Configuração incompleta — esse passo vai falhar em runtime" side="top">
          <span className="absolute -right-1.5 -top-1.5 z-10 flex size-5 items-center justify-center rounded-full bg-[var(--color-warning)] text-white shadow-md ring-2 ring-white">
            <AlertTriangle className="size-3" strokeWidth={2.6} />
          </span>
        </TooltipHost>
      )}
      <Handle
        type="target"
        position={Position.Left}
        className="size-3! border-2! border-white! bg-[var(--glass-border)]!"
      />
      <div className="node-drag-handle flex cursor-grab items-start gap-3 px-3.5 py-3 active:cursor-grabbing">
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
          <p className="truncate text-[14px] font-extrabold tracking-tighter leading-tight text-[var(--text-primary)]">
            {data.label}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[12px] font-medium tracking-tight text-[var(--text-muted)]">
            {data.summary}
          </p>
        </div>
        {data.onDelete && (
          <TooltipHost label="Remover passo" side="top">
            <button
              type="button"
              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[var(--color-ink-muted)] opacity-0 transition-all hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)] group-hover/node:opacity-100"
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
            className="flex w-full items-center gap-2 border-t border-[var(--glass-border-subtle)] px-3.5 py-2 transition-colors hover:bg-[var(--color-bg-subtle)]/60"
            onClick={(e) => {
              e.stopPropagation();
              data.onStatsClick?.();
            }}
            aria-label="Ver eventos"
          >
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success-bg)] px-2 py-0.5 text-[10px] font-bold tabular-nums text-[var(--color-success-text)] ring-1 ring-[var(--color-success)]/15">
              <CheckCircle2 className="size-3" />
              {s.success}
            </span>
            {s.failed > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-danger-bg)] px-2 py-0.5 text-[10px] font-bold tabular-nums text-[var(--color-danger-text)] ring-1 ring-[var(--color-danger)]/15">
                <AlertTriangle className="size-3" />
                {s.failed}
              </span>
            )}
          </button>
        </TooltipHost>
      )}
      <NodeInlineConfig
        selected={selected}
        stepType={data.stepType}
        config={data.config}
        stepOptions={data.stepOptions ?? []}
        onChange={(next) => data.onConfigChange?.(next)}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="size-3! border-2! border-white! bg-primary! shadow-[var(--shadow-indigo-glow)]!"
      />
    </div>
  );
}
