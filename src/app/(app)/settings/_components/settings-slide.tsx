"use client";

import { usePathname } from "next/navigation";

/**
 * Wrapper do painel direito: a cada troca de sub-rota, o conteúdo entra
 * deslizando da direita (mesma animação das rotas da NavRail —
 * `.v2-content-slide-in`). O `key={pathname}` força remontagem para a
 * animação CSS disparar em cada navegação. NavRail e sidebar de settings
 * ficam fora deste wrapper → permanecem estáticas.
 */
export function SettingsSlide({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div
      key={pathname}
      className="v2-content-slide-in flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden"
    >
      {children}
    </div>
  );
}
