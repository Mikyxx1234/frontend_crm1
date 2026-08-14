import { AppLoading } from "@/components/crm/app-loading";

/**
 * Compat: `PageLoading` / `PanelLoading` continuam existindo como nomes, mas
 * NÃO desenham mais skeletons que imitam o layout final (header + 4 cards +
 * área principal). Eles delegam para o `AppLoading` — estado de carregamento
 * único do app.
 *
 * - `PageLoading`: rota top-level (reserva a coluna da NavRail).
 * - `PanelLoading`: só o painel, para seções cujo `layout.tsx` já mantém
 *   rail/sidebar persistentes (ex.: `/settings`).
 */

export function PageLoading() {
  return <AppLoading variant="screen" />;
}

export function PanelLoading() {
  return <AppLoading variant="panel" />;
}
