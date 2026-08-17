"use client";

import { useEffect, useState } from "react";

import { CheckboxGlass } from "@/components/crm/checkbox-glass";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Checkbox visível só para ADMIN no encerramento de conversa. */
export function SkipAutomationsCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-2.5">
      <CheckboxGlass
        checked={checked}
        onChange={onChange}
        aria-label="Encerrar sem executar nenhuma automação"
        className="mt-0.5"
      />
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={() => onChange(!checked)}
      >
        <span className="block font-display text-[12.5px] font-semibold leading-snug text-[var(--text-primary)]">
          Encerrar sem executar nenhuma automação
        </span>
        <span className="mt-0.5 block font-body text-[11.5px] leading-relaxed text-[var(--text-muted)]">
          Nenhum fluxo ligado ao encerramento será disparado.
        </span>
      </button>
    </div>
  );
}

/**
 * Confirm de encerrar (quando o departamento não exige tabulação).
 * Só deve ser aberto para ADMIN — o caller faz o gate.
 */
export function ResolveConfirmDialog({
  open,
  onOpenChange,
  submitting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting?: boolean;
  onConfirm: (skipAutomations: boolean) => void;
}) {
  const [skipAutomations, setSkipAutomations] = useState(false);

  useEffect(() => {
    if (!open) setSkipAutomations(false);
  }, [open]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Encerrar conversa</AlertDialogTitle>
          <AlertDialogDescription>
            O atendimento será marcado como resolvido.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <SkipAutomationsCheckbox
          checked={skipAutomations}
          onChange={setSkipAutomations}
        />
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(skipAutomations)}
            disabled={submitting}
          >
            {submitting ? "Encerrando…" : "Encerrar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
