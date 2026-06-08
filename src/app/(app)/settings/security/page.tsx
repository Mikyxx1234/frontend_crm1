import { Suspense } from "react";
import { SecurityClientPage } from "./client-page";

export const dynamic = "force-dynamic";

export default function SecurityPage() {
  return (
    <Suspense>
      <SecurityClientPage />
    </Suspense>
  );
}
