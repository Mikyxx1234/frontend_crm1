"use client";

import type { ReactNode } from "react";
import {
  IconAlertTriangle,
  IconToolsKitchen2,
  IconUsers,
  IconWifi,
} from "@tabler/icons-react";

import { KpiCard, type KpiTone } from "@/components/crm/kpi-card";
import { KpiStrip } from "@/components/crm/kpi-strip";
import { TooltipGlass } from "@/components/crm/tooltip-glass";
import { cn } from "@/lib/utils";

import type { CoverageStats } from "./schedule-data";

function CoverageKpi({
  tip,
  className,
  ...kpi
}: {
  tip: string;
  className?: string;
  label: string;
  value: string;
  icon: ReactNode;
  tone?: KpiTone;
}) {
  return (
    <TooltipGlass label={tip}>
      <div className={cn("h-full min-w-0", className)}>
        <KpiCard {...kpi} className="h-full w-full" />
      </div>
    </TooltipGlass>
  );
}

export function CoverageMiniDash({ stats }: { stats: CoverageStats }) {
  return (
    <KpiStrip
      aria-label="Indicadores de cobertura"
      gridClassName="grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-4"
    >
      <CoverageKpi
        tip="Total de agentes visíveis na grade (após filtros)"
        label="Agentes"
        value={stats.agents.toLocaleString("pt-BR")}
        icon={<IconUsers size={20} stroke={2.2} />}
        tone="brand"
      />
      <CoverageKpi
        tip="Agentes com presença online neste momento"
        label="Online agora"
        value={stats.onlineNow.toLocaleString("pt-BR")}
        icon={<IconWifi size={20} stroke={2.2} />}
        tone="success"
      />
      <CoverageKpi
        tip="Horas do dia sem nenhum agente em expediente"
        label="Gaps no dia"
        value={stats.gaps.toLocaleString("pt-BR")}
        icon={<IconAlertTriangle size={20} stroke={2.2} />}
        tone={stats.gaps > 0 ? "warning" : "neutral"}
      />
      <CoverageKpi
        tip="Horário com mais agentes em almoço"
        label="Pico almoço"
        value={stats.lunchPeak}
        icon={<IconToolsKitchen2 size={20} stroke={2.2} />}
        tone="violet"
      />
    </KpiStrip>
  );
}
