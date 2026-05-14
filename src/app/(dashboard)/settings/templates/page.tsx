import { redirect } from "next/navigation";

export default function LegacyTemplatesRedirectPage() {
  redirect("/settings/message-models?tab=internal");
}
