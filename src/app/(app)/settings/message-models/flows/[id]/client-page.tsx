"use client";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import OldFlowEditorClientPage from "@/app/old/settings/message-models/flows/[id]/client-page";

/**
 * Fase 1d (migração v1→v2): rota canônica `/settings/message-models/flows/[id]`
 * no shell v2. Fornece NavRailV2 + fundo mesh do layout (app). O editor já
 * tem seu próprio header glass com botão de voltar — não duplicamos PageHeader.
 */
export default function FlowEditorV2ClientPage() {
  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />
      <main className="flex min-w-0 flex-col overflow-auto">
        <OldFlowEditorClientPage />
      </main>
    </div>
  );
}
