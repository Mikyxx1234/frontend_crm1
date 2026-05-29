/*
 * Segmento REAL `/v2/*` — novo frontend isolado.
 *
 * Diferente do route group `(v2)` (parênteses, não aparece na URL),
 * este segmento materializa o prefixo `/v2/` no path. Convive com o
 * legado em zero-colisão: enquanto o `(v2)` continua respondendo nas
 * URLs antigas (/inbox-v2, /dashboard-v2, /pipeline/kanban-v2), o
 * novo shell vive em /v2/*.
 *
 * Mesma estratégia visual do `(v2)/layout.tsx`:
 *  - importa globals-v2.css (tokens av-*, glass, mesh, escala 0.88)
 *  - wrapper `.v2-root.v2-min-screen` pinta o mesh translucido
 *  - Auth/Providers vêm do root layout (NextAuth + React Query)
 */

import "@/styles/globals-v2.css";

export default function V2RealLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="v2-root v2-min-screen bg-[var(--color-background)]"
      style={{
        backgroundImage:
          "radial-gradient(at 20% 10%, var(--bg-mesh-1, #b8cfec) 0px, transparent 50%), radial-gradient(at 80% 90%, var(--bg-mesh-2, #e8d5f0) 0px, transparent 50%)",
      }}
    >
      {children}
    </div>
  );
}
