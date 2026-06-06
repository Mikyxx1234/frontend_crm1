import { NavRailV2 } from "@/components/crm/nav-rail-v2";

import LogsClientPage from "./_client";

export const dynamic = "force-dynamic";

export default function LogsPage() {
  return <LogsClientPage navRail={<NavRailV2 />} />;
}
