"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type LossReason = { id: string; label: string };

async function fetchLossReasons(): Promise<LossReason[]> {
  const res = await fetch(apiUrl("/api/settings/loss-reasons"));
  if (!res.ok) return [];
  return res.json();
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isPending?: boolean;
  title?: string;
  description?: string;
};

export function LossReasonDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  title = "Marcar como perdido",
  description = "Informe o motivo para registrar a perda.",
}: Props) {
  const [selected, setSelected] = React.useState<string | null>(null);
  const [customReason, setCustomReason] = React.useState("");

  const { data: reasons = [] } = useQuery({
    queryKey: ["loss-reasons"],
    queryFn: fetchLossReasons,
    staleTime: 5 * 60_000,
    enabled: open,
  });

  React.useEffect(() => {
    if (open) {
      setSelected(null);
      setCustomReason("");
    }
  }, [open]);

  const hasReasons = reasons.length > 0;
  const isOther = selected === "__other__";
  const resolvedReason = isOther ? customReason.trim() : (selected ?? customReason.trim());
  const canSubmit = resolvedReason.length > 0;

  const submit = () => {
    if (canSubmit) onConfirm(resolvedReason);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {hasReasons ? (
            <>
              <Label className="text-xs font-semibold text-slate-600">Selecione o motivo</Label>
              <div className="flex flex-wrap gap-2">
                {reasons.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelected(selected === r.label ? null : r.label)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm font-medium transition",
                      selected === r.label
                        ? "border-red-400 bg-red-50 text-red-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                    )}
                  >
                    {r.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelected(selected === "__other__" ? null : "__other__")}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-medium transition",
                    isOther
                      ? "border-red-400 bg-red-50 text-red-700"
                      : "border-dashed border-slate-300 bg-white text-slate-500 hover:border-slate-400 hover:bg-slate-50",
                  )}
                >
                  Outro…
                </button>
              </div>
              {isOther && (
                <Textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Descreva o motivo…"
                  rows={2}
                  className="text-sm"
                  autoFocus
                />
              )}
            </>
          ) : (
            <>
              <Label htmlFor="lost-reason-free">Motivo</Label>
              <Textarea
                id="lost-reason-free"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Ex.: concorrente, orçamento, sem retorno…"
                rows={3}
              />
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={!canSubmit || isPending}>
            Confirmar perda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
