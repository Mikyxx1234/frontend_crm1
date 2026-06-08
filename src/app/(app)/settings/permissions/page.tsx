import { Suspense } from "react";

import { PermissionsClientPage } from "./client-page";

export const dynamic = "force-dynamic";

export default function PermissionsPage() {
  return (
    <Suspense>
      <PermissionsClientPage />
    </Suspense>
  );
}
