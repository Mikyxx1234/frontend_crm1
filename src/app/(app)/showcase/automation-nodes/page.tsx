"use client";

import { useMemo } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";

import { ActionNode } from "@/components/automations/action-node";
import {
  AnimatedEdge,
  AnimatedEdgeDefs,
} from "@/components/automations/animated-edge";
import { ConditionNode } from "@/components/automations/condition-node";
import { DelayNode } from "@/components/automations/delay-node";
import { FinishNode } from "@/components/automations/finish-node";
import { InteractiveNode } from "@/components/automations/interactive-node";
import { TriggerNode } from "@/components/automations/trigger-node";

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  interactive: InteractiveNode,
  condition: ConditionNode,
  delay: DelayNode,
  finish: FinishNode,
};

const edgeTypes = { animated: AnimatedEdge };

/* ────────────────────────────────────────────────────────────────────
   As 5 variações visuais de nó, demonstradas com os componentes reais
   do editor (conectados ao backend em produção). Aqui usamos dados de
   exemplo só pra referência visual no DS v2.
   ──────────────────────────────────────────────────────────────────── */

const VARIATIONS = [
  {
    n: "1",
    title: "Header sólido por categoria",
    note: "Ação linear. Cor do header e do ícone seguem a categoria do passo (ação, lógica, salesbot…).",
  },
  {
    n: "2",
    title: "Header em gradiente",
    note: "Marcos do fluxo — Gatilho (entrada) e Final (saída). Gradiente brand/vermelho + halo.",
  },
  {
    n: "3",
    title: "Balão de mensagem",
    note: "Passos de mensagem exibem o conteúdo num balão estilo chat no corpo do nó.",
  },
  {
    n: "4",
    title: "Pílulas de saída",
    note: "Bifurcações: cada saída (botão, ramo, timeout) é uma pílula com handle dedicado à direita.",
  },
  {
    n: "5",
    title: "Compacto",
    note: "Passos utilitários (atraso, variável, goto) — apenas ícone + título, saída única.",
  },
];

function buildNodes(): Node[] {
  return [
    // 2 — gradiente (trigger)
    {
      id: "trigger",
      type: "trigger",
      position: { x: 0, y: 40 },
      data: {
        label: "Lead entrou no funil",
        summary: "Quando um novo lead chega via WhatsApp.",
      },
    },
    // 1 — header sólido por categoria (ação)
    {
      id: "action",
      type: "action",
      position: { x: 340, y: 0 },
      data: {
        stepType: "move_stage",
        label: "Mover para Qualificação",
        summary: "Avança o negócio para a etapa Qualificação.",
        stepIndex: 1,
      },
    },
    // 3 — balão de mensagem
    {
      id: "message",
      type: "action",
      position: { x: 340, y: 150 },
      data: {
        stepType: "send_whatsapp_message",
        label: "Mensagem de boas-vindas",
        summary: "Olá! 👋 Que bom ter você por aqui. Posso te ajudar a encontrar o plano ideal?",
        stepIndex: 2,
      },
    },
    // 4 — pílulas de saída (interactive)
    {
      id: "interactive",
      type: "interactive",
      position: { x: 720, y: 0 },
      data: {
        stepType: "send_whatsapp_interactive",
        label: "Qual seu interesse?",
        summary: "Escolha uma das opções abaixo:",
        stepIndex: 3,
        buttons: [
          { id: "b0", title: "Quero comprar" },
          { id: "b1", title: "Tenho dúvidas" },
        ],
        hasElse: true,
        hasTimeout: true,
      },
    },
    // 4 — pílulas de saída (condition)
    {
      id: "condition",
      type: "condition",
      position: { x: 720, y: 300 },
      data: {
        label: "Faixa de orçamento",
        branches: [
          { id: "c0", label: "Premium", rules: [{ field: "orçamento", op: "gte", value: "5000" }] },
          { id: "c1", label: "Padrão", rules: [{ field: "orçamento", op: "lt", value: "5000" }] },
        ],
      },
    },
    // 5 — compacto (delay)
    {
      id: "delay",
      type: "delay",
      position: { x: 1100, y: 60 },
      data: { label: "Aguardar 1 dia", summary: "Pausa de 24h antes do follow-up.", stepIndex: 4 },
    },
    // 2 — gradiente (finish)
    {
      id: "finish",
      type: "finish",
      position: { x: 1100, y: 200 },
      data: { label: "Encerrar fluxo", summary: "Nenhum passo posterior será executado." },
    },
  ];
}

function buildEdges(): Edge[] {
  const base = { type: "animated" as const };
  return [
    { ...base, id: "e1", source: "trigger", target: "action", data: { variant: "default", energized: true } },
    { ...base, id: "e2", source: "trigger", target: "message", data: { variant: "default", energized: true } },
    { ...base, id: "e3", source: "action", target: "interactive", data: { variant: "default" } },
    { ...base, id: "e4", source: "interactive", sourceHandle: "btn_0", target: "delay", data: { variant: "button", energized: true } },
    { ...base, id: "e5", source: "interactive", sourceHandle: "else", target: "condition", data: { variant: "else" } },
    { ...base, id: "e6", source: "interactive", sourceHandle: "timeout", target: "finish", data: { variant: "timeout" } },
    { ...base, id: "e7", source: "delay", target: "finish", data: { variant: "default" } },
  ];
}

function NodesCanvas() {
  const nodes = useMemo(buildNodes, []);
  const edges = useMemo(buildEdges, []);

  return (
    <div className="h-[560px] w-full overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] shadow-[var(--glass-shadow)]">
      <AnimatedEdgeDefs />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        panOnScroll
        minZoom={0.4}
        maxZoom={1.2}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="rgba(91,111,245,0.18)" />
      </ReactFlow>
    </div>
  );
}

export default function AutomationNodesShowcase() {
  return (
    <div
      className="min-h-screen p-10"
      style={{
        background:
          "linear-gradient(135deg, var(--color-bg-base) 0%, var(--color-bg-mesh-1) 40%, var(--color-bg-mesh-2) 70%, #dce8f5 100%)",
      }}
    >
      <div className="mx-auto max-w-7xl">
        {/* Cabeçalho */}
        <div className="mb-8">
          <p className="mb-1 font-display text-[10.5px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
            DS v2 · Automação
          </p>
          <h1 className="font-display text-[24px] font-bold text-[var(--text-primary)]">
            Nós do construtor de fluxo
          </h1>
          <p className="mt-1 max-w-2xl font-body text-[13px] text-[var(--text-secondary)]">
            Os mesmos componentes usados no editor real (
            <span className="font-mono text-[12px]">/automations/[id]</span>), reestilizados no DS v2.
            As 5 variações de tratamento visual estão demonstradas no canvas ao vivo abaixo.
          </p>
        </div>

        {/* Legenda das 5 variações */}
        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {VARIATIONS.map((v) => (
            <div
              key={v.n}
              className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-3.5 shadow-[var(--glass-shadow-sm)]"
            >
              <div className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-[var(--brand-primary)] font-display text-[10px] font-bold text-white">
                  {v.n}
                </span>
                <span className="font-display text-[12px] font-bold tracking-tight text-[var(--text-primary)]">
                  {v.title}
                </span>
              </div>
              <p className="font-body text-[11px] leading-relaxed text-[var(--text-muted)]">{v.note}</p>
            </div>
          ))}
        </div>

        {/* Canvas ao vivo */}
        <ReactFlowProvider>
          <NodesCanvas />
        </ReactFlowProvider>

        <p className="mt-4 font-body text-[11.5px] text-[var(--text-muted)]">
          Canvas interativo (pan/zoom). As conexões com pulso animado indicam fluxo ativo — opt-in via{" "}
          <span className="font-mono text-[11px]">data.energized</span>.
        </p>
      </div>
    </div>
  );
}
