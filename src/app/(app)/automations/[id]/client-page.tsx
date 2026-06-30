"use client";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import OldAutomationEditor from "@/features/legacy-v1/automations-editor";

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
 * Layout: NavRailV2 (72px) + área do editor. O editor usa margens
 * negativas (-m-6/md:-m-8) pra escapar do padding do pai; por isso
 * envolvemos num container com p-6/md:p-8 que ele cancela, preenchendo
 * a célula.
 */
export default function V2AutomationDetailClientPage() {
  return (
    <div className="v2-screen grid h-[100dvh] grid-cols-[72px_1fr] overflow-hidden">
      <div className="py-4 pl-4">
        <NavRailV2 />
      </div>
      <div className="relative min-h-0 overflow-hidden p-6 md:p-8">
        <OldAutomationEditor />
      </div>
    </div>
  );
}
