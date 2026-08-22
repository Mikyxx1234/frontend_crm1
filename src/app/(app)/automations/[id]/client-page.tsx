"use client";

import { useParams } from "next/navigation";

import { NavRailSpacer } from "@/components/crm/nav-rail-spacer";
import { FlowEditor } from "@/components/flow/flow-editor";

/** Builder de automação v2 — editor canvas novo (ex-/fluxo). */
export default function V2AutomationDetailClientPage() {
  const params = useParams<{ id: string | string[] }>();
  const raw = params?.id;
  const automationId = Array.isArray(raw) ? raw[0] : raw;

  if (!automationId) return null;

  return (
    <div className="v2-screen grid grid-cols-[var(--nav-rail-w,72px)_1fr] gap-4 overflow-hidden p-4">
      <NavRailSpacer />
      <main className="flex min-h-0 min-w-0 flex-col overflow-hidden">
        <FlowEditor automationId={automationId} />
      </main>
    </div>
  );
}
