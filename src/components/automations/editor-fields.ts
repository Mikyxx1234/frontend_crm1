/**
 * Esquema declarativo dos campos de edição inline por tipo de ação.
 * Espelha o painel real (`step-config-panel.tsx`) mas em formato de dados,
 * para o renderizador inline montar a UI sem 29 blocos JSX à mão.
 */
import type { Opt } from "./editor-data"

export type SourceKey =
  | "stage"
  | "owner"
  | "department"
  | "aiAgentId"
  | "aiAgentUserId"
  | "template"
  | "automation"

type Common = {
  key: string
  label: string
  placeholder?: string
  hint?: string
  optional?: boolean
}

export type EditorField =
  | (Common & { kind: "text" })
  | (Common & { kind: "media" })
  | (Common & { kind: "tag" })
  | (Common & { kind: "textarea" })
  | (Common & { kind: "number"; min?: number; step?: number; suffix?: string })
  | (Common & { kind: "select"; options: Opt[] })
  | (Common & { kind: "source"; source: SourceKey })
  | (Common & { kind: "step" })
  | (Common & { kind: "duration" })
  | (Common & { kind: "delay" })
  | (Common & { kind: "hours" })
  | { kind: "info"; text: string }
  | { kind: "updateField" }
  | { kind: "templatePreview" }
  /** Construtor visual completo do step webhook (URL, método, headers, body). */
  | { kind: "webhookConfig" }
  | { kind: "builder"; key: string; builder: "buttons" | "buttonsTitle" | "condition" | "schedule" | "headers" }

const ACTIVITY_TYPES: Opt[] = [
  { value: "TASK", label: "Tarefa" },
  { value: "CALL", label: "Ligação" },
  { value: "MEETING", label: "Reunião" },
  { value: "EMAIL", label: "E-mail" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "NOTE", label: "Nota" },
  { value: "OTHER", label: "Outro" },
]
const MEDIA_TYPES: Opt[] = [
  { value: "image", label: "Imagem" },
  { value: "video", label: "Vídeo" },
  { value: "audio", label: "Áudio" },
  { value: "document", label: "Documento" },
]
const HTTP_METHODS: Opt[] = ["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => ({ value: m, label: m }))
const TARGET_OPTS: Opt[] = [
  { value: "deal", label: "Negócio" },
  { value: "contact", label: "Contato" },
]
const TIMEOUT_ACTIONS: Opt[] = [
  { value: "continue", label: "Continuar fluxo" },
  { value: "stop", label: "Encerrar" },
  { value: "retry", label: "Repetir pergunta" },
  { value: "goto", label: "Ir para passo" },
]

export const STEP_FIELDS: Record<string, EditorField[]> = {
  send_email: [
    { kind: "text", key: "to", label: "Para", placeholder: "email@cliente.com ou {{campo}}" },
    { kind: "text", key: "subject", label: "Assunto" },
    { kind: "textarea", key: "body", label: "Corpo" },
  ],
  move_stage: [{ kind: "source", source: "stage", key: "stageId", label: "Mover para estágio" }],
  assign_owner: [
    { kind: "source", source: "owner", key: "userId", label: "Responsável" },
    { kind: "select", key: "target", label: "Aplicar em", options: TARGET_OPTS },
  ],
  // Sem esta entrada o canvas não monta o seletor — o bloco ficava só com
  // "Selecionar departamento" (StepConfigPanel existe mas não é mais usado).
  transfer_department: [
    { kind: "source", source: "department", key: "departmentId", label: "Departamento de destino" },
  ],
  add_tag: [{ kind: "tag", key: "tagName", label: "Nome da tag" }],
  remove_tag: [{ kind: "tag", key: "tagName", label: "Nome da tag" }],
  update_field: [{ kind: "updateField" }],
  create_activity: [
    { kind: "select", key: "type", label: "Tipo", options: ACTIVITY_TYPES },
    { kind: "text", key: "title", label: "Título" },
    { kind: "textarea", key: "description", label: "Descrição", optional: true },
  ],
  send_whatsapp_message: [
    { kind: "textarea", key: "content", label: "Conteúdo da mensagem", hint: "Use {{campo}} para variáveis." },
    { kind: "text", key: "fallbackTemplateName", label: "Template fallback (sessão expirada)", optional: true },
  ],
  send_whatsapp_template: [
    { kind: "source", source: "template", key: "templateName", label: "Template" },
    { kind: "text", key: "languageCode", label: "Idioma", placeholder: "pt_BR" },
    { kind: "templatePreview" },
  ],
  send_whatsapp_media: [
    { kind: "select", key: "mediaType", label: "Tipo de mídia", options: MEDIA_TYPES },
    { kind: "media", key: "mediaUrl", label: "Arquivo" },
    { kind: "text", key: "caption", label: "Legenda", optional: true },
  ],
  send_whatsapp_interactive: [
    { kind: "textarea", key: "body", label: "Texto da mensagem" },
    { kind: "text", key: "header", label: "Cabeçalho", optional: true },
    { kind: "text", key: "footer", label: "Rodapé", optional: true },
    { kind: "builder", builder: "buttonsTitle", key: "buttons", label: "Botões (máx. 3)" },
    { kind: "step", key: "elseGotoStepId", label: "Se resposta não bater → ir para", optional: true },
    { kind: "text", key: "saveToVariable", label: "Salvar resposta em variável", optional: true },
  ],
  // Construtor visual (WebhookStepConfig) — parâmetros + catálogo de
  // variáveis. O STEP_FIELDS antigo só tinha textarea JSON e escondeu
  // o builder quando o canvas migrou pra edição inline.
  webhook: [{ kind: "webhookConfig" }],
  delay: [{ kind: "delay", key: "ms", label: "Duração" }],
  condition: [{ kind: "builder", builder: "condition", key: "branches", label: "Condições" }],
  update_lead_score: [{ kind: "info", text: "Recalcula o Lead Score do contato no contexto. Sem configuração." }],
  question: [
    { kind: "textarea", key: "message", label: "Mensagem enviada ao lead" },
    { kind: "builder", builder: "buttons", key: "buttons", label: "Botões de resposta" },
    { kind: "text", key: "saveToVariable", label: "Salvar resposta em variável", optional: true },
    { kind: "step", key: "elseGotoStepId", label: "Se não bater com botão → ir para", optional: true },
    { kind: "hours", key: "timeoutMs", label: "Timeout (horas)" },
    { kind: "select", key: "timeoutAction", label: "Ação ao expirar", options: TIMEOUT_ACTIONS },
    { kind: "step", key: "timeoutGotoStepId", label: "Ir para (no timeout)", optional: true },
  ],
  wait_for_reply: [
    { kind: "duration", key: "timeoutMs", label: "Cronômetro" },
    { kind: "text", key: "saveToVariable", label: "Salvar resposta em variável", optional: true },
    { kind: "step", key: "receivedGotoStepId", label: "Mensagem recebida → ir para", optional: true },
    { kind: "step", key: "timeoutGotoStepId", label: "Sem resposta (timeout) → ir para", optional: true },
  ],
  set_variable: [
    { kind: "text", key: "variableName", label: "Nome da variável" },
    { kind: "text", key: "value", label: "Valor" },
  ],
  goto: [{ kind: "step", key: "targetStepId", label: "Ir para qual passo?" }],
  transfer_automation: [
    { kind: "source", source: "automation", key: "targetAutomationId", label: "Automação destino" },
  ],
  stop_automation: [{ kind: "info", text: "Para a automação atual neste ponto." }],
  finish: [{ kind: "info", text: "Encerra a automação — nenhum passo posterior é executado." }],
  create_deal: [
    { kind: "text", key: "title", label: "Título do negócio" },
    { kind: "source", source: "stage", key: "stageId", label: "Estágio" },
    { kind: "number", key: "value", label: "Valor", min: 0, step: 1, suffix: "R$" },
  ],
  finish_conversation: [{ kind: "info", text: "Marca as conversas abertas como resolvidas." }],
  business_hours: [
    { kind: "builder", builder: "schedule", key: "schedule", label: "Horários de funcionamento" },
    { kind: "text", key: "timezone", label: "Fuso horário", placeholder: "America/Sao_Paulo" },
    { kind: "step", key: "elseStepId", label: "Fora do horário → ir para", optional: true },
  ],
  ask_ai_agent: [
    { kind: "source", source: "aiAgentId", key: "agentId", label: "Agente de IA" },
    { kind: "textarea", key: "promptTemplate", label: "Pergunta para o agente" },
    { kind: "text", key: "saveToVariable", label: "Salvar resposta em variável", placeholder: "ai_response" },
  ],
  transfer_to_ai_agent: [
    { kind: "source", source: "aiAgentUserId", key: "agentUserId", label: "Agente IA" },
    { kind: "select", key: "target", label: "Aplicar em", options: TARGET_OPTS },
  ],
  consume_stock: [{ kind: "info", text: "Baixa o estoque dos produtos do negócio. Bloqueia se faltar saldo." }],
  execute_distribution: [
    { kind: "text", key: "distributionType", label: "Tipo / segmento", optional: true },
  ],
}

/**
 * Catálogo de campos disponíveis nas CONDIÇÕES de automação. Cada `value`
 * é um caminho pontilhado que o avaliador do backend resolve via
 * `getByPath` sobre `{ contact, deal, conversation, variables }`
 * (ver `automation-executor.ts`). Só expomos caminhos realmente resolvíveis.
 */
export const CONDITION_FIELDS: Opt[] = [
  // Contato
  { value: "contact.name", label: "Nome do contato", group: "Contato" },
  { value: "contact.email", label: "E-mail", group: "Contato" },
  { value: "contact.phone", label: "Telefone", group: "Contato" },
  { value: "contact.source", label: "Origem", group: "Contato" },
  { value: "contact.lifecycleStage", label: "Ciclo de vida", group: "Contato" },
  { value: "contact.assignedToId", label: "Responsável (contato)", group: "Contato" },
  { value: "contact.tags", label: "Tags do contato", group: "Contato" },
  // Negócio
  { value: "deal.title", label: "Título do negócio", group: "Negócio" },
  { value: "deal.value", label: "Valor", group: "Negócio" },
  { value: "deal.status", label: "Status do negócio", group: "Negócio" },
  { value: "deal.stageId", label: "Etapa", group: "Negócio" },
  { value: "deal.pipelineId", label: "Funil", group: "Negócio" },
  { value: "deal.ownerId", label: "Responsável (negócio)", group: "Negócio" },
  { value: "deal.tags", label: "Tags do negócio", group: "Negócio" },
  // Conversa
  { value: "conversation.channel", label: "Canal", group: "Conversa" },
  { value: "conversation.assignedToId", label: "Atendente", group: "Conversa" },
  { value: "conversation.departmentId", label: "Departamento", group: "Conversa" },
  { value: "conversation.isClosed", label: "Conversa encerrada", group: "Conversa" },
  { value: "conversation.hasAgentReply", label: "Teve resposta do agente", group: "Conversa" },
  { value: "conversation.hasError", label: "Conversa com erro", group: "Conversa" },
]

/** Campos booleanos → valor vira select Sim/Não. */
export const CONDITION_BOOL_FIELDS = new Set<string>([
  "conversation.isClosed",
  "conversation.hasAgentReply",
  "conversation.hasError",
])

export const BOOL_OPTS: Opt[] = [
  { value: "true", label: "Sim" },
  { value: "false", label: "Não" },
]

export const DEAL_STATUS_OPTS: Opt[] = [
  { value: "OPEN", label: "Aberto" },
  { value: "WON", label: "Ganho" },
  { value: "LOST", label: "Perdido" },
]

/** Tipos de canal (valor de `conversation.channel`). */
export const CHANNEL_KIND_OPTS: Opt[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "messenger", label: "Messenger" },
  { value: "telegram", label: "Telegram" },
  { value: "webchat", label: "Webchat" },
]

export const CONDITION_OPS: Opt[] = [
  { value: "eq", label: "Igual a" },
  { value: "ne", label: "Diferente de" },
  { value: "includes", label: "Contém" },
  { value: "starts_with", label: "Começa com" },
  { value: "ends_with", label: "Termina com" },
  { value: "gt", label: "Maior que" },
  { value: "gte", label: "Maior ou igual" },
  { value: "lt", label: "Menor que" },
  { value: "lte", label: "Menor ou igual" },
  { value: "empty", label: "Vazio" },
  { value: "not_empty", label: "Não vazio" },
  { value: "has_tag", label: "Tem a tag" },
  { value: "not_has_tag", label: "Não tem a tag" },
]

export const WEEK_DAYS = [
  { value: 0, label: "D" },
  { value: 1, label: "S" },
  { value: 2, label: "T" },
  { value: 3, label: "Q" },
  { value: 4, label: "Q" },
  { value: 5, label: "S" },
  { value: 6, label: "S" },
]
