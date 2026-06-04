export type FlowNodeKind = "trigger" | "action" | "final" | "placeholder"

/** Ramo de saída de um nó (botão, opção de escolha, ramo de condição) */
export interface FlowOption {
  id: string
  label: string
  /** Tom do conector: neutro, sucesso (verde) ou falha (vermelho) */
  tone?: "default" | "success" | "danger"
}

export interface FlowNodeData {
  id: string
  kind: FlowNodeKind
  /** Chave do catálogo de blocos (ou "trigger"/"final") */
  blockType: string
  title: string
  subtitle?: string
  /** Linha extra (ex.: "Pipeline: Atendimento") */
  meta?: string
  /** Balão de mensagem exibido no corpo do card (estilo chatbot) */
  body?: string
  /** Saídas ramificadas — cada uma tem seu próprio conector (1→N) */
  options?: FlowOption[]
  /** Contador de execuções exibido no badge */
  count?: number
  x: number
  y: number
}

/** Conexão entre nós. `sourceHandle` aponta para uma saída específica (opção) */
export interface FlowEdgeData {
  id: string
  source: string
  target: string
  sourceHandle?: string
  tone?: "default" | "success" | "danger"
}

export interface BlockDef {
  type: string
  label: string
}

/* Catálogo da paleta lateral */
export const actionBlocks: BlockDef[] = [
  { type: "send-email", label: "Enviar e-mail" },
  { type: "move-stage", label: "Mover estágio" },
  { type: "assign", label: "Atribuir responsável" },
  { type: "add-tag", label: "Adicionar tag" },
  { type: "remove-tag", label: "Remover tag" },
  { type: "update-field", label: "Atualizar campo" },
  { type: "create-activity", label: "Criar atividade" },
  { type: "lead-score", label: "Atualizar lead score" },
]

export const salesbotBlocks: BlockDef[] = [
  { type: "ask-lead", label: "Pergunta ao lead" },
  { type: "ai-agent", label: "Transferir para agente IA" },
  { type: "end-conversation", label: "Encerrar conversa" },
]

interface Flow {
  nodes: FlowNodeData[]
  edges: FlowEdgeData[]
}

/* ---------- Fluxos por automação (canvas livre, com ramificações) ---------- */

const flowsByAutomation: Record<string, Flow> = {
  "auto-1": {
    nodes: [
      {
        id: "n-trigger",
        kind: "trigger",
        blockType: "trigger",
        title: "Negócio criado",
        meta: "Pipeline: Atendimento",
        count: 302,
        x: 40,
        y: 220,
      },
      {
        id: "n-ask",
        kind: "action",
        blockType: "ask-lead",
        title: "Pergunta ao lead",
        body: "Como podemos te ajudar hoje?",
        options: [
          { id: "o-suporte", label: "Suporte técnico" },
          { id: "o-comercial", label: "Falar com vendas" },
          { id: "o-outro", label: "Outro assunto" },
        ],
        count: 290,
        x: 380,
        y: 180,
      },
      {
        id: "n-ai",
        kind: "action",
        blockType: "ai-agent",
        title: "Transferir para agente IA",
        subtitle: "→ Júlia",
        count: 151,
        x: 760,
        y: 60,
      },
      {
        id: "n-assign",
        kind: "action",
        blockType: "assign",
        title: "Atribuir responsável",
        subtitle: "→ Equipe comercial",
        count: 78,
        x: 760,
        y: 220,
      },
      {
        id: "n-end",
        kind: "action",
        blockType: "end-conversation",
        title: "Encerrar conversa",
        subtitle: "Marcar como resolvida",
        count: 61,
        x: 760,
        y: 360,
      },
      { id: "n-final", kind: "final", blockType: "final", title: "Finalizar fluxo", x: 1120, y: 220 },
    ],
    edges: [
      { id: "e1", source: "n-trigger", target: "n-ask" },
      { id: "e2", source: "n-ask", sourceHandle: "o-suporte", target: "n-ai" },
      { id: "e3", source: "n-ask", sourceHandle: "o-comercial", target: "n-assign" },
      { id: "e4", source: "n-ask", sourceHandle: "o-outro", target: "n-end" },
      { id: "e5", source: "n-ai", target: "n-final" },
      { id: "e6", source: "n-assign", target: "n-final" },
      { id: "e7", source: "n-end", target: "n-final" },
    ],
  },

  "auto-2": {
    nodes: [
      {
        id: "n-trigger",
        kind: "trigger",
        blockType: "trigger",
        title: "Mensagem recebida",
        meta: "Canal: WhatsApp",
        count: 412,
        x: 40,
        y: 200,
      },
      {
        id: "n-cond",
        kind: "action",
        blockType: "condition",
        title: "Horário de atendimento?",
        options: [
          { id: "o-sim", label: "Dentro do horário", tone: "success" },
          { id: "o-nao", label: "Fora do horário", tone: "danger" },
        ],
        count: 412,
        x: 380,
        y: 200,
      },
      {
        id: "n-ai",
        kind: "action",
        blockType: "ai-agent",
        title: "Transferir para agente IA",
        subtitle: "→ Júlia",
        count: 209,
        x: 760,
        y: 90,
      },
      {
        id: "n-msg",
        kind: "action",
        blockType: "wa-message",
        title: "Mensagem WhatsApp",
        body: "Estamos fora do horário. Retornamos às 8h.",
        count: 203,
        x: 760,
        y: 290,
      },
      { id: "n-final", kind: "final", blockType: "final", title: "Finalizar fluxo", x: 1120, y: 200 },
    ],
    edges: [
      { id: "e1", source: "n-trigger", target: "n-cond" },
      { id: "e2", source: "n-cond", sourceHandle: "o-sim", target: "n-ai", tone: "success" },
      { id: "e3", source: "n-cond", sourceHandle: "o-nao", target: "n-msg", tone: "danger" },
      { id: "e4", source: "n-ai", target: "n-final" },
      { id: "e5", source: "n-msg", target: "n-final" },
    ],
  },

  "auto-3": {
    nodes: [
      {
        id: "n-trigger",
        kind: "trigger",
        blockType: "trigger",
        title: "Tag adicionada",
        meta: "Tag: novo-cliente",
        count: 188,
        x: 40,
        y: 220,
      },
      {
        id: "n-email",
        kind: "action",
        blockType: "send-email",
        title: "Enviar e-mail",
        subtitle: "Modelo: Boas-vindas",
        count: 188,
        x: 380,
        y: 220,
      },
      {
        id: "n-cond",
        kind: "action",
        blockType: "condition",
        title: "Abriu o e-mail?",
        options: [
          { id: "o-sim", label: "Abriu", tone: "success" },
          { id: "o-nao", label: "Não abriu", tone: "danger" },
        ],
        count: 181,
        x: 720,
        y: 220,
      },
      {
        id: "n-activity",
        kind: "action",
        blockType: "create-activity",
        title: "Criar atividade",
        subtitle: "Ligar em 24h",
        count: 96,
        x: 1080,
        y: 110,
      },
      {
        id: "n-tag",
        kind: "action",
        blockType: "add-tag",
        title: "Adicionar tag",
        subtitle: "reengajar",
        count: 85,
        x: 1080,
        y: 330,
      },
      { id: "n-final", kind: "final", blockType: "final", title: "Finalizar fluxo", x: 1440, y: 220 },
    ],
    edges: [
      { id: "e1", source: "n-trigger", target: "n-email" },
      { id: "e2", source: "n-email", target: "n-cond" },
      { id: "e3", source: "n-cond", sourceHandle: "o-sim", target: "n-activity", tone: "success" },
      { id: "e4", source: "n-cond", sourceHandle: "o-nao", target: "n-tag", tone: "danger" },
      { id: "e5", source: "n-activity", target: "n-final" },
      { id: "e6", source: "n-tag", target: "n-final" },
    ],
  },

  "auto-4": {
    nodes: [
      {
        id: "n-trigger",
        kind: "trigger",
        blockType: "trigger",
        title: "Etapa alterada",
        meta: "Para: Proposta enviada",
        count: 96,
        x: 40,
        y: 200,
      },
      {
        id: "n-activity",
        kind: "action",
        blockType: "create-activity",
        title: "Criar atividade",
        subtitle: "Follow-up em 2 dias",
        count: 96,
        x: 380,
        y: 200,
      },
      {
        id: "n-assign",
        kind: "action",
        blockType: "assign",
        title: "Atribuir responsável",
        subtitle: "→ Rafael",
        count: 92,
        x: 720,
        y: 200,
      },
      {
        id: "n-score",
        kind: "action",
        blockType: "lead-score",
        title: "Atualizar lead score",
        subtitle: "+15 pontos",
        count: 90,
        x: 1060,
        y: 200,
      },
      { id: "n-final", kind: "final", blockType: "final", title: "Finalizar fluxo", x: 1400, y: 200 },
    ],
    edges: [
      { id: "e1", source: "n-trigger", target: "n-activity" },
      { id: "e2", source: "n-activity", target: "n-assign" },
      { id: "e3", source: "n-assign", target: "n-score" },
      { id: "e4", source: "n-score", target: "n-final" },
    ],
  },

  "auto-5": {
    nodes: [
      {
        id: "n-trigger",
        kind: "trigger",
        blockType: "trigger",
        title: "Negócio ganho",
        meta: "Pipeline: Vendas",
        count: 54,
        x: 40,
        y: 200,
      },
      {
        id: "n-activity",
        kind: "action",
        blockType: "create-activity",
        title: "Criar atividade",
        subtitle: "Pós-venda em 7 dias",
        count: 54,
        x: 380,
        y: 200,
      },
      {
        id: "n-score",
        kind: "action",
        blockType: "lead-score",
        title: "Atualizar lead score",
        subtitle: "+30 pontos",
        count: 52,
        x: 720,
        y: 200,
      },
      { id: "n-final", kind: "final", blockType: "final", title: "Finalizar fluxo", x: 1060, y: 200 },
    ],
    edges: [
      { id: "e1", source: "n-trigger", target: "n-activity" },
      { id: "e2", source: "n-activity", target: "n-score" },
      { id: "e3", source: "n-score", target: "n-final" },
    ],
  },
}

export function getFlow(id: string): FlowNodeData[] {
  return (flowsByAutomation[id] ?? flowsByAutomation["auto-1"]).nodes
}

export function getFlowEdges(id: string): FlowEdgeData[] {
  return (flowsByAutomation[id] ?? flowsByAutomation["auto-1"]).edges
}

/** Largura padrão do nó no canvas */
export const NODE_WIDTH = 256
