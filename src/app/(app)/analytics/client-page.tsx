"use client";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { RestrictedScreen } from "@/components/crm/restricted-screen";
import { useRequireManager } from "@/hooks/use-user-role";
import OldAnalyticsPage from "@/features/legacy-v1/analytics";

export default function AnalyticsClientPage() {
  const { ready, isManagerUp } = useRequireManager();
  if (ready && !isManagerUp) return <RestrictedScreen />;

  return (
    <div className="v2-screen grid grid-cols-[var(--nav-rail-w,72px)_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />
      <main className="flex min-w-0 flex-col gap-3.5 overflow-auto pr-2">
        <OldAnalyticsPage />
      </main>
    </div>
  );
}

