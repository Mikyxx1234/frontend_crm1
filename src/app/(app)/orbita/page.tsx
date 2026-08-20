import type { Metadata } from "next";

import OrbitaClientPage from "./client-page";
import { NavRailSpacer } from "@/components/crm/nav-rail-spacer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Órbita",
};

export default function OrbitaPage() {
  return <OrbitaClientPage navRail={<NavRailSpacer />} />;
}
