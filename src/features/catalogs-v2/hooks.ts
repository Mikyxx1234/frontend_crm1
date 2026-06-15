"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiUrl } from "@/lib/api";
import type {
  CapabilityPayload,
  CatalogTemplate,
  CatalogView,
  SerializedCapability,
} from "./types";

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: init?.body
      ? { "Content-Type": "application/json", ...(init?.headers ?? {}) }
      : init?.headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { message?: string })?.message ?? "Erro na requisição");
  }
  return data as T;
}

// ── Capacidades disponíveis (registro de código) ────────────────────────────
export function useCapabilities() {
  return useQuery({
    queryKey: ["capabilities"],
    queryFn: () =>
      jsonFetch<{ capabilities: SerializedCapability[] }>("/api/capabilities"),
    select: (d) => d.capabilities,
    staleTime: 5 * 60_000,
  });
}

// ── Catálogos ────────────────────────────────────────────────────────────────
export function useCatalogs() {
  return useQuery({
    queryKey: ["catalogs"],
    queryFn: () => jsonFetch<{ catalogs: CatalogView[] }>("/api/catalogs"),
    select: (d) => d.catalogs,
  });
}

export function useCatalog(id: string | null) {
  return useQuery({
    queryKey: ["catalog", id],
    queryFn: () => jsonFetch<{ catalog: CatalogView }>(`/api/catalogs/${id}`),
    enabled: !!id,
    select: (d) => d.catalog,
  });
}

export function useCatalogTemplates() {
  return useQuery({
    queryKey: ["catalog-templates"],
    queryFn: () =>
      jsonFetch<{ templates: CatalogTemplate[] }>("/api/catalog-templates"),
    select: (d) => d.templates,
    staleTime: 5 * 60_000,
  });
}

type CreateCatalogBody = {
  name: string;
  description?: string | null;
  templateKey?: string | null;
  capabilities: CapabilityPayload[];
};

export function useCreateCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCatalogBody) =>
      jsonFetch<{ catalog: CatalogView }>("/api/catalogs", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalogs"] });
    },
  });
}

type UpdateCatalogBody = {
  name?: string;
  description?: string | null;
  capabilities?: CapabilityPayload[];
};

export function useUpdateCatalog(id: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCatalogBody) =>
      jsonFetch<{ catalog: CatalogView }>(`/api/catalogs/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalogs"] });
      qc.invalidateQueries({ queryKey: ["catalog", id] });
    },
  });
}

export function useDeleteCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      jsonFetch(`/api/catalogs/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalogs"] });
    },
  });
}

export function useSaveAsTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name?: string }) =>
      jsonFetch(`/api/catalogs/${id}/save-as-template`, {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["catalog-templates"] });
    },
  });
}
