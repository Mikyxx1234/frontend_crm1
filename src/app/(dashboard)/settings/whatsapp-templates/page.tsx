import { redirect } from "next/navigation";

export default function LegacyWhatsappTemplatesRedirectPage() {
  redirect("/settings/message-models?tab=whatsapp");
}
