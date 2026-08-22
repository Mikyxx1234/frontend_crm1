// ============================================================================
// Tipos e normalização dos registros de execução exibidos pelas modais de
// Logs / Inspeção da Sessão do canvas.
//
// A fonte é `GET /api/automations/:id/logs` — até 24/ago/26 este módulo
// FABRICAVA as entradas com um PRNG a partir dos contadores dos cards, o que
// mostrava histórico inexistente. O gerador foi removido.
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
  contactPhone: string | null
  stepType: string | null
  summary: Record<string, string | number | boolean>
  params: Record<string, string | number | boolean>
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

/** Linha crua de `automation_logs`, como devolvida pela API. */
export interface AutomationLogRow {
  id: string
  status: string
  message?: string | null
  contactId?: string | null
  dealId?: string | null
  stepId?: string | null
  stepType?: string | null
  executedAt: string
  payload?: Record<string, unknown> | null
  contactName?: string | null
  contactPhone?: string | null
  dealName?: string | null
  dealNumber?: number | null
}

/**
 * Vocabulário do backend → o das abas do canvas. `SKIPPED` é alerta e
 * `FAILED`/`FAILED_HANDLED` são erro, o mesmo mapeamento dos contadores dos
 * cards. Status desconhecido cai em alerta para não sumir da lista.
 */
function toLogStatus(raw: string): LogStatus {
  switch (raw) {
    case "SUCCESS":
    case "STARTED":
    case "COMPLETED":
    case "COMPLETED_WITH_ERRORS":
      return "success"
    case "FAILED":
    case "FAILED_HANDLED":
      return "error"
    default:
      return "alert"
  }
}

function shortRef(id: string): string {
  return id.length > 8 ? id.slice(-6) : id
}

/** Achata o `payload` (Json livre) para o formato chave→escalar da inspeção. */
function flattenPayload(
  payload: Record<string, unknown> | null | undefined,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {}
  if (!payload) return out
  for (const [key, value] of Object.entries(payload)) {
    if (value === null || value === undefined) continue
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      out[key] = value
    } else {
      out[key] = JSON.stringify(value)
    }
  }
  return out
}

export function automationLogToEntry(row: AutomationLogRow): LogEntry {
  const status = toLogStatus(row.status)
  const message = row.message?.trim() || STATUS_TITLE[status]
  const contactId = row.contactId ?? ""
  const dealId = row.dealId ?? ""

  const summary: Record<string, string | number | boolean> = {
    id: row.id,
    status: row.status,
    message,
    executedAt: row.executedAt,
  }
  if (row.stepId) summary.stepId = row.stepId
  if (row.stepType) summary.stepType = row.stepType
  if (contactId) summary.contactId = contactId
  if (dealId) summary.dealId = dealId
  if (row.contactName) summary.contactName = row.contactName
  if (row.contactPhone) summary.contactPhone = row.contactPhone
  if (row.dealName) summary.dealName = row.dealName
  if (row.dealNumber != null) summary.dealNumber = row.dealNumber

  const contactLabel =
    row.contactName?.trim() ||
    (contactId ? `Contato ${shortRef(contactId)}` : "Sem contato")
  const dealLabel =
    row.dealName?.trim() ||
    (row.dealNumber != null
      ? `Negócio #${row.dealNumber}`
      : dealId
        ? `Negócio ${shortRef(dealId)}`
        : "Sem negócio")

  return {
    id: row.id,
    sessionId: row.id,
    status,
    title:
      status === "error" && row.message?.trim()
        ? row.message.trim()
        : STATUS_TITLE[status],
    message,
    timestamp: row.executedAt,
    contactId,
    dealId,
    contactLabel,
    dealLabel,
    contactPhone: row.contactPhone?.trim() || null,
    stepType: row.stepType ?? null,
    summary,
    params: flattenPayload(row.payload),
  }
}

export function matchesLogQuery(entry: LogEntry, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    entry.title,
    entry.message,
    entry.contactLabel,
    entry.dealLabel,
    entry.contactPhone,
    entry.contactId,
    entry.dealId,
    entry.stepType,
    formatDateTime(entry.timestamp),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  return haystack.includes(q)
}

export function formatDateTime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`
}
