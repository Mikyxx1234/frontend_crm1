/**
 * /widgets — Central de Widgets (extensoes internas da organizacao).
 * Injeta o `<NavRailV2 />` e delega a UI para o client component.
 */

import WidgetsClientPage from "./client-page";
import { NavRailV2 } from "@/components/crm/nav-rail-v2";

export const dynamic = "force-dynamic";

export default function WidgetsPage() {
  return <WidgetsClientPage navRail={<NavRailV2 />} />;
}
