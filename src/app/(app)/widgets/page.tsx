/**
 * /widgets — Central de Widgets (extensoes internas da organizacao).
 * Injeta o `<NavRailSpacer />` e delega a UI para o client component.
 */

import WidgetsClientPage from "./client-page";
import { NavRailSpacer } from "@/components/crm/nav-rail-spacer";

export const dynamic = "force-dynamic";

export default function WidgetsPage() {
  return <WidgetsClientPage navRail={<NavRailSpacer />} />;
}
