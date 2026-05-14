import { auth } from "@/lib/auth-public";
import { apiServerGet } from "@/lib/api-server";
import { CampaignBuilderWizard } from "@/features/campaign-builder/campaign-builder-wizard";

import ClientPage from "./client-page";

/**
 * Feature-flag campaign_builder_v2.
 *
 * No monólito a checagem batia no Prisma via `isFeatureEnabled`. No frontend
 * separado isso vira um GET `/api/feature-flags?key=campaign_builder_v2`
 * server-side (rewrite pro backend) — assim mantém a UX de SSR sem precisar
 * de Prisma local.
 *
 * Se a chamada falhar (backend indisponível, sem permissão), cai pro
 * builder v1 que é o default seguro.
 */
type FeatureFlagResp = { enabled: boolean };

export default async function Page() {
  const session = await auth();
  const orgId = (session?.user as { organizationId?: string | null } | undefined)
    ?.organizationId;

  let useBuilderV2 = false;
  if (orgId) {
    try {
      const res = await apiServerGet<FeatureFlagResp>(
        `/api/feature-flags?key=campaign_builder_v2`,
      );
      useBuilderV2 = Boolean(res?.enabled);
    } catch {
      useBuilderV2 = false;
    }
  }

  if (useBuilderV2) {
    return <CampaignBuilderWizard />;
  }

  return <ClientPage />;
}
