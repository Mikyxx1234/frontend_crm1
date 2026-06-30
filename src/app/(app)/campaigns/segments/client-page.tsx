"use client";

import { IconPlus, IconUsers } from "@tabler/icons-react";
import { useRef } from "react";

import { NavRailV2 } from "@/components/crm/nav-rail-v2";
import { PageHeader } from "@/components/crm/page-header";
import { PagePrimaryButton } from "@/components/crm/page-toolbar";
import { RestrictedScreen } from "@/components/crm/restricted-screen";
import { useRequireManager } from "@/hooks/use-user-role";
import OldSegmentsPage from "@/features/legacy-v1/campaigns-segments";

export default function SegmentsClientPage() {
  const { ready, isManagerUp } = useRequireManager();
  const openNewRef = useRef<(() => void) | null>(null);

  if (ready && !isManagerUp) return <RestrictedScreen />;

  return (
    <div className="v2-screen grid grid-cols-[72px_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />
      <main className="flex min-w-0 flex-col gap-3.5 overflow-auto pr-2">
        <PageHeader
          back={{ href: "/campaigns", label: "Campanhas" }}
          icon={<IconUsers size={22} />}
          title="Segmentos"
          description="Filtros salvos para usar nas campanhas"
          actions={
            <PagePrimaryButton type="button" onClick={() => openNewRef.current?.()}>
              <IconPlus size={16} /> Novo segmento
            </PagePrimaryButton>
          }
        />
        <OldSegmentsPage
          hideHeader
          hideToolbar
          onRegisterOpenNew={(openNew) => {
            openNewRef.current = openNew;
          }}
        />
      </main>
    </div>
  );
}
