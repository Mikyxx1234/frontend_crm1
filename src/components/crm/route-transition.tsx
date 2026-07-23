"use client";

import { usePathname } from "next/navigation";

/**
 * Transição de entrada das páginas abertas pela NavRail.
 *
 * Chaveia pelo PRIMEIRO segmento da rota (`/inbox`, `/pipeline`, `/settings`…):
 * ao trocar de seção, o wrapper remonta e o CSS anima só o conteúdo — a
 * NavRail (primeiro filho de `.v2-screen`) fica estática. Navegação DENTRO
 * da mesma seção (troca de query/sub-rota) mantém o mesmo segmento → não
 * replica a animação (evita flicker e preserva a transição interna própria,
 * ex.: SettingsSlide).
 *
 * O wrapper NÃO recebe `transform` próprio; a animação vive em
 * `.v2-route-transition > .v2-screen > *:not(:first-child)` (ver globals.css).
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const segment = pathname.split("/")[1] ?? "";
  return (
    <div key={segment} className="v2-route-transition contents">
      {children}
    </div>
  );
}
