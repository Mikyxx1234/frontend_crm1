"use client";

import type { ComponentType, CSSProperties, ReactNode } from "react";
import { Handle, Position } from "reactflow";
import { AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";

import { TooltipHost } from "@/components/ui/tooltip";
import { canonicalStepType } from "@/lib/automation-workflow";
import { cn } from "@/lib/utils";

/** Assinatura comum dos ícones (lucide) usados pelos nós. */
type IconType = ComponentType<{ className?: string; strokeWidth?: number; style?: CSSProperties }>;

/**
 * node-kit — kit de UI compartilhado pelos nós do WorkflowCanvas (editor
 * real, conectado ao backend). Centraliza o tratamento visual DS v2:
 *
 *   • categoria por `stepType` (cor sólida + fundo glass)            → `stepTone`
 *   • header colorido por categoria                                  → <CategoryHeader>
 *   • pernas/saídas como pílulas com handle dedicado                 → <OutcomePill>
 *   • balão de mensagem no corpo (estilo chat)                       → <MessageBubble>
 *   • shell glass + badges/stats reaproveitáveis                     → <NodeShell> etc.
 *
 * IMPORTANTE: este kit NÃO altera contratos do React Flow. Os `id` dos
 * <Handle> continuam sendo passados por quem usa <OutcomePill> — a
 * derivação de edges em `buildEdges`/`onConnect` depende deles.
 */

/* ────────────────────────────────────────────────────────────────────
   Categorias — tom semântico por família de passo (DS v2)
   ──────────────────────────────────────────────────────────────────── */

export type NodeCategory =
  | "trigger"
  | "message"
  | "action"
  | "logic"
  | "salesbot"
  | "ai"
  | "final";

export type Tone = {
  /** Cor sólida (ícone, dot, handle, acento). */
  fg: string;
  /** Fundo suave do chip de ícone. */
  bg: string;
  /** Borda/anel suave. */
  ring: string;
};

/** Paleta DS v2 por categoria (hex/rgba — espelha blockPalette). */
export const categoryTone: Record<NodeCategory, Tone> = {
  trigger: { fg: "#5b6ff5", bg: "rgba(91,111,245,0.12)", ring: "rgba(91,111,245,0.22)" },
  message: { fg: "#16a34a", bg: "rgba(22,163,74,0.12)", ring: "rgba(22,163,74,0.22)" },
  action: { fg: "#2f6df6", bg: "rgba(47,109,246,0.12)", ring: "rgba(47,109,246,0.22)" },
  logic: { fg: "#f97316", bg: "rgba(249,115,22,0.13)", ring: "rgba(249,115,22,0.24)" },
  salesbot: { fg: "#7c3aed", bg: "rgba(124,58,237,0.12)", ring: "rgba(124,58,237,0.22)" },
  ai: { fg: "#7c3aed", bg: "rgba(124,58,237,0.12)", ring: "rgba(124,58,237,0.22)" },
  final: { fg: "#ef4444", bg: "rgba(239,68,68,0.13)", ring: "rgba(239,68,68,0.24)" },
};

/** stepType (backend) → categoria DS v2. */
const STEP_CATEGORY: Record<string, NodeCategory> = {
  // Mensagens (balão de chat)
  send_whatsapp_message: "message",
  send_whatsapp_template: "message",
  send_whatsapp_media: "message",
  send_whatsapp_interactive: "salesbot",
  send_email: "message",
  // Ações
  move_stage: "action",
  assign_owner: "action",
  add_tag: "action",
  remove_tag: "action",
  update_field: "action",
  create_activity: "action",
  update_lead_score: "action",
  create_deal: "action",
  finish_conversation: "action",
  consume_stock: "action",
  webhook: "action",
  execute_distribution: "action",
  // Lógica
  delay: "logic",
  condition: "logic",
  business_hours: "logic",
  wait_for_reply: "logic",
  // Salesbot
  question: "salesbot",
  set_variable: "salesbot",
  goto: "salesbot",
  transfer_automation: "salesbot",
  // IA
  transfer_to_ai_agent: "ai",
  ask_ai_agent: "ai",
  // Terminais
  finish: "final",
  stop_automation: "final",
};

/** Tipos de passo que exibem o conteúdo como balão de mensagem. */
const MESSAGE_STEP_TYPES = new Set([
  "send_whatsapp_message",
  "send_whatsapp_template",
  "send_whatsapp_media",
  "send_whatsapp_interactive",
  "send_email",
  "question",
]);

export function categoryOf(stepType: string): NodeCategory {
  return STEP_CATEGORY[stepType] ?? STEP_CATEGORY[canonicalStepType(stepType)] ?? "action";
}

export function stepTone(stepType: string): Tone {
  return categoryTone[categoryOf(stepType)];
}

export function isMessageStep(stepType: string): boolean {
  return MESSAGE_STEP_TYPES.has(stepType) || MESSAGE_STEP_TYPES.has(canonicalStepType(stepType));
}

/* ────────────────────────────────────────────────────────────────────
   Shell glass — wrapper externo dos nós com acento por tom
   ──────────────────────────────────────────────────────────────────── */

export function NodeShell({
  tone,
  selected,
  incomplete,
  className,
  children,
}: {
  tone: Tone;
  selected?: boolean;
  incomplete?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const accent = incomplete ? "#d97706" : tone.fg;
  return (
    <div
      className={cn(
        "group/node relative overflow-hidden rounded-[var(--radius-xl)] border bg-[var(--glass-bg-base)] backdrop-blur-[10px] transition-all duration-200",
        selected ? "-translate-y-px" : "hover:-translate-y-px",
        className
      )}
      style={{
        borderColor: selected ? accent : "var(--glass-border)",
        boxShadow: selected
          ? `0 0 0 2px ${tone.ring}, 0 14px 40px -16px ${accent}`
          : incomplete
            ? `0 0 0 1px ${tone.ring}, var(--glass-shadow-sm)`
            : "var(--glass-shadow-sm)",
      }}
    >
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Header colorido por categoria
   ──────────────────────────────────────────────────────────────────── */

export function CategoryHeader({
  tone,
  icon: Icon,
  eyebrow,
  title,
  summary,
  /** Header em gradiente sólido (trigger/final) com texto branco. */
  variant = "soft",
  onDelete,
  deleteLabel = "Remover passo",
  trailing,
}: {
  tone: Tone;
  icon: IconType;
  eyebrow?: string;
  title: string;
  summary?: string;
  variant?: "soft" | "gradient";
  onDelete?: () => void;
  deleteLabel?: string;
  trailing?: ReactNode;
}) {
  const gradient = variant === "gradient";
  const headerStyle: CSSProperties = gradient
    ? {
        backgroundImage: `linear-gradient(135deg, ${tone.fg}, color-mix(in srgb, ${tone.fg} 70%, #ffffff))`,
        color: "#ffffff",
      }
    : { backgroundColor: tone.bg };

  return (
    <div className="relative flex items-start gap-3 px-3.5 py-3" style={headerStyle}>
      {gradient && (
        <>
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgba(255,255,255,0.7),transparent)]" />
          <span className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full bg-white/15 blur-2xl" />
        </>
      )}
      <span
        className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]"
        style={
          gradient
            ? { backgroundColor: "rgba(255,255,255,0.2)", color: "#ffffff", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.3)" }
            : { backgroundColor: "var(--glass-bg-overlay)", color: tone.fg, boxShadow: `inset 0 0 0 1px ${tone.ring}` }
        }
      >
        <Icon className="size-4" strokeWidth={2.4} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: gradient ? "rgba(255,255,255,0.85)" : tone.fg }}
          >
            {eyebrow}
          </p>
        )}
        <p
          className="truncate text-[14px] font-extrabold leading-tight tracking-tight"
          style={{ color: gradient ? "#ffffff" : "var(--text-primary)" }}
        >
          {title}
        </p>
        {summary && (
          <p
            className="mt-0.5 line-clamp-2 text-[12px] font-medium tracking-tight"
            style={{ color: gradient ? "rgba(255,255,255,0.82)" : "var(--text-muted)" }}
          >
            {summary}
          </p>
        )}
      </div>
      {trailing}
      {onDelete && (
        <TooltipHost label={deleteLabel} side="top">
          <button
            type="button"
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-md)] opacity-0 transition-all group-hover/node:opacity-100",
              gradient
                ? "text-white/70 hover:bg-white/15 hover:text-white"
                : "text-[var(--text-muted)] hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)]"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label={deleteLabel}
          >
            <Trash2 className="size-3.5" strokeWidth={2.2} />
          </button>
        </TooltipHost>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Pílula de saída — linha com label + handle dedicado à direita
   ──────────────────────────────────────────────────────────────────── */

export function OutcomePill({
  handleId,
  label,
  icon: Icon,
  color,
  muted,
  last,
}: {
  /** id do <Handle> source — preservar exatamente (buildEdges depende). */
  handleId: string;
  label: string;
  icon?: IconType;
  /** Cor sólida da perna (dot + handle). */
  color: string;
  /** Estilo neutro (ex.: timeout/sem resposta). */
  muted?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex h-9 items-center gap-2 px-3.5",
        !last && "border-b border-[var(--glass-border-subtle)]"
      )}
    >
      {Icon ? (
        <Icon className="size-3.5 shrink-0" strokeWidth={2.4} style={{ color: muted ? "var(--text-muted)" : color }} />
      ) : (
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: muted ? "var(--text-muted)" : color }} />
      )}
      <span
        className="flex-1 truncate text-[11px] font-bold tracking-tight"
        style={{ color: muted ? "var(--text-muted)" : "var(--text-secondary)" }}
      >
        {label}
      </span>
      <Handle
        type="source"
        position={Position.Right}
        id={handleId}
        className="size-3! border-2! border-[color:var(--glass-bg-base)]!"
        style={{ backgroundColor: muted ? "#94a3b8" : color }}
      />
    </div>
  );
}

/** Container das pílulas de saída (faixa inferior do card). */
export function OutcomeGroup({ children }: { children: ReactNode }) {
  return (
    <div className="border-t border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)]">
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Balão de mensagem (estilo chat) no corpo
   ──────────────────────────────────────────────────────────────────── */

export function MessageBubble({ text, tone }: { text: string; tone: Tone }) {
  return (
    <div className="px-3.5 pb-3 pt-1">
      <div
        className="relative max-w-full rounded-[var(--radius-lg)] rounded-tl-[4px] px-3 py-2"
        style={{ backgroundColor: tone.bg, boxShadow: `inset 0 0 0 1px ${tone.ring}` }}
      >
        <p className="line-clamp-3 whitespace-pre-line text-[12px] font-medium leading-relaxed tracking-tight text-[var(--text-secondary)]">
          {text}
        </p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Badges / Stats reaproveitáveis
   ──────────────────────────────────────────────────────────────────── */

export function StepBadge({ index }: { index: number }) {
  return (
    <span
      className="absolute -left-2.5 -top-2.5 z-10 flex size-6 items-center justify-center rounded-full text-[10px] font-bold tabular-nums text-white shadow-md ring-2 ring-[color:var(--glass-bg-base)]"
      style={{ backgroundImage: "linear-gradient(135deg, var(--brand-primary), var(--brand-primary-dark))" }}
    >
      {index}
    </span>
  );
}

export function IncompleteBadge() {
  return (
    <TooltipHost label="Configuração incompleta — esse passo vai falhar em runtime" side="top">
      <span className="absolute -right-1.5 -top-1.5 z-10 flex size-5 items-center justify-center rounded-full bg-[var(--color-warning)] text-white shadow-md ring-2 ring-[color:var(--glass-bg-base)]">
        <AlertTriangle className="size-3" strokeWidth={2.6} />
      </span>
    </TooltipHost>
  );
}

export function StatsBar({
  stats,
  onClick,
}: {
  stats: { success: number; failed: number; skipped: number };
  onClick?: () => void;
}) {
  if (!(stats.success > 0 || stats.failed > 0)) return null;
  return (
    <TooltipHost label="Ver eventos" side="bottom">
      <button
        type="button"
        className="flex w-full items-center gap-2 border-t border-[var(--glass-border-subtle)] px-3.5 py-2 transition-colors hover:bg-[var(--glass-bg-overlay)]"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        aria-label="Ver eventos"
      >
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success-bg)] px-2 py-0.5 text-[10px] font-bold tabular-nums text-[var(--color-success-text)]">
          <CheckCircle2 className="size-3" />
          {stats.success}
        </span>
        {stats.failed > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-danger-bg)] px-2 py-0.5 text-[10px] font-bold tabular-nums text-[var(--color-danger-text)]">
            <AlertTriangle className="size-3" />
            {stats.failed}
          </span>
        )}
      </button>
    </TooltipHost>
  );
}

/** Handle target padrão (entrada à esquerda). */
export function TargetHandle({ id }: { id?: string }) {
  return (
    <Handle
      type="target"
      position={Position.Left}
      id={id}
      className="size-3! border-2! border-[color:var(--glass-bg-base)]! bg-[color:var(--text-muted)]!"
    />
  );
}

/** Handle source único (saída linear à direita). */
export function SourceHandle({ color }: { color: string }) {
  return (
    <Handle
      type="source"
      position={Position.Right}
      className="size-3.5! border-2! border-[color:var(--glass-bg-base)]!"
      style={{ backgroundColor: color }}
    />
  );
}
