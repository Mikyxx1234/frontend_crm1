import { Suspense } from "react";

import DepartmentsClientPage from "./client-page";

export const dynamic = "force-dynamic";

export default function DepartmentsPage() {
  return (
    <Suspense fallback={null}>
      <DepartmentsClientPage />
    </Suspense>
  );
}
