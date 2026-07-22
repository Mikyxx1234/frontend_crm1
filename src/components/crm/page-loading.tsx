import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeletons de carregamento de rota (Suspense do App Router — `loading.tsx`).
 *
 * - `PageLoading`: página top-level completa (placeholder da NavRail à
 *   esquerda + skeleton de header/conteúdo). Usado no `(app)/loading.tsx`,
 *   fallback para todas as seções cujas páginas renderizam a própria rail.
 * - `PanelLoading`: só o painel de conteúdo — para seções cujo `layout.tsx`
 *   já provê rail/sidebar persistentes (ex.: `/settings`).
 */

function ContentSkeleton() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 shrink-0 rounded-[var(--radius-lg)]" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      {/* Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-[var(--radius-xl)]" />
        ))}
      </div>
      {/* Área principal */}
      <Skeleton className="min-h-0 w-full flex-1 rounded-[var(--radius-xl)]" />
    </div>
  );
}

export function PageLoading() {
  return (
    <div
      className="v2-screen grid min-w-0 gap-3 overflow-hidden p-3 sm:gap-4 sm:p-4"
      style={{ gridTemplateColumns: "var(--nav-rail-w, 72px) minmax(0, 1fr)" }}
      aria-busy="true"
    >
      {/* Placeholder da NavRail — mesma cor/forma pra transição sem "salto". */}
      <div
        className="hidden h-full rounded-[var(--radius-xl)] border border-[var(--nav-border)] bg-[var(--nav-bg)] md:block"
        aria-hidden
      />
      <ContentSkeleton />
    </div>
  );
}

/** Loader só do painel — para layouts que já mantêm rail/sidebar (settings). */
export function PanelLoading() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col" aria-busy="true">
      <ContentSkeleton />
    </div>
  );
}
