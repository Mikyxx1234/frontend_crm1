import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface PipelineFilterPageProps {
  params: Promise<{ id: string }>;
}

/**
 * `/pipeline/filter/<savedFilterId>` → `/pipeline?filter=<id>`.
 *
 * Formato curto de link para um filtro salvo. O Kanban expande o preset nos
 * params legíveis (`?status=&created=…`) assim que carrega, então o link que o
 * usuário copia depois já é auto-contido. Id inexistente cai na visão padrão.
 */
export default async function PipelineFilterPage({ params }: PipelineFilterPageProps) {
  const { id } = await params;
  redirect(`/pipeline?filter=${encodeURIComponent(id)}`);
}
