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
  IconSearch,
} from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <IconSearch
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou SKU…"
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-0.5">
          {([{ val: "", label: "Todos" }] as Array<{ val: ProductKind | ""; label: string }>)
            .concat(
              (Object.keys(KIND_LABEL) as ProductKind[]).map((k) => ({
                val: k,
                label: KIND_LABEL[k],
              })),
            )
            .map((opt) => (
              <button
                key={opt.val || "all"}
                type="button"
                onClick={() => setKindFilter(opt.val)}
                className={cn(
                  "rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium transition-colors",
                  kindFilter === opt.val
                    ? "bg-[var(--glass-bg-strong)] text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
              >
                {opt.label}
              </button>
            ))}
        </div>
        <Button onClick={openCreate}>
          <IconPlus size={16} /> Novo produto
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <IconLoader2 size={24} className="animate-spin text-[var(--text-secondary)]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--glass-border)] py-16">
          <IconPackage size={40} className="text-[var(--text-secondary)] opacity-40" />
          <p className="text-sm text-[var(--text-secondary)]">Nenhum produto encontrado.</p>
          <Button variant="outline" size="sm" onClick={openCreate}>
            <IconPlus size={14} /> Criar primeiro
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--glass-border)] text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3 text-right">Preço base</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className={cn(
                    "border-b border-[var(--glass-border)] transition-colors last:border-0 hover:bg-[var(--glass-bg-subtle)]",
                    !p.isActive && "opacity-50",
                  )}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-[var(--text-primary)]">{p.name}</span>
                    {p.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-[var(--text-secondary)]">
                        {p.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="gap-1 text-[10px]">
                      {KIND_ICON[p.kind]} {KIND_LABEL[p.kind]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--text-secondary)]">
                    {p.sku || "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-[var(--text-primary)]">
                    {formatCurrency(Number(p.price))}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={p.isActive ? "default" : "secondary"} className="text-[10px]">
                      {p.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => openEdit(p.id)}
                    >
                      <IconPencil size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
