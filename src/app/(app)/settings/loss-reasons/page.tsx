import { redirect } from "next/navigation";

/** Motivos de perda ficam na etapa Perdido em Configurações → Pipeline. */
export default function LossReasonsPage() {
  redirect("/settings/pipeline");
}
