"use client";

import OldFlowEditorClientPage from "@/features/legacy-v1/settings/message-models/flows-id";

/**
 * Fase 1d (migração v1→v2): rota canônica `/settings/message-models/flows/[id]`.
 * NavRailV2 + sidebar de configurações agora vêm do layout master-detail
 * (`settings/layout.tsx`); aqui só o editor no painel direito.
 */
export default function FlowEditorV2ClientPage() {
  return (
    <main className="flex min-w-0 flex-1 flex-col overflow-auto">
      <OldFlowEditorClientPage />
    </main>
  );
}
