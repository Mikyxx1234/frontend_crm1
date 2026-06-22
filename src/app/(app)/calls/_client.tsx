"use client";

import { useState } from "react";
import { IconPhone } from "@tabler/icons-react";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import { PageFilterBar } from "@/components/crm/page-toolbar";
import { CallHistoryFilters } from "@/features/softphone/components/call-history-filters";
import { CallHistoryList } from "@/features/softphone/components/call-history-list";
import type { ListCallsFilters } from "@/features/softphone/api/types";

const DEFAULT_FILTERS: ListCallsFilters = { page: 1, perPage: 25 };

export default function CallsClientPage() {
  const [filters, setFilters] = useState<ListCallsFilters>(DEFAULT_FILTERS);

  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />

      <main className="flex min-w-0 flex-col gap-4 overflow-hidden">
        <PageHeader
          icon={<IconPhone size={22} stroke={2.2} />}
          title="Chamadas"
          description="Histórico de chamadas recebidas, realizadas e perdidas."
        />

        <PageFilterBar>
          <CallHistoryFilters filters={filters} onChange={setFilters} />
        </PageFilterBar>

        <CallHistoryList filters={filters} onFiltersChange={setFilters} />
      </main>
    </div>
  );
}
