"use client";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import OldAutomationEditor from "@/features/legacy-v1/automations-editor";

/**
 * Builder de automação v2.
 *
 * Reusa o editor funcional (fetch, steps, ramificações, salvar/toggle).
 * Shell idêntico às demais páginas v2 (NavRail + p-4 + gap-4) — evita
 * o corte top/bottom que o layout antigo (100dvh + margens negativas)
 * causava sob o zoom do `.v2-root`.
 */
export default function V2AutomationDetailClientPage() {
  return (
    <div className="v2-screen grid grid-cols-[var(--nav-rail-w,72px)_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />
      <main className="flex min-h-0 min-w-0 flex-col overflow-hidden">
        <OldAutomationEditor />
      </main>
    </div>
  );
}
