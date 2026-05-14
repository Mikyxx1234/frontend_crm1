import { auth } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { CampaignBuilderWizard } from "@/features/campaign-builder/campaign-builder-wizard";

import ClientPage from "./client-page";

export default async function Page() {
  const session = await auth();
  const orgId = (session?.user as { organizationId?: string | null } | undefined)
    ?.organizationId;

  const useBuilderV2 = orgId
    ? await isFeatureEnabled("campaign_builder_v2", orgId)
    : false;

  if (useBuilderV2) {
    return <CampaignBuilderWizard />;
  }

  return <ClientPage />;
}
