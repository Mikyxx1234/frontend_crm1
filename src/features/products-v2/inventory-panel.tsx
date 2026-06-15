"use client";

import * as React from "react";
import { IconBox, IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownGlass } from "@/components/crm/dropdown-glass";
import { useCan } from "@/hooks/use-my-permissions";

import { useAdjustInventory, useOrgUnits, useProductInventory } from "./hooks";
import { REASON_LABEL } from "./types";

const OPERATIONS: Array<{ value: string; label: string }> = [
  { value: "restock", label: "Repor (+)" },
  { value: "consume", label: "Consumir (−)" },
  { value: "reserve", label: "Reservar" },
  { value: "release", label: "Liberar reserva" },
];

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function InventoryPanel({ productId }: { productId: string }) {
  const { data, isLoading } = useProductInventory(productId);
  const { data: orgUnits = [] } = useOrgUnits();
  const adjust = useAdjustInventory(productId);
  const canAdjust = useCan("inventory:adjust");

  const [operation, setOperation] = React.useState("restock");
  const [qty, setQty] = React.useState("1");
  const [note, setNote] = React.useState("");
  const [poolId, setPoolId] = React.useState("");
  const [orgUnitId, setOrgUnitId] = React.useState("");

  const pools = data?.pools ?? [];
  const movements = data?.movements ?? [];

  const handleAdjust = async () => {
    const q = Math.floor(Number(qty) || 0);
    if (q <= 0) {
      toast.error("Quantidade deve ser maior que zero.");
      return;
    }
    if (!note.trim()) {
      toast.error("Motivo é obrigatório.");
      return;
    }
    try {
      await adjust.mutateAsync({
        operation,
        qty: q,
        note: note.trim(),
        poolId: poolId || undefined,
        orgUnitId: poolId ? undefined : orgUnitId || undefined,
      });
      setNote("");
      setQty("1");
      toast.success("Movimento registrado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao ajustar");
    }
  };

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] p-4">
      <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
        <IconBox size={14} /> Alocação / Estoque
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <IconLoader2 size={18} className="animate-spin text-[var(--text-secondary)]" />
        </div>
      ) : pools.length === 0 ? (
        <p className="text-[11px] text-[var(--text-secondary)]">
          Nenhum pool de alocação. Use o ajuste manual abaixo para criar um pool e repor saldo.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {pools.map((p) => (
            <div
              key={p.id}
              className="rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-3"
            >
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {p.orgUnit?.name ?? "Pool global"}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--text-secondary)]">
                <span>
                  Disponível:{" "}
                  <strong className="text-[var(--text-primary)] tabular-nums">
                    {p.stats.balance}
                  </strong>
                </span>
                <span>
                  Reservado:{" "}
                  <strong className="tabular-nums">{p.stats.reserved}</strong>
                </span>
                <span>
                  Consumido:{" "}
                  <strong className="tabular-nums">{p.stats.consumed}</strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Extrato */}
      {movements.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Extrato
          </p>
          <div className="max-h-48 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--glass-border)]">
            <table className="w-full text-[12px]">
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-b border-[var(--glass-border)] last:border-0">
                    <td className="px-3 py-1.5 text-[var(--text-secondary)]">{fmtDate(m.createdAt)}</td>
                    <td className="px-3 py-1.5 text-[var(--text-primary)]">
                      {REASON_LABEL[m.reason] ?? m.reason}
                    </td>
                    <td
                      className={`px-3 py-1.5 text-right font-medium tabular-nums ${
                        m.delta < 0 ? "text-[var(--color-danger)]" : "text-[var(--color-success)]"
                      }`}
                    >
                      {m.delta > 0 ? `+${m.delta}` : m.delta}
                    </td>
                    <td className="max-w-[160px] truncate px-3 py-1.5 text-[var(--text-secondary)]">
                      {m.note ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ajuste manual */}
      {canAdjust && (
        <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Ajuste manual
          </p>
          <div className="grid gap-2 sm:grid-cols-12">
            <div className="sm:col-span-3">
              <Label className="text-[11px]">Operação</Label>
              <DropdownGlass
                options={OPERATIONS}
                value={operation}
                onValueChange={(v) => setOperation(v)}
                triggerClassName="mt-1 h-9 w-full"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-[11px]">Qtd.</Label>
              <Input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="mt-1 h-9"
              />
            </div>
            <div className="sm:col-span-3">
              <Label className="text-[11px]">Pool / unidade</Label>
              <DropdownGlass
                options={[
                  ...pools.map((p) => ({
                    value: p.id,
                    label: p.orgUnit?.name ?? "Pool global",
                  })),
                  { value: "new:", label: "+ Novo pool global" },
                  ...orgUnits
                    .filter((u) => u.active)
                    .map((u) => ({ value: `new:${u.id}`, label: `+ Novo pool — ${u.name}` })),
                ]}
                value={poolId || `new:${orgUnitId}`}
                onValueChange={(v) => {
                  if (v.startsWith("new:")) {
                    setPoolId("");
                    setOrgUnitId(v.slice(4));
                  } else {
                    setPoolId(v);
                    setOrgUnitId("");
                  }
                }}
                triggerClassName="mt-1 h-9 w-full"
              />
            </div>
            <div className="sm:col-span-4">
              <Label className="text-[11px]">Motivo *</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex.: inventário inicial"
                className="mt-1 h-9"
              />
            </div>
          </div>
          <div className="mt-2 flex justify-end">
            <Button size="sm" disabled={adjust.isPending} onClick={handleAdjust}>
              {adjust.isPending && <IconLoader2 size={14} className="mr-1.5 animate-spin" />}
              Registrar movimento
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
