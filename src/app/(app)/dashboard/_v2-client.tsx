"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { IconLayoutDashboard } from "@tabler/icons-react";

import { NavRail } from "@/components/crm/nav-rail";
import { PageHeader } from "@/components/crm/page-header";
import { TabsGlass } from "@/components/crm/tabs-glass";
import { DealsOverview } from "@/components/crm/dashboard/deals-overview";
import { ServiceOverview } from "@/components/crm/dashboard/service-overview";

import {
  FilterBar,
  computePeriod,
  rangeToPeriod,
  type CustomRange,
  type PeriodPreset,
} from "@/features/dashboard-v2/components/filter-bar";
import {
  useDealsOverview,
  usePipelineOptions,
  useServiceOverview,
} from "@/features/dashboard-v2/hooks";

/**
 * Props opcionais — usadas para reaproveitar o dashboard dentro do
 * segmento `/v2/*` (que injeta `<NavRailV2 />` com hrefs novos). Sem
 * nada passado, mantém o `<NavRail />` legado.
 */
interface DashboardV2ClientPageProps {
  navRail?: React.ReactNode;
}

export default function DashboardV2ClientPage({
  navRail,
}: DashboardV2ClientPageProps = {}) {
  const { status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";

  const [activeTab, setActiveTab] = useState(0);
  // Padrão "Hoje" (estilo Kommo); um range de calendário sobrepõe o preset.
  const [preset, setPreset] = useState<PeriodPreset>("hoje");
  const [customRange, setCustomRange] = useState<CustomRange | null>(null);
  const [pipelineId, setPipelineId] = useState<string | undefined>(undefined);

  const period = useMemo(
    () => (customRange ? rangeToPeriod(customRange) : computePeriod(preset)),
    [preset, customRange],
  );

  // Selecionar um preset limpa o range custom (e vice-versa).
  const handlePreset = (p: PeriodPreset) => {
    setPreset(p);
    setCustomRange(null);
  };

  const { data: pipelines = [] } = usePipelineOptions(isAuthenticated);

  useEffect(() => {
    if (!pipelineId && pipelines.length) {
      const def = pipelines.find((p) => p.isDefault) ?? pipelines[0];
      setPipelineId(def.id);
    }
  }, [pipelines, pipelineId]);

  const isDeals = activeTab === 0;

  const dealsQuery = useDealsOverview({
    period,
    pipelineId,
    enabled: isAuthenticated && isDeals,
  });
  const serviceQuery = useServiceOverview({
    period,
    enabled: isAuthenticated && !isDeals,
  });

  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      {navRail ?? <NavRail />}

      <main className="flex min-w-0 flex-col gap-4 overflow-y-auto pr-1">
        <PageHeader
          icon={<IconLayoutDashboard size={22} />}
          title="Dashboard"
          description="Visão geral de negócios e atendimento"
          actions={
            <FilterBar
              preset={preset}
              onPresetChange={handlePreset}
              customRange={customRange}
              onCustomRangeChange={setCustomRange}
              pipelines={pipelines}
              pipelineId={pipelineId}
              onPipelineChange={setPipelineId}
              showPipeline={isDeals}
            />
          }
        />

        <TabsGlass
          tabs={["Negócios", "Atendimento"]}
          activeTab={activeTab}
          onChange={setActiveTab}
          className="max-w-[280px]"
        />

        {isDeals ? (
          <QueryState
            isLoading={dealsQuery.isLoading}
            error={dealsQuery.error}
            hasData={!!dealsQuery.data}
          >
            {dealsQuery.data && <DealsOverview data={dealsQuery.data} />}
          </QueryState>
        ) : (
          <QueryState
            isLoading={serviceQuery.isLoading}
            error={serviceQuery.error}
            hasData={!!serviceQuery.data}
          >
            {serviceQuery.data && <ServiceOverview data={serviceQuery.data} />}
          </QueryState>
        )}
      </main>
    </div>
  );
}

function QueryState({
  isLoading,
  error,
  hasData,
  children,
}: {
  isLoading: boolean;
  error: unknown;
  hasData: boolean;
  children: React.ReactNode;
}) {
  if (isLoading && !hasData) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[104px] animate-pulse rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]"
            />
          ))}
        </div>
        <div className="h-[260px] animate-pulse rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[var(--radius-xl)] border border-[var(--color-danger)]/20 bg-[color-mix(in_srgb,var(--color-danger)_8%,transparent)] p-6 text-center font-body text-[13px] text-[var(--color-danger-text)]">
        {error instanceof Error ? error.message : "Erro ao carregar o dashboard."}
      </div>
    );
  }

  return <>{children}</>;
}
