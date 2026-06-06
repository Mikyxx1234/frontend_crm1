"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { IconAdjustmentsHorizontal, IconLayoutDashboard } from "@tabler/icons-react";
import { toast } from "sonner";

import { NavRail } from "@/components/crm/nav-rail";
import { PageHeader } from "@/components/crm/page-header";
import { TabsGlass } from "@/components/crm/tabs-glass";
import { ButtonGlass } from "@/components/crm/button-glass";
import { DealsDashboard } from "@/components/crm/dashboard/deals-dashboard";
import { DashboardLayoutEditor } from "@/components/crm/dashboard/dashboard-layout-editor";
import { ServiceOverview } from "@/components/crm/dashboard/service-overview";

import { DashboardFilters } from "@/features/dashboard-v2/components/dashboard-filters";
import {
  useDashboard,
  useDashboardFilterOptions,
  useServiceOverview,
} from "@/features/dashboard-v2/hooks";
import {
  useDashboardPreferences,
  useSaveDashboardPreferences,
} from "@/features/dashboard-v2/preferences";
import {
  periodToRangeISO,
  useDashboardFilters,
} from "@/features/dashboard-v2/use-dashboard-filters";
import { resolveDashboardBlocks } from "@/lib/dashboard-blocks-catalog";

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
  const isDeals = activeTab === 0;

  const [editing, setEditing] = useState(false);

  const { filters, patch, clear } = useDashboardFilters();

  const { data: options } = useDashboardFilterOptions(isAuthenticated);

  const dashboardQuery = useDashboard(filters, isAuthenticated && isDeals);

  const prefsQuery = useDashboardPreferences(isAuthenticated && isDeals);
  const savePrefs = useSaveDashboardPreferences();
  const resolvedBlocks = useMemo(
    () => resolveDashboardBlocks(prefsQuery.data?.dashboard?.blocks),
    [prefsQuery.data],
  );

  const period = useMemo(() => periodToRangeISO(filters), [filters]);
  const serviceQuery = useServiceOverview({
    period,
    enabled: isAuthenticated && !isDeals,
  });

  // Pipeline em uso: o explicitamente selecionado ou o resolvido pelo
  // backend (default da org) — usado para popular as opções de etapa.
  const effectivePipelineId =
    filters.pipelineId ?? dashboardQuery.data?.pipelineId;

  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      {navRail ?? <NavRail />}

      <main className="flex min-w-0 flex-col gap-4 overflow-y-auto pr-1">
        <PageHeader
          icon={<IconLayoutDashboard size={22} />}
          title="Dashboard"
          description="Visão geral de negócios e atendimento"
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsGlass
            tabs={["Negócios", "Atendimento"]}
            activeTab={activeTab}
            onChange={(i) => {
              setActiveTab(i);
              setEditing(false);
            }}
            className="max-w-[280px]"
          />
          {isDeals && !editing && dashboardQuery.data && (
            <ButtonGlass
              variant="glass"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <IconAdjustmentsHorizontal size={15} />
              Editar dashboard
            </ButtonGlass>
          )}
        </div>

        {!editing && (
          <DashboardFilters
            filters={filters}
            onPatch={patch}
            onClear={clear}
            options={options}
            effectivePipelineId={effectivePipelineId}
            showStructural={isDeals}
          />
        )}

        {isDeals ? (
          editing ? (
            <DashboardLayoutEditor
              initial={resolvedBlocks}
              saving={savePrefs.isPending}
              onCancel={() => setEditing(false)}
              onSave={(blocks) =>
                savePrefs.mutate(blocks, {
                  onSuccess: () => {
                    toast.success("Layout do dashboard salvo.");
                    setEditing(false);
                  },
                  onError: (e) =>
                    toast.error(e.message || "Não foi possível salvar o layout."),
                })
              }
            />
          ) : (
            <QueryState
              isLoading={dashboardQuery.isLoading}
              error={dashboardQuery.error}
              hasData={!!dashboardQuery.data}
            >
              {dashboardQuery.data && (
                <DealsDashboard
                  data={dashboardQuery.data}
                  blocks={resolvedBlocks}
                />
              )}
            </QueryState>
          )
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
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
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
