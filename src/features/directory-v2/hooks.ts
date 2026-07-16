"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addContactNote,
  addContactTag,
  createActivity,
  createCompany,
  createContact,
  deleteActivity,
  deleteCompany,
  deleteContact,
  fetchActivities,
  fetchCompanies,
  fetchCompany,
  fetchContact,
  fetchContacts,
  removeContactTag,
  updateActivity,
  updateCompany,
  updateContact,
  type ActivityListItemDto,
  type ActivityListPage,
  type ActivityTypeDto,
  type CompanyDetailDto,
  type CompanyListPage,
  type CompanyWriteBody,
  type ContactDetailDto,
  type ContactListPage,
  type ContactNoteDto,
  type ContactWriteBody,
  type CreateActivityPayload,
  type UpdateActivityPayload,
} from "./api";

import { isPreviewMode } from "@/lib/preview-mode";
import { isDirectoryMock } from "./mock";
import { isPageMockMode } from "@/lib/page-mock-mode";

/** Em preview/mock mode, ignora o guard de sessão e sempre dispara a query. */
function resolveEnabled(enabled: boolean | undefined): boolean {
  return isPreviewMode() || isDirectoryMock() || isPageMockMode()
    ? true
    : (enabled ?? true);
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

export function useContact(id: string | null) {
  return useQuery<ContactDetailDto>({
    queryKey: ["v2-contact", id ?? "__none__"],
    queryFn: () => fetchContact(id as string),
    enabled: !!id,
    staleTime: 10_000,
  });
}

function invalidateContacts(qc: ReturnType<typeof useQueryClient>, id?: string) {
  qc.invalidateQueries({ queryKey: ["v2-contacts"], exact: false });
  if (id) qc.invalidateQueries({ queryKey: ["v2-contact", id] });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation<ContactDetailDto, Error, ContactWriteBody>({
    mutationFn: createContact,
    onSuccess: () => invalidateContacts(qc),
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation<ContactDetailDto, Error, { id: string; body: ContactWriteBody }>({
    mutationFn: ({ id, body }) => updateContact(id, body),
    onSuccess: (_d, vars) => invalidateContacts(qc, vars.id),
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, Error, string>({
    mutationFn: deleteContact,
    onSuccess: (_d, id) => invalidateContacts(qc, id),
  });
}

export function useAddContactNote() {
  const qc = useQueryClient();
  return useMutation<ContactNoteDto, Error, { id: string; content: string }>({
    mutationFn: ({ id, content }) => addContactNote(id, content),
    onSuccess: (_d, vars) => invalidateContacts(qc, vars.id),
  });
}

export function useAddContactTag() {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, Error, { id: string; tagId: string }>({
    mutationFn: ({ id, tagId }) => addContactTag(id, tagId),
    onSuccess: (_d, vars) => invalidateContacts(qc, vars.id),
  });
}

export function useRemoveContactTag() {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, Error, { id: string; tagId: string }>({
    mutationFn: ({ id, tagId }) => removeContactTag(id, tagId),
    onSuccess: (_d, vars) => invalidateContacts(qc, vars.id),
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

export function useCompany(id: string | null) {
  return useQuery<CompanyDetailDto>({
    queryKey: ["v2-company", id ?? "__none__"],
    queryFn: () => fetchCompany(id as string),
    enabled: !!id,
    staleTime: 10_000,
  });
}

function invalidateCompanies(qc: ReturnType<typeof useQueryClient>, id?: string) {
  qc.invalidateQueries({ queryKey: ["v2-companies"], exact: false });
  if (id) qc.invalidateQueries({ queryKey: ["v2-company", id] });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation<CompanyDetailDto, Error, CompanyWriteBody>({
    mutationFn: createCompany,
    onSuccess: () => invalidateCompanies(qc),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation<CompanyDetailDto, Error, { id: string; body: CompanyWriteBody }>({
    mutationFn: ({ id, body }) => updateCompany(id, body),
    onSuccess: (_d, vars) => invalidateCompanies(qc, vars.id),
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, Error, string>({
    mutationFn: deleteCompany,
    onSuccess: (_d, id) => invalidateCompanies(qc, id),
  });
}

function invalidateActivities(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["v2-activities"], exact: false });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation<ActivityListItemDto, Error, CreateActivityPayload>({
    mutationFn: createActivity,
    onSuccess: () => invalidateActivities(qc),
  });
}

export function useUpdateActivity() {
  const qc = useQueryClient();
  return useMutation<ActivityListItemDto, Error, { id: string; payload: UpdateActivityPayload }>({
    mutationFn: ({ id, payload }) => updateActivity(id, payload),
    onSuccess: () => invalidateActivities(qc),
  });
}

export function useDeleteActivity() {
  const qc = useQueryClient();
  return useMutation<{ ok: true }, Error, string>({
    mutationFn: deleteActivity,
    onSuccess: () => invalidateActivities(qc),
  });
}

export function useActivities(params: {
  type?: ActivityTypeDto;
  completed?: boolean;
  page?: number;
  perPage?: number;
  scope?: "mine" | "department" | "all";
  enabled?: boolean;
}) {
  const page = params.page ?? 1;
  const perPage = params.perPage ?? 30;
  return useQuery<ActivityListPage>({
    queryKey: [
      "v2-activities",
      params.type ?? "__any__",
      params.completed === undefined ? "__any__" : params.completed,
      params.scope ?? "all",
      page,
      perPage,
    ],
    queryFn: () =>
      fetchActivities({
        type: params.type,
        completed: params.completed,
        scope: params.scope,
        page,
        perPage,
      }),
    enabled: resolveEnabled(params.enabled),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}
