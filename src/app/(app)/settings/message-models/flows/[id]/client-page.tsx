"use client";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import OldFlowEditorClientPage from "@/features/legacy-v1/settings/message-models/flows-id";

/**
 * Fase 1d (migração v1→v2): rota canônica `/settings/message-models/flows/[id]`
 * no shell v2. O editor mantém header glass próprio com voltar integrado.
 */
export default function FlowEditorV2ClientPage() {
  return (
    <div className="v2-screen grid grid-cols-[var(--nav-rail-w,72px)_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />
      <main className="flex min-w-0 flex-col overflow-auto">
        <OldFlowEditorClientPage />
      </main>
    </div>
  );
}
