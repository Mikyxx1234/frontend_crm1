"use client";

import { NavRailSpacer } from "@/components/crm/nav-rail-spacer";
import { RestrictedScreen } from "@/components/crm/restricted-screen";
import { useRequireManager } from "@/hooks/use-user-role";
import OldDevelopersPage from "@/features/legacy-v1/developers";

export default function DevelopersClientPage() {
  const { ready, isManagerUp } = useRequireManager();
  if (ready && !isManagerUp) return <RestrictedScreen />;

  return (
    <div className="v2-screen grid grid-cols-[var(--nav-rail-w,72px)_1fr] gap-4 overflow-hidden p-4">
      <NavRailSpacer />
      <main className="flex min-w-0 flex-col gap-3.5 overflow-auto pr-2">
        <OldDevelopersPage />
      </main>
    </div>
  );
}

