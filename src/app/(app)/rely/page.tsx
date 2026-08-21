import type { Metadata } from "next";

import RelyClientPage from "./client-page";
import { NavRailSpacer } from "@/components/crm/nav-rail-spacer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rely",
};

export default function RelyPage() {
  return <RelyClientPage navRail={<NavRailSpacer />} />;
}
