import { describe, expect, it } from "vitest"

import followUpVaga from "@/components/automations/fixtures/follow-up-vaga.json"
import posVagaAceita from "@/components/automations/fixtures/pos-vaga-aceita.json"
import receptivoGeral from "@/components/automations/fixtures/receptivo-geral.json"

import {
  applySavedLayout,
  automationToFlowGraph,
  flowGraphToAutomation,
  readRfPos,
  TRIGGER_NODE_ID,
  type AutomationFlowSource,
} from "@/lib/flow-automation-adapter"
import { roundTrip } from "./flow-roundtrip"

const FIXTURES: [string, unknown][] = [
  ["receptivo-geral", receptivoGeral],
  ["follow-up-vaga", followUpVaga],
  ["pos-vaga-aceita", posVagaAceita],
]

function asSource(raw: unknown): AutomationFlowSource {
  const r = raw as {
    id: string
    name: string
    triggerType: string
    triggerConfig: unknown
    steps: { id: string; type: string; config: unknown }[]
  }
  return {
    id: r.id,
    name: r.name,
    triggerType: r.triggerType,
    triggerConfig: r.triggerConfig,
    steps: r.steps,
  }
}

describe("flow-automation-adapter", () => {
  it.each(FIXTURES)("round-trip preserva o registro de %s", (_name, raw) => {
    const diff = roundTrip(asSource(raw))
    expect(diff.lostKeys).toEqual([])
    expect(diff.changedValues).toEqual([])
    expect(diff.structuralDiffs).toEqual([])
    expect(diff.inventedEdges).toEqual([])
    expect(diff.missingEdges).toEqual([])
  })

  // Lacuna conhecida e contida: a chave sobrevive ao round-trip, só não vira
  // traço no canvas. Ver `RoundTripDiff.waitForReplyLinearRefs`.
  it("pos-vaga-aceita: única rota não desenhada é o nextStepId linear de wait_for_reply", () => {
    const diff = roundTrip(asSource(posVagaAceita))
    expect(diff.waitForReplyLinearRefs).toHaveLength(1)
    expect(diff.lostKeys).toEqual([])
  })

  it.each(FIXTURES)("%s: só acrescenta __rfPos em step sem posição", (_name, raw) => {
    const source = asSource(raw)
    const unpositioned = source.steps.filter((s) => !readRfPos(s.config)).length
    const diff = roundTrip(source)
    expect(diff.addedKeys.every((k) => k.endsWith(".__rfPos"))).toBe(true)
    expect(diff.addedKeys.length).toBeLessThanOrEqual(unpositioned + 1)
  })

  it("respeita __rfPos salvo e não reposiciona o que já está organizado", () => {
    const source = asSource(receptivoGeral)
    const graph = automationToFlowGraph(source)
    const nodes = applySavedLayout(graph.nodes, graph.edges, new Set(graph.unpositionedIds), "LR")
    for (const step of source.steps) {
      const saved = readRfPos(step.config)
      if (!saved) continue
      const node = nodes.find((n) => n.id === step.id)
      expect(node?.position).toEqual(saved)
    }
  })

  it("posiciona com Dagre apenas os nós sem __rfPos", () => {
    const source = asSource(receptivoGeral)
    const stripped: AutomationFlowSource = {
      ...source,
      steps: source.steps.map((s, i) => {
        if (i !== 1) return s
        const { __rfPos: _drop, ...rest } = s.config as Record<string, unknown>
        return { ...s, config: rest }
      }),
    }
    const graph = automationToFlowGraph(stripped)
    expect(graph.unpositionedIds).toContain(stripped.steps[1].id)
    const nodes = applySavedLayout(graph.nodes, graph.edges, new Set(graph.unpositionedIds), "LR")
    const moved = nodes.find((n) => n.id === stripped.steps[1].id)
    expect(Number.isFinite(moved?.position.x)).toBe(true)
    // Não pode cair em (0,0) longe do resto do fluxo já organizado.
    const others = nodes.filter((n) => n.id !== moved?.id && n.id !== TRIGGER_NODE_ID)
    const minX = Math.min(...others.map((n) => n.position.x))
    const maxX = Math.max(...others.map((n) => n.position.x))
    expect(moved!.position.x).toBeGreaterThanOrEqual(minX - 2000)
    expect(moved!.position.x).toBeLessThanOrEqual(maxX + 2000)
  })

  it("__none__ é fim de ramo, não destino", () => {
    const source: AutomationFlowSource = {
      id: "a1",
      name: "t",
      triggerType: "manual",
      triggerConfig: {},
      steps: [
        { id: "s1", type: "send_whatsapp_message", config: { nextStepId: "__none__" } },
      ],
    }
    const graph = automationToFlowGraph(source)
    expect(graph.edges.filter((e) => e.source === "s1")).toEqual([])
  })

  it("mover um nó atualiza __rfPos sem tocar nas demais chaves", () => {
    const source = asSource(receptivoGeral)
    const graph = automationToFlowGraph(source)
    const nodes = graph.nodes.map((n) =>
      n.id === source.steps[0].id ? { ...n, position: { x: 12, y: 34 } } : n,
    )
    const back = flowGraphToAutomation(nodes, graph.edges, source)
    expect(back.steps[0].config.__rfPos).toEqual({ x: 12, y: 34 })
    const before = { ...(source.steps[0].config as Record<string, unknown>) }
    const after = { ...back.steps[0].config }
    delete before.__rfPos
    delete after.__rfPos
    expect(after).toEqual(before)
  })
})
