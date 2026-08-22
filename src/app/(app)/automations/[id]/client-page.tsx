"use client";

import { NavRailSpacer } from "@/components/crm/nav-rail-spacer";
import { FlowEditor } from "@/components/flow/flow-editor";

/**
 * Builder de automação v2 — editor canvas novo (ex-/fluxo).
 *
 * ATENÇÃO: o FlowEditor ainda não lê o `id` da rota nem persiste na API —
 * o canvas é o fluxo BV-Calouros com rascunho em localStorage. A troca do
 * editor legado (features/legacy-v1) por este é de UX; a carga/ salvamento
 * por automação ficam de follow-up.
 */
export default function V2AutomationDetailClientPage() {
  return (
    <div className="v2-screen grid grid-cols-[var(--nav-rail-w,72px)_1fr] gap-4 overflow-hidden p-4">
      <NavRailSpacer />
      <main className="flex min-h-0 min-w-0 flex-col overflow-hidden">
        <FlowEditor />
      </main>
    </div>
  );
}
