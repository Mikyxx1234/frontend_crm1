/*
 * Layout do route group (v2) — escopo isolado para páginas reescritas
 * com o pacote visual v0 (components/crm/*).
 *
 * Decisões:
 *  - NÃO usa DashboardShell legado (cada página v2 tem seu próprio NavRail).
 *  - Importa globals-v2.css com tokens/utilities adicionais (av-*, online,
 *    enterprise-bg, lead). Aditivo ao globals.css principal — zero risco
 *    de regressão em /inbox, /pipeline, /settings, etc.
 *  - Auth/Providers já são herdados de app/layout.tsx (root).
 */

import "@/styles/globals-v2.css";

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return (
    <div
      // Pintura de fundo do mesh translucido (mesma paleta do v0).
      // Cobre TODA a tela do route group, sem depender de nenhum
      // wrapper externo.
      className="v2-root v2-min-screen bg-[var(--bg-base)]"
      style={{
        backgroundImage:
          "radial-gradient(at 20% 10%, var(--bg-mesh-1, #b8cfec) 0px, transparent 50%), radial-gradient(at 80% 90%, var(--bg-mesh-2, #e8d5f0) 0px, transparent 50%)",
      }}
    >
      {children}
    </div>
  );
}
