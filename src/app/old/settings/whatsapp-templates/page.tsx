import { redirect } from "next/navigation";

export default function LegacyWhatsappTemplatesRedirectPage() {
  redirect("/old/settings/message-models?tab=whatsapp");
}
