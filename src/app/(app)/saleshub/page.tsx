import { Suspense } from "react";

import SalesHubClientPage from "./_client";
import { PageLoading } from "@/components/crm/page-loading";

export const dynamic = "force-dynamic";

export default function SalesHubPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SalesHubClientPage />
    </Suspense>
  );
}
