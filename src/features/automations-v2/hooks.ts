"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAutomation,
  deleteAutomation,
  fetchAutomation,
  fetchAutomations,
  saveAutomationSteps,
  toggleAutomationActive,
  updateAutomation,
  type AutomationDetailDto,
  type AutomationListItemDto,
  type AutomationListPage,
  type AutomationStepInput,
  type AutomationWriteBody,
} from "./api";

import { isPreviewMode } from "@/lib/preview-mode";

function resolveEnabled(enabled: boolean | undefined): boolean {
  return isPreviewMode() ? true : (enabled ?? true);
}

export function useAutomations(params: {
  active?: boolean;
  search?: string;
  page?: number;
  perPage?: number;
  enabled?: boolean;
}) {
  const page = params.page ?? 1;
  const perPage = params.perPage ?? 30;
  return useQuery<AutomationListPage>({
    queryKey: [
      "v2-automations",
      params.active === undefined ? "__any__" : params.active,
      params.search ?? "",
      page,
      perPage,
    ],
    queryFn: () =>
      fetchAutomations({
        active: params.active,
        search: params.search,
        page,
        perPage,
      }),
    enabled: resolveEnabled(params.enabled),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useToggleAutomation() {
  const qc = useQueryClient();
  return useMutation<AutomationListItemDto, Error, string>({
    mutationFn: toggleAutomationActive,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["v2-automations"], exact: false });
      qc.invalidateQueries({ queryKey: ["v2-automation"], exact: false });
    },
  });
}

export function useAutomation(id: string | null) {
  return useQuery<AutomationDetailDto>({
    queryKey: ["v2-automation", id ?? "__none__"],
    queryFn: () => fetchAutomation(id as string),
    enabled: isPreviewMode() ? !!id : !!id,
    staleTime: 10_000,
  });
}

function invalidateAutomations(
  qc: ReturnType<typeof useQueryClient>,
  id?: string,
) {
  qc.invalidateQueries({ queryKey: ["v2-automations"], exact: false });
  if (id) qc.invalidateQueries({ queryKey: ["v2-automation", id] });
}

export function useCreateAutomation() {
  const qc = useQueryClient();
  return useMutation<AutomationDetailDto, Error, AutomationWriteBody>({
    mutationFn: createAutomation,
    onSuccess: () => invalidateAutomations(qc),
  });
}

export function useUpdateAutomation() {
  const qc = useQueryClient();
  return useMutation<
    AutomationDetailDto,
    Error,
    { id: string; body: AutomationWriteBody }
  >({
    mutationFn: ({ id, body }) => updateAutomation(id, body),
    onSuccess: (_d, vars) => invalidateAutomations(qc, vars.id),
  });
}

export function useDeleteAutomation() {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, Error, string>({
    mutationFn: deleteAutomation,
    onSuccess: (_d, id) => invalidateAutomations(qc, id),
  });
}

export function useSaveAutomationSteps() {
  const qc = useQueryClient();
  return useMutation<
    AutomationDetailDto,
    Error,
    { id: string; steps: AutomationStepInput[] }
  >({
    mutationFn: ({ id, steps }) => saveAutomationSteps(id, steps),
    onSuccess: (_d, vars) => invalidateAutomations(qc, vars.id),
  });
}
