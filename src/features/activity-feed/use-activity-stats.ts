"use client";

import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api";

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
      const res = await fetch(apiUrl("/api/activity-feed/stats"), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Falha ao carregar estatísticas");
      return (await res.json()) as ActivityStats;
    },
    staleTime: 60_000,
  });
}
