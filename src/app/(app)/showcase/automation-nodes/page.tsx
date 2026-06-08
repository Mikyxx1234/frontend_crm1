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
import { BusinessHoursNode } from "@/components/automations/business-hours-node";
import { ConditionNode } from "@/components/automations/condition-node";
import { DelayNode } from "@/components/automations/delay-node";
import { DistributionNode } from "@/components/automations/distribution-node";
import { FinishNode } from "@/components/automations/finish-node";
import { GotoNode } from "@/components/automations/goto-node";
import { InteractiveNode } from "@/components/automations/interactive-node";
import { TriggerNode } from "@/components/automations/trigger-node";
import { VariableNode } from "@/components/automations/variable-node";
import { WaitNode } from "@/components/automations/wait-node";

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  businessHours: BusinessHoursNode,
  delay: DelayNode,
  interactive: InteractiveNode,
  wait: WaitNode,
  variable: VariableNode,
  distribution: DistributionNode,
  goto: GotoNode,
  finish: FinishNode,
};

const edgeTypes = { animated: AnimatedEdge };

/* edge helper -------------------------------------------------------- */
type V = "default" | "button" | "else" | "timeout" | "error";
function edge(
  id: string,
  source: string,
  target: string,
  opts?: { handle?: string; variant?: V; energized?: boolean }
): Edge {
  return {
    id,
    source,
    target,
    type: "animated",
    sourceHandle: opts?.handle,
    data: { variant: opts?.variant ?? "default", energized: opts?.energized },
  };
}

/* ───────────────────────────────────────────────────────────────────
   SEÇÃO A — 5 estilos visuais de nó (um canvas)
   ─────────────────────────────────────────────────────────────────── */

const NODE_VARIATIONS = [
  { n: "1", title: "Header sólido por categoria", note: "Ação linear. Cor do header/ícone segue a categoria do passo." },
  { n: "2", title: "Header em gradiente", note: "Marcos do fluxo — Gatilho (entrada) e Final (saída) com halo." },
  { n: "3", title: "Balão de mensagem", note: "Passos de mensagem exibem o conteúdo num balão estilo chat." },
  { n: "4", title: "Pílulas de saída", note: "Cada saída (botão, ramo, timeout) é uma pílula com handle dedicado." },
  { n: "5", title: "Compacto", note: "Passos utilitários (atraso, variável, goto) — só ícone + título." },
];

function styleNodes(): Node[] {
  return [
    { id: "trigger", type: "trigger", position: { x: 0, y: 60 }, data: { label: "Lead entrou no funil", summary: "Novo lead via WhatsApp." } },
    { id: "action", type: "action", position: { x: 340, y: 0 }, data: { stepType: "move_stage", label: "Mover para Qualificação", summary: "Avança o negócio.", stepIndex: 1 } },
    { id: "message", type: "action", position: { x: 340, y: 150 }, data: { stepType: "send_whatsapp_message", label: "Boas-vindas", summary: "Olá! Que bom ter você por aqui. Posso ajudar a achar o plano ideal?", stepIndex: 2, hasErrorBranch: true, errorLabel: "Falha ao enviar a mensagem" } },
    { id: "interactive", type: "interactive", position: { x: 720, y: 0 }, data: { stepType: "send_whatsapp_interactive", label: "Qual seu interesse?", summary: "Escolha uma opção:", stepIndex: 3, buttons: [{ id: "b0", title: "Comprar" }, { id: "b1", title: "Dúvidas" }], hasElse: true, hasTimeout: true } },
    { id: "fallback", type: "action", position: { x: 720, y: 230 }, data: { stepType: "create_activity", label: "Notificar equipe", summary: "Registrar falha de envio para acompanhamento.", stepIndex: 9 } },
    { id: "delay", type: "delay", position: { x: 1100, y: 70 }, data: { label: "Aguardar 1 dia", summary: "Pausa de 24h.", stepIndex: 4 } },
    { id: "finish", type: "finish", position: { x: 1100, y: 210 }, data: { label: "Encerrar fluxo", summary: "Nenhum passo posterior." } },
  ];
}
function styleEdges(): Edge[] {
  return [
    edge("s1", "trigger", "action", { energized: true }),
    edge("s2", "trigger", "message", { energized: true }),
    edge("s3", "action", "interactive"),
    edge("s3b", "message", "fallback", { handle: "error", variant: "error" }),
    edge("s4", "interactive", "delay", { handle: "btn_0", variant: "button", energized: true }),
    edge("s5", "interactive", "finish", { handle: "timeout", variant: "timeout" }),
    edge("s6", "delay", "finish"),
  ];
}

/* ───────────────────────────────────────────────────────────────────
   SEÇÃO B — 5 cenários de fluxo (valida as "pernas")
   ─────────────────────────────────────────────────────────────────── */

/* Cenário 1 — Linear (saída única + balão) */
function flow1(): { nodes: Node[]; edges: Edge[] } {
  return {
    nodes: [
      { id: "t", type: "trigger", position: { x: 0, y: 40 }, data: { label: "Negócio criado", summary: "Disparado quando um novo negócio entra no funil." } },
      { id: "m", type: "action", position: { x: 320, y: 30 }, data: { stepType: "send_whatsapp_message", label: "Mensagem de boas-vindas", summary: "Oi {{deal.contact}}! Recebemos seu interesse e já vamos te ajudar.", stepIndex: 1 } },
      { id: "tag", type: "action", position: { x: 660, y: 40 }, data: { stepType: "add_tag", label: "Adicionar tag", summary: "Tag “novo-lead”.", stepIndex: 2 } },
      { id: "w", type: "delay", position: { x: 980, y: 50 }, data: { label: "Aguardar 2 horas", summary: "Espera antes do follow-up.", stepIndex: 3 } },
      { id: "f", type: "finish", position: { x: 1240, y: 40 }, data: { label: "Encerrar", summary: "Fim do fluxo." } },
    ],
    edges: [
      edge("a1", "t", "m", { energized: true }),
      edge("a2", "m", "tag"),
      edge("a3", "tag", "w"),
      edge("a4", "w", "f"),
    ],
  };
}

/* Cenário 2 — Condição multi-branch + else */
function flow2(): { nodes: Node[]; edges: Edge[] } {
  return {
    nodes: [
      { id: "t", type: "trigger", position: { x: 0, y: 120 }, data: { label: "Lead respondeu", summary: "Quando o lead envia uma mensagem." } },
      {
        id: "c", type: "condition", position: { x: 320, y: 60 },
        data: {
          label: "Faixa de orçamento",
          branches: [
            { id: "premium", label: "Premium", rules: [{ field: "orçamento", op: "gte", value: "5000" }] },
            { id: "padrao", label: "Padrão", rules: [{ field: "orçamento", op: "lt", value: "5000" }] },
          ],
        },
      },
      { id: "a1", type: "action", position: { x: 720, y: 0 }, data: { stepType: "assign_user", label: "Atribuir closer sênior", summary: "Roteia para o time premium.", stepIndex: 2 } },
      { id: "a2", type: "action", position: { x: 720, y: 150 }, data: { stepType: "move_stage", label: "Mover para Nutrição", summary: "Entra na régua padrão.", stepIndex: 3 } },
      { id: "a3", type: "action", position: { x: 720, y: 300 }, data: { stepType: "create_activity", label: "Criar tarefa de revisão", summary: "Sem orçamento informado.", stepIndex: 4 } },
      { id: "f", type: "finish", position: { x: 1080, y: 150 }, data: { label: "Encerrar", summary: "Fim do fluxo." } },
    ],
    edges: [
      edge("b0", "t", "c", { energized: true }),
      edge("b1", "c", "a1", { handle: "branch:premium", energized: true }),
      edge("b2", "c", "a2", { handle: "branch:padrao" }),
      edge("b3", "c", "a3", { handle: "else", variant: "else" }),
      edge("b4", "a1", "f"),
      edge("b5", "a2", "f"),
      edge("b6", "a3", "f"),
    ],
  };
}

/* Cenário 3 — Salesbot interativo (botões + else + timeout) */
function flow3(): { nodes: Node[]; edges: Edge[] } {
  return {
    nodes: [
      { id: "t", type: "trigger", position: { x: 0, y: 140 }, data: { label: "Conversa iniciada", summary: "Cliente mandou a primeira mensagem." } },
      {
        id: "q", type: "interactive", position: { x: 320, y: 70 },
        data: {
          stepType: "send_whatsapp_interactive", label: "Como podemos ajudar?", summary: "Selecione uma das opções 👇",
          stepIndex: 1,
          buttons: [{ id: "b0", title: "Falar com vendas" }, { id: "b1", title: "Suporte técnico" }, { id: "b2", title: "2ª via de boleto" }],
          hasElse: true, hasTimeout: true,
        },
      },
      { id: "v", type: "action", position: { x: 760, y: -40 }, data: { stepType: "assign_user", label: "Encaminhar p/ Vendas", summary: "Distribui ao time comercial.", stepIndex: 2 } },
      { id: "s", type: "action", position: { x: 760, y: 90 }, data: { stepType: "create_activity", label: "Abrir ticket de suporte", summary: "Cria atividade técnica.", stepIndex: 3 } },
      { id: "b", type: "action", position: { x: 760, y: 220 }, data: { stepType: "send_whatsapp_message", label: "Enviar boleto", summary: "Aqui está sua 2ª via 🧾", stepIndex: 4 } },
      { id: "fb", type: "action", position: { x: 760, y: 350 }, data: { stepType: "send_whatsapp_message", label: "Resposta livre", summary: "Não entendi 🤔 Pode reformular?", stepIndex: 5 } },
      { id: "to", type: "goto", position: { x: 760, y: 470 }, data: { label: "Retomar topo", summary: "Sem resposta no tempo — volta ao menu.", stepIndex: 6 } },
    ],
    edges: [
      edge("c0", "t", "q", { energized: true }),
      edge("c1", "q", "v", { handle: "btn_0", variant: "button", energized: true }),
      edge("c2", "q", "s", { handle: "btn_1", variant: "button" }),
      edge("c3", "q", "b", { handle: "btn_2", variant: "button" }),
      edge("c4", "q", "fb", { handle: "else", variant: "else" }),
      edge("c5", "q", "to", { handle: "timeout", variant: "timeout" }),
    ],
  };
}

/* Cenário 4 — Espera por resposta (received / timeout) */
function flow4(): { nodes: Node[]; edges: Edge[] } {
  return {
    nodes: [
      { id: "t", type: "trigger", position: { x: 0, y: 100 }, data: { label: "Proposta enviada", summary: "Após enviar a proposta comercial." } },
      { id: "m", type: "action", position: { x: 300, y: 90 }, data: { stepType: "send_whatsapp_message", label: "Pedir confirmação", summary: "Conseguiu ver a proposta? Posso tirar alguma dúvida?", stepIndex: 1 } },
      { id: "w", type: "wait", position: { x: 640, y: 60 }, data: { label: "Aguardar resposta", summary: "Espera o cliente responder.", timeoutLabel: "48h sem resposta", stepIndex: 2 } },
      { id: "won", type: "action", position: { x: 1010, y: -10 }, data: { stepType: "move_stage", label: "Mover para Negociação", summary: "Cliente respondeu — avança.", stepIndex: 3 } },
      { id: "rem", type: "action", position: { x: 1010, y: 150 }, data: { stepType: "send_whatsapp_message", label: "Lembrete automático", summary: "Passando pra saber se ainda tem interesse 🙂", stepIndex: 4 } },
      { id: "f", type: "finish", position: { x: 1340, y: 70 }, data: { label: "Encerrar", summary: "Fim do fluxo." } },
    ],
    edges: [
      edge("d0", "t", "m", { energized: true }),
      edge("d1", "m", "w"),
      edge("d2", "w", "won", { handle: "received", variant: "button", energized: true }),
      edge("d3", "w", "rem", { handle: "timeout", variant: "timeout" }),
      edge("d4", "won", "f"),
      edge("d5", "rem", "f"),
    ],
  };
}

/* Cenário 5 — Horário comercial + distribuição (true / false) */
function flow5(): { nodes: Node[]; edges: Edge[] } {
  return {
    nodes: [
      { id: "t", type: "trigger", position: { x: 0, y: 140 }, data: { label: "Lead inbound", summary: "Mensagem nova fora de um atendimento." } },
      { id: "bh", type: "businessHours", position: { x: 300, y: 120 }, data: { label: "Horário comercial?", summary: "Seg–Sex, 9h–18h", stepIndex: 1 } },
      { id: "dist", type: "distribution", position: { x: 660, y: 30 }, data: { label: "Distribuir atendimento", summary: "Round-robin entre agentes online.", stepIndex: 2 } },
      { id: "off", type: "action", position: { x: 660, y: 280 }, data: { stepType: "send_whatsapp_message", label: "Mensagem fora do horário", summary: "Estamos fora do expediente, retornamos amanhã às 9h ⏰", stepIndex: 3 } },
      { id: "ok", type: "action", position: { x: 1040, y: -30 }, data: { stepType: "create_activity", label: "Notificar agente", summary: "Atribuído com sucesso.", stepIndex: 4 } },
      { id: "queue", type: "action", position: { x: 1040, y: 120 }, data: { stepType: "add_tag", label: "Enfileirar lead", summary: "Sem agente disponível — tag “fila”.", stepIndex: 5 } },
      { id: "f", type: "finish", position: { x: 1040, y: 280 }, data: { label: "Encerrar", summary: "Fim do fluxo." } },
    ],
    edges: [
      edge("e0", "t", "bh", { energized: true }),
      edge("e1", "bh", "dist", { handle: "true", variant: "button", energized: true }),
      edge("e2", "bh", "off", { handle: "false", variant: "else" }),
      edge("e3", "dist", "ok", { handle: "true", variant: "button" }),
      edge("e4", "dist", "queue", { handle: "false", variant: "else" }),
      edge("e5", "off", "f"),
    ],
  };
}

const SCENARIOS = [
  { id: "f1", title: "Onboarding linear", legs: "Saída única + balão de mensagem", build: flow1, h: 300 },
  { id: "f2", title: "Roteamento por condição", legs: "2 ramos + “nenhuma das condições” (else)", build: flow2, h: 420 },
  { id: "f3", title: "Menu Salesbot interativo", legs: "3 botões + outra resposta + timeout", build: flow3, h: 600 },
  { id: "f4", title: "Espera por resposta", legs: "Recebida (verde) + cronômetro/timeout", build: flow4, h: 340 },
  { id: "f5", title: "Horário + distribuição", legs: "Horário (sim/não) + distribuição (distribuído/sem agente)", build: flow5, h: 440 },
];

/* ───────────────────────────────────────────────────────────────────
   Canvas reutilizável
   ─────────────────────────────────────────────────────────────────── */

function FlowPreview({
  nodes,
  edges,
  height,
}: {
  nodes: Node[];
  edges: Edge[];
  height: number;
}) {
  return (
    <div
      className="w-full overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] shadow-[var(--glass-shadow-sm)]"
      style={{ height }}
    >
      <ReactFlowProvider>
        <AnimatedEdgeDefs />
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.16 }}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnScroll={false}
          panOnScroll
          minZoom={0.3}
          maxZoom={1.2}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} color="rgba(91,111,245,0.16)" />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

function StyleSection() {
  const nodes = useMemo(styleNodes, []);
  const edges = useMemo(styleEdges, []);
  return <FlowPreview nodes={nodes} edges={edges} height={520} />;
}

function ScenarioCard({
  index,
  title,
  legs,
  build,
  h,
}: {
  index: number;
  title: string;
  legs: string;
  build: () => { nodes: Node[]; edges: Edge[] };
  h: number;
}) {
  const { nodes, edges } = useMemo(build, [build]);
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-4 shadow-[var(--glass-shadow-sm)]">
      <div className="mb-3 flex items-start gap-3">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] font-display text-[12px] font-bold text-white">
          {index}
        </span>
        <div>
          <h3 className="font-display text-[15px] font-bold tracking-tight text-[var(--text-primary)]">
            {title}
          </h3>
          <p className="font-body text-[12px] text-[var(--text-muted)]">
            Valida: <span className="text-[var(--text-secondary)]">{legs}</span>
          </p>
        </div>
      </div>
      <FlowPreview nodes={nodes} edges={edges} height={h} />
    </div>
  );
}

export default function AutomationNodesShowcase() {
  return (
    <div
      className="min-h-screen p-6 md:p-10"
      style={{
        background:
          "linear-gradient(135deg, var(--color-bg-base) 0%, var(--color-bg-mesh-1) 40%, var(--color-bg-mesh-2) 70%, #dce8f5 100%)",
      }}
    >
      <div className="mx-auto max-w-7xl">
        {/* Cabeçalho */}
        <div className="mb-8">
          <p className="mb-1 font-display text-[10.5px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
            DS v2 · Construtor de automações
          </p>
          <h1 className="font-display text-[26px] font-bold text-[var(--text-primary)]">
            Nós e fluxos de automação
          </h1>
          <p className="mt-1 max-w-2xl font-body text-[13px] leading-relaxed text-[var(--text-secondary)]">
            Os mesmos componentes do editor real (
            <span className="font-mono text-[12px]">/automations/[id]</span>), reestilizados no DS v2.
            Abaixo, primeiro os 5 tratamentos visuais de nó e, em seguida, 5 cenários de fluxo
            completos para validar todas as pernas/ramificações.
          </p>
        </div>

        {/* SEÇÃO A — estilos de nó */}
        <section className="mb-12">
          <h2 className="mb-3 font-display text-[16px] font-bold tracking-tight text-[var(--text-primary)]">
            A. 5 estilos de nó
          </h2>
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {NODE_VARIATIONS.map((v) => (
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
          <StyleSection />
        </section>

        {/* SEÇÃO B — cenários de fluxo */}
        <section>
          <h2 className="mb-1 font-display text-[16px] font-bold tracking-tight text-[var(--text-primary)]">
            B. 5 cenários de fluxo
          </h2>
          <p className="mb-5 font-body text-[12px] text-[var(--text-muted)]">
            Cada cenário exercita um tipo diferente de ramificação. As conexões com pulso indicam o
            “caminho feliz”.
          </p>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {SCENARIOS.map((s, i) => (
              <ScenarioCard
                key={s.id}
                index={i + 1}
                title={s.title}
                legs={s.legs}
                build={s.build}
                h={s.h}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
