import type { Metadata } from "next"
import { ShowcaseClient } from "./showcase-client"

export const metadata: Metadata = {
  title: "Design System v2 — Showcase",
  description: "Referência visual de todos os componentes e tokens do DS v2.",
}

export default function ShowcasePage() {
  return <ShowcaseClient />
}
