"use client";

import { useCallback, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import {
  ArrowRightLeft,
  Bot,
  BotMessageSquare,
  Briefcase,
  CalendarPlus,
  CheckCircle2,
  Clock,
  CornerDownRight,
  FileText,
  GitBranch,
  Globe,
  Image,
  Mail,
  MessageCircleQuestion,
  MessageSquare,
  MousePointerClick,
  Pause,
  Pencil,
  Plus,
  Repeat,
  Square,
  StopCircle,
  Tag,
  Timer,
  TrendingUp,
  UserPlus,
  Variable,
} from "lucide-react";
import type { ComponentType } from "react";

import { cn } from "@/lib/utils";
import type { ActionStepType } from "@/lib/automation-workflow";

import { StepPickerModal } from "./step-picker-modal";

export const stepIcon: Record<string, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  send_email: Mail,
  move_stage: ArrowRightLeft,
  assign_owner: UserPlus,
  add_tag: Tag,
  remove_tag: Tag,
  update_field: Pencil,
  create_activity: CalendarPlus,
  send_whatsapp_message: MessageSquare,
  send_whatsapp_template: FileText,
  send_whatsapp_media: Image,
  send_whatsapp_interactive: MousePointerClick,
  webhook: Globe,
  delay: Clock,
  condition: GitBranch,
  update_lead_score: TrendingUp,
  question: MessageCircleQuestion,
  wait_for_reply: Pause,
  set_variable: Variable,
  goto: CornerDownRight,
  transfer_automation: Repeat,
  stop_automation: StopCircle,
  finish: Square,
  create_deal: Briefcase,
  finish_conversation: CheckCircle2,
  business_hours: Timer,
  ask_ai_agent: Bot,
  transfer_to_ai_agent: BotMessageSquare,
};

// Descricao curta (1 linha) usada no modal "O que deseja automatizar?"
// Mantida em pt-BR direta, sem jargao.
export const stepDescription: Record<string, string> = {
  send_email: "Envia um e-mail para o contato.",
  move_stage: "Move o negocio para outra etapa do funil.",
  assign_owner: "Atribui um responsavel ao contato/negocio.",
  add_tag: "Adiciona uma tag ao contato.",
  remove_tag: "Remove uma tag do contato.",
  update_field: "Atualiza um campo personalizado.",
  create_activity: "Cria uma tarefa, ligacao ou reuniao.",
  send_whatsapp_message: "Envia uma mensagem de texto pelo WhatsApp.",
  send_whatsapp_template: "Envia um template aprovado pelo WhatsApp.",
  send_whatsapp_media: "Envia imagem, video ou documento.",
  send_whatsapp_interactive: "Envia botoes interativos para o contato escolher.",
  webhook: "Dispara uma chamada HTTP para um sistema externo.",
  delay: "Aguarda um intervalo de tempo antes do proximo passo.",
  condition: "Define uma regra com saidas Sim/Nao.",
  update_lead_score: "Soma ou subtrai pontos no lead score.",
  question: "Faz uma pergunta com opcoes de resposta.",
  wait_for_reply: "Aguarda o contato responder antes de seguir.",
  set_variable: "Cria ou atualiza uma variavel do fluxo.",
  goto: "Salta para outro passo do fluxo.",
  transfer_automation: "Transfere o contato para outra automacao.",
  stop_automation: "Encerra a execucao da automacao.",
  finish: "Encerra a automação neste ponto — nenhum passo posterior será executado.",
  create_deal: "Cria um novo negocio para o contato.",
  finish_conversation: "Marca a conversa como resolvida.",
  business_hours: "Decide com base no horario de atendimento.",
  ask_ai_agent: "Consulta um agente de IA e salva a resposta em variavel.",
  transfer_to_ai_agent:
    "Transfere o atendimento pra um agente IA, que assume a conversa automaticamente.",
};

export const stepColor: Record<string, string> = {
  send_email: "text-blue-600",
  move_stage: "text-indigo-500",
  assign_owner: "text-teal-500",
  add_tag: "text-emerald-500",
  remove_tag: "text-red-400",
  update_field: "text-amber-500",
  create_activity: "text-violet-500",
  send_whatsapp_message: "text-green-600",
  send_whatsapp_template: "text-green-500",
  send_whatsapp_media: "text-green-500",
  send_whatsapp_interactive: "text-violet-500",
  webhook: "text-gray-500",
  delay: "text-orange-400",
  condition: "text-cyan-500",
  update_lead_score: "text-pink-500",
  question: "text-blue-500",
  wait_for_reply: "text-orange-500",
  set_variable: "text-fuchsia-500",
  goto: "text-sky-500",
  transfer_automation: "text-indigo-500",
  stop_automation: "text-rose-500",
  finish: "text-red-500",
  create_deal: "text-emerald-600",
  finish_conversation: "text-green-500",
  business_hours: "text-amber-600",
  ask_ai_agent: "text-violet-500",
  transfer_to_ai_agent: "text-violet-600",
};

export type StepGroup = { title: string; items: ActionStepType[] };

export const STEP_GROUPS: StepGroup[] = [
  {
    title: "Mensagens",
    items: [
      "send_whatsapp_message",
      "send_whatsapp_template",
      "send_whatsapp_media",
      "send_whatsapp_interactive",
      "send_email",
    ],
  },
  {
    title: "Salesbot",
    items: ["question", "wait_for_reply", "set_variable", "goto", "transfer_automation", "finish"],
  },
  {
    title: "Ações",
    items: [
      "move_stage",
      "assign_owner",
      "add_tag",
      "remove_tag",
      "update_field",
      "create_activity",
      "update_lead_score",
      "create_deal",
      "finish_conversation",
    ],
  },
  {
    title: "Lógica",
    items: ["delay", "condition", "business_hours"],
  },
  {
    title: "Integrações",
    items: ["webhook"],
  },
  {
    title: "IA",
    items: ["transfer_to_ai_agent", "ask_ai_agent"],
  },
];

export type AddStepNodeData = {
  afterStepId: string | null;
  onSelectType: (stepType: ActionStepType, afterStepId: string | null) => void;
};

/**
 * AddStepNode — pilula "Adicionar proximo passo" que aparece no fim do
 * canvas. Ao clicar, abre o `StepPickerModal` central premium ("O que
 * deseja automatizar?") com search + grid 2-col de cards.
 *
 * Visual premium: brand outline + animacao `pulse-soft` (CSS puro) pra
 * chamar atencao sem ser cansativo.
 */
export function AddStepNode({ data }: NodeProps<AddStepNodeData>) {
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback(
    (type: ActionStepType) => {
      data.onSelectType(type, data.afterStepId);
      setOpen(false);
    },
    [data]
  );

  return (
    <div className="relative flex flex-col items-center">
      <Handle
        type="target"
        position={Position.Left}
        className="size-2! border-none! bg-transparent!"
      />

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          "flex items-center gap-2 rounded-full border-2 border-dashed px-4 py-2 text-[12px] font-bold tracking-tight transition-all duration-200",
          open
            ? "border-primary bg-[#eef4ff] text-primary shadow-[var(--shadow-indigo-glow)]"
            : "animate-pulse-soft border-primary/40 bg-white/80 text-slate-500 backdrop-blur-sm hover:-translate-y-px hover:border-primary hover:bg-[#eef4ff] hover:text-primary hover:shadow-[var(--shadow-indigo-glow)]"
        )}
      >
        <Plus className="size-3.5" strokeWidth={2.6} />
        <span>Adicionar próximo passo</span>
      </button>

      <StepPickerModal
        open={open}
        onClose={() => setOpen(false)}
        onSelect={handleSelect}
      />
    </div>
  );
}
