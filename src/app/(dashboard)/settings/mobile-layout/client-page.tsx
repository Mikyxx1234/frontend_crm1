"use client";

import { apiUrl } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Loader2,
  Lock,
  RotateCcw,
  Save,
  Smartphone,
} from "lucide-react";
import { useEffect, useState } from "react";

import { MobileModuleIcon } from "@/components/layout/mobile-module-icon";
import { Button } from "@/components/ui/button";
import { pageHeaderDescriptionClass, pageHeaderTitleClass } from "@/components/ui/page-header";
import {
  MOBILE_LAYOUT_QUERY_KEY,
  useMobileLayout,
} from "@/hooks/use-mobile-layout";
import {
  BOTTOM_NAV_MAX,
  DEFAULT_BOTTOM_NAV,
  DEFAULT_ENABLED,
  MOBILE_MODULES,
  type MobileModuleId,
} from "@/lib/mobile-layout";
import { cn } from "@/lib/utils";

/**
 * Layout Builder do PWA mobile.
 *
 * Estrutura:
 *   - Coluna ESQUERDA: catalogo de modulos (toggle on/off + reorder
 *     dentro do bottom nav).
 *   - Coluna DIREITA: mockup estatico de iPhone com preview LIVE.
 *     Re-renderiza instantaneamente conforme o admin muda toggles.
 *
 * Fluxo de dados:
 *   1. `useMobileLayout()` carrega config remota.
 *   2. Estado local `draft` espelha config; usuario edita.
 *   3. Salvar -> PUT /api/mobile-layout -> invalida cache global.
 *   4. App em outras abas pega versao nova em ate 30s (staleTime).
 *
 * Decisoes UX:
 *   - Sem drag-and-drop pesado (dnd-kit) — usamos botoes ↑↓ que
 *     funcionam perfeitamente em mobile e teclado, sao acessiveis
 *     por padrao e mantem bundle leve. Se o usuario pedir DnD
 *     "real" depois, refatoramos.
 *   - Limite de 4 modulos no bottom nav (BOTTOM_NAV_MAX) imposto
 *     visualmente: 5o toggle aparece desabilitado com tooltip.
 *   - Inbox e `required` -> toggle bloqueado (cadeado).
 */

type ModuleState = {
  id: MobileModuleId;
  enabled: boolean;
  inBottomNav: boolean;
  bottomNavOrder: number; // -1 quando nao esta no nav
};

export function MobileLayoutClientPage() {
  const { config, isLoading } = useMobileLayout();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<ModuleState[]>([]);
  const [saved, setSaved] = useState(false);

  // Sincroniza draft quando config carrega/refetcha. Usamos
  // version como chave: se o admin abre a pagina depois de outro
  // admin ter salvo, pegamos a versao mais nova automaticamente.
  useEffect(() => {
    if (isLoading) return;
    const navOrder = new Map(config.bottomNav.map((id, idx) => [id, idx] as const));
    const enabledSet = new Set(config.enabled);
    setDraft(
      MOBILE_MODULES.map((m) => ({
        id: m.id,
        enabled: enabledSet.has(m.id),
        inBottomNav: navOrder.has(m.id),
        bottomNavOrder: navOrder.get(m.id) ?? -1,
      })),
    );
  }, [config.version, isLoading, config.bottomNav, config.enabled]);

  const saveMutation = useMutation({
    mutationFn: async (payload: { bottomNav: MobileModuleId[]; enabled: MobileModuleId[] }) => {
      const res = await fetch(apiUrl("/api/mobile-layout"), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`save_failed_${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MOBILE_LAYOUT_QUERY_KEY });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const bottomNavCount = draft.filter((d) => d.inBottomNav).length;
  const orderedBottomNav = draft
    .filter((d) => d.inBottomNav)
    .sort((a, b) => a.bottomNavOrder - b.bottomNavOrder);

  function toggleEnabled(id: MobileModuleId) {
    const desc = MOBILE_MODULES.find((m) => m.id === id);
    if (desc?.required) return;
    setDraft((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const nextEnabled = !d.enabled;
        return {
          ...d,
          enabled: nextEnabled,
          inBottomNav: nextEnabled ? d.inBottomNav : false,
          bottomNavOrder: nextEnabled ? d.bottomNavOrder : -1,
        };
      }),
    );
  }

  function toggleBottomNav(id: MobileModuleId) {
    setDraft((prev) => {
      const target = prev.find((d) => d.id === id);
      if (!target || !target.enabled) return prev;
      const isAdding = !target.inBottomNav;
      if (isAdding && bottomNavCount >= BOTTOM_NAV_MAX) return prev;

      if (isAdding) {
        const nextOrder = Math.max(0, ...prev.filter((p) => p.inBottomNav).map((p) => p.bottomNavOrder)) + 1;
        return prev.map((d) =>
          d.id === id ? { ...d, inBottomNav: true, bottomNavOrder: nextOrder } : d,
        );
      }
      // Removendo: re-numera os restantes pra ficarem 0..N-1.
      const remaining = prev
        .filter((p) => p.inBottomNav && p.id !== id)
        .sort((a, b) => a.bottomNavOrder - b.bottomNavOrder);
      const orderMap = new Map(remaining.map((p, idx) => [p.id, idx] as const));
      return prev.map((d) =>
        d.id === id
          ? { ...d, inBottomNav: false, bottomNavOrder: -1 }
          : orderMap.has(d.id)
            ? { ...d, bottomNavOrder: orderMap.get(d.id)! }
            : d,
      );
    });
  }

  function moveBottomNav(id: MobileModuleId, dir: -1 | 1) {
    setDraft((prev) => {
      const ordered = prev
        .filter((d) => d.inBottomNav)
        .sort((a, b) => a.bottomNavOrder - b.bottomNavOrder);
      const idx = ordered.findIndex((d) => d.id === id);
      if (idx < 0) return prev;
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= ordered.length) return prev;
      const a = ordered[idx];
      const b = ordered[swapIdx];
      return prev.map((d) => {
        if (d.id === a.id) return { ...d, bottomNavOrder: b.bottomNavOrder };
        if (d.id === b.id) return { ...d, bottomNavOrder: a.bottomNavOrder };
        return d;
      });
    });
  }

  function resetDefaults() {
    const navSet = new Set<MobileModuleId>(DEFAULT_BOTTOM_NAV);
    const enabledSet = new Set<MobileModuleId>(DEFAULT_ENABLED);
    setDraft(
      MOBILE_MODULES.map((m) => ({
        id: m.id,
        enabled: enabledSet.has(m.id),
        inBottomNav: navSet.has(m.id),
        bottomNavOrder: navSet.has(m.id) ? DEFAULT_BOTTOM_NAV.indexOf(m.id) : -1,
      })),
    );
  }

  function save() {
    const enabled = draft.filter((d) => d.enabled).map((d) => d.id);
    const bottomNav = orderedBottomNav.map((d) => d.id);
    saveMutation.mutate({ bottomNav, enabled });
  }

  const dirty =
    JSON.stringify({
      e: draft.filter((d) => d.enabled).map((d) => d.id).sort(),
      b: orderedBottomNav.map((d) => d.id),
    }) !==
    JSON.stringify({
      e: [...config.enabled].sort(),
      b: config.bottomNav,
    });

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Smartphone className="size-5 text-brand-blue" />
          <h1 className={pageHeaderTitleClass}>
            Layout do app mobile
          </h1>
        </div>
        <p className={pageHeaderDescriptionClass}>
          Personalize quais módulos aparecem na barra inferior do app instalável (PWA). Os operadores
          verão essa configuração na próxima vez que abrirem o app.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* COLUNA ESQUERDA — Catalogo de modulos */}
        <div className="space-y-6">
          {/* Bottom nav editor */}
          <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-premium">
            <div className="mb-4 flex items-end justify-between gap-2">
              <div>
                <h2 className="font-outfit text-lg font-black text-slate-900">
                  Barra inferior do app
                </h2>
                <p className="text-sm text-slate-500">
                  Até {BOTTOM_NAV_MAX} módulos · usados {bottomNavCount}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetDefaults}
                className="gap-1.5 text-slate-500 hover:text-slate-900"
              >
                <RotateCcw className="size-3.5" />
                Restaurar padrão
              </Button>
            </div>

            <ol className="space-y-2">
              {orderedBottomNav.map((d, idx) => {
                const desc = MOBILE_MODULES.find((m) => m.id === d.id)!;
                return (
                  <li
                    key={d.id}
                    className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/40 p-3"
                  >
                    <span className="flex size-9 items-center justify-center rounded-full bg-brand-navy text-white">
                      <MobileModuleIcon name={desc.iconName} className="size-[18px]" strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-outfit text-sm font-black text-slate-900">{desc.label}</p>
                      <p className="truncate text-[12px] text-slate-500">{desc.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveBottomNav(d.id, -1)}
                        disabled={idx === 0}
                        aria-label={`Mover ${desc.label} para cima`}
                        className="touch-target flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                      >
                        <ArrowUp className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBottomNav(d.id, 1)}
                        disabled={idx === orderedBottomNav.length - 1}
                        aria-label={`Mover ${desc.label} para baixo`}
                        className="touch-target flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                      >
                        <ArrowDown className="size-4" />
                      </button>
                      {desc.required ? (
                        <span
                          className="touch-target flex items-center justify-center rounded-full text-slate-400"
                          title="Inbox é fixo no app — não pode ser removido."
                        >
                          <Lock className="size-4" />
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleBottomNav(d.id)}
                          aria-label={`Remover ${desc.label} da barra inferior`}
                          className="touch-target rounded-full text-[11px] font-bold uppercase tracking-wider text-rose-500 hover:bg-rose-50"
                        >
                          Tirar
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Catalogo completo */}
          <section className="rounded-[28px] border border-slate-100 bg-white p-6 shadow-premium">
            <div className="mb-4">
              <h2 className="font-outfit text-lg font-black text-slate-900">Todos os módulos</h2>
              <p className="text-sm text-slate-500">
                Habilite ou esconda módulos do app. Itens habilitados que não estão na barra ficam
                no menu &quot;Mais&quot;.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {draft.map((d) => {
                const desc = MOBILE_MODULES.find((m) => m.id === d.id)!;
                const canPromote = d.enabled && !d.inBottomNav && bottomNavCount < BOTTOM_NAV_MAX;
                return (
                  <div
                    key={d.id}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border p-3 transition-colors",
                      d.enabled ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-70",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full",
                        d.enabled ? "bg-brand-blue/10 text-brand-blue" : "bg-slate-200 text-slate-400",
                      )}
                    >
                      <MobileModuleIcon name={desc.iconName} className="size-[18px]" strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-outfit text-sm font-black text-slate-900">{desc.label}</p>
                      <p className="truncate text-[12px] text-slate-500">{desc.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <button
                        type="button"
                        onClick={() => toggleEnabled(d.id)}
                        disabled={desc.required}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors",
                          desc.required
                            ? "cursor-not-allowed bg-slate-100 text-slate-400"
                            : d.enabled
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                              : "bg-slate-200 text-slate-600 hover:bg-slate-300",
                        )}
                      >
                        {desc.required ? "Fixo" : d.enabled ? "Ativo" : "Oculto"}
                      </button>
                      {d.enabled && !d.inBottomNav && (
                        <button
                          type="button"
                          onClick={() => toggleBottomNav(d.id)}
                          disabled={!canPromote}
                          title={!canPromote ? `Limite de ${BOTTOM_NAV_MAX} no menu inferior` : ""}
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors",
                            canPromote
                              ? "bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20"
                              : "cursor-not-allowed bg-slate-100 text-slate-400",
                          )}
                        >
                          Pôr no menu
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Save bar (sticky) */}
          <div className="sticky bottom-4 z-10 flex items-center justify-end gap-3 rounded-2xl border border-slate-100 bg-white/95 p-4 shadow-premium backdrop-blur">
            {saved && (
              <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-600">
                <Check className="size-4" />
                Salvo
              </span>
            )}
            {dirty && !saved && (
              <span className="text-sm text-amber-600">Você tem alterações não salvas.</span>
            )}
            <Button
              type="button"
              onClick={save}
              disabled={!dirty || saveMutation.isPending}
              className="h-11 gap-2 rounded-full bg-[#507df1] px-6 text-white shadow-blue-glow hover:bg-[#4466d6]"
            >
              {saveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Salvar layout
            </Button>
          </div>
        </div>

        {/* COLUNA DIREITA — Mockup iPhone */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <IPhoneMockup
            bottomNav={orderedBottomNav.map((d) => d.id)}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Mockup ESTATICO de iPhone (notch + bezels) com preview live da
 * bottom nav. Nao tenta ser pixel-perfect com o real iPhone — e
 * uma representacao visual pra dar contexto da tela. Conteudo
 * interno e um placeholder generico ("Inbox") + a bottom nav real
 * renderizada com o estado atual do draft.
 */
function IPhoneMockup({ bottomNav }: { bottomNav: MobileModuleId[] }) {
  const items = bottomNav
    .map((id) => MOBILE_MODULES.find((m) => m.id === id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  return (
    <div className="flex flex-col items-center">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        Pré-visualização ao vivo
      </p>
      <div
        className="relative aspect-[9/19.5] w-full max-w-[320px] rounded-[44px] border-[10px] border-slate-900 bg-slate-900 shadow-premium"
      >
        {/* Tela */}
        <div className="absolute inset-0 overflow-hidden rounded-[34px] bg-[#f4f7fa]">
          {/* Notch */}
          <div className="absolute left-1/2 top-0 z-20 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-slate-900" />
          {/* Top bar (status bar imitada) */}
          <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-6 pt-2 text-[10px] font-bold text-slate-900">
            <span>9:41</span>
            <span>•••</span>
          </div>
          {/* Mobile top bar do app */}
          <div className="absolute left-0 right-0 top-7 flex items-center justify-between bg-brand-navy px-4 py-3 shadow-md">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-md bg-white">
                <span className="text-[12px] font-black text-brand-navy">E</span>
              </span>
              <span className="font-outfit text-[13px] font-black tracking-tight text-white">
                Inbox
              </span>
            </div>
            <span className="size-7 rounded-full bg-white/20" />
          </div>
          {/* Conteudo placeholder */}
          <div className="absolute left-0 right-0 top-[78px] bottom-[64px] space-y-2 overflow-hidden px-3 py-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl bg-white p-2 shadow-sm">
                <span className="size-8 shrink-0 rounded-full bg-slate-200" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="h-2 w-2/3 rounded-full bg-slate-200" />
                  <div className="h-2 w-full rounded-full bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
          {/* Bottom nav LIVE */}
          <div className="absolute bottom-0 left-0 right-0 flex items-stretch border-t border-white/10 bg-brand-navy px-1 pb-2 pt-1.5">
            {items.length === 0 ? (
              <div className="flex-1 py-3 text-center text-[10px] text-sidebar-muted">
                Nenhum módulo na barra
              </div>
            ) : (
              items.map((m, idx) => (
                <div
                  key={m.id}
                  className={cn(
                    "relative flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5",
                    idx === 0 ? "text-white" : "text-sidebar-muted",
                  )}
                >
                  <MobileModuleIcon
                    name={m.iconName}
                    className={cn("size-4", idx === 0 && "scale-110")}
                    strokeWidth={idx === 0 ? 2.5 : 2}
                  />
                  <span className="text-[8px] font-semibold tracking-tight">{m.label}</span>
                  {idx === 0 && (
                    <span className="absolute -top-0.5 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-white" />
                  )}
                </div>
              ))
            )}
            <div className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-sidebar-muted">
              <span className="flex h-4 items-center text-[14px] font-bold">···</span>
              <span className="text-[8px] font-semibold tracking-tight">Mais</span>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-slate-400">
        Mudanças aparecem para os operadores em até 30s.
      </p>
    </div>
  );
}
