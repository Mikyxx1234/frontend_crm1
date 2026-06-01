import { redirect } from "next/navigation";

export default function LegacyTemplatesRedirectPage() {
  redirect("/old/settings/message-models?tab=internal");
}
