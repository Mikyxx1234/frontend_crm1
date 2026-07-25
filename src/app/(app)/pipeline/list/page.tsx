import { Suspense } from "react";

import V2PipelineListClientPage from "./client-page";
import { PageLoading } from "@/components/crm/page-loading";

export const dynamic = "force-dynamic";

export default function V2PipelineListPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <V2PipelineListClientPage />
    </Suspense>
  );
}
