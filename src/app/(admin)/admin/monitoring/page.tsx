import { IconActivity as Activity } from "@tabler/icons-react";

import { PageHeader } from "@/components/ui/page-header";
import { apiServerGet } from "@/lib/api-server";

import { MonitoringClient, type PerfReport } from "./monitoring-client";

export const dynamic = "force-dynamic";

export default async function AdminMonitoringPage() {
  const initial = await apiServerGet<PerfReport>(
    "/api/admin/perf-report?windowMinutes=60",
  ).catch(() => null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<Activity />}
        eyebrow="Plataforma"
        title="Monitoring"
        description="Uso de CPU, memoria, disco, IO, banco, filas e API — DEV e PROD, saida consumivel por IA."
      />
      <MonitoringClient initial={initial} />
    </div>
  );
}
