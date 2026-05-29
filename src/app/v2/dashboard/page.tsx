/**
 * /v2/dashboard — reaproveita DashboardV2ClientPage do route group
 * `(v2)/dashboard-v2`, injetando o `<NavRailV2 />`.
 *
 * Toda a feature `features/dashboard-v2` (analytics deals-overview,
 * service-overview, pipelines) é reaproveitada sem alterações.
 */

import DashboardV2ClientPage from "@/app/(v2)/dashboard-v2/client-page";
import { NavRailV2 } from "@/components/crm/nav-rail-v2";

export const dynamic = "force-dynamic";

export default function V2DashboardPage() {
  return <DashboardV2ClientPage navRail={<NavRailV2 />} />;
}
