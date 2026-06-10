/**
 * /widgets/[slug] — entry point para abrir um widget instalado.
 *
 * Para widgets INTERNAL com rota propria (ex.: `smart_distribution` ->
 * `/widgets/distribution`), o client component redireciona. Para widgets
 * PARTNER, renderiza o iframe com SSO embutido no token.
 */

import WidgetRunnerClientPage from "./client-page";
import { NavRailV2 } from "@/components/crm/nav-rail-v2";

export const dynamic = "force-dynamic";

export default async function WidgetRunnerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <WidgetRunnerClientPage slug={slug} navRail={<NavRailV2 />} />;
}
