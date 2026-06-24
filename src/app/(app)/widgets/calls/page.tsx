/**
 * /widgets/calls — Histórico de chamadas (módulo do widget `calls_history`).
 *
 * Espelha a antiga rota nativa `/calls`, agora gateada por widget — quem
 * desinstala a Telefonia em /widgets deixa de ver esta página, o
 * SoftphoneWidget global e o DealCallButton nos cards (todos compartilham
 * o mesmo gate via `useCallsWidget`).
 *
 * O gating real é feito no client (useCallsWidget); o backend reforça
 * em `/api/calls` quando aplicável.
 */

import CallsClientPage from "./client-page";
import { NavRailV2 } from "@/components/crm/nav-rail-v2";

export const dynamic = "force-dynamic";

export default function CallsWidgetPage() {
  return <CallsClientPage navRail={<NavRailV2 />} />;
}
