"use client";

import * as React from "react";
import { IconAlertTriangle as AlertTriangle, IconCheck as Check, IconChevronDown as ChevronDown, IconChevronUp as ChevronUp, IconGripVertical as GripVertical, IconLoader2 as Loader2, IconLock as Lock, IconRotate2 as RotateCcw } from "@tabler/icons-react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  SIDEBAR_CATALOG,
  getSidebarCatalogItem,
  resolveSidebarItems,
  type SidebarItemPreference,
} from "@/lib/sidebar-catalog";

import { useSaveSidebarPreferences, useSidebarPreferences } from "./hooks";

/** Item do estado local: ordem implicita pela posicao no array. */
interface LocalItem {
  key: string;
  enabled: boolean;
}

function toLocalItems(pref: SidebarItemPreference[] | undefined): LocalItem[] {
  return resolveSidebarItems(pref).map((i) => ({ key: i.key, enabled: i.enabled }));
}

function signature(items: LocalItem[]): string {
  return items.map((i) => `${i.key}:${i.enabled ? 1 : 0}`).join("|");
}

export function SidebarCustomizationCard() {
  const { data, isLoading, isError, error } = useSidebarPreferences();
  const saveMutation = useSaveSidebarPreferences();

  const prefItems = data?.sidebar.items;

  const [items, setItems] = React.useState<LocalItem[]>(() => toLocalItems(prefItems));
  const [baseline, setBaseline] = React.useState<string>(() => signature(toLocalItems(prefItems)));
  const dragIndex = React.useRef<number | null>(null);

  // Sincroniza o estado local quando a preferencia carrega/muda — mas so
  // quando nao ha alteracoes nao salvas (evita sobrescrever edicoes do user).
  React.useEffect(() => {
    if (prefItems === undefined) return;
    const next = toLocalItems(prefItems);
    const nextSig = signature(next);
    setItems((current) =>
      signature(current) === baseline ? next : current,
    );
    setBaseline(nextSig);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const dirty = signature(items) !== baseline;

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    setItems((curr) => {
      const next = [...curr];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const toggle = (key: string) => {
    setItems((curr) =>
      curr.map((it) => (it.key === key ? { ...it, enabled: !it.enabled } : it)),
    );
  };

  const handleSave = () => {
    const payload: SidebarItemPreference[] = items.map((it, idx) => ({
      key: it.key,
      enabled: it.enabled,
      order: idx + 1,
    }));
    saveMutation.mutate(payload, {
      onSuccess: () => toast.success("Preferências salvas com sucesso."),
      onError: (e) =>
        toast.error(e.message || "Não foi possível salvar suas preferências."),
    });
  };

  const handleReset = () => {
    // Ordem do catalogo, todos habilitados — marca como nao-salvo.
    setItems(SIDEBAR_CATALOG.map((i) => ({ key: i.key, enabled: true })));
    toast.message("Padrão restaurado — clique em Salvar para aplicar.");
  };

  return (
    <section className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-8 shadow-[var(--glass-shadow)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">
            Personalização da Sidebar
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-snug text-[var(--text-muted)]">
            Escolha quais atalhos aparecem no seu menu lateral e organize a ordem
            conforme sua rotina. Essa configuração vale só para você.
          </p>
        </div>
        {dirty && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
            Alterações não salvas
          </span>
        )}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-[var(--color-ink-muted)]" />
          </div>
        ) : isError ? (
          <div className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50/60 px-4 py-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              {error instanceof Error
                ? error.message
                : "Não foi possível carregar suas preferências."}
            </span>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((it, idx) => {
              const meta = getSidebarCatalogItem(it.key);
              if (!meta) return null;
              const Icon = meta.icon;
              return (
                <li
                  key={it.key}
                  draggable
                  onDragStart={() => {
                    dragIndex.current = idx;
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragIndex.current !== null && dragIndex.current !== idx) {
                      move(dragIndex.current, idx);
                    }
                    dragIndex.current = null;
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]/40 px-3 py-2.5 transition-opacity",
                    !it.enabled && "opacity-60",
                  )}
                >
                  {/* Drag handle + botoes de ordenacao (fallback mobile/a11y) */}
                  <div className="flex shrink-0 items-center gap-0.5">
                    <span
                      className="hidden cursor-grab text-slate-300 active:cursor-grabbing sm:block"
                      aria-hidden
                    >
                      <GripVertical className="size-4" />
                    </span>
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => move(idx, idx - 1)}
                        disabled={idx === 0}
                        aria-label={`Mover ${meta.title} para cima`}
                        className="text-slate-400 transition-colors hover:text-slate-700 disabled:opacity-30"
                      >
                        <ChevronUp className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(idx, idx + 1)}
                        disabled={idx === items.length - 1}
                        aria-label={`Mover ${meta.title} para baixo`}
                        className="text-slate-400 transition-colors hover:text-slate-700 disabled:opacity-30"
                      >
                        <ChevronDown className="size-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#eef2ff] text-primary">
                    <Icon size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {meta.title}
                      </p>
                      {meta.locked && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          <Lock className="size-2.5" />
                          Obrigatório
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[12px] text-[var(--color-ink-muted)]">
                      {meta.description}
                    </p>
                  </div>

                  <Switch
                    checked={it.enabled}
                    disabled={meta.locked}
                    onCheckedChange={() => toggle(it.key)}
                    aria-label={`Mostrar ${meta.title} no menu lateral`}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleReset}
          disabled={isLoading || isError || saveMutation.isPending}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-4 text-sm font-semibold text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--glass-bg-strong)] disabled:opacity-50"
        >
          <RotateCcw className="size-4" />
          Restaurar padrão
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saveMutation.isPending || isLoading || isError}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white shadow-[var(--shadow-indigo-glow)] transition-colors hover:bg-[#4466d6] disabled:opacity-50"
        >
          {saveMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          Salvar alterações
        </button>
      </div>
    </section>
  );
}
