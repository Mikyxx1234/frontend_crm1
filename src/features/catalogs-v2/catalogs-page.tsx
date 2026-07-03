"use client";

import * as React from "react";
import {
  IconBookmark,
  IconBoxMultiple,
  IconLoader2,
  IconPencil,
  IconPlus,
  IconSearch,
  IconStar,
  IconStars,
  IconTag,
  IconTrash,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useConfirm } from "@/components/ui/confirm-dialog";

import { ProductDialog } from "@/features/products-v2/product-dialog";
import { useSettingsHeaderSlots } from "@/app/(app)/settings/_v2-shell";

import { CatalogWizard } from "./catalog-wizard";
import { capabilityMeta } from "./constants";
import {
  useCatalogs,
  useDeleteCatalog,
  useSaveAsTemplate,
} from "./hooks";
import type { CatalogView } from "./types";

/* ────────────────────────────────────────────────────────────────────── *
 *  STATS
 * ────────────────────────────────────────────────────────────────────── */

type StatTone = "brand" | "purple" | "green" | "amber";

function StatCard({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  tone: StatTone;
}) {
  const toneClass = {
    brand: "bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]",
    purple:
      "bg-[color-mix(in_srgb,var(--brand-secondary)_18%,transparent)] text-[var(--brand-secondary)]",
    green:
      "bg-[var(--color-success-bg)] text-[color-mix(in_srgb,var(--color-success)_75%,black)]",
    amber:
      "bg-[var(--color-warn-bg)] text-[var(--color-warn)]",
  }[tone];

  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-4 py-3.5 shadow-[var(--glass-shadow-sm)] backdrop-blur-md">
      <div
        aria-hidden
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
          toneClass,
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="font-display text-[21px] font-extrabold leading-none tracking-tight text-[var(--text-primary)]">
          {value}
        </div>
        <div className="mt-1 text-[11.5px] font-semibold text-[var(--text-muted)]">
          {label}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────── *
 *  CARD DE CATÁLOGO
 * ────────────────────────────────────────────────────────────────────── */

function CatalogCard({
  cat,
  onEdit,
  onSaveTemplate,
  onDelete,
  templatePending,
  deletePending,
}: {
  cat: CatalogView;
  onEdit: () => void;
  onSaveTemplate: () => void;
  onDelete: () => void;
  templatePending: boolean;
  deletePending: boolean;
}) {
  const activeCaps = cat.capabilities.filter((c) => c.enabled);
  const productCount = cat._count?.products ?? 0;

  return (
    <article className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] p-4 shadow-[var(--glass-shadow-sm)] transition-all hover:-translate-y-0.5 hover:border-[var(--input-border-focus)] hover:shadow-[var(--glass-shadow)] v2-dark:bg-[var(--glass-bg-modal)]">
      <div className="flex items-start gap-3">
        <div
          aria-hidden
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] text-[var(--brand-primary)]"
        >
          <IconBoxMultiple size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="font-display text-[15px] font-bold text-[var(--text-primary)] transition-colors hover:text-[var(--brand-primary)]"
            >
              {cat.name}
            </button>
            {cat.isDefault && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-enterprise-bg)] px-2 py-0.5 font-display text-[11px] font-bold text-[var(--brand-primary)]">
                <IconStar size={11} /> Padrão
              </span>
            )}
            {cat.isTemplate && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-border-subtle)] px-2 py-0.5 font-display text-[11px] font-bold text-[var(--text-secondary)]">
                <IconBookmark size={11} /> Template
              </span>
            )}
          </div>
          {cat.description && (
            <p className="mt-1 text-[12.5px] leading-snug text-[var(--text-muted)]">
              {cat.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            title="Editar catálogo"
            aria-label="Editar catálogo"
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)] transition-colors hover:border-[var(--input-border-focus)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)]"
          >
            <IconPencil size={15} />
          </button>
          <button
            type="button"
            title="Salvar como template"
            aria-label="Salvar como template"
            onClick={onSaveTemplate}
            disabled={templatePending}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)] transition-colors hover:border-[var(--input-border-focus)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)] disabled:opacity-50"
          >
            <IconBookmark size={15} />
          </button>
          {!cat.isDefault && (
            <button
              type="button"
              title="Excluir catálogo"
              aria-label="Excluir catálogo"
              onClick={onDelete}
              disabled={deletePending}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)] transition-colors hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] disabled:opacity-50"
            >
              <IconTrash size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--glass-border-subtle)] pt-2.5">
        {activeCaps.length === 0 ? (
          <span className="text-[11.5px] italic text-[var(--text-muted)]">
            Sem capacidades ativas
          </span>
        ) : (
          activeCaps.map((c) => {
            const meta = capabilityMeta(c.capabilityKey);
            const Icon = meta.icon;
            return (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-2.5 py-1 font-display text-[12px] font-bold text-[var(--text-secondary)]"
              >
                <Icon size={12} className="text-[var(--brand-secondary)]" />
                {meta.short}
              </span>
            );
          })
        )}
        <span className="ml-auto text-[12px] font-semibold text-[var(--text-muted)]">
          · {productCount} produto{productCount === 1 ? "" : "s"}
        </span>
      </div>
    </article>
  );
}

/* ────────────────────────────────────────────────────────────────────── *
 *  MANAGER
 * ────────────────────────────────────────────────────────────────────── */

export function CatalogsManager() {
  const { data: catalogs, isLoading } = useCatalogs();
  const deleteMutation = useDeleteCatalog();
  const templateMutation = useSaveAsTemplate();
  const slots = useSettingsHeaderSlots();
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CatalogView | null>(null);
  const [newProductCatalogId, setNewProductCatalogId] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const { confirm, dialog } = useConfirm();

  async function handleDelete(id: string, name: string) {
    const ok = await confirm({
      title: `Excluir o catálogo "${name}"?`,
      description: "Os produtos ficarão sem catálogo.",
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (!ok) return;
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success("Catálogo excluído."),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Erro ao excluir"),
    });
  }

  function handleSaveTemplate(id: string) {
    templateMutation.mutate(
      { id },
      {
        onSuccess: () => toast.success("Salvo como template da organização."),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Erro ao salvar template"),
      },
    );
  }

  /* Métricas — somam todos os catálogos sem filtro (visão organizacional). */
  const stats = React.useMemo(() => {
    const list = catalogs ?? [];
    const activeCapabilities = list.reduce(
      (sum, c) => sum + c.capabilities.filter((cap) => cap.enabled).length,
      0,
    );
    const totalProducts = list.reduce(
      (sum, c) => sum + (c._count?.products ?? 0),
      0,
    );
    const defaults = list.filter((c) => c.isDefault).length;
    return {
      total: list.length,
      activeCapabilities,
      totalProducts,
      defaults,
    };
  }, [catalogs]);

  /* Filtro por busca, case-insensitive sobre name+description. */
  const filtered = React.useMemo(() => {
    const list = catalogs ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false),
    );
  }, [catalogs, query]);

  /* Injeta busca + ação no PageHeader do SettingsV2Shell. O effect é
     reativo a `query` pra manter o input controlado no centro. */
  React.useEffect(() => {
    if (!slots) return;
    slots.setCenter(
      <label className="flex h-[42px] w-full max-w-[440px] items-center gap-2.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-4 text-[var(--text-muted)] transition-shadow focus-within:border-[var(--input-border-focus)] focus-within:shadow-[0_0_0_3px_var(--input-ring-focus)]">
        <IconSearch size={16} className="shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar catálogo..."
          aria-label="Buscar catálogo"
          className="min-w-0 flex-1 border-none bg-transparent text-[14px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
        />
      </label>,
    );
    slots.setActions(
      <Button onClick={() => setWizardOpen(true)}>
        <IconPlus size={16} /> Novo catálogo
      </Button>,
    );
    return () => {
      slots.setCenter(null);
      slots.setActions(null);
    };
  }, [slots, query]);

  return (
    <div className="flex flex-col gap-3.5">
      {/* MÉTRICAS */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          tone="brand"
          icon={<IconBoxMultiple size={20} />}
          value={stats.total}
          label="Catálogos na organização"
        />
        <StatCard
          tone="purple"
          icon={<IconTag size={20} />}
          value={stats.activeCapabilities}
          label="Capacidades ativas"
        />
        <StatCard
          tone="green"
          icon={<IconBookmark size={20} />}
          value={stats.totalProducts}
          label="Produtos cadastrados"
        />
        <StatCard
          tone="amber"
          icon={<IconStars size={20} />}
          value={stats.defaults}
          label="Catálogo padrão"
        />
      </div>

      {/* PAINEL — lista de catálogos */}
      <section
        aria-label="Catálogos da organização"
        className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] shadow-[var(--glass-shadow)] v2-dark:bg-[var(--glass-bg-modal)]"
      >
        <header className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-[var(--glass-border-subtle)] bg-[var(--glass-bg-panel)] px-4 py-3.5 v2-dark:bg-[var(--glass-bg-modal)]">
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]"
          >
            <IconBoxMultiple size={16} />
          </span>
          <span className="font-display text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
            Catálogos da organização
          </span>
          <span className="rounded-full border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-2 py-px text-[11px] font-bold text-[var(--text-muted)]">
            {filtered.length}
          </span>
          {query && (
            <span className="text-[11.5px] text-[var(--text-muted)]">
              de {stats.total}
            </span>
          )}
        </header>

        <div className="grid gap-3.5 p-4 [grid-template-columns:repeat(auto-fill,minmax(380px,1fr))]">
          {isLoading && (
            <div className="col-span-full flex items-center justify-center gap-2 py-12 text-[13px] text-[var(--text-muted)]">
              <IconLoader2 size={16} className="animate-spin" />
              Carregando catálogos…
            </div>
          )}

          {!isLoading && filtered.length === 0 && query && (
            <div className="col-span-full flex flex-col items-center gap-2 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)]">
                <IconSearch size={20} />
              </div>
              <p className="font-display text-[13px] font-bold text-[var(--text-primary)]">
                Nenhum catálogo encontrado para “{query}”
              </p>
              <p className="text-[12px] text-[var(--text-muted)]">
                Tente outro termo ou crie um novo catálogo.
              </p>
            </div>
          )}

          {!isLoading &&
            filtered.map((cat) => (
              <CatalogCard
                key={cat.id}
                cat={cat}
                onEdit={() => setEditing(cat)}
                onSaveTemplate={() => handleSaveTemplate(cat.id)}
                onDelete={() => handleDelete(cat.id, cat.name)}
                templatePending={templateMutation.isPending}
                deletePending={deleteMutation.isPending}
              />
            ))}

          {!isLoading && !query && (
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-6 text-[var(--text-muted)] transition-all hover:border-[var(--input-border-focus)] hover:bg-[var(--glass-bg-strong)] hover:text-[var(--brand-primary)]"
            >
              <span
                aria-hidden
                className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]"
              >
                <IconPlus size={20} />
              </span>
              <span className="font-display text-[13.5px] font-bold">
                Novo catálogo
              </span>
            </button>
          )}
        </div>
      </section>

      {/* DIALOGS */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Novo catálogo</DialogTitle>
            <DialogDescription>
              Responda perguntas de negócio — o catálogo monta as capacidades para você.
            </DialogDescription>
          </DialogHeader>
          <CatalogWizard
            onDone={(createdId) => {
              setWizardOpen(false);
              if (createdId) setNewProductCatalogId(createdId);
            }}
            onCancel={() => setWizardOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ProductDialog
        open={!!newProductCatalogId}
        onOpenChange={(o) => !o && setNewProductCatalogId(null)}
        productId={null}
        initialCatalogId={newProductCatalogId ?? undefined}
        onCreated={() => setNewProductCatalogId(null)}
      />

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Editar catálogo</DialogTitle>
            <DialogDescription>
              Ajuste capacidades, modos e políticas de override deste catálogo.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <CatalogWizard
              key={editing.id}
              catalog={editing}
              onDone={() => setEditing(null)}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      {dialog}
    </div>
  );
}
