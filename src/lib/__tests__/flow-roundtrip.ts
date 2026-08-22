/**
 * Harness de teste de mesa: carrega uma automação exportada, converte para o
 * grafo do canvas, converte de volta e compara com a entrada.
 *
 * Fica fora de `*.test.ts` de propósito — é usado tanto pelo teste versionado
 * (fixtures do repo) quanto por conferências pontuais com exports de produção.
 */
import {
  applySavedLayout,
  automationToFlowGraph,
  flowGraphToAutomation,
  readRfPos,
  TRIGGER_NODE_ID,
  type AutomationFlowSource,
} from "@/lib/flow-automation-adapter"

export type RoundTripDiff = {
  stepCount: number
  edgeCount: number
  /** Chaves de config presentes na entrada e ausentes na saída. */
  lostKeys: string[]
  /** Chaves criadas pela conversão (esperado: só `__rfPos` de step sem posição). */
  addedKeys: string[]
  /** Valores alterados (fora de `__rfPos`). */
  changedValues: string[]
  /** Steps que sumiram, apareceram, trocaram de tipo ou de posição no array. */
  structuralDiffs: string[]
  /** Arestas sem referência correspondente no config de origem. */
  inventedEdges: string[]
  /** Referências do config que não viraram aresta (fora sentinela/órfãs). */
  missingEdges: string[]
  /**
   * Subconjunto conhecido de `missingEdges`: `wait_for_reply` que guarda um
   * `nextStepId` linear além do `receivedGotoStepId`. `outputsFromStepConfig`
   * reserva o handle `next` como alias de `received` nesse tipo, então essa
   * rota não tem handle próprio para ser desenhada. A chave continua no config
   * e volta intacta no save — o que falta é o traço no canvas.
   */
  waitForReplyLinearRefs: string[]
}

const STOP = "__none__"

function asRecord(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {}
}

function walk(
  before: unknown,
  after: unknown,
  path: string,
  out: { lost: string[]; added: string[]; changed: string[] },
) {
  const bothRecords =
    typeof before === "object" && before !== null && !Array.isArray(before) &&
    typeof after === "object" && after !== null && !Array.isArray(after)

  if (bothRecords) {
    const b = before as Record<string, unknown>
    const a = after as Record<string, unknown>
    for (const key of Object.keys(b)) {
      if (!(key in a)) out.lost.push(`${path}.${key}`)
      else walk(b[key], a[key], `${path}.${key}`, out)
    }
    for (const key of Object.keys(a)) {
      if (!(key in b)) out.added.push(`${path}.${key}`)
    }
    return
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    if (before.length !== after.length) {
      out.changed.push(`${path} (len ${before.length} → ${after.length})`)
      return
    }
    before.forEach((item, i) => walk(item, after[i], `${path}[${i}]`, out))
    return
  }

  if (JSON.stringify(before) !== JSON.stringify(after)) {
    out.changed.push(`${path} (${JSON.stringify(before)} → ${JSON.stringify(after)})`)
  }
}

/** Todos os ids de destino referenciados no config de um step. */
export function configTargets(cfg: Record<string, unknown>): string[] {
  const out: string[] = []
  const add = (v: unknown) => {
    if (typeof v === "string" && v && v !== STOP) out.push(v)
  }
  add(cfg.nextStepId)
  add(cfg.targetStepId)
  add(cfg.elseStepId)
  add(cfg.elseGotoStepId)
  add(cfg.timeoutGotoStepId)
  add(cfg.receivedGotoStepId)
  add(cfg.failureGotoStepId)
  for (const key of ["buttons", "rows", "options", "branches"]) {
    const list = cfg[key]
    if (!Array.isArray(list)) continue
    for (const item of list) {
      const rec = asRecord(item)
      add(rec.gotoStepId)
      add(rec.nextStepId)
    }
  }
  return out
}

export function roundTrip(source: AutomationFlowSource): RoundTripDiff {
  const graph = automationToFlowGraph(source)
  const nodes = applySavedLayout(graph.nodes, graph.edges, new Set(graph.unpositionedIds), "LR")
  const back = flowGraphToAutomation(nodes, graph.edges, source)

  const diff: RoundTripDiff = {
    stepCount: source.steps.length,
    edgeCount: graph.edges.length,
    lostKeys: [],
    addedKeys: [],
    changedValues: [],
    structuralDiffs: [],
    inventedEdges: [],
    missingEdges: [],
    waitForReplyLinearRefs: [],
  }

  if (back.steps.length !== source.steps.length) {
    diff.structuralDiffs.push(`nº de steps ${source.steps.length} → ${back.steps.length}`)
  }

  source.steps.forEach((step, i) => {
    const out = back.steps[i]
    if (!out) {
      diff.structuralDiffs.push(`step ${step.id} sumiu`)
      return
    }
    if (out.id !== step.id) {
      diff.structuralDiffs.push(`posição ${i}: ${step.id} → ${out.id}`)
      return
    }
    if (out.type !== step.type) {
      diff.structuralDiffs.push(`${step.id}: tipo ${step.type} → ${out.type}`)
    }
    const acc = { lost: [] as string[], added: [] as string[], changed: [] as string[] }
    walk(asRecord(step.config), out.config, `${step.id}.config`, acc)
    diff.lostKeys.push(...acc.lost)
    diff.addedKeys.push(...acc.added)
    // `__rfPos` só muda quando o step chegou sem posição e recebeu a do Dagre.
    diff.changedValues.push(...acc.changed.filter((c) => !c.includes(".__rfPos")))
  })

  const triggerAcc = { lost: [] as string[], added: [] as string[], changed: [] as string[] }
  walk(asRecord(source.triggerConfig), back.triggerConfig, "triggerConfig", triggerAcc)
  diff.lostKeys.push(...triggerAcc.lost)
  diff.addedKeys.push(...triggerAcc.added)
  diff.changedValues.push(...triggerAcc.changed.filter((c) => !c.includes(".__rfPos")))

  // Arestas: cada uma tem de corresponder a uma referência real do config.
  const stepIds = new Set(source.steps.map((s) => s.id))
  const refsBySource = new Map<string, Set<string>>()
  for (const step of source.steps) {
    refsBySource.set(
      step.id,
      new Set(configTargets(asRecord(step.config)).filter((t) => stepIds.has(t))),
    )
  }
  const edgesBySource = new Map<string, Set<string>>()
  for (const edge of graph.edges) {
    if (edge.source === TRIGGER_NODE_ID) {
      if (edge.target !== source.steps[0]?.id) {
        diff.inventedEdges.push(`gatilho → ${edge.target} (entrada é ${source.steps[0]?.id})`)
      }
      continue
    }
    const set = edgesBySource.get(edge.source) ?? new Set()
    set.add(edge.target)
    edgesBySource.set(edge.source, set)
    if (!refsBySource.get(edge.source)?.has(edge.target)) {
      diff.inventedEdges.push(`${edge.source} -[${edge.sourceHandle}]→ ${edge.target}`)
    }
  }
  const typeById = new Map(source.steps.map((s) => [s.id, s.type]))
  for (const [src, refs] of refsBySource) {
    for (const target of refs) {
      if (edgesBySource.get(src)?.has(target)) continue
      const cfg = asRecord(source.steps.find((s) => s.id === src)?.config)
      if (typeById.get(src) === "wait_for_reply" && cfg.nextStepId === target) {
        diff.waitForReplyLinearRefs.push(`${src} → ${target}`)
        continue
      }
      diff.missingEdges.push(`${src} → ${target}`)
    }
  }

  return diff
}

/** Quantos steps chegaram sem `__rfPos` (recebem posição do Dagre no load). */
export function countUnpositioned(source: AutomationFlowSource): number {
  return source.steps.filter((s) => !readRfPos(s.config)).length
}
