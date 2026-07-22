"use client";

import { usePathname } from "next/navigation";

/**
 * Transição de entrada das páginas abertas pela NavRail.
 *
 * Chaveia pelo PRIMEIRO segmento da rota (`/inbox`, `/pipeline`, `/settings`…):
 * ao trocar de seção, o wrapper remonta e a animação `v2-page-slide-in`
 * dispara. Navegação DENTRO da mesma seção (troca de query/sub-rota) mantém
 * o mesmo segmento → não replica a animação (evita flicker e preserva a
 * transição interna própria, ex.: SettingsSlide).
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const segment = pathname.split("/")[1] ?? "";
  return (
    <div key={segment} className="v2-page-slide-in">
      {children}
    </div>
  );
}
