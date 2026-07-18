"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { IconPackage, IconPencil, IconPlus } from "@tabler/icons-react";

import { ButtonGlass } from "@/components/crm/button-glass";
import { PageActionsMenu } from "@/components/crm/page-toolbar";
import {
  SettingsListFilterBar,
  type SettingsFilterGroup,
} from "@/components/crm/settings-filter-bar";
import { useSettingsHeaderSlots } from "@/app/(app)/settings/_v2-shell";
import { apiUrl } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";

import { ProductDialog } from "./product-dialog";
import { KIND_LABEL, type ProductKind } from "./types";

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  price: number | string;
  unit: string;
  kind: ProductKind;
  isActive: boolean;
};

/** Card canônico: glass, hover elevado com borda de foco. */
const CARD_CLASS =
  "group relative flex min-w-0 items-center gap-3 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] px-3.5 py-3 shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--input-border-focus)] hover:shadow-[var(--glass-shadow)]";

async function fetchProducts(search: string): Promise<ProductRow[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("perPage", "100");
  const res = await fetch(apiUrl(`/api/products?${params}`));
  if (!res.ok) throw new Error("Erro ao carregar produtos");
  const data = await res.json();
  return data.products as ProductRow[];
}

export function ProductsV2Page() {
  const slots = useSettingsHeaderSlots();
  const [search, setSearch] = React.useState("");
  const [kindFilter, setKindFilter] = React.useState<ProductKind | "">("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", search],
    queryFn: () => fetchProducts(search),
  });

  const filtered = kindFilter
    ? products.filter((p) => p.kind === kindFilter)
    : products;

  const openCreate = React.useCallback(() => {
    setEditingId(null);
    setDialogOpen(true);
  }, []);
  const openEdit = React.useCallback((id: string) => {
    setEditingId(id);
    setDialogOpen(true);
  }, []);

  /* Contagem por tipo — alimenta os badges do popover de filtros. */
  const kindCounts = React.useMemo(() => {
    const acc: Record<string, number> = {};
    for (const p of products) acc[p.kind] = (acc[p.kind] ?? 0) + 1;
    return acc;
  }, [products]);

  const filterGroups = React.useMemo<SettingsFilterGroup[]>(
    () => [
      {
        key: "kind",
        label: "Filtrar por tipo",
        value: kindFilter,
        onChange: (v) => setKindFilter(v as ProductKind | ""),
        options: [
          { value: "", label: "Todos" },
          ...(Object.keys(KIND_LABEL) as ProductKind[]).map((k) => ({
            value: k,
            label: KIND_LABEL[k],
            count: kindCounts[k] ?? 0,
          })),
        ],
      },
    ],
    [kindFilter, kindCounts],
  );

  const searchNode = React.useMemo(
    () => (
      <SettingsListFilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Buscar por nome ou SKU…"
        ariaLabel="Buscar produtos"
        groups={filterGroups}
        onClearAll={() => {
          setSearch("");
          setKindFilter("");
        }}
        popoverTitle="Filtros"
      />
    ),
    [search, filterGroups],
  );

  const actionsNode = React.useMemo(
    () => (
      <PageActionsMenu
        items={[
          {
            icon: <IconPlus size={16} />,
            label: "Novo produto",
            onClick: openCreate,
            primary: true,
          },
        ]}
      />
    ),
    [openCreate],
  );

  /* Injeta busca (center) + ações (actions) no PageHeader do
     SettingsV2Shell — padrão canônico. */
  React.useEffect(() => {
    if (!slots) return;
    slots.setCenter(searchNode);
    slots.setActions(actionsNode);
    return () => {
      slots.setCenter(null);
      slots.setActions(null);
    };
  }, [slots, searchNode, actionsNode]);

  return (
    <div className="w-full min-w-0">
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[68px] animate-pulse rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] shadow-[var(--glass-shadow-sm)]"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg-base)] py-16">
          <IconPackage size={40} className="text-[var(--text-muted)] opacity-40" />
          <p className="text-sm text-[var(--text-muted)]">Nenhum produto encontrado.</p>
          <ButtonGlass variant="glass" size="sm" onClick={openCreate}>
            <IconPlus size={14} /> Criar primeiro
          </ButtonGlass>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const infos = [
              formatCurrency(Number(p.price)),
              KIND_LABEL[p.kind],
              p.sku || null,
              !p.isActive ? "Inativo" : null,
            ].filter(Boolean);
            return (
              <div
                key={p.id}
                className={cn(CARD_CLASS, !p.isActive && "opacity-55")}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[13.5px] font-bold text-[var(--text-primary)]">
                    {p.name}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-[var(--text-muted)]">
                    {infos.join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => openEdit(p.id)}
                    aria-label={`Editar ${p.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--color-primary-soft)] hover:text-[var(--brand-primary)]"
                  >
                    <IconPencil size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        productId={editingId}
        onCreated={(id) => setEditingId(id)}
      />
    </div>
  );
}
