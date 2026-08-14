import { headers } from "next/headers";

import { PageLoading } from "@/components/crm/page-loading";
import { FlowPendingShell } from "@/components/pipeline/flow-pending-shell";

/**
 * Fallback de Suspense do route group `(app)`.
 * Path vem do header `x-pathname` (middleware) — não de `usePathname()`,
 * que no 1º paint do loading.tsx chega vazio e vazava os 4 cards do
 * PageLoading no F5 de `/pipeline/flow`.
 */
function isFlowPath(raw: string): boolean {
  if (!raw) return false;
  try {
    const path = raw.startsWith("http") ? new URL(raw).pathname : raw.split("?")[0];
    return path.startsWith("/pipeline/flow");
  } catch {
    return raw.includes("/pipeline/flow");
  }
}

export default async function Loading() {
  const h = await headers();
  const raw = h.get("x-pathname") ?? h.get("next-url") ?? "";
  if (isFlowPath(raw)) return <FlowPendingShell />;
  return <PageLoading />;
}
