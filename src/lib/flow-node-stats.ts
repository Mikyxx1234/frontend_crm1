/**
 * Projeta os contadores de `GET /api/automations/:id/stats` sobre os nós do
 * canvas.
 *
 * Fica fora de `flow-automation-adapter.ts` de propósito: aquele módulo é a
 * conversão pura entre o registro persistido e o grafo, e telemetria não pode
 * virar dependência dele. Aqui é um passo posterior, aplicado sobre os nós já
 * montados.
 *
 * Vocabulário: o backend fala `success/failed/skipped`, o card fala
 * `sucessos/alertas/erros`. O mapeamento é o mesmo do canvas legado
 * (`components/automations/workflow-canvas.tsx`): alertas = skipped,
 * erros = failed.
 */
import type { Node } from "@xyflow/react"

import type { AutomationStats } from "./automation-stats-types"
import type { FlowNodeData } from "./flow-data"
import { TRIGGER_NODE_ID } from "./flow-automation-adapter"

export type FlowNodeStats = { sucessos: number; alertas: number; erros: number }

const ZERO: FlowNodeStats = { sucessos: 0, alertas: 0, erros: 0 }

/**
 * O gatilho não tem `stepId`, então o backend agrega os logs da automação por
 * status cru. "Sucesso" aqui é toda execução que chegou a começar.
 */
function triggerStats(trigger: Record<string, number> | undefined): FlowNodeStats {
  const t = trigger ?? {}
  return {
    sucessos: (t["STARTED"] ?? 0) + (t["COMPLETED"] ?? 0) + (t["COMPLETED_WITH_ERRORS"] ?? 0),
    alertas: t["SKIPPED"] ?? 0,
    erros: t["FAILED"] ?? 0,
  }
}

export function statsForNode(
  nodeId: string,
  stats: AutomationStats | undefined,
): FlowNodeStats {
  if (!stats) return ZERO
  if (nodeId === TRIGGER_NODE_ID) return triggerStats(stats.trigger)
  const s = stats.steps?.[nodeId]
  if (!s) return ZERO
  return { sucessos: s.success, alertas: s.skipped, erros: s.failed }
}

function same(a: FlowNodeStats, b: FlowNodeStats): boolean {
  return a.sucessos === b.sucessos && a.alertas === b.alertas && a.erros === b.erros
}

/**
 * Devolve o mesmo array quando nada mudou — o canvas re-renderiza a cada
 * `setNodes`, e o polling dos stats bate a cada 30s sem novidade na maioria
 * das vezes.
 */
export function applyStatsToNodes(
  nodes: Node<FlowNodeData>[],
  stats: AutomationStats | undefined,
): Node<FlowNodeData>[] {
  let changed = false
  const next = nodes.map((node) => {
    const value = statsForNode(node.id, stats)
    if (same(node.data.stats, value)) return node
    changed = true
    return { ...node, data: { ...node.data, stats: value } }
  })
  return changed ? next : nodes
}
