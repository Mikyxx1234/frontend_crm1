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
    staleTime: 15_000,
  });
}

export function useUpdateResponsible() {
  const qc = useQueryClient();
  return useMutation<
    unknown,
    Error,
    { userId: string; input: UpdateResponsibleInput }
  >({
    mutationFn: ({ userId, input }) => updateResponsible(userId, input),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: DISTRIBUTION_RESPONSIBLES_KEY }),
  });
}

export function useSetAgentStatus() {
  const qc = useQueryClient();
  return useMutation<
    void,
    Error,
    { userId: string; status: AgentOnlineStatus }
  >({
    mutationFn: ({ userId, status }) => setAgentStatus(userId, status),
    onSuccess: () => {
      // Ficar ONLINE drena a fila de espera no backend — atualiza ambos.
      qc.invalidateQueries({ queryKey: DISTRIBUTION_RESPONSIBLES_KEY });
      qc.invalidateQueries({ queryKey: DISTRIBUTION_PENDING_KEY });
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
