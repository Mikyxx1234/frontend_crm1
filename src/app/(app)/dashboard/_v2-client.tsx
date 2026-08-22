"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { IconLayoutDashboard, IconUsers } from "@tabler/icons-react";

import { AppLoading } from "@/components/crm/app-loading";
import { NavRail } from "@/components/crm/nav-rail";
import { PageHeader } from "@/components/crm/page-header";
import { PageSegmentedControl } from "@/components/crm/page-toolbar";
import { ManagerDashboard } from "@/components/crm/dashboard/manager-dashboard";
import { OperatorDashboard } from "@/components/crm/dashboard/operator-dashboard";
import { ServiceOverview } from "@/components/crm/dashboard/service-overview";
import { TabulationsDashboard } from "@/app/(app)/settings/tabulations/tabulations-dashboard";
import { AgentsOnlineWidget } from "@/components/dashboard/widgets/agents-online-widget";
import { useUserRole } from "@/hooks/use-user-role";

import { DashboardFilters } from "@/features/dashboard-v2/components/dashboard-filters";
import {
  useDashboard,
  useDashboardFilterOptions,
  useDashboardMe,
  useServiceOverview,
} from "@/features/dashboard-v2/hooks";
import {
  periodToRangeISO,
  useDashboardFilters,
} from "@/features/dashboard-v2/use-dashboard-filters";

const DASHBOARD_TABS = [
  { key: "deals", label: "Negócios" },
  { key: "service", label: "Atendimento" },
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
  const { isManagerUp, ready } = useUserRole();

  if (!ready) {
    return (
      <div className="v2-screen grid grid-cols-[var(--nav-rail-w,72px)_1fr] gap-4 overflow-hidden p-4">
        {navRail ?? <NavRail />}
        <AppLoading variant="inline" className="min-h-[420px]" />
      </div>
    );
  }

  return isManagerUp ? (
    <ManagerHome navRail={navRail} isAuthenticated={isAuthenticated} />
  ) : (
    <OperatorHome navRail={navRail} isAuthenticated={isAuthenticated} />
  );
}

function OperatorHome({
  navRail,
  isAuthenticated,
}: {
  navRail?: React.ReactNode;
  isAuthenticated: boolean;
}) {
  const query = useDashboardMe(isAuthenticated);

  return (
    <Shell navRail={navRail} title="Sua fila">
      <QueryState isLoading={query.isLoading} error={query.error} hasData={!!query.data}>
        {query.data ? <OperatorDashboard data={query.data} /> : null}
      </QueryState>
    </Shell>
  );
}

function ManagerHome({
  navRail,
  isAuthenticated,
}: {
  navRail?: React.ReactNode;
  isAuthenticated: boolean;
}) {
  const [activeTab, setActiveTab] = useState<DashboardTabKey>("deals");
  const isDeals = activeTab === "deals";
  const isService = activeTab === "service";
  const isTabulations = activeTab === "tabulations";

  const { data: options } = useDashboardFilterOptions(isAuthenticated);
  const { filters, patch, clear } = useDashboardFilters(options?.pipelines);
  const dashboardQuery = useDashboard(filters, isAuthenticated && isDeals);
  const period = useMemo(() => periodToRangeISO(filters), [filters]);
  const serviceQuery = useServiceOverview({
    period,
    enabled: isAuthenticated && isService,
  });
  const effectivePipelineId = filters.pipelineId ?? dashboardQuery.data?.pipelineId;

  return (
    <Shell
      navRail={navRail}
      title="Dashboard"
      actions={
        <PageSegmentedControl
          size="compact"
          aria-label="Visão do dashboard"
          items={DASHBOARD_TABS.map((tab) => ({
            value: tab.key,
            label: tab.label,
          }))}
          value={activeTab}
          onChange={(v) => setActiveTab(v as DashboardTabKey)}
        />
      }
    >
      {!isTabulations && (
        <DashboardFilters
          filters={filters}
          onPatch={patch}
          onClear={clear}
          options={options}
          effectivePipelineId={effectivePipelineId}
          showStructural={isDeals}
        />
      )}

      {!isTabulations && (
        <section className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-5 shadow-[var(--glass-shadow)] backdrop-blur-md">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
              <IconUsers size={17} />
            </span>
            <div>
              <h3 className="font-display text-[15px] font-bold text-foreground">Equipe online</h3>
              <p className="text-[12px] text-muted-foreground">Quem está disponível agora</p>
            </div>
          </div>
          <AgentsOnlineWidget />
        </section>
      )}

      {isDeals ? (
        <QueryState
          isLoading={dashboardQuery.isLoading}
          error={dashboardQuery.error}
          hasData={!!dashboardQuery.data}
        >
          {dashboardQuery.data ? (
            <ManagerDashboard data={dashboardQuery.data} period={period} />
          ) : null}
        </QueryState>
      ) : isService ? (
        <QueryState
          isLoading={serviceQuery.isLoading}
          error={serviceQuery.error}
          hasData={!!serviceQuery.data}
        >
          {serviceQuery.data ? <ServiceOverview data={serviceQuery.data} /> : null}
        </QueryState>
      ) : (
        <TabulationsDashboard />
      )}
    </Shell>
  );
}

function Shell({
  navRail,
  title,
  actions,
  children,
}: {
  navRail?: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="v2-screen grid grid-cols-[var(--nav-rail-w,72px)_1fr] gap-4 overflow-hidden p-4">
      {navRail ?? <NavRail />}
      <main className="flex min-w-0 flex-col gap-4 overflow-hidden">
        <PageHeader
          icon={<IconLayoutDashboard size={22} stroke={2.2} />}
          title={title}
          actions={actions}
        />
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">{children}</div>
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
    return <AppLoading variant="inline" className="min-h-[420px]" />;
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
