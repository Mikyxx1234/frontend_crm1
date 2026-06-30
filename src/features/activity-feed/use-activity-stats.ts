"use client";

import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api";
import { isPageMockMode, shouldAutoDemoEmpty } from "@/lib/page-mock-mode";
import { MOCK_ACTIVITY_STATS } from "./mock-stats";

export type ActivityStats = {
  window: { from: string; to: string };
  totals: {
    total: number;
    byActorType: Record<string, number>;
    byEntityType: Record<string, number>;
    byType: Array<{ type: string; count: number }>;
  };
  timeline: Array<{ day: string; count: number }>;
};

export function useActivityStats(enabled: boolean = true) {
  return useQuery<ActivityStats>({
    queryKey: ["activity-feed-stats"],
    enabled,
    queryFn: async () => {
      if (isPageMockMode()) {
        return MOCK_ACTIVITY_STATS;
      }
      try {
        const res = await fetch(apiUrl("/api/activity-feed/stats"), {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Falha ao carregar estatísticas");
        const data = (await res.json()) as ActivityStats;
        if (
          shouldAutoDemoEmpty({
            realCount: data.totals.total,
            hasFilters: false,
            isLoading: false,
          })
        ) {
          return MOCK_ACTIVITY_STATS;
        }
        return data;
      } catch {
        return MOCK_ACTIVITY_STATS;
      }
    },
    staleTime: 60_000,
  });
}
