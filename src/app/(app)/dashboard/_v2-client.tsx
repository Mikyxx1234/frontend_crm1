"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { IconAdjustmentsHorizontal, IconLayoutDashboard } from "@tabler/icons-react";
import { toast } from "sonner";

import { NavRail } from "@/components/crm/nav-rail";
import { PageHeader } from "@/components/crm/page-header";
import {
  PageGhostButton,
  PageSegmentedControl,
} from "@/components/crm/page-toolbar";
import { DealsDashboard } from "@/components/crm/dashboard/deals-dashboard";
import { DashboardLayoutEditor } from "@/components/crm/dashboard/dashboard-layout-editor";
import { ServiceOverview } from "@/components/crm/dashboard/service-overview";
import { TabulationsDashboard } from "@/app/(app)/settings/tabulations/tabulations-dashboard";
import { AgentsOnlineWidget } from "@/components/dashboard/widgets/agents-online-widget";
import { useUserRole } from "@/hooks/use-user-role";
import { IconUsers } from "@tabler/icons-react";

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
const DASHBOARD_TABS = [
  { key: "deals", label: "Negócios" },
  { key: "service", label: "Atendimento" },
  // Motivos de encerramento. Reaproveita a tela de settings inteira — ela já
  // traz período/usuário/departamento próprios, por isso escondemos o filtro
  // global nesta aba.
  { key: "tabulations", label: "Tabulações" },
] as const;

type DashboardTabKey = (typeof DASHBOARD_TABS)[number]["key"];

interface DashboardV2ClientPageProps {
  navRail?: React.ReactNode;
}

export default function DashboardV2ClientPage({
  navRail,
}: DashboardV2ClientPageProps = {}) {
  const { status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";
  const { isManagerUp } = useUserRole();

  const [activeTab, setActiveTab] = useState<DashboardTabKey>("deals");
  const isDeals = activeTab === "deals";
  const isService = activeTab === "service";
  const isTabulations = activeTab === "tabulations";

  const visibleTabs = useMemo(
    () => DASHBOARD_TABS.filter((t) => t.key !== "tabulations" || isManagerUp),
    [isManagerUp],
  );

  const [editing, setEditing] = useState(false);

  const { data: options } = useDashboardFilterOptions(isAuthenticated);

  const { filters, patch, clear } = useDashboardFilters(options?.pipelines);

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
    enabled: isAuthenticated && isService,
  });

  // Pipeline em uso: o explicitamente selecionado ou o resolvido pelo
  // backend (default da org) — usado para popular as opções de etapa.
  const effectivePipelineId =
    filters.pipelineId ?? dashboardQuery.data?.pipelineId;

  return (
    <div className="v2-screen grid grid-cols-[var(--nav-rail-w,72px)_1fr] gap-4 overflow-hidden p-4">
      {navRail ?? <NavRail />}

      <main className="flex min-w-0 flex-col gap-4 overflow-hidden">
        <PageHeader
          icon={<IconLayoutDashboard size={22} stroke={2.2} />}
          title="Dashboard"
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <PageSegmentedControl
                size="compact"
                aria-label="Visão do dashboard"
                items={visibleTabs.map((tab) => ({
                  value: tab.key,
                  label: tab.label,
                }))}
                value={activeTab}
                onChange={(v) => {
                  setActiveTab(v as DashboardTabKey);
                  setEditing(false);
                }}
              />
              {isDeals && !editing && dashboardQuery.data ? (
                <PageGhostButton type="button" onClick={() => setEditing(true)}>
                  <IconAdjustmentsHorizontal size={15} /> Editar dashboard
                </PageGhostButton>
              ) : null}
            </div>
          }
        />

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
        {!editing && !isTabulations && (
          <DashboardFilters
            filters={filters}
            onPatch={patch}
            onClear={clear}
            options={options}
            effectivePipelineId={effectivePipelineId}
            showStructural={isDeals}
          />
        )}

        {isManagerUp && !editing && !isTabulations && (
          <section className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-5 shadow-[var(--glass-shadow)] backdrop-blur-md">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
                <IconUsers size={17} />
              </span>
              <div>
                <h3 className="font-display text-[15px] font-bold text-foreground">
                  Equipe online
                </h3>
                <p className="text-[12px] text-muted-foreground">
                  Disponibilidade dos agentes para distribuição de leads
                </p>
              </div>
            </div>
            <AgentsOnlineWidget />
          </section>
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
        ) : isService ? (
          <QueryState
            isLoading={serviceQuery.isLoading}
            error={serviceQuery.error}
            hasData={!!serviceQuery.data}
          >
            {serviceQuery.data && <ServiceOverview data={serviceQuery.data} />}
          </QueryState>
        ) : (
          <TabulationsDashboard />
        )}
        </div>
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
