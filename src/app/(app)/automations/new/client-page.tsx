"use client";

import { useRouter } from "next/navigation";

import { NavRailSpacer } from "@/components/crm/nav-rail-spacer";
import { NewAutomationModal } from "@/features/automations-v2/new-automation-modal";

/** Deep link `/automations/new` abre o mesmo modal da lista. */
export default function NewAutomationClientPage() {
  const router = useRouter();

  return (
    <div className="v2-screen grid grid-cols-[var(--nav-rail-w,72px)_1fr] gap-4 overflow-hidden p-4">
      <NavRailSpacer />
      <NewAutomationModal
        open
        onOpenChange={(open) => {
          if (!open) router.push("/automations");
        }}
      />
    </div>
  );
}
