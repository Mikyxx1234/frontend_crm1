import type { WidgetsResponse } from "./types";

export const MOCK_WIDGETS_RESPONSE: WidgetsResponse = {
  items: [
    {
      slug: "smart_distribution",
      name: "Distribuição Inteligente",
      description: "Distribui leads entre consultores com regras de fila e disponibilidade.",
      features: ["Fila de espera", "Round-robin", "Presença online"],
      icon: "route",
      category: "Operações",
      availability: "available",
      ownerType: "INTERNAL",
      installed: true,
      status: "ACTIVE",
      installedAt: new Date().toISOString(),
      marketplaceStatus: "ONLINE",
    },
    {
      slug: "ai_copilot",
      name: "Copiloto IA",
      description: "Sugestões de resposta e resumo de conversas.",
      features: ["Resumo", "Sugestões"],
      icon: "bot",
      category: "IA",
      availability: "coming_soon",
      ownerType: "INTERNAL",
      installed: false,
      status: null,
      installedAt: null,
      marketplaceStatus: "ONLINE",
    },
  ],
};
