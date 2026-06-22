import type { AutomationExport } from "../automation-graph"
import receptivo from "./receptivo-geral.json"
import followUp from "./follow-up-vaga.json"
import posVaga from "./pos-vaga-aceita.json"

export type FlowFixtureKey = "demo" | "receptivo" | "followup" | "pos-vaga"

export const FLOW_FIXTURES: Record<Exclude<FlowFixtureKey, "demo">, AutomationExport> = {
  receptivo: receptivo as AutomationExport,
  followup: followUp as AutomationExport,
  "pos-vaga": posVaga as AutomationExport,
}

export const FLOW_FIXTURE_OPTIONS: { key: FlowFixtureKey; label: string }[] = [
  { key: "demo", label: "Demo (mock)" },
  { key: "receptivo", label: "receptivo_geral (produção)" },
  { key: "followup", label: "Follow-up de envio de vaga" },
  { key: "pos-vaga", label: "Pós Vaga Aceita" },
]
