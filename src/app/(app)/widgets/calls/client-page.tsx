"use client";

/**
 * CallsClientPage — histórico de chamadas dentro da Central de Widgets.
 *
 * Gating:
 *   - Se o widget `calls_history` está INSTALADO: renderiza a UI normal
 *     (filtros + lista).
 *   - Se NÃO está instalado: mostra `NotEnabledState` com CTA pra
 *     `/widgets` (espelha o padrão de `/widgets/distribution`).
 *   - Enquanto a query carrega: skeleton (evita flash do estado vazio).
 *
 * O SoftphoneWidget global e o DealCallButton nos cards usam o MESMO
 * gate (`useCallsWidget`) — quem desinstala aqui desliga TUDO de
 * telefonia, sem precisar mexer em mais nada.
 */

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { IconPhone, IconSettings } from "@tabler/icons-react";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import { PageFilterBar } from "@/components/crm/page-toolbar";
import { CallHistoryFilters } from "@/features/softphone/components/call-history-filters";
import { CallHistoryList } from "@/features/softphone/components/call-history-list";
import { useCallsWidget } from "@/features/softphone/hooks/use-calls-widget";
import type { ListCallsFilters } from "@/features/softphone/api/types";

const DEFAULT_FILTERS: ListCallsFilters = { page: 1, perPage: 25 };

interface CallsClientPageProps {
  navRail?: React.ReactNode;
}

export default function CallsClientPage({ navRail }: CallsClientPageProps = {}) {
  const { status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";
  const callsWidget = useCallsWidget(isAuthenticated);

  const [filters, setFilters] = useState<ListCallsFilters>(DEFAULT_FILTERS);

  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      {navRail ?? <NavRailV2 />}

      <main className="flex min-w-0 flex-col gap-4 overflow-hidden">
        <PageHeader
          icon={<IconPhone size={22} stroke={2.2} />}
          title="Chamadas"
          description="Histórico de chamadas recebidas, realizadas e perdidas."
          actions={
            <Link
              href="/settings/softphone"
              className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-4 py-2 font-display text-[13px] font-medium text-[var(--text-primary)] transition-all hover:-translate-y-px hover:bg-[var(--glass-bg-strong)]"
              title="Abrir configurações do softphone (provedor, ramal, webhook)"
            >
              <IconSettings size={16} />
              Configurações
            </Link>
          }
        />

        {callsWidget.isLoading ? (
          <SkeletonState />
        ) : callsWidget.enabled !== true ? (
          <NotEnabledState />
        ) : (
          <>
            <PageFilterBar>
              <CallHistoryFilters filters={filters} onChange={setFilters} />
            </PageFilterBar>
            <CallHistoryList filters={filters} onFiltersChange={setFilters} />
          </>
        )}
      </main>
    </div>
  );
}

function NotEnabledState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-12 text-center shadow-[var(--glass-shadow-sm)] backdrop-blur-md">
      <IconPhone size={36} className="text-[var(--text-muted)]" />
      <p className="font-display text-[16px] font-bold text-[var(--text-primary)]">
        Módulo de Telefonia não habilitado
      </p>
      <p className="max-w-md font-body text-[13px] text-[var(--text-muted)]">
        O histórico de chamadas, o softphone integrado e o botão de ligar nos
        cards fazem parte do widget de Telefonia. Ative-o na Central de Widgets
        para liberar esta área.
      </p>
      <a
        href="/widgets"
        className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-primary)] px-4 py-2 font-display text-[13px] font-bold text-white transition-all hover:-translate-y-px"
      >
        Ir para a Central de Widgets
      </a>
    </div>
  );
}

function SkeletonState() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] backdrop-blur-md"
        />
      ))}
    </div>
  );
}
