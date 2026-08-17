import DemandsClientPage from "./client-page";
import { NavRailSpacer } from "@/components/crm/nav-rail-spacer";

export const dynamic = "force-dynamic";

export default function DemandsPage() {
  return <DemandsClientPage navRail={<NavRailSpacer />} />;
}
