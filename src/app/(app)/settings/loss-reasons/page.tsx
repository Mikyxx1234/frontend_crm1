import { Suspense } from "react";

import LossReasonsV2ClientPage from "./client-page";

export const dynamic = "force-dynamic";

export default function LossReasonsPage() {
  return (
    <Suspense fallback={null}>
      <LossReasonsV2ClientPage />
    </Suspense>
  );
}
