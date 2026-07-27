"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  fetchDistributionLogs,
  fetchDistributionSettings,
  fetchPending,
  fetchResponsibles,
  retryPending,
  setAgentStatus,
  simulateDistribution,
  updateDistributionSettings,
  updateResponsible,
  type DistributionLogsPage,
  type DistributionSettings,
} from "./api";
import type {
  AgentOnlineStatus,
  DistributionResult,
  PendingResponse,
  ResponsiblesResponse,
  RetryResult,
  UpdateResponsibleInput,
} from "./types";

export const DISTRIBUTION_RESPONSIBLES_KEY = ["distribution-responsibles"] as const;
export const DISTRIBUTION_PENDING_KEY = ["distribution-pending"] as const;
export const DISTRIBUTION_SETTINGS_KEY = ["distribution-settings"] as const;
export const DISTRIBUTION_LOGS_KEY = ["distribution-logs"] as const;

export function useDistributionLogs(enabled = true) {
  return useInfiniteQuery<DistributionLogsPage>({
    queryKey: DISTRIBUTION_LOGS_KEY,
    queryFn: ({ pageParam }) =>
      fetchDistributionLogs((pageParam as string | null) ?? null),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled,
    staleTime: 10_000,
  });
}

export function useDistributionSettings(enabled = true) {
  return useQuery<DistributionSettings>({
    queryKey: DISTRIBUTION_SETTINGS_KEY,
    queryFn: fetchDistributionSettings,
    enabled,
    staleTime: 30_000,
  });
}

export function useUpdateDistributionSettings() {
  const qc = useQueryClient();
  return useMutation<DistributionSettings, Error, DistributionSettings>({
    mutationFn: (input) => updateDistributionSettings(input),
    onSuccess: (data) => {
      qc.setQueryData(DISTRIBUTION_SETTINGS_KEY, data);
      qc.invalidateQueries({ queryKey: DISTRIBUTION_PENDING_KEY });
    },
  });
}

export function useDistributionResponsibles(enabled = true) {
  return useQuery<ResponsiblesResponse>({
    queryKey: DISTRIBUTION_RESPONSIBLES_KEY,
    queryFn: fetchResponsibles,
    enabled,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });
}

export function useUpdateResponsible() {
  const qc = useQueryClient();
  return useMutation<
    unknown,
    Error,
    { userId: string; input: UpdateResponsibleInput },
    { prev: ResponsiblesResponse | undefined }
  >({
    mutationFn: ({ userId, input }) => updateResponsible(userId, input),
    onMutate: async ({ userId, input }) => {
      await qc.cancelQueries({ queryKey: DISTRIBUTION_RESPONSIBLES_KEY });
      const prev = qc.getQueryData<ResponsiblesResponse>(
        DISTRIBUTION_RESPONSIBLES_KEY,
      );
      if (prev?.responsibles) {
        qc.setQueryData<ResponsiblesResponse>(DISTRIBUTION_RESPONSIBLES_KEY, {
          ...prev,
          responsibles: prev.responsibles.map((r) => {
            if (r.userId !== userId) return r;
            return {
              ...r,
              ...(input.participates !== undefined
                ? { participates: input.participates }
                : {}),
              ...(input.paused !== undefined ? { paused: input.paused } : {}),
              ...(input.queueLimit !== undefined
                ? { queueLimit: input.queueLimit }
                : {}),
              ...(input.type !== undefined ? { type: input.type } : {}),
              ...(input.preLunchStopMinutes !== undefined
                ? { preLunchStopMinutes: input.preLunchStopMinutes }
                : {}),
              ...(input.schedule
                ? {
                    schedule: {
                      startTime:
                        input.schedule.startTime ??
                        r.schedule?.startTime ??
                        "08:00",
                      lunchStart:
                        input.schedule.lunchStart ??
                        r.schedule?.lunchStart ??
                        "12:00",
                      lunchEnd:
                        input.schedule.lunchEnd ??
                        r.schedule?.lunchEnd ??
                        "13:00",
                      endTime:
                        input.schedule.endTime ??
                        r.schedule?.endTime ??
                        "18:00",
                      timezone:
                        input.schedule.timezone ??
                        r.schedule?.timezone ??
                        "America/Sao_Paulo",
                      weekdays:
                        input.schedule.weekdays ??
                        r.schedule?.weekdays ?? [1, 2, 3, 4, 5],
                    },
                    hasSchedule: true,
                  }
                : {}),
            };
          }),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(DISTRIBUTION_RESPONSIBLES_KEY, ctx.prev);
    },
    onSettled: () =>
      qc.invalidateQueries({
        queryKey: DISTRIBUTION_RESPONSIBLES_KEY,
        refetchType: "active",
      }),
  });
}

export function useSetAgentStatus() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { userId: string; status: AgentOnlineStatus },
    { prev: ResponsiblesResponse | undefined }
  >({
    mutationFn: ({ userId, status }) => setAgentStatus(userId, status),
    onMutate: async ({ userId, status }) => {
      await qc.cancelQueries({ queryKey: DISTRIBUTION_RESPONSIBLES_KEY });
      const prev = qc.getQueryData<ResponsiblesResponse>(
        DISTRIBUTION_RESPONSIBLES_KEY,
      );
      if (prev?.responsibles) {
        qc.setQueryData<ResponsiblesResponse>(DISTRIBUTION_RESPONSIBLES_KEY, {
          ...prev,
          responsibles: prev.responsibles.map((r) =>
            r.userId === userId ? { ...r, status } : r,
          ),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(DISTRIBUTION_RESPONSIBLES_KEY, ctx.prev);
    },
    onSettled: () => {
      // Ficar ONLINE drena a fila de espera no backend — atualiza ambos.
      void qc.invalidateQueries({
        queryKey: DISTRIBUTION_RESPONSIBLES_KEY,
        refetchType: "active",
      });
      void qc.invalidateQueries({
        queryKey: DISTRIBUTION_PENDING_KEY,
        refetchType: "active",
      });
    },
  });
}

export function useSimulateDistribution() {
  return useMutation<DistributionResult, Error, void>({
    mutationFn: () => simulateDistribution(),
  });
}

export function usePendingDistributions(enabled = true) {
  return useQuery<PendingResponse>({
    queryKey: DISTRIBUTION_PENDING_KEY,
    queryFn: fetchPending,
    enabled,
    staleTime: 15_000,
  });
}

export function useRetryPending() {
  const qc = useQueryClient();
  return useMutation<RetryResult, Error, void>({
    mutationFn: () => retryPending(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DISTRIBUTION_PENDING_KEY });
      qc.invalidateQueries({ queryKey: DISTRIBUTION_RESPONSIBLES_KEY });
    },
  });
}
