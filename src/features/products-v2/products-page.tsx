"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  IconBriefcase,
  IconBuildingStore,
  IconCash,
  IconLoader2,
  IconPackage,
  IconPencil,
  IconPlus,
  IconSchool,
} from "@tabler/icons-react";

import { ButtonGlass } from "@/components/crm/button-glass";
import { Chip } from "@/components/crm/chip";
import { StatusPill } from "@/components/crm/status-pill";
import {
  PageSearchBar,
  PageSegmentedControl,
  PagePrimaryButton,
  type PageSegmentItem,
} from "@/components/crm/page-toolbar";
import {
  ListColumnLabel,
  listTableHeadRowClass,
} from "@/components/crm/sortable-header";
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

const KIND_ICON: Record<ProductKind, React.ReactNode> = {
  PHYSICAL: <IconBuildingStore size={12} />,
  SERVICE: <IconCash size={12} />,
  COURSE: <IconSchool size={12} />,
  JOB_OPENING: <IconBriefcase size={12} />,
};

/** Pills de filtro por tipo — "Todos" + cada ProductKind. */
const KIND_FILTER_ITEMS: readonly PageSegmentItem[] = [
  { value: "", label: "Todos" },
  ...(Object.keys(KIND_LABEL) as ProductKind[]).map((k) => ({
    value: k,
    label: KIND_LABEL[k],
  })),
];

/** Colunas da tabela glass (mesmo padrão de /contacts): grid CSS. */
const TABELA_COLS =
  "grid-cols-[minmax(0,1fr)_130px_150px_140px_120px_72px]";

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

  const openCreate = () => {
    setEditingId(null);
    setDialogOpen(true);
  };
  const openEdit = (id: string) => {
    setEditingId(id);
    setDialogOpen(true);
  };

  /* Injeta busca (center) + filtros/ação (actions) no PageHeader do
     SettingsV2Shell — padrão canônico /contacts. */
  React.useEffect(() => {
    if (!slots) return;
    slots.setCenter(
      <PageSearchBar
        variant="compact"
        value={search}
        onChange={setSearch}
        placeholder="Buscar por nome ou SKU…"
      />,
    );
    slots.setActions(
      <div className="flex items-center gap-2">
        <PageSegmentedControl
          items={KIND_FILTER_ITEMS}
          value={kindFilter}
          onChange={(v) => setKindFilter(v as ProductKind | "")}
          size="compact"
          aria-label="Filtrar por tipo de produto"
        />
        <PagePrimaryButton onClick={openCreate}>
          <IconPlus size={15} /> Novo produto
        </PagePrimaryButton>
      </div>,
    );
    return () => {
      slots.setCenter(null);
      slots.setActions(null);
    };
  }, [slots, search, kindFilter]);

  return (
    <div className="w-full">
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <IconLoader2 size={24} className="animate-spin text-[var(--text-muted)]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-xl)] border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg-base)] py-16">
          <IconPackage size={40} className="text-[var(--text-muted)] opacity-40" />
          <p className="text-sm text-[var(--text-muted)]">Nenhum produto encontrado.</p>
          <ButtonGlass variant="glass" size="sm" onClick={openCreate}>
            <IconPlus size={14} /> Criar primeiro
          </ButtonGlass>
        </div>
      ) : (
        <div className="flex flex-col rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-1.5 shadow-[var(--glass-shadow)] backdrop-blur-md">
          <div className={listTableHeadRowClass(`grid ${TABELA_COLS} gap-3 px-3 py-2`)}>
            <ListColumnLabel>Nome</ListColumnLabel>
            <ListColumnLabel>Tipo</ListColumnLabel>
            <ListColumnLabel>SKU</ListColumnLabel>
            <ListColumnLabel align="right">Preço base</ListColumnLabel>
            <ListColumnLabel className="text-center">Status</ListColumnLabel>
            <ListColumnLabel align="right">Ações</ListColumnLabel>
          </div>

          <div className="flex flex-col">
            {filtered.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "grid items-center gap-3 border-b border-[var(--glass-border-subtle)] px-3 py-2.5 transition-colors last:border-0 hover:bg-[var(--glass-bg-overlay)]",
                  TABELA_COLS,
                  !p.isActive && "opacity-55",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-display text-[13.5px] font-semibold text-[var(--text-primary)]">
                    {p.name}
                  </p>
                  {p.description && (
                    <p className="mt-0.5 truncate text-[12px] text-[var(--text-muted)]">
                      {p.description}
                    </p>
                  )}
                </div>
                <div className="min-w-0">
                  <Chip variant="ghost">
                    {KIND_ICON[p.kind]} {KIND_LABEL[p.kind]}
                  </Chip>
                </div>
                <div className="truncate font-mono text-[12px] text-[var(--text-muted)]">
                  {p.sku || "—"}
                </div>
                <div className="text-right font-display text-[13px] font-bold tabular-nums text-[var(--text-primary)]">
                  {formatCurrency(Number(p.price))}
                </div>
                <div className="flex justify-center">
                  {p.isActive ? (
                    <StatusPill variant="success">Ativo</StatusPill>
                  ) : (
                    <Chip variant="ghost">Inativo</Chip>
                  )}
                </div>
                <div className="flex justify-end">
                  <ButtonGlass
                    variant="icon"
                    size="icon"
                    onClick={() => openEdit(p.id)}
                    aria-label={`Editar ${p.name}`}
                  >
                    <IconPencil size={14} />
                  </ButtonGlass>
                </div>
              </div>
            ))}
          </div>
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
