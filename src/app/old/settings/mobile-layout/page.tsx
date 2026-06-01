import type { Metadata } from "next";

import { MobileLayoutClientPage } from "./client-page";

export const metadata: Metadata = {
  title: "Layout do app mobile · EduIT",
  description: "Personalize quais módulos aparecem na barra inferior do app instalável (PWA).",
};

export default function Page() {
  return <MobileLayoutClientPage />;
}
