/**
 * /v2/pipeline — visão Kanban (reaproveita o KanbanV2ClientPage do
 * route group `(v2)/pipeline/kanban-v2`).
 *
 * Para alternar entre Kanban e Lista, ver `/v2/pipeline/list`.
 */

import { Suspense } from "react";

import KanbanV2ClientPage from "./_v2-client";
import { NavRailSpacer } from "@/components/crm/nav-rail-spacer";

export const dynamic = "force-dynamic";

export default function V2PipelinePage() {
  return (
    <Suspense fallback={null}>
      <KanbanV2ClientPage navRail={<NavRailSpacer />} listHref="/pipeline/list" />
    </Suspense>
  );
}
