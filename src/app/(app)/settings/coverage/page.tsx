import { Suspense } from "react";

import CoverageV2ClientPage from "./client-page";

export const dynamic = "force-dynamic";

export default function CoveragePage() {
  return (
    <Suspense fallback={null}>
      <CoverageV2ClientPage />
    </Suspense>
  );
}
