"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useSession } from "next-auth/react";

import {
  useDashboardStore,
  WIDGET_REGISTRY,
  type GridItem,
  type WidgetId,
  type DashboardPresetId,
} from "@/stores/dashboard-store";

/**
 * Shape persistido em `UserDashboardLayout.data`. Conversão bidirecional
 * aqui — a API só valida superficialmente, então é aqui que sanitizamos
 * (remove widgets que não existem mais no catálogo).
 */
type PersistedLayout = {
  visibleWidgets?: unknown;
  layout?: unknown;
  meta?: Record<string, unknown>;
};

type GetResponse = {
  id?: string;
  name?: string;
  preset?: DashboardPresetId;
  data?: PersistedLayout | null;
  updatedAt?: string;
  /** quando não há registro, o backend devolve { layout: null } */
  layout?: null;
};

function sanitize(raw: PersistedLayout | null | undefined): {
  layout: Record<WidgetId, GridItem>;
  visible: WidgetId[];
} | null {
  if (!raw || typeof raw !== "object") return null;

  const rawLayout = raw.layout;
  const rawVisible = raw.visibleWidgets;
  if (!rawLayout || typeof rawLayout !== "object" || !Array.isArray(rawVisible)) return null;

  const layout: Record<string, GridItem> = {};
  for (const [id, value] of Object.entries(rawLayout as Record<string, unknown>)) {
    if (!(id in WIDGET_REGISTRY)) continue;
    if (!value || typeof value !== "object") continue;
    const v = value as Partial<GridItem>;
    if (
      typeof v.x !== "number" ||
      typeof v.y !== "number" ||
      typeof v.w !== "number" ||
      typeof v.h !== "number"
    ) {
      continue;
    }
    layout[id] = {
      i: id as WidgetId,
      x: v.x,
      y: v.y,
      w: v.w,
      h: v.h,
      minW: typeof v.minW === "number" ? v.minW : WIDGET_REGISTRY[id as WidgetId].defaults.minW,
      minH: typeof v.minH === "number" ? v.minH : WIDGET_REGISTRY[id as WidgetId].defaults.minH,
    };
  }

  const visible: WidgetId[] = [];
  for (const id of rawVisible) {
    if (typeof id === "string" && id in WIDGET_REGISTRY) {
      visible.push(id as WidgetId);
    }
  }

  if (Object.keys(layout).length === 0 && visible.length === 0) return null;
  return { layout: layout as Record<WidgetId, GridItem>, visible };
}

/**
 * Hook que:
 *  1) Carrega o layout salvo do backend na montagem e hidrata o store.
 *  2) Escuta mudanças `dirty=true` do store e faz PUT com debounce de 800ms.
 *  3) Só atua com sessão autenticada.
 *
 * Usar no topo da página do dashboard.
 */
export function useDashboardLayoutSync(enabled: boolean = true) {
  const { status } = useSession();
  const hydrate = useDashboardStore((s) => s.hydrate);
  const markSaved = useDashboardStore((s) => s.markSaved);

  const authed = status === "authenticated";

  // 1) Carrega do backend uma vez.
  const loadedRef = React.useRef(false);
  React.useEffect(() => {
    if (!enabled || !authed || loadedRef.current) return;
    loadedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(apiUrl("/api/dashboard/layout"), { cache: "no-store" });
        if (!r.ok) return;
        const json = (await r.json()) as GetResponse;
        if (cancelled || !json.data) return;
        const parsed = sanitize(json.data);
        if (!parsed) return;
        hydrate({
          layout: parsed.layout,
          visibleWidgets: parsed.visible,
          preset: (json.preset as DashboardPresetId) ?? "custom",
          activeLayoutName: json.name ?? "Padrão",
        });
      } catch {
        // Falha silenciosa — cache local (já hidratado) segue valendo.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, authed, hydrate]);

  // 2) Debounce: observa `dirty` e faz PUT quando houver pausa de 800ms.
  React.useEffect(() => {
    if (!enabled || !authed) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = useDashboardStore.subscribe((state, prev) => {
      void prev;
      if (!state.dirty) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        const s = useDashboardStore.getState();
        try {
          const body = {
            name: s.activeLayoutName || "Padrão",
            preset: s.preset,
            visibleWidgets: [...s.visibleWidgets],
            layout: s.layout,
          };
          const r = await fetch(apiUrl("/api/dashboard/layout"), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (r.ok) markSaved();
        } catch {
          // Falha silenciosa — continua dirty e tenta no próximo ciclo.
        }
      }, 800);
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, [enabled, authed, markSaved]);
}
