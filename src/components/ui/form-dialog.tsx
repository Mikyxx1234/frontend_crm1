"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  type DialogSize,
} from "@/components/ui/dialog";

/**
 * Padrao unificado de modal central para formularios de criacao e edicao.
 *
 * API compatível com o antigo drawer lateral para migração drop-in:
 * ```
 * <FormDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Novo contato"
 *   description="Cadastre um novo contato no CRM"
 *   icon={<IconUser size={20} />}
 *   size="md"
 *   footer={
 *     <>
 *       <ButtonGlass variant="glass" onClick={onCancel}>Cancelar</ButtonGlass>
 *       <ButtonGlass variant="primary" onClick={onSubmit}>Salvar</ButtonGlass>
 *     </>
 *   }
 * >
 *   {formFields}
 * </FormDialog>
 * ```
 *
 * Modal central via Dialog. Header e footer fixos; o corpo (children)
 * rola independentemente. Portais de dropdown usam ModalPortalContext
 * do DialogContent.
 */

type FormDialogSize = "sm" | "md" | "lg" | "xl" | "2xl";

/** Mapeia os tamanhos legados para presets do Dialog. */
const SIZE_TO_DIALOG: Record<FormDialogSize, DialogSize> = {
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl",
  "2xl": "2xl",
};

export interface FormDialogProps {
  /** Estado do modal (controlled). */
  open: boolean;
  /** Callback chamado quando o modal solicita abrir/fechar. */
  onOpenChange: (open: boolean) => void;
  /** Titulo exibido no header. */
  title: React.ReactNode;
  /** Descricao curta abaixo do titulo (opcional). */
  description?: React.ReactNode;
  /** Icone opcional a esquerda do titulo (ex.: <IconUser size={20} />). */
  icon?: React.ReactNode;
  /** Largura maxima do modal. Default: `md` (~512px). */
  size?: FormDialogSize;
  /**
   * Conteudo do rodape (ex.: botoes Cancelar/Salvar). Se omitido, footer
   * nao e renderizado.
   */
  footer?: React.ReactNode;
  /**
   * Quando true, impede o fechamento (util enquanto uma mutation esta em
   * andamento). Backdrop click, ESC e DialogClose sao ignorados.
   */
  busy?: boolean;
  /** Classes adicionais aplicadas ao corpo rolavel. */
  bodyClassName?: string;
  /** Classes adicionais aplicadas ao painel do modal. */
  className?: string;
  children: React.ReactNode;
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  size = "md",
  footer,
  busy = false,
  bodyClassName,
  className,
  children,
}: FormDialogProps) {
  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (busy && !next) return;
      onOpenChange(next);
    },
    [busy, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        size={SIZE_TO_DIALOG[size]}
        panelClassName={cn("relative", className)}
        bodyClassName="flex flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 border-b border-[var(--glass-border-subtle)] px-6 py-5 text-left">
          <div className="flex items-center gap-2 pe-8">
            {icon ? (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center text-[var(--text-secondary)]">
                {icon}
              </span>
            ) : null}
            <DialogTitle>{title}</DialogTitle>
          </div>
          {description ? (
            <p className="text-sm text-[var(--text-muted)]">{description}</p>
          ) : null}
        </DialogHeader>

        <DialogClose
          disabled={busy}
          className={cn(busy && "pointer-events-none opacity-40")}
        />

        <div
          className={cn(
            "min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-6 py-5",
            bodyClassName,
          )}
        >
          {children}
        </div>

        {footer ? (
          <DialogFooter className="shrink-0 border-t border-[var(--glass-border-subtle)] bg-[var(--glass-bg-panel)] px-6 py-4 sm:flex-row sm:justify-end">
            {footer}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
