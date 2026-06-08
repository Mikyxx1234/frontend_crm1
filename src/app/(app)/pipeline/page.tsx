/**
 * /pipeline — visão Kanban.
 *
 * Suporta deep-link de negócio via query param:
 *   /pipeline?deal=<dealId>  →  abre o painel do negócio diretamente.
 *
 * Para alternar para Lista, ver `/pipeline/list`.
 */

import KanbanV2ClientPage from "./_v2-client";
import { NavRailV2 } from "@/components/crm/nav-rail-v2";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ deal?: string }>;
}

export default async function V2PipelinePage({ searchParams }: PageProps) {
  const { deal } = await searchParams;
  return (
    <KanbanV2ClientPage
      navRail={<NavRailV2 />}
      listHref="/pipeline/list"
      initialDealId={deal ?? null}
    />
  );
}
