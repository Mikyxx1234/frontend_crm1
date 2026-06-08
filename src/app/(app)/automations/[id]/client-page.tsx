"use client";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import OldAutomationEditor from "@/app/old/automations/[id]/client-page";

/**
 * Builder de automação v2.
 *
 * DECISÃO (pragmática): em vez de reconstruir o canvas glass do zero
 * (que exigiria reimplementar conversão de config legado, ramificações,
 * handles nomeados e auto-layout no formato FlowNodeData), reusamos o
 * editor v1 completo — `AutomationDetailPage` de `/old/automations/[id]`.
 *
 * Ele já resolve TUDO:
 *  - fetch de /api/automations/:id (com steps)
 *  - normalizeLegacyStepConfig (config Kommo legado → canônico)
 *  - WorkflowCanvas com ramificações reais, cores por tipo, salvar/toggle
 *
 * O editor lê o `id` via useParams() — como a rota v2 também é
 * `/automations/[id]`, pega o mesmo id sem precisar de prop.
 *
 * Trade-off aceito: o canvas mantém o visual v1 (não glass). A migração
 * pro canvas glass nativo é tarefa do v0 (componente novo de node que
 * entenda o formato do backend). Até lá, isto entrega 100% funcional.
 *
 * Layout: segue o padrão canônico das telas v2
 * (`grid-cols-[72px_1fr] gap-4 p-4` + `<NavRailV2 />`). O editor é
 * envolvido num card glass arredondado que ocupa a célula 1fr e alinha
 * verticalmente com a nav rail. O editor usa `-m-6/md:-m-8` pra escapar
 * de paddings; aqui o card NÃO tem padding (o editor preenche full-bleed)
 * e o `rounded-[var(--radius-xl)] overflow-hidden` recorta a topbar/canvas
 * pra casar com o respiro da nav rail.
 */
export default function V2AutomationDetailClientPage() {
  return (
    <div className="v2-screen grid h-[100dvh] grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />
      <main className="relative min-h-0 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] shadow-[var(--glass-shadow-sm)]">
        <div className="absolute inset-0 p-6 md:p-8">
          <OldAutomationEditor />
        </div>
      </main>
    </div>
  );
}
