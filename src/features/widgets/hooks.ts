"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchWidgets,
  installWidget,
  uninstallWidget,
} from "./api";
import type { WidgetsResponse } from "./types";

import { isPreviewMode } from "@/lib/preview-mode";

const WIDGETS_KEY = ["widgets"] as const;

/** Em preview mode, ignora o guard de sessao e sempre dispara a query. */
function resolveEnabled(enabled: boolean | undefined): boolean {
  return isPreviewMode() ? true : (enabled ?? true);
}

export function useWidgets(enabled?: boolean) {
  return useQuery<WidgetsResponse>({
    queryKey: WIDGETS_KEY,
    queryFn: fetchWidgets,
    enabled: resolveEnabled(enabled),
    staleTime: 30_000,
  });
}

export function useInstallWidget() {
  const qc = useQueryClient();
  return useMutation<{ slug: string; installed: boolean }, Error, string>({
    mutationFn: installWidget,
    onSuccess: () => qc.invalidateQueries({ queryKey: WIDGETS_KEY }),
  });
}

export function useUninstallWidget() {
  const qc = useQueryClient();
  return useMutation<{ slug: string; installed: boolean }, Error, string>({
    mutationFn: uninstallWidget,
    onSuccess: () => qc.invalidateQueries({ queryKey: WIDGETS_KEY }),
  });
}
