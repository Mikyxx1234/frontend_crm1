import { notFound } from "next/navigation";
import { Suspense } from "react";
import ClientPage from "../client-page";

type Params = { view: string };

/**
 * Mapeamento URL -> ViewMode interno. Mantido aqui (server) e replicado no
 * client-page para evitar importar um helper marcado como `"use client"`
 * a partir do server component. As duas listas têm que andar juntas.
 */
const URL_TO_VIEW = {
  kanban: "kanban",
  list: "list",
  agile: "saleshub",
} as const;

export default async function PipelineViewPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { view } = await params;
  const mode = URL_TO_VIEW[view as keyof typeof URL_TO_VIEW];
  if (!mode) notFound();

  return (
    <Suspense>
      <ClientPage initialView={mode} />
    </Suspense>
  );
}
