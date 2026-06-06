"use client";

import * as React from "react";

/**
 * Renderiza `children` apenas no client, depois do mount.
 *
 * Use quando um filho usa `useId()`/state do React em uma posicao da
 * arvore cuja contagem de chamadas pode divergir entre SSR e CSR
 * (ex.: Radix DropdownMenu logo apos lazy-mounted siblings). Sem isso,
 * o React reclama de hydration mismatch:
 *   "A tree hydrated but some attributes ... id=radix-_R_1... vs _R_5..."
 *
 * Trade-off: o conteudo nao chega ao HTML SSR — quem precisa de SEO
 * deve usar outra solucao. Para chrome de app (header, dropdowns,
 * controles), e o caminho mais seguro.
 *
 * Passe `fallback` com a mesma dimensao do children pra evitar layout
 * shift no momento do mount (ex.: `<div className="h-10 w-[180px]" />`).
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return <>{fallback}</>;
  return <>{children}</>;
}
