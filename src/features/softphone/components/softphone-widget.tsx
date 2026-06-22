"use client";

/**
 * SoftphoneWidget — placeholder global do softphone (montado no
 * `(app)/layout.tsx`).
 *
 * Estado atual: NO-OP intencional. O `feat(softphone)` (commit 572f06e)
 * restaurou os componentes auxiliares (DealCallButton, CallHistoryList,
 * forms de configuração, hook `use-softphone` com JsSIP singleton) mas
 * NÃO incluiu o widget global flutuante — o caller do layout esperava
 * o componente existir e o build do Easypanel quebra sem essa exportação.
 *
 * Render no-op mantém o layout compilando enquanto o widget real
 * (provavelmente uma chip flutuante com estado da chamada ativa
 * vindo do hook `use-softphone`) não é portado. Substituir este
 * arquivo pela implementação real quando ela existir.
 */
export function SoftphoneWidget() {
  return null;
}

export default SoftphoneWidget;
