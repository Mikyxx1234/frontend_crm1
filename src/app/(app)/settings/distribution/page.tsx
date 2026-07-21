import { redirect } from "next/navigation";

/**
 * Rota legada — a config de Distribuição foi movida para o card do widget
 * na Central (`/widgets`). Deep link abre direto o drawer de config.
 */
export default function DistributionSettingsRedirect() {
  redirect("/widgets?configure=smart_distribution");
}
