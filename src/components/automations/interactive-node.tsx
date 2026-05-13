"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  MessageCircleQuestion,
  MousePointerClick,
  Trash2,
} from "lucide-react";

import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type InteractiveButton = {
  text?: string;
  title?: string;
  id?: string;
  gotoStepId?: string;
};

export type InteractiveNodeData = {
  stepType: string;
  label: string;
  summary: string;
  stepIndex?: number;
  /** Step sem body ou sem botões — sinaliza em âmbar. */
  incomplete?: boolean;
  buttons: InteractiveButton[];
  hasElse: boolean;
  hasTimeout: boolean;
  onDelete?: () => void;
  stats?: { success: number; failed: number; skipped: number };
  onStatsClick?: () => void;
};

function buttonLabel(btn: InteractiveButton, idx: number): string {
  return btn.title || btn.text || `Opção ${idx + 1}`;
}

/**
 * InteractiveNode — pergunta com botões cada um podendo ter destino
 * próprio (`btn_0`, `btn_1`, ...) + opcional `else` + `timeout`.
 * Cada linha de botão tem seu handle dedicado saindo lateralmente,
 * pra desenhar grafos não-lineares de conversação.
 *
 * Cor accent muda conforme `stepType`:
 *  - "question"                          → violet (família salesbot)
 *  - "send_whatsapp_interactive"         → violet (botões WhatsApp)
 */
export function InteractiveNode({ data, selected }: NodeProps<InteractiveNodeData>) {
  const buttons = data.buttons ?? [];
  const s = data.stats;
  const hasStats = s && (s.success > 0 || s.failed > 0);
  const isQuestion = data.stepType === "question";
  const Icon = isQuestion ? MessageCircleQuestion : MousePointerClick;

  // Ambos usam violet, mas mantemos a estrutura caso queiramos
  // distinguir no futuro (ex.: question = blue, interactive = violet).
  const accentBorder = "border-violet-400/60";
  const accentRing = "ring-violet-300/30";
  const accentShadow =
    "shadow-[0_10px_30px_-10px_rgba(139,92,246,0.4)] hover:shadow-[0_10px_30px_-10px_rgba(139,92,246,0.3)]";
  const iconBg = "bg-violet-50 text-violet-500 ring-violet-100";
  const handleColor = "bg-violet-500!";
  const buttonDot = "bg-violet-400";

  return (
    <div
      className={cn(
        "group/node relative min-w-[260px] max-w-[320px] rounded-2xl border bg-white transition-all duration-200",
        selected
          ? cn(accentBorder, "ring-2", accentRing, accentShadow.split(" ")[0])
          : cn(
              "border-slate-100 shadow-[0_4px_16px_-8px_rgba(13,27,62,0.08)] hover:-translate-y-px",
              `hover:${accentBorder}`,
              accentShadow.split(" ")[1]
            )
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

      {/* Header */}
      <div className="flex items-start gap-3 px-3.5 py-3">
        <span
          className={cn(
            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ring-1",
            iconBg
          )}
        >
          <Icon className="size-4" strokeWidth={2.4} />
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

      {/* Button rows — cada um com seu handle */}
      {buttons.length > 0 && (
        <div className="border-t border-slate-100 bg-linear-to-b from-slate-50/40 to-transparent">
          {buttons.map((btn, i) => (
            <div
              key={btn.id || i}
              className="relative flex h-8 items-center gap-2 border-b border-slate-100/80 px-3.5 last:border-b-0"
            >
              <span className={cn("size-1.5 shrink-0 rounded-full", buttonDot)} />
              <span className="flex-1 truncate text-[11px] font-bold tracking-tight text-slate-700">
                {buttonLabel(btn, i)}
              </span>
              <Handle
                type="source"
                position={Position.Right}
                id={`btn_${i}`}
                className={cn("size-3! border-2! border-white!", handleColor)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Else + Timeout rows — cada linha tem handle próprio à DIREITA
          (não mais Bottom) pra manter o padrão visual dos demais handles
          e permitir conectar facilmente ao próximo card à direita. */}
      {(data.hasElse || data.hasTimeout) && (
        <div className="border-t border-slate-100">
          {data.hasElse && (
            <div className="relative flex h-8 items-center gap-2 border-b border-slate-100/80 px-3.5 last:border-b-0">
              <HelpCircle className="size-3 shrink-0 text-amber-500" strokeWidth={2.4} />
              <span className="flex-1 truncate text-[11px] font-bold tracking-tight text-amber-700">
                Outra resposta
              </span>
              <Handle
                type="source"
                position={Position.Right}
                id="else"
                className="size-3! border-2! border-white! bg-amber-500!"
              />
            </div>
          )}
          {data.hasTimeout && (
            <div className="relative flex h-8 items-center gap-2 border-b border-slate-100/80 px-3.5 last:border-b-0">
              <Clock className="size-3 shrink-0 text-slate-400" strokeWidth={2.4} />
              <span className="flex-1 truncate text-[11px] font-medium tracking-tight text-slate-500">
                Sem resposta
              </span>
              <Handle
                type="source"
                position={Position.Right}
                id="timeout"
                className="size-3! border-2! border-white! bg-slate-400!"
              />
            </div>
          )}
        </div>
      )}

      {/* NOTE: não há "main flow handle" extra — cada botão/else/timeout
          tem seu próprio source handle na linha correspondente. Antes
          havia um Handle source sem id centralizado à direita, que
          aparecia sobreposto ao primeiro botão (bug "dois pontos"). */}

      {/* Stats */}
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
    </div>
  );
}
