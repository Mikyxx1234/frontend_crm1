// ============================================================================
// Gerador determinístico de logs por card, alimentando as modais navegáveis
// de Sucessos / Alertas / Erros e a Inspeção da Sessão.
// ============================================================================

export type LogStatus = "success" | "alert" | "error"

export interface LogEntry {
  id: string
  sessionId: string
  status: LogStatus
  title: string
  message: string
  timestamp: string // ISO
  contactId: string
  dealId: string
  contactLabel: string
  dealLabel: string
  summary: Record<string, string | number | boolean>
  params: Record<string, string | number | boolean>
}

export interface NodeLogs {
  entered: LogEntry[]
  success: LogEntry[]
  alert: LogEntry[]
  error: LogEntry[]
  total: number
}

const STATUS_TITLE: Record<LogStatus, string> = {
  success: "Concluído com sucesso",
  alert: "Concluído com alerta",
  error: "Falha na execução",
}

const STATUS_META: Record<LogStatus, { label: string; code: string }> = {
  success: { label: "Concluído com sucesso", code: "SUCCESS" },
  alert: { label: "Concluído com alerta", code: "WARNING" },
  error: { label: "Falha na execução", code: "ERROR" },
}

export function statusMeta(status: LogStatus) {
  return STATUS_META[status]
}

// PRNG determinístico (mulberry32) a partir de uma string
function seededRandom(seed: string) {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789"
function shortId(rand: () => number, len = 5) {
  let s = ""
  for (let i = 0; i < len; i++) s += CHARS[Math.floor(rand() * CHARS.length)]
  return s
}

const ALERT_MESSAGES = [
  "Contato sem número de telefone válido",
  "Variável {{primeiro_nome}} vazia — usado fallback",
  "Janela de 24h expirada, enviado como template",
  "Tag de segmentação ausente no contato",
]

const ERROR_MESSAGES = [
  "Falha ao enviar mensagem: número inexistente no WhatsApp",
  "Timeout ao aguardar resposta do contato",
  "Template rejeitado pela Meta (categoria inválida)",
  "Webhook retornou status 500",
  "Sessão encerrada por inatividade",
]

function makeEntry(
  status: LogStatus,
  nodeTitle: string,
  nodeRef: number,
  index: number,
  rand: () => number,
): LogEntry {
  const suffix = shortId(rand)
  const sessionId = `cms${shortId(rand, 21)}`
  const contactSuffix = suffix
  const minutesAgo = Math.floor(rand() * 60 * 24 * 6)
  const date = new Date(2026, 7, 15, 15, 56)
  date.setMinutes(date.getMinutes() - minutesAgo)

  const message =
    status === "success"
      ? `${nodeTitle} — OK`
      : status === "alert"
        ? ALERT_MESSAGES[Math.floor(rand() * ALERT_MESSAGES.length)]
        : ERROR_MESSAGES[Math.floor(rand() * ERROR_MESSAGES.length)]

  const contactId = `cms${shortId(rand, 3)}e${shortId(rand, 11)}`
  const dealId = `cms${shortId(rand, 3)}e${shortId(rand, 11)}`

  const summary: Record<string, string | number | boolean> = {
    id: sessionId,
    status: STATUS_META[status].code,
    message,
    executedAt: date.toISOString(),
    contactId,
    dealId,
  }

  const params: Record<string, string | number | boolean> = {
    stepRef: nodeRef,
    stepTitle: nodeTitle,
    channel: "whatsapp",
    phone: `+55 11 9${Math.floor(1000 + rand() * 8999)}-${Math.floor(1000 + rand() * 8999)}`,
    templateName: "bv_calouros_onboarding",
    templateLang: "pt_BR",
    variables: 3,
    attempts: status === "error" ? Math.ceil(rand() * 3) : 1,
    deliveredAt: status === "error" ? "" : date.toISOString(),
    readAt: status === "success" ? date.toISOString() : "",
    responseButton: status === "success" ? "Acesso ao Portal" : "",
    campaign: "Boas-vindas Calouros 2026.2",
    origin: "fluxo-automatico",
    retryable: status === "error",
    latencyMs: Math.floor(120 + rand() * 900),
  }

  return {
    id: `${sessionId}-${index}`,
    sessionId,
    status,
    title: STATUS_TITLE[status],
    message,
    timestamp: date.toISOString(),
    contactId,
    dealId,
    contactLabel: `Contato ${contactSuffix}`,
    dealLabel: `Negócio ${contactSuffix}`,
    summary,
    params,
  }
}

const cache = new Map<string, NodeLogs>()

export function getNodeLogs(
  nodeId: string,
  nodeTitle: string,
  nodeRef: number,
  stats: { sucessos: number; alertas: number; erros: number },
): NodeLogs {
  const cacheKey = `${nodeId}:${stats.sucessos}:${stats.alertas}:${stats.erros}`
  const hit = cache.get(cacheKey)
  if (hit) return hit

  const cap = (n: number) => Math.min(n, 60) // limita a lista renderizada
  const rand = seededRandom(cacheKey)

  const success = Array.from({ length: cap(stats.sucessos) }, (_, i) =>
    makeEntry("success", nodeTitle, nodeRef, i, rand),
  )
  const alert = Array.from({ length: cap(stats.alertas) }, (_, i) =>
    makeEntry("alert", nodeTitle, nodeRef, i, rand),
  )
  const error = Array.from({ length: cap(stats.erros) }, (_, i) =>
    makeEntry("error", nodeTitle, nodeRef, i, rand),
  )

  const entered = [...success, ...alert, ...error].sort(
    (a, b) => +new Date(b.timestamp) - +new Date(a.timestamp),
  )

  const result: NodeLogs = {
    entered,
    success,
    alert,
    error,
    total: stats.sucessos + stats.alertas + stats.erros,
  }
  cache.set(cacheKey, result)
  return result
}

export function formatDateTime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`
}
