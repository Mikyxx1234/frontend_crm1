import type { Metadata } from "next"
import { DealDetailVariations } from "./deal-detail-variations"

export const metadata: Metadata = {
  title: "Detalhe do Negócio — 3 Variações | DS v2",
  description: "Três propostas de refatoração da tela de detalhe do negócio dentro do DS v2.",
}

export default function DealDetailShowcasePage() {
  return <DealDetailVariations />
}
