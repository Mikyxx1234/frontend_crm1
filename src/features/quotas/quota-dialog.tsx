"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormSheet } from "@/components/ui/form-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiUrl } from "@/lib/api";

type QuotaDetail = {
  id: string;
  name: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  productId: string | null;
  orgUnitId: string | null;
  qtyTotal: number | null;
  qtyConsumed: number;
  validFrom: string;
  validTo: string | null;
  exclusionGroup: string | null;
  maxStacks: number;
  calcMode: "CASCADE" | "SUM_SIMPLE";
  active: boolean;
};

type ProductOption = { id: string; name: string };
type UnitOption = { id: string; name: string };

const sectionClass =
  "rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-4";
const sectionTitleClass =
  "mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]";

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

export function QuotaDialog({
  open,
  onOpenChange,
  quotaId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  quotaId: string | null;
}) {
  const isEdit = Boolean(quotaId);
  const queryClient = useQueryClient();

  const { data: quota } = useQuery({
    queryKey: ["quota", quotaId],
    queryFn: async () => {
      if (!quotaId) return null;
      const res = await fetch(apiUrl(`/api/quotas/${quotaId}`));
      if (!res.ok) return null;
      const data = (await res.json()) as { quota: QuotaDetail };
      return data.quota;
    },
    enabled: open && Boolean(quotaId),
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
      const data = (await res.json()) as { items?: UnitOption[]; orgUnits?: UnitOption[] };
      return data.items ?? data.orgUnits ?? [];
    },
    enabled: open,
  });

  const [name, setName] = React.useState("");
  const [discountType, setDiscountType] = React.useState<"PERCENT" | "FIXED">("PERCENT");
  const [discountValue, setDiscountValue] = React.useState("10");
  const [productId, setProductId] = React.useState<string>("");
  const [orgUnitId, setOrgUnitId] = React.useState<string>("");
  const [qtyTotal, setQtyTotal] = React.useState<string>("");
  const [validFrom, setValidFrom] = React.useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [validTo, setValidTo] = React.useState("");
  const [exclusionGroup, setExclusionGroup] = React.useState("");
  const [maxStacks, setMaxStacks] = React.useState("1");
  const [calcMode, setCalcMode] = React.useState<"CASCADE" | "SUM_SIMPLE">("CASCADE");
  const [active, setActive] = React.useState(true);

  React.useEffect(() => {
    if (!open) return;
    if (quota) {
      setName(quota.name);
      setDiscountType(quota.discountType);
      setDiscountValue(String(quota.discountValue));
      setProductId(quota.productId ?? "");
      setOrgUnitId(quota.orgUnitId ?? "");
      setQtyTotal(quota.qtyTotal === null ? "" : String(quota.qtyTotal));
      setValidFrom(toDateInput(quota.validFrom));
      setValidTo(toDateInput(quota.validTo));
      setExclusionGroup(quota.exclusionGroup ?? "");
      setMaxStacks(String(quota.maxStacks));
      setCalcMode(quota.calcMode);
      setActive(quota.active);
    } else if (!isEdit) {
      setName("");
      setDiscountType("PERCENT");
      setDiscountValue("10");
      setProductId("");
      setOrgUnitId("");
      setQtyTotal("");
      setValidFrom(new Date().toISOString().slice(0, 10));
      setValidTo("");
      setExclusionGroup("");
      setMaxStacks("1");
      setCalcMode("CASCADE");
      setActive(true);
    }
  }, [open, quota, isEdit]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        discountType,
        discountValue: Number(discountValue),
        productId: productId || null,
        orgUnitId: orgUnitId || null,
        qtyTotal: qtyTotal === "" ? null : Number(qtyTotal),
        validFrom: validFrom || undefined,
        validTo: validTo || null,
        exclusionGroup: exclusionGroup || null,
        maxStacks: Number(maxStacks) || 1,
        calcMode,
        active,
      };
      const url = quotaId ? `/api/quotas/${quotaId}` : `/api/quotas`;
      const method = quotaId ? "PATCH" : "POST";
      const res = await fetch(apiUrl(url), {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message || "Erro ao salvar cota");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotas"] });
      queryClient.invalidateQueries({ queryKey: ["quota", quotaId] });
      toast.success(isEdit ? "Cota atualizada." : "Cota criada.");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const canSave = name.trim().length > 0 && Number(discountValue) > 0;

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={isEdit ? "Editar cota" : "Nova cota de desconto"}
      description="Cupom de desconto com estoque, vigência e regras de cumulatividade."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isEdit ? "Fechar" : "Cancelar"}
          </Button>
          <Button onClick={() => saveMut.mutate()} disabled={!canSave || saveMut.isPending}>
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
                placeholder="Ex.: Cupom Estudante 20%"
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
          <p className={sectionTitleClass}>Escopo</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Produto</Label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-[var(--glass-border)] bg-white px-2 text-sm"
              >
                <option value="">Qualquer</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Unidade</Label>
              <select
                value={orgUnitId}
                onChange={(e) => setOrgUnitId(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-[var(--glass-border)] bg-white px-2 text-sm"
              >
                <option value="">Qualquer</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className={sectionClass}>
          <p className={sectionTitleClass}>Estoque e vigência</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Total (vazio = ilimitado)</Label>
              <Input
                type="number"
                min="0"
                value={qtyTotal}
                onChange={(e) => setQtyTotal(e.target.value)}
                className="mt-1"
              />
            </div>
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
          </div>
        </div>

        <div className={sectionClass}>
          <p className={sectionTitleClass}>Cumulatividade e cálculo</p>
          <div className="grid gap-3 sm:grid-cols-3">
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
            <div>
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
              id="quota-active"
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            <Label htmlFor="quota-active">Ativa</Label>
          </div>
        </div>
      </div>
    </FormSheet>
  );
}
