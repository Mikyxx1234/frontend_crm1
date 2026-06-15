"use client";

import * as React from "react";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownGlass } from "@/components/crm/dropdown-glass";
import { useCan } from "@/hooks/use-my-permissions";
import { formatCurrency } from "@/lib/utils";

import { useOfferMutations, useOrgUnits, useProductOffers } from "./hooks";

const sectionClass =
  "rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-4";

export function OffersSection({
  productId,
  basePrice,
}: {
  productId: string;
  basePrice: number;
}) {
  const { data: offers = [] } = useProductOffers(productId);
  const { data: orgUnits = [] } = useOrgUnits();
  const { create, remove } = useOfferMutations(productId);
  const canManage = useCan("product:manage_offers");

  const [newUnit, setNewUnit] = React.useState("");
  const [newPrice, setNewPrice] = React.useState("");
  const [newDiscount, setNewDiscount] = React.useState("");

  const availableUnits = orgUnits.filter(
    (u) => u.active && !offers.some((o) => o.orgUnitId === u.id),
  );

  const handleAdd = async () => {
    if (!newUnit) {
      toast.error("Selecione a unidade.");
      return;
    }
    try {
      await create.mutateAsync({
        orgUnitId: newUnit,
        price: Number(newPrice) || basePrice,
        discountPct: newDiscount ? Number(newDiscount) : null,
      });
      setNewUnit("");
      setNewPrice("");
      setNewDiscount("");
      toast.success("Oferta adicionada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao adicionar oferta");
    }
  };

  return (
    <div className={sectionClass}>
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
        Ofertas por unidade
      </p>

      {offers.length === 0 ? (
        <p className="text-[11px] text-[var(--text-secondary)]">
          Sem ofertas específicas. As unidades usam o preço base ({formatCurrency(basePrice)}).
        </p>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--glass-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--glass-border)] text-left text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
                <th className="px-3 py-2">Unidade</th>
                <th className="px-3 py-2 text-right">Preço</th>
                <th className="px-3 py-2 text-right">Desconto</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.id} className="border-b border-[var(--glass-border)] last:border-0">
                  <td className="px-3 py-2 text-[var(--text-primary)]">
                    {o.orgUnit?.name ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[var(--text-primary)]">
                    {formatCurrency(Number(o.price))}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                    {o.discountPct != null ? `${Number(o.discountPct)}%` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {canManage && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => remove.mutate(o.id)}
                      >
                        <IconTrash size={14} className="text-[var(--color-danger)]" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canManage && (
        <div className="mt-3 grid grid-cols-12 items-end gap-2">
          <div className="col-span-5">
            <Label className="text-[11px]">Unidade</Label>
            <DropdownGlass
              options={availableUnits.map((u) => ({ value: u.id, label: u.name }))}
              value={newUnit}
              onValueChange={(v) => setNewUnit(v)}
              placeholder="— Selecione —"
              triggerClassName="mt-1 h-9 w-full"
            />
          </div>
          <div className="col-span-3">
            <Label className="text-[11px]">Preço</Label>
            <Input
              type="number"
              step="0.01"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder={String(basePrice)}
              className="mt-1 h-9"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-[11px]">Desc. %</Label>
            <Input
              type="number"
              step="1"
              value={newDiscount}
              onChange={(e) => setNewDiscount(e.target.value)}
              className="mt-1 h-9"
            />
          </div>
          <div className="col-span-2">
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              disabled={create.isPending || availableUnits.length === 0}
              onClick={handleAdd}
            >
              <IconPlus size={14} /> Add
            </Button>
          </div>
        </div>
      )}
      {orgUnits.length === 0 && (
        <p className="mt-2 text-[11px] text-[var(--text-secondary)]">
          Nenhuma unidade cadastrada. Crie unidades para definir ofertas por filial.
        </p>
      )}
    </div>
  );
}
