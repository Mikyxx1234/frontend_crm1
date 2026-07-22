import { Suspense } from "react";

import ProductsV2ClientPage from "./client-page";

export const dynamic = "force-dynamic";

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsV2ClientPage />
    </Suspense>
  );
}
