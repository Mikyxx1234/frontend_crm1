"use client";

import { useQuery } from "@tanstack/react-query";

import {
  fetchActivities,
  fetchCompanies,
  fetchContacts,
  type ActivityListPage,
  type ActivityTypeDto,
  type CompanyListPage,
  type ContactListPage,
} from "./api";

import { isPreviewMode } from "@/lib/preview-mode";

/** Em preview mode, ignora o guard de sessão e sempre dispara a query. */
function resolveEnabled(enabled: boolean | undefined): boolean {
  return isPreviewMode() ? true : (enabled ?? true);
}

export function useContacts(params: {
  search?: string;
  page?: number;
  perPage?: number;
  enabled?: boolean;
}) {
  const page = params.page ?? 1;
  const perPage = params.perPage ?? 30;
  return useQuery<ContactListPage>({
    queryKey: ["v2-contacts", params.search ?? "", page, perPage],
    queryFn: () => fetchContacts({ search: params.search, page, perPage }),
    enabled: resolveEnabled(params.enabled),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useCompanies(params: {
  search?: string;
  page?: number;
  perPage?: number;
  enabled?: boolean;
}) {
  const page = params.page ?? 1;
  const perPage = params.perPage ?? 30;
  return useQuery<CompanyListPage>({
    queryKey: ["v2-companies", params.search ?? "", page, perPage],
    queryFn: () => fetchCompanies({ search: params.search, page, perPage }),
    enabled: resolveEnabled(params.enabled),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

export function useActivities(params: {
  type?: ActivityTypeDto;
  completed?: boolean;
  page?: number;
  perPage?: number;
  enabled?: boolean;
}) {
  const page = params.page ?? 1;
  const perPage = params.perPage ?? 30;
  return useQuery<ActivityListPage>({
    queryKey: [
      "v2-activities",
      params.type ?? "__any__",
      params.completed === undefined ? "__any__" : params.completed,
      page,
      perPage,
    ],
    queryFn: () =>
      fetchActivities({
        type: params.type,
        completed: params.completed,
        page,
        perPage,
      }),
    enabled: resolveEnabled(params.enabled),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}
