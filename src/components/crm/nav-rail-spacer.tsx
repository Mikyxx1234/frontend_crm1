/*
 * NavRailSpacer — placeholder da coluna do trilho de navegação.
 *
 * O `NavRailV2` REAL agora vive uma única vez no layout `(app)` (fixo e
 * persistente entre navegações — não remonta, então os ícones não piscam).
 * As páginas continuam usando o grid `grid-cols-[var(--nav-rail-w,72px)_…]`;
 * este spacer só OCUPA a primeira coluna (reserva o espaço) para o conteúdo
 * cair na coluna certa. Sem efeitos/imagens/estado → zero flash.
 *
 * `max-md:hidden` espelha o rail (no mobile a coluna some — grid vira 1 col
 * e a navegação vai para a MobileBottomNav).
 */
export function NavRailSpacer() {
  return <div aria-hidden className="max-md:hidden" />;
}
