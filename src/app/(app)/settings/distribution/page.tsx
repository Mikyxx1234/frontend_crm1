import { Suspense } from "react";

import DistributionV2ClientPage from "./client-page";

export const dynamic = "force-dynamic";

export default function DistributionPage() {
  return (
    <Suspense fallback={null}>
      <DistributionV2ClientPage />
    </Suspense>
  );
}
