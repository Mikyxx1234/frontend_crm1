import { redirect } from "next/navigation";

/**
 * A grade de Cobertura virou a aba "Cobertura" da tela de Distribuição
 * (ao lado de "Equipe"). A rota antiga fica como redirect permanente
 * para não quebrar links salvos/bookmarks.
 */
export default function CoveragePage() {
  redirect("/widgets/distribution?tab=coverage");
}
