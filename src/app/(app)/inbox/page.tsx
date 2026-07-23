/**
 * /v2/inbox — reaproveita integralmente o InboxV2ClientPage do route
 * group `(v2)/inbox-v2`. Apenas injeta o `<NavRailSpacer />` (hrefs /v2/*)
 * via prop `navRail` para casar com o novo shell.
 *
 * Mudanças no chat: nenhuma. Toda a feature inbox-v2 (queries, hooks,
 * popovers, realtime SSE) é reaproveitada exatamente como está.
 */

import { IconMessageCircle } from "@tabler/icons-react";

import InboxV2ClientPage from "./_v2-client";
import { NavRailSpacer } from "@/components/crm/nav-rail-spacer";

export const dynamic = "force-dynamic";

export default function V2InboxPage() {
  return (
    <InboxV2ClientPage
      navRail={<NavRailSpacer />}
      pageHeader={{
        icon: <IconMessageCircle size={22} />,
        title: "Caixa de entrada",
      }}
    />
  );
}
