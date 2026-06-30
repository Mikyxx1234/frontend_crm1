/**
 * Rota legada `/calls` — mantida APENAS como redirect 308 para
 * `/widgets/calls`. A página real virou um módulo da Central de Widgets
 * (gateada pelo widget `calls_history`), então preservamos a URL antiga
 * pra não quebrar links externos, favoritos, atalhos do navegador, etc.
 *
 * O `_client.tsx` antigo virou inerte: ainda existe pra retrocompatibilidade
 * de imports diretos, mas a rota não passa mais por ele.
 */

import { redirect } from "next/navigation";

export default function CallsPage() {
  redirect("/widgets/calls");
}
