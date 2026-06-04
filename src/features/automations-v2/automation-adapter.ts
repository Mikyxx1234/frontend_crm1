/**
 * Adapter entre `AutomationListItemDto` do backend e o tipo `Automation`
 * usado pela UI v2 (`@/lib/automations-data`).
 *
 * Métricas como `runs`, `runsToday`, `successRate`, `lastRun` ainda não
 * existem na listagem do backend — usamos valores neutros (0/—) até que
 * o endpoint de stats seja agregado na listagem.
 */

import type { Automation, AutomationTrigger } from "@/lib/automations-data";
import type { AutomationListItemDto } from "./api";

const TRIGGER_LABEL: Record<string, AutomationTrigger> = {
  DEAL_CREATED: "Negócio criado",
  DEAL_WON: "Negócio ganho",
  DEAL_LOST: "Negócio perdido",
  STAGE_CHANGED: "Etapa alterada",
  MESSAGE_RECEIVED: "Mensagem recebida",
  TAG_ADDED: "Tag adicionada",
};

const ACCENTS: Automation["accent"][] = ["blue", "purple", "mint", "coral", "teal"];

function pickAccent(id: string): Automation["accent"] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dtoToAutomation(dto: AutomationListItemDto): Automation {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description ?? "",
    trigger: TRIGGER_LABEL[dto.triggerType] ?? ("Negócio criado" as AutomationTrigger),
    steps: dto.stepCount,
    updatedAt: formatDate(dto.updatedAt),
    active: dto.active,
    runs: 0,
    runsToday: 0,
    successRate: 0,
    lastRun: "—",
    accent: pickAccent(dto.id),
  };
}
