import { AppRouteLoading } from "@/components/pipeline/flow-pending-shell";

/** Fallback de Suspense para as rotas de `(app)` — skeleton com placeholder
 *  da NavRail + conteúdo. Seções com layout próprio (ex.: settings) têm o
 *  seu próprio `loading.tsx`. `/pipeline/flow` usa o chrome do Flow, não
 *  os 4 cards genéricos do PageLoading. */
export default function Loading() {
  return <AppRouteLoading />;
}
