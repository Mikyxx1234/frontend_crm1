import { redirect } from "next/navigation";

/**
 * Rota legada — a config de Telefonia IP foi movida para o card do widget
 * na Central (`/widgets`). Deep link abre direto o drawer de config.
 */
export default function SoftphoneSettingsRedirect() {
  redirect("/widgets?configure=calls_history");
}
