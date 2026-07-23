/**
 * /widgets/distribution — Distribuição Inteligente (módulo do widget `smart_distribution`).
 * Injeta o NavRailV2 e delega a UI para o client component. O gating real é
 * feito no client (useWidgets) e reforçado pelo backend em todas as rotas.
 */

import DistributionClientPage from "./client-page";
import { NavRailSpacer } from "@/components/crm/nav-rail-spacer";

export const dynamic = "force-dynamic";

export default function DistributionPage() {
  return <DistributionClientPage navRail={<NavRailSpacer />} />;
}
