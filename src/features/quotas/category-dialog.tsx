"use client";

/**
 * CategoryDialog — cria/edita uma Categoria de Desconto e, quando editando,
 * gerencia as alocações de volume por Unidade (grid inline).
 *
 * Categoria = fonte da verdade de % + regras (exclusion group, maxStacks,
 * calcMode, vigência). Alocações = uma cota por (categoria × unidade)
 * com o volume disponível.
 */
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconLoader2, IconPlus, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormSheet } from "@/components/ui/form-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiUrl } from "@/lib/api";

type CategoryDetail = {
  id: string;
  name: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  productId: string | null;
  exclusionGroup: string | null;
  maxStacks: number;
  calcMode: "CASCADE" | "SUM_SIMPLE";
  validFrom: string;
  validTo: string | null;
  active: boolean;
  quotas?: Array<{
    id: string;
    orgUnitId: string | null;
    orgUnit: { id: string; name: string } | null;
    qtyTotal: number | null;
    qtyConsumed: number;
    balance: number | null;
    active: boolean;
  }>;
};

type ProductOption = { id: string; name: string };
type UnitOption = { id: string; name: string };

type AllocRow = {
  orgUnitId: string | null;
  qtyTotal: string; // "" = ilimitado
  qtyConsumed: number;
};

const sectionClass =
  "rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-4";
const sectionTitleClass =
  "mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]";

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

export function CategoryDialog({
  open,
  onOpenChange,
  categoryId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categoryId: string | null;
}) {
  const isEdit = Boolean(categoryId);
  const queryClient = useQueryClient();

  const { data: category } = useQuery({
    queryKey: ["discount-category", categoryId],
    queryFn: async () => {
      if (!categoryId) return null;
      const res = await fetch(apiUrl(`/api/discount-categories/${categoryId}`));
      if (!res.ok) return null;
      const data = (await res.json()) as { category: CategoryDetail };
      return data.category;
    },
    enabled: open && Boolean(categoryId),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["quotas-products"],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/products?perPage=200`));
      if (!res.ok) return [] as ProductOption[];
      const data = (await res.json()) as { products: ProductOption[] };
      return data.products;
    },
    enabled: open,
  });
  const { data: units = [] } = useQuery({
    queryKey: ["quotas-org-units"],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/org-units`));
      if (!res.ok) return [] as UnitOption[];
      const data = (await res.json()) as {
        items?: UnitOption[];
        orgUnits?: UnitOption[];
      };
      return data.items ?? data.orgUnits ?? [];
    },
    enabled: open,
  });

  const [name, setName] = React.useState("");
  const [discountType, setDiscountType] =
    React.useState<"PERCENT" | "FIXED">("PERCENT");
  const [discountValue, setDiscountValue] = React.useState("25");
  const [productId, setProductId] = React.useState<string>("");
  const [exclusionGroup, setExclusionGroup] = React.useState("");
  const [maxStacks, setMaxStacks] = React.useState("1");
  const [calcMode, setCalcMode] =
    React.useState<"CASCADE" | "SUM_SIMPLE">("CASCADE");
  const [validFrom, setValidFrom] = React.useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [validTo, setValidTo] = React.useState("");
  const [active, setActive] = React.useState(true);
  const [allocs, setAllocs] = React.useState<AllocRow[]>([]);

  React.useEffect(() => {
    if (!open) return;
    if (category) {
      setName(category.name);
      setDiscountType(category.discountType);
      setDiscountValue(String(category.discountValue));
      setProductId(category.productId ?? "");
      setExclusionGroup(category.exclusionGroup ?? "");
      setMaxStacks(String(category.maxStacks));
      setCalcMode(category.calcMode);
      setValidFrom(toDateInput(category.validFrom));
      setValidTo(toDateInput(category.validTo));
      setActive(category.active);
      setAllocs(
        (category.quotas ?? []).map((q) => ({
          orgUnitId: q.orgUnitId,
          qtyTotal: q.qtyTotal === null ? "" : String(q.qtyTotal),
          qtyConsumed: q.qtyConsumed,
        })),
      );
    } else if (!isEdit) {
      setName("");
      setDiscountType("PERCENT");
      setDiscountValue("25");
      setProductId("");
      setExclusionGroup("");
      setMaxStacks("1");
      setCalcMode("CASCADE");
      setValidFrom(new Date().toISOString().slice(0, 10));
      setValidTo("");
      setActive(true);
      setAllocs([]);
    }
  }, [open, category, isEdit]);

  const saveMut = useMutation({
    mutationFn: async () => {
      // 1) Cria/atualiza a categoria.
      const payload = {
        name,
        discountType,
        discountValue: Number(discountValue),
        productId: productId || null,
        exclusionGroup: exclusionGroup || null,
        maxStacks: Number(maxStacks) || 1,
        calcMode,
        validFrom: validFrom || undefined,
        validTo: validTo || null,
        active,
      };
      const url = categoryId
        ? `/api/discount-categories/${categoryId}`
        : `/api/discount-categories`;
      const method = categoryId ? "PATCH" : "POST";
      const res = await fetch(apiUrl(url), {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message || "Erro ao salvar categoria");
      }
      const created = (await res.json().catch(() => ({}))) as { id?: string };
      const targetId = categoryId ?? created.id;
      if (!targetId) return;

      // 2) Envia alocações (upsert em batch).
      const allocPayload = {
        allocations: allocs
          // Evita duplicatas (o backend valida também).
          .filter((a, idx, arr) => {
            const key = a.orgUnitId ?? "__global__";
            return arr.findIndex((x) => (x.orgUnitId ?? "__global__") === key) === idx;
          })
          .map((a) => ({
            orgUnitId: a.orgUnitId,
            qtyTotal: a.qtyTotal === "" ? null : Number(a.qtyTotal),
          })),
      };
      const allocRes = await fetch(
        apiUrl(`/api/discount-categories/${targetId}/allocations`),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(allocPayload),
        },
      );
      if (!allocRes.ok) {
        const data = (await allocRes.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(data.message || "Erro ao salvar alocações");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discount-categories"] });
      queryClient.invalidateQueries({
        queryKey: ["discount-category", categoryId],
      });
      queryClient.invalidateQueries({ queryKey: ["quotas"] });
      toast.success(isEdit ? "Categoria atualizada." : "Categoria criada.");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const canSave = name.trim().length > 0 && Number(discountValue) > 0;

  const addAlloc = React.useCallback(() => {
    // Sugere a primeira unidade ainda sem alocação.
    const usedIds = new Set(allocs.map((a) => a.orgUnitId));
    const nextUnit = units.find((u) => !usedIds.has(u.id));
    setAllocs((arr) => [
      ...arr,
      {
        orgUnitId: nextUnit?.id ?? null,
        qtyTotal: "",
        qtyConsumed: 0,
      },
    ]);
  }, [allocs, units]);

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={isEdit ? "Editar categoria" : "Nova categoria de desconto"}
      description="Defina o percentual/regras uma única vez e aloque o volume por unidade."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isEdit ? "Fechar" : "Cancelar"}
          </Button>
          <Button
            onClick={() => saveMut.mutate()}
            disabled={!canSave || saveMut.isPending}
          >
            {saveMut.isPending && (
              <IconLoader2 size={14} className="mr-1.5 animate-spin" />
            )}
            {isEdit ? "Salvar" : "Criar"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className={sectionClass}>
          <p className={sectionTitleClass}>Dados gerais</p>
          <div className="grid gap-3">
            <div>
              <Label>Nome *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
                placeholder="Ex.: Balcão 25%"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <select
                  value={discountType}
                  onChange={(e) =>
                    setDiscountType(e.target.value as "PERCENT" | "FIXED")
                  }
                  className="mt-1 h-9 w-full rounded-md border border-[var(--glass-border)] bg-white px-2 text-sm"
                >
                  <option value="PERCENT">Percentual (%)</option>
                  <option value="FIXED">Valor fixo (R$)</option>
                </select>
              </div>
              <div>
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </div>

        <div className={sectionClass}>
          <p className={sectionTitleClass}>Escopo por produto</p>
          <div>
            <Label>Produto (opcional)</Label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-[var(--glass-border)] bg-white px-2 text-sm"
            >
              <option value="">Qualquer produto/curso</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
              Deixe em branco para valer independente do curso (ex.: “Balcão”,
              “Estratégico” aplicam a qualquer curso).
            </p>
          </div>
        </div>

        <div className={sectionClass}>
          <p className={sectionTitleClass}>Vigência e cumulatividade</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Válida desde</Label>
              <Input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Válida até</Label>
              <Input
                type="date"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Grupo de exclusão</Label>
              <Input
                value={exclusionGroup}
                onChange={(e) => setExclusionGroup(e.target.value)}
                className="mt-1"
                placeholder="Ex.: bolsas"
              />
            </div>
            <div>
              <Label>Máx. empilhadas</Label>
              <Input
                type="number"
                min="1"
                value={maxStacks}
                onChange={(e) => setMaxStacks(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Modo de cálculo</Label>
              <select
                value={calcMode}
                onChange={(e) =>
                  setCalcMode(e.target.value as "CASCADE" | "SUM_SIMPLE")
                }
                className="mt-1 h-9 w-full rounded-md border border-[var(--glass-border)] bg-white px-2 text-sm"
              >
                <option value="CASCADE">Cascata (padrão)</option>
                <option value="SUM_SIMPLE">Soma simples</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              id="cat-active"
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            <Label htmlFor="cat-active">Ativa</Label>
          </div>
        </div>

        {/* Alocação de volume por unidade */}
        <div className={sectionClass}>
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Alocação por unidade
            </p>
            <Button size="sm" variant="outline" onClick={addAlloc}>
              <IconPlus size={14} /> Alocação
            </Button>
          </div>
          {allocs.length === 0 ? (
            <p className="text-[11px] text-[var(--text-secondary)]">
              Sem alocações. Adicione o volume disponível por unidade (ex.: BF =
              50, Sapopemba = 35). Deixe em branco para volume ilimitado.
            </p>
          ) : (
            <div className="space-y-2">
              {allocs.map((a, i) => {
                const consumed = a.qtyConsumed;
                const total = a.qtyTotal === "" ? null : Number(a.qtyTotal);
                const balance = total === null ? null : total - consumed;
                return (
                  <div key={i} className="grid grid-cols-12 items-end gap-2">
                    <div className="col-span-6">
                      <Label className="text-[11px]">Unidade</Label>
                      <select
                        value={a.orgUnitId ?? ""}
                        onChange={(e) =>
                          setAllocs((arr) =>
                            arr.map((x, j) =>
                              j === i
                                ? {
                                    ...x,
                                    orgUnitId: e.target.value || null,
                                  }
                                : x,
                            ),
                          )
                        }
                        className="mt-1 h-9 w-full rounded-md border border-[var(--glass-border)] bg-white px-2 text-sm"
                      >
                        <option value="">— Global —</option>
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <Label className="text-[11px]">Volume total</Label>
                      <Input
                        type="number"
                        min="0"
                        value={a.qtyTotal}
                        onChange={(e) =>
                          setAllocs((arr) =>
                            arr.map((x, j) =>
                              j === i ? { ...x, qtyTotal: e.target.value } : x,
                            ),
                          )
                        }
                        placeholder="Ilimitado"
                        className="mt-1 h-9"
                      />
                    </div>
                    <div className="col-span-2 pb-1 text-right text-[12px] tabular-nums text-[var(--text-secondary)]">
                      {total === null ? (
                        <span>—</span>
                      ) : (
                        <span>
                          {consumed}/{total}
                          {balance !== null && balance < 0 ? (
                            <span className="ml-1 text-[var(--color-danger)]">!</span>
                          ) : null}
                        </span>
                      )}
                    </div>
                    <div className="col-span-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9"
                        onClick={() =>
                          setAllocs((arr) => arr.filter((_, j) => j !== i))
                        }
                      >
                        <IconTrash size={14} className="text-[var(--color-danger)]" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              <p className="mt-2 text-[11px] text-[var(--text-secondary)]">
                Ao remover uma alocação, ela é desativada (histórico de consumo é
                preservado). Volume total nunca cai abaixo do já consumido.
              </p>
            </div>
          )}
        </div>
      </div>
    </FormSheet>
  );
}
