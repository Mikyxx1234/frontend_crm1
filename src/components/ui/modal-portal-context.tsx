"use client";

import * as React from "react";

/**
 * Container de portal para popovers/menus dentro de um modal.
 *
 * Problema: o `Dialog` (components/ui/dialog.tsx) usa o elemento `<dialog>`
 * nativo com `showModal()`, que cria uma *top-layer* real + `::backdrop`.
 * Componentes Radix (DropdownGlass etc.) portam seu conteúdo para
 * `document.body` por padrão — ou seja, FORA da top-layer — e ficam atrás
 * do backdrop, invisíveis e com os cliques interceptados pelo `<dialog>`.
 *
 * Solução: o `DialogContent` publica seu nó `<dialog>` neste contexto e os
 * componentes flutuantes portam para dentro dele (`Portal container={...}`),
 * voltando a renderizar acima do backdrop e a receber eventos de ponteiro.
 *
 * Fora de um modal o valor é `null` → comportamento padrão (portal no body).
 */
export const ModalPortalContext = React.createContext<HTMLElement | null>(null);

export function useModalPortalContainer(): HTMLElement | null {
  return React.useContext(ModalPortalContext);
}
