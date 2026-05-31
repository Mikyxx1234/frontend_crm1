"use client";

import { useQuery } from "@tanstack/react-query";

import {
  fetchAutomation,
  fetchAutomations,
  type AutomationDetailDto,
  type AutomationListPage,
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

export function useAutomation(id: string | null) {
  return useQuery<AutomationDetailDto>({
    queryKey: ["v2-automation", id ?? "__none__"],
    queryFn: () => fetchAutomation(id as string),
    enabled: isPreviewMode() ? !!id : !!id,
    staleTime: 10_000,
  });
}
