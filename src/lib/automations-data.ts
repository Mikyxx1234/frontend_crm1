export type AutomationTrigger =
  | "Negócio criado"
  | "Mensagem recebida"
  | "Etapa alterada"
  | "Tag adicionada"
  | "Negócio ganho"
  | "Negócio perdido"

export interface Automation {
  id: string
  name: string
  description: string
  trigger: AutomationTrigger
  steps: number
  updatedAt: string
  active: boolean
  /** Total de execuções acumuladas */
  runs: number
  /** Execuções nas últimas 24h */
  runsToday: number
  /** Taxa de sucesso (0–100) */
  successRate: number
  /** Última execução (texto relativo) */
  lastRun: string
  /** Chave do gradiente de avatar usada como acento do card */
  accent: "blue" | "purple" | "mint" | "coral" | "teal"
}

export function getAutomation(id: string): Automation | undefined {
  return automations.find((a) => a.id === id)
}

export const automations: Automation[] = [
  {
    id: "auto-1",
    name: "redireciona2310",
    description: "Distribui novos negócios do pipeline de Atendimento para o agente de IA.",
    trigger: "Negócio criado",
    steps: 3,
    updatedAt: "22/04/2026, 11:59",
    active: true,
    runs: 302,
    runsToday: 28,
    successRate: 97,
    lastRun: "há 4 min",
    accent: "blue",
  },
  {
    id: "auto-2",
    name: "Agente IA",
    description: "Responde mensagens recebidas no WhatsApp e qualifica o lead automaticamente.",
    trigger: "Mensagem recebida",
    steps: 2,
    updatedAt: "22/04/2026, 06:54",
    active: true,
    runs: 412,
    runsToday: 64,
    successRate: 99,
    lastRun: "há 1 min",
    accent: "purple",
  },
  {
    id: "auto-3",
    name: "Boas-vindas WhatsApp",
    description: "Dispara uma sequência de boas-vindas quando a tag de novo cliente é adicionada.",
    trigger: "Tag adicionada",
    steps: 4,
    updatedAt: "20/04/2026, 09:12",
    active: false,
    runs: 188,
    runsToday: 0,
    successRate: 94,
    lastRun: "há 2 dias",
    accent: "mint",
  },
  {
    id: "auto-4",
    name: "Follow-up proposta",
    description: "Cria atividades de follow-up e move o negócio quando a etapa é alterada.",
    trigger: "Etapa alterada",
    steps: 5,
    updatedAt: "18/04/2026, 15:30",
    active: true,
    runs: 96,
    runsToday: 7,
    successRate: 91,
    lastRun: "há 26 min",
    accent: "teal",
  },
  {
    id: "auto-5",
    name: "Pós-venda automático",
    description: "Agenda contato de pós-venda e atualiza o lead score ao ganhar o negócio.",
    trigger: "Negócio ganho",
    steps: 3,
    updatedAt: "15/04/2026, 08:45",
    active: false,
    runs: 54,
    runsToday: 0,
    successRate: 88,
    lastRun: "há 6 dias",
    accent: "coral",
  },
]
