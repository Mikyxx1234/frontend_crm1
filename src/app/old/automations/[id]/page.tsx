import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import ClientPage from "./client-page";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[480px] w-full rounded-xl" />
        </div>
      }
    >
      <ClientPage />
    </Suspense>
  );
}
