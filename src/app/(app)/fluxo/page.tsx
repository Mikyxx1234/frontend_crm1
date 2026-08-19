import type { Metadata } from "next"

import { NavRailSpacer } from "@/components/crm/nav-rail-spacer"
import { FlowEditor } from "@/components/flow/flow-editor"

export const metadata: Metadata = {
  title: "Fluxo de atendimento",
}

export default function FluxoPage() {
  return (
    <div className="v2-screen grid grid-cols-[var(--nav-rail-w,72px)_1fr] gap-4 overflow-hidden p-4">
      <NavRailSpacer />
      <main className="flex min-h-0 min-w-0 flex-col overflow-hidden">
        <FlowEditor />
      </main>
    </div>
  )
}
