/**
 * /campaigns — Campanhas v2 (canal Meta Cloud API).
 * Server wrapper que injeta o NavRailV2 e delega a UI para o client component.
 * O gating de permissão é reforçado pelo backend nas rotas /api/campaigns/*.
 */

import CampaignsClientPage from "./client-page";

export const dynamic = "force-dynamic";

export default function CampaignsPage() {
  return <CampaignsClientPage />;
}
