import { PageLoading } from "@/components/crm/page-loading";

/** Fallback de Suspense para as rotas de `(app)` — skeleton com placeholder
 *  da NavRail + conteúdo. Seções com layout próprio (ex.: settings) têm o
 *  seu próprio `loading.tsx`. */
export default function Loading() {
  return <PageLoading />;
}
