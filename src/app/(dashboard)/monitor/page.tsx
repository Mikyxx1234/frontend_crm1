import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Monitor · EduIT CRM",
  description: "Redirecionando para o dashboard em modo Monitor.",
};

/**
 * O antigo /monitor foi incorporado ao dashboard principal como um
 * preset ("Monitor") + botão de TV Wall, mantendo a mesma identidade
 * visual (War Room escuro, supervisão em tempo real) mas agora sobre a
 * mesma infraestrutura de widgets drag-and-drop do resto do CRM.
 *
 * Mantemos este redirect para não quebrar:
 *   - bookmarks e atalhos salvos
 *   - entradas de menu externas
 *   - integrações que monitoravam /monitor
 *
 * Qualquer acesso a /monitor cai no / com `?preset=monitor`, que o
 * client-page detecta e aplica automaticamente (além de ligar o modo
 * TV Wall quando a query for "monitor").
 */
export default function MonitorRedirectPage() {
  redirect("/?preset=monitor");
}
