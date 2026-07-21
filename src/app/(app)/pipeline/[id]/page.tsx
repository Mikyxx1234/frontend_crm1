import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface V2DealDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Deep-link legado `/pipeline/[id]` → mesmo painel do Kanban (`?deal=`).
 * Evita a página full-page antiga (DealDetailsPanel) divergente do workspace.
 */
export default async function V2DealDetailPage({ params }: V2DealDetailPageProps) {
  const { id } = await params;
  redirect(`/pipeline?deal=${encodeURIComponent(id)}`);
}
