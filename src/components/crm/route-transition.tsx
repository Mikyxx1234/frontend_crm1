"use client";

import { useEffect, useRef } from "react";
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
 * No F5 / primeiro paint NÃO anima: `animation-fill-mode: backwards`
 * (opacity:0) gerava flash branco/vazio antes do conteúdo aparecer.
 *
 * O wrapper NÃO recebe `transform` próprio; a animação vive em
 * `.v2-route-transition > .v2-screen > *:not(:first-child)` (ver globals.css).
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const segment = pathname.split("/")[1] ?? "";
  const isFirstPaint = useRef(true);

  useEffect(() => {
    isFirstPaint.current = false;
  }, []);

  return (
    <div
      key={segment}
      className={
        isFirstPaint.current
          ? "contents"
          : "v2-route-transition contents"
      }
    >
      {children}
    </div>
  );
}
