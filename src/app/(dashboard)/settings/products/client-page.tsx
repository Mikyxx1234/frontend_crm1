"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Briefcase,
  Check,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Settings2,
  X,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pageHeaderDescriptionClass, pageHeaderTitleClass } from "@/components/ui/page-header";
import { SelectNative } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatCurrency } from "@/lib/utils";

type ProductDto = {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  price: number | string;
  unit: string;
  type: "PRODUCT" | "SERVICE";
  isActive: boolean;
  createdAt: string;
};

type CustomFieldDef = {
  id: string;
  name: string;
  label: string;
  type: string;
  options: string[];
};

type CustomFieldValue = {
  fieldId: string;
  value: string;
};

async function fetchProducts(search: string, showInactive: boolean, typeFilter: string) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (showInactive) params.set("active", "false");
  if (typeFilter) params.set("type", typeFilter);
  params.set("perPage", "200");
  const res = await fetch(apiUrl(`/api/products?${params}`));
  if (!res.ok) throw new Error("Erro ao carregar produtos");
  const data = await res.json();
  return data.products as ProductDto[];
}

async function fetchProductCustomFields(): Promise<CustomFieldDef[]> {
  const res = await fetch(apiUrl("/api/custom-fields?entity=product"));
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function fetchProductCfValues(productId: string): Promise<CustomFieldValue[]> {
  const res = await fetch(apiUrl(`/api/products/${productId}/custom-fields`));
  if (!res.ok) return [];
  return res.json();
}

type FormData = {
  name: string;
  description: string;
  sku: string;
  price: string;
  unit: string;
  type: "PRODUCT" | "SERVICE";
};

const emptyForm: FormData = { name: "", description: "", sku: "", price: "", unit: "un", type: "PRODUCT" };

export default function ProductsSettingsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [showInactive, setShowInactive] = React.useState(false);
  const [typeFilter, setTypeFilter] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormData>(emptyForm);
  const [cfValues, setCfValues] = React.useState<Record<string, string>>({});

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", search, showInactive, typeFilter],
    queryFn: () => fetchProducts(search, showInactive, typeFilter),
  });

  const { data: customFields = [] } = useQuery({
    queryKey: ["product-custom-fields"],
    queryFn: fetchProductCustomFields,
    staleTime: 60_000,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        sku: form.sku.trim() || null,
        price: parseFloat(form.price) || 0,
        unit: form.type === "SERVICE" ? "serviço" : (form.unit.trim() || "un"),
        type: form.type,
      };
      const url = editingId ? `/api/products/${editingId}` : "/api/products";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(apiUrl(url), {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erro ao salvar");
      }
      const result = await res.json();
      const productId = editingId || result.product?.id;

      if (productId && customFields.length > 0) {
        const cfPayload = customFields.map((f) => ({
          fieldId: f.id,
          value: cfValues[f.id] ?? "",
        }));
        await fetch(apiUrl(`/api/products/${productId}/custom-fields`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ values: cfPayload }),
        });
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      setCfValues({});
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(apiUrl(`/api/products/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Erro");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setCfValues({});
    setDialogOpen(true);
  };

  const openEdit = async (p: ProductDto) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description ?? "",
      sku: p.sku ?? "",
      price: String(Number(p.price)),
      unit: p.unit,
      type: p.type,
    });
    const vals = await fetchProductCfValues(p.id);
    const map: Record<string, string> = {};
    for (const v of vals) map[v.fieldId] = v.value;
    setCfValues(map);
    setDialogOpen(true);
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/settings"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1">
          <h1 className={pageHeaderTitleClass}>Catálogo de Produtos e Serviços</h1>
          <p className={pageHeaderDescriptionClass}>
            Gerencie os produtos e serviços que podem ser vinculados aos negócios.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="gap-1.5" title="Criar/editar campos personalizados para esta entidade">
            <Link href="/settings/custom-fields?entity=product">
              <Settings2 className="size-4" />
              <span className="hidden sm:inline">Gerenciar campos</span>
            </Link>
          </Button>
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="size-4" /> Novo
          </Button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou SKU…"
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-border/60 bg-muted/20 p-0.5">
          {([
            { val: "", label: "Todos" },
            { val: "PRODUCT", label: "Produtos" },
            { val: "SERVICE", label: "Serviços" },
          ]).map((opt) => (
            <button
              key={opt.val}
              type="button"
              onClick={() => setTypeFilter(opt.val)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                typeFilter === opt.val
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <Button
          variant={showInactive ? "default" : "outline"}
          size="sm"
          onClick={() => setShowInactive((v) => !v)}
        >
          {showInactive ? "Mostrando todos" : "Só ativos"}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16">
          <Package className="size-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhum item encontrado.</p>
          <Button variant="outline" size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 size-3.5" /> Criar primeiro
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3 text-right">Preço</th>
                <th className="px-4 py-3">Unidade</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p.id}
                  className={cn(
                    "border-b border-border/40 transition-colors hover:bg-muted/20",
                    !p.isActive && "opacity-50"
                  )}
                >
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium">{p.name}</span>
                      {p.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                          {p.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] gap-1",
                        p.type === "SERVICE"
                          ? "border-violet-200 bg-violet-50 text-violet-700"
                          : "border-blue-200 bg-blue-50 text-blue-700"
                      )}
                    >
                      {p.type === "SERVICE" ? (
                        <><Briefcase className="size-2.5" /> Serviço</>
                      ) : (
                        <><Package className="size-2.5" /> Produto</>
                      )}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {p.sku || "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {formatCurrency(Number(p.price))}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.type === "SERVICE" ? "—" : p.unit}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant={p.isActive ? "default" : "secondary"}
                      className={cn("text-[10px]", p.isActive && "bg-emerald-600")}
                    >
                      {p.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        disabled={toggleMutation.isPending}
                        onClick={() =>
                          toggleMutation.mutate({ id: p.id, isActive: !p.isActive })
                        }
                      >
                        {p.isActive ? (
                          <X className="size-3 text-destructive" />
                        ) : (
                          <Check className="size-3 text-emerald-600" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar" : "Novo"} {form.type === "SERVICE" ? "serviço" : "produto"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Altere os dados abaixo."
                : "Preencha os dados para o catálogo."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Grid 2 colunas: Tipo + Nome. Em mobile empilha. */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Tipo</Label>
                <SelectNative
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "PRODUCT" | "SERVICE" }))}
                  className="mt-1 h-9"
                  disabled={!!editingId}
                >
                  <option value="PRODUCT">Produto</option>
                  <option value="SERVICE">Serviço</option>
                </SelectNative>
              </div>
              <div>
                <Label>Nome *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={form.type === "SERVICE" ? "Nome do serviço" : "Nome do produto"}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descrição opcional"
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Grid 3 colunas: SKU + Unidade (condicional) + Preço. */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>SKU</Label>
                <Input
                  value={form.sku}
                  onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                  placeholder="ABC-001"
                  className="mt-1"
                />
              </div>
              {form.type === "PRODUCT" ? (
                <div>
                  <Label>Unidade</Label>
                  <Input
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                    placeholder="un, hr, mês…"
                    className="mt-1"
                  />
                </div>
              ) : (
                <div aria-hidden className="hidden sm:block" />
              )}
              <div>
                <Label>{form.type === "SERVICE" ? "Valor (R$)" : "Preço (R$)"}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="0,00"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Campos personalizados por tenant. Com `size="lg"` (max-w-2xl)
                temos espaço pra grid de 2 colunas, que acomoda melhor
                catálogos com vários atributos (marca, categoria, peso,
                garantia…). Quando a empresa ainda não cadastrou nenhum
                campo, mostramos um CTA discreto pro admin. */}
            <div className="rounded-lg border border-border/60 bg-muted/15 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground">
                  Campos personalizados
                </p>
                <Link
                  href="/settings/custom-fields?entity=product"
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Criar/editar campos personalizados desta entidade"
                >
                  <Settings2 className="size-3" />
                  Gerenciar
                </Link>
              </div>

              {customFields.length === 0 ? (
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Nenhum campo adicional cadastrado. Crie campos como
                  &quot;marca&quot;, &quot;categoria&quot;, &quot;peso&quot; ou o que fizer
                  sentido para o seu catálogo.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {customFields.map((cf) => (
                    <div key={cf.id} className="space-y-1">
                      <Label className="text-xs">{cf.label}</Label>
                      {cf.type === "SELECT" ? (
                        <SelectNative
                          value={cfValues[cf.id] ?? ""}
                          onChange={(e) => setCfValues((v) => ({ ...v, [cf.id]: e.target.value }))}
                          className="h-9"
                        >
                          <option value="">—</option>
                          {cf.options.map((o) => <option key={o} value={o}>{o}</option>)}
                        </SelectNative>
                      ) : cf.type === "BOOLEAN" ? (
                        <SelectNative
                          value={cfValues[cf.id] ?? ""}
                          onChange={(e) => setCfValues((v) => ({ ...v, [cf.id]: e.target.value }))}
                          className="h-9"
                        >
                          <option value="">—</option>
                          <option value="true">Sim</option>
                          <option value="false">Não</option>
                        </SelectNative>
                      ) : cf.type === "NUMBER" ? (
                        <Input
                          type="number"
                          value={cfValues[cf.id] ?? ""}
                          onChange={(e) => setCfValues((v) => ({ ...v, [cf.id]: e.target.value }))}
                          className="h-9"
                        />
                      ) : cf.type === "DATE" ? (
                        <Input
                          type="date"
                          value={cfValues[cf.id] ?? ""}
                          onChange={(e) => setCfValues((v) => ({ ...v, [cf.id]: e.target.value }))}
                          className="h-9"
                        />
                      ) : (
                        <Input
                          value={cfValues[cf.id] ?? ""}
                          onChange={(e) => setCfValues((v) => ({ ...v, [cf.id]: e.target.value }))}
                          className="h-9"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!form.name.trim() || saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : null}
              {editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
