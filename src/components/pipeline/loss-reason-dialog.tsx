"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { FormSheet } from "@/components/ui/form-sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type LossReason = { id: string; label: string };

async function fetchCatalogReasons(): Promise<LossReason[]> {
  const res = await fetch(apiUrl("/api/settings/loss-reasons"));
  if (!res.ok) return [];
  const data = (await res.json()) as LossReason[];
  return Array.isArray(data) ? data : [];
}

async function fetchPipelineReasons(pipelineId: string): Promise<{
  reasons: LossReason[];
  required: boolean;
  allowOther: boolean;
}> {
  const res = await fetch(apiUrl(`/api/pipelines/${pipelineId}/loss-reasons`));
  if (!res.ok) return { reasons: [], required: false, allowOther: true };
  const data = (await res.json()) as {
    reasons?: LossReason[];
    lossReasonRequired?: boolean;
    lossReasonAllowOther?: boolean;
  };
  return {
    reasons: Array.isArray(data.reasons) ? data.reasons : [],
    required: Boolean(data.lossReasonRequired),
    allowOther: data.lossReasonAllowOther !== false,
  };
}

async function fetchOrgAllowOther(): Promise<boolean> {
  try {
    const res = await fetch(
      apiUrl("/api/settings/org?key=deals.loss_reason_allow_other"),
    );
    if (!res.ok) return true;
    const data = (await res.json()) as { value?: string | null };
    return data.value !== "false";
  } catch {
    return true;
  }
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isPending?: boolean;
  title?: string;
  description?: string;
  /** Quando informado, lista só os motivos vinculados ao funil. */
  pipelineId?: string | null;
};

export function LossReasonDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  title = "Marcar como perdido",
  description = "Informe o motivo para registrar a perda.",
  pipelineId,
}: Props) {
  const [selected, setSelected] = React.useState<string | null>(null);
  const [customReason, setCustomReason] = React.useState("");

  const catalogQuery = useQuery({
    queryKey: ["loss-reasons"],
    queryFn: fetchCatalogReasons,
    staleTime: 5 * 60_000,
    enabled: open && !pipelineId,
  });

  const pipelineQuery = useQuery({
    queryKey: ["pipeline-loss-reasons", pipelineId],
    queryFn: () => fetchPipelineReasons(pipelineId!),
    staleTime: 0,
    refetchOnMount: "always",
    enabled: open && !!pipelineId,
  });

  const orgAllowOtherQuery = useQuery({
    queryKey: ["org-setting", "deals.loss_reason_allow_other"],
    queryFn: fetchOrgAllowOther,
    staleTime: 0,
    refetchOnMount: "always",
    enabled: open && !pipelineId,
  });

  const reasons = pipelineId
    ? (pipelineQuery.data?.reasons ?? [])
    : (catalogQuery.data ?? []);
  const required = pipelineId
    ? Boolean(pipelineQuery.data?.required)
    : true;
  const allowOther = pipelineId
    ? (pipelineQuery.data?.allowOther ?? true)
    : (orgAllowOtherQuery.data ?? true);

  React.useEffect(() => {
    if (open) {
      setSelected(null);
      setCustomReason("");
    }
  }, [open]);

  React.useEffect(() => {
    if (!allowOther && selected === "__other__") {
      setSelected(null);
      setCustomReason("");
    }
  }, [allowOther, selected]);

  const hasReasons = reasons.length > 0;
  const isOther = allowOther && selected === "__other__";
  const blockedNoReasons = !allowOther && !hasReasons;
  const resolvedReason = isOther
    ? customReason.trim()
    : allowOther
      ? (selected ?? customReason.trim())
      : (selected ?? "");
  const canSubmit = blockedNoReasons
    ? false
    : required
      ? resolvedReason.length > 0
      : true;

  const submit = () => {
    if (!canSubmit) return;
    onConfirm(resolvedReason);
  };

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      busy={isPending}
      title={title}
      description={description}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={!canSubmit || isPending}>
            Confirmar perda
          </Button>
        </>
      }
    >
      <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
        {hasReasons ? (
          <>
            <Label className="text-xs font-semibold text-[var(--text-secondary)]">
              Selecione o motivo
              {!required && (
                <span className="ml-1 font-normal text-[var(--text-muted)]">
                  (opcional)
                </span>
              )}
            </Label>
            <div className="flex flex-wrap gap-2">
              {reasons.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelected(selected === r.label ? null : r.label)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-medium transition",
                    selected === r.label
                      ? "border-[var(--color-danger)] bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]"
                      : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-primary)] hover:border-[var(--glass-border)] hover:bg-[var(--glass-bg-strong)]",
                  )}
                >
                  {r.label}
                </button>
              ))}
              {allowOther && (
                <button
                  type="button"
                  onClick={() =>
                    setSelected(selected === "__other__" ? null : "__other__")
                  }
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-medium transition",
                    isOther
                      ? "border-[var(--color-danger)] bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]"
                      : "border-dashed border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)] hover:border-[var(--glass-border)] hover:bg-[var(--glass-bg-strong)]",
                  )}
                >
                  Outro…
                </button>
              )}
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
        ) : allowOther ? (
          <>
            <Label htmlFor="lost-reason-free">
              Motivo{!required && " (opcional)"}
            </Label>
            <Textarea
              id="lost-reason-free"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Ex.: concorrente, orçamento, sem retorno…"
              rows={3}
            />
          </>
        ) : (
          <div className="rounded-lg border border-[var(--color-warning)] bg-[var(--color-warning-bg)] px-3 py-2.5 text-xs text-[var(--color-warning-text)]">
            {pipelineId
              ? "Este funil não tem motivos ativos. Configure na etapa Perdido em Configurações → Pipeline."
              : "Nenhum motivo cadastrado. Configure na etapa Perdido em Configurações → Pipeline."}
          </div>
        )}
      </div>
    </FormSheet>
  );
}
