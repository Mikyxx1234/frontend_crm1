import { normalizeConditionConfig } from "@/lib/automation-condition"
import type { FlowNodeData } from "./nodes"

type Btn = { id?: string; title?: string; text?: string; gotoStepId?: string }

/** Formata ms → rótulo legível (ex.: "8 min"). */
function formatDuration(ms: number): string {
  if (ms <= 0) return ""
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  const parts: string[] = []
  if (h > 0) parts.push(`${h} h`)
  if (m > 0) parts.push(`${m} min`)
  if (s > 0 && h === 0) parts.push(`${s} seg`)
  return parts.join(" ")
}

function clampSubtitle(text: string, max = 48): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function interactiveOutputs(config: Record<string, unknown>, withElse: boolean): NonNullable<FlowNodeData["outputs"]> {
  const buttons = Array.isArray(config.buttons) ? (config.buttons as Btn[]) : []
  const outputs: NonNullable<FlowNodeData["outputs"]> = buttons.map((btn, idx) => ({
    id: `btn_${idx}`,
    label: (btn.title || btn.text || `Botão ${idx + 1}`).trim() || `Botão ${idx + 1}`,
  }))
  if (withElse) {
    outputs.push({ id: "else", label: "Outra resposta", icon: "list", err: true })
  }
  return outputs
}

/**
 * Deriva rótulos/saídas visuais do card a partir do `config` canônico.
 * Garante que a edição inline e o preview do nó mostrem os mesmos dados.
 */
export function resolveFlowPresentation(
  stepType: string | undefined,
  config: Record<string, unknown>,
  data: FlowNodeData,
): Partial<FlowNodeData> {
  if (!stepType) return {}

  switch (stepType) {
    case "send_whatsapp_interactive": {
      const body = String(config.body ?? "").trim()
      return {
        outputs: interactiveOutputs(config, true),
        subtitle: body ? clampSubtitle(body) : data.subtitle,
      }
    }
    case "question": {
      const message = String(config.message ?? "").trim()
      const hasTimeout = !!(config.timeoutGotoStepId || config.timeoutMs)
      const outputs = interactiveOutputs(config, true)
      if (hasTimeout) {
        outputs.push({ id: "timeout", label: "Sem resposta", icon: "clock", err: true })
      }
      return {
        outputs,
        subtitle: message ? clampSubtitle(message) : data.subtitle,
      }
    }
    case "wait_for_reply": {
      const ms = Number(config.timeoutMs ?? 0)
      const label = formatDuration(ms)
      return {
        branches: [
          { id: "received", label: "Mensagem recebida" },
          { id: "timeout", label: "Sem resposta no prazo", err: true },
        ],
        meta: label ? `Cronômetro: ${label}` : data.meta,
      }
    }
    case "send_whatsapp_message": {
      const content = String(config.content ?? "").trim()
      return { subtitle: content ? clampSubtitle(content) : data.subtitle }
    }
    case "send_whatsapp_template": {
      const tpl = String(config.templateName ?? "").trim()
      const body = String(config.bodyPreview ?? "").trim()
      // Preview: prioriza o corpo real do template; cai pro nome do template.
      const subtitle = body ? clampSubtitle(body, 90) : tpl ? clampSubtitle(tpl) : data.subtitle
      const buttons = Array.isArray(config.buttons) ? (config.buttons as Btn[]) : []
      // Só vira nó ramificado quando o template tem botões de resposta rápida
      // (roteamento). Sem botões, mantém a saída única padrão (d.source).
      if (buttons.length > 0) {
        return { outputs: interactiveOutputs(config, true), subtitle }
      }
      return { subtitle }
    }
    case "add_tag":
    case "remove_tag": {
      const tag = String(config.tagName ?? "").trim()
      return { title: tag || data.title }
    }
    case "move_stage":
      return { title: data.title }
    case "condition": {
      const cond = normalizeConditionConfig(config)
      const outputs: NonNullable<FlowNodeData["outputs"]> = cond.branches.map((branch, i) => ({
        id: `branch:${branch.id}`,
        label: branch.label?.trim() || `Ramo ${i + 1}`,
      }))
      if (cond.elseStepId) {
        outputs.push({ id: "else", label: "Nenhuma condição", icon: "list", err: true })
      }
      return { outputs }
    }
    default:
      return {}
  }
}
