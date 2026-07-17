"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { FormSheet } from "@/components/ui/form-sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type LossReason = { id: string; label: string };

async function fetchLossReasons(): Promise<LossReason[]> {
  const res = await fetch(apiUrl("/api/settings/loss-reasons"));
  if (!res.ok) return [];
  return res.json();
}

/**
 * Lê a setting `deals.loss_reason_allow_other` da org. Default = true (mantém
 * comportamento histórico). Quando false, o botão "Outro…" e o textarea livre
 * somem do dialog, forçando o usuário a escolher um motivo cadastrado.
 *
 * Defesa em profundidade: o backend também rejeita motivos fora da lista
 * (`services/deals.assertLostReasonAllowed`) — esta consulta serve só pra UX.
 */
async function fetchAllowOther(): Promise<boolean> {
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

  // Sem `staleTime` + `refetchOnMount: "always"` pra garantir que toda vez
  // que o dialog reabre, refazemos o GET. Sem isso, mudar a setting em
  // Configurações e voltar pro kanban deixava o botão "Outro…" aparecendo
  // (cache antigo do React Query). Custo da chamada é baixíssimo (1 GET de
  // org_settings, cacheado por 60s no Redis do backend).
  const { data: allowOther = true } = useQuery({
    queryKey: ["org-setting", "deals.loss_reason_allow_other"],
    queryFn: fetchAllowOther,
    staleTime: 0,
    refetchOnMount: "always",
    enabled: open,
  });

  React.useEffect(() => {
    if (open) {
      setSelected(null);
      setCustomReason("");
    }
  }, [open]);

  // Quando o admin desliga "Outro" enquanto o dialog está aberto e o usuário
  // já tinha clicado em "Outro…", desfaz a seleção pra evitar enviar string
  // livre que o backend recusaria com 400.
  React.useEffect(() => {
    if (!allowOther && selected === "__other__") {
      setSelected(null);
      setCustomReason("");
    }
  }, [allowOther, selected]);

  const hasReasons = reasons.length > 0;
  const isOther = allowOther && selected === "__other__";
  // Quando "Outro" está bloqueado e não há motivos cadastrados, o admin precisa
  // configurar a lista primeiro — exibimos aviso e desabilitamos o submit.
  const blockedNoReasons = !allowOther && !hasReasons;
  const resolvedReason = isOther
    ? customReason.trim()
    : allowOther
      ? (selected ?? customReason.trim())
      : (selected ?? "");
  const canSubmit = !blockedNoReasons && resolvedReason.length > 0;

  const submit = () => {
    if (canSubmit) onConfirm(resolvedReason);
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
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="button" onClick={submit} disabled={!canSubmit || isPending}>Confirmar perda</Button>
        </>
      }
    >
      <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
          {hasReasons ? (
            <>
              <Label className="text-xs font-semibold text-[var(--text-secondary)]">Selecione o motivo</Label>
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
                    onClick={() => setSelected(selected === "__other__" ? null : "__other__")}
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
              <Label htmlFor="lost-reason-free">Motivo</Label>
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
              Nenhum motivo cadastrado. Peça ao admin para adicionar motivos em
              <span className="font-semibold"> Configurações → Motivos de perda</span>
              {" "}ou habilitar “Permitir motivo personalizado”.
            </div>
          )}
        </div>

      </div>
    </FormSheet>
  );
}
