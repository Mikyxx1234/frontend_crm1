/**
 * Adapter entre `AutomationListItemDto` do backend e o tipo `Automation`
 * usado pela UI v2 (`@/lib/automations-data`).
 *
 * As métricas (`runs`, `runsToday`, `successRate`, `lastRun`) agora vêm
 * agregadas da listagem do backend a partir dos logs de execução. Quando
 * ausentes (ex.: payload antigo), caímos em valores neutros (0/—).
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

/**
 * "Última execução" compacta pro card (coluna estreita): relativo pra
 * eventos recentes, "hoje HH:mm" no mesmo dia, senão dd/mm.
 */
function formatLastRun(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = Date.now();
  const diffMs = now - d.getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    ...(sameYear ? {} : { year: "2-digit" }),
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
    runs: dto.runs ?? 0,
    runsToday: dto.runsToday ?? 0,
    successRate: dto.successRate ?? 0,
    lastRun: formatLastRun(dto.lastRunAt),
    accent: pickAccent(dto.id),
  };
}
