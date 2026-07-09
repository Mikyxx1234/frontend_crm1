import { NavRailV2 } from "@/components/crm/nav-rail-v2"
import { FlowEditor } from "@/components/automations/flow-editor"

export default function AutomationsEditorPage() {
  return (
    <div className="v2-screen grid grid-cols-[var(--nav-rail-w,72px)_1fr] gap-4 overflow-hidden p-4">
      <NavRailV2 />
      <main className="flex min-h-0 min-w-0 flex-col overflow-hidden">
        <FlowEditor />
      </main>
    </div>
  )
}
