import { AppLoading } from "@/components/crm/app-loading";

/**
 * Fallback de Suspense do route group `(app)` — um único loading para TODAS
 * as rotas. Sem ramificação por path (antes o header `x-pathname` escolhia
 * um shell específico do Flow): o loader não imita mais o layout de destino,
 * então não há o que ramificar.
 */
export default function Loading() {
  return <AppLoading />;
}
