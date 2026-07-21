"use client";

import { IconRobot } from "@tabler/icons-react";

import OldAIAgentsPage from "@/features/legacy-v1/ai-agents";
import { AppV2PageShell } from "../_v2-page-shell";

/**
 * Fase 3 (migração v1→v2): rota canônica `/ai-agents` no shell v2.
 *
 * Mesma observação de `/reports`: não há item correspondente no
 * `SIDEBAR_CATALOG` backend — registrado em DECISOES-PENDENTES. A rota fica
 * acessível por URL direta. A v1 já cobre lista, editor e fila de rascunhos;
 * a reskin V0 entra na Fase 5/6.
 */
export default function AIAgentsV2ClientPage() {
  return (
    <AppV2PageShell
      title="Agentes de IA"
      description="Configure assistentes, prompts e fila de rascunhos"
      icon={<IconRobot size={22} />}
    >
      <div className="min-w-0 overflow-x-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-3 backdrop-blur-md sm:p-4">
        <OldAIAgentsPage embedded />
      </div>
    </AppV2PageShell>
  );
}

