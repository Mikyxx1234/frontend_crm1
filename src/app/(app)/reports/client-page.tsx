"use client";

import { IconChartBar } from "@tabler/icons-react";

import OldReportsPage from "@/app/old/reports/client-page";
import { AppV2PageShell } from "../_v2-page-shell";

/**
 * Fase 2 (migração v1→v2): rota canônica `/reports` no shell v2.
 *
 * NOTA: o item "reports" não está no `SIDEBAR_CATALOG` (frontend nem backend),
 * então não aparece na NavRailV2 por padrão. Adicionar exige sincronizar o
 * catálogo backend (read-only nesta migração). Registrado em
 * `docs/design-system/DECISOES-PENDENTES.md`. A rota fica acessível por URL
 * direta e links pontuais até a próxima janela de mudança no backend.
 */
export default function ReportsV2ClientPage() {
  return (
    <AppV2PageShell
      title="Relatórios"
      description="Análises de pipeline, atendimento e performance"
      icon={<IconChartBar size={22} />}
    >
      <div className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-4 backdrop-blur-md">
        <OldReportsPage />
      </div>
    </AppV2PageShell>
  );
}
