"use client";

import { SalesHubHost } from "@/components/pipeline/sales-hub-host";

/**
 * Rota standalone `/saleshub` — mesmo host do tab Flow em `/pipeline/flow`.
 */
export default function SalesHubClientPage() {
  return <SalesHubHost showPipelineName />;
}
