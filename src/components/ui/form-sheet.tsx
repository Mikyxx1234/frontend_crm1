"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * Padrao unificado de drawer lateral para formularios de criacao e edicao.
 *
 * Uso:
 * ```
 * <FormSheet
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
 * </FormSheet>
 * ```
 *
 * Sempre desliza da direita ocupando 100% da altura. O corpo (children)
 * rola independente; header e footer ficam fixos.
 */

type FormSheetSize = "sm" | "md" | "lg" | "xl";

const SIZE_TO_WIDTH: Record<FormSheetSize, string> = {
  sm: "w-[min(100vw,420px)]",
  md: "w-[min(100vw,560px)]",
  lg: "w-[min(100vw,720px)]",
  xl: "w-[min(100vw,960px)]",
};

export interface FormSheetProps {
  /** Estado do drawer (controlled). */
  open: boolean;
  /** Callback chamado quando o drawer solicita abrir/fechar. */
  onOpenChange: (open: boolean) => void;
  /** Titulo exibido no header. */
  title: React.ReactNode;
  /** Descricao curta abaixo do titulo (opcional). */
  description?: React.ReactNode;
  /** Icone opcional a esquerda do titulo (ex.: <IconUser size={20} />). */
  icon?: React.ReactNode;
  /** Largura maxima do drawer. Default: `md` (560px). */
  size?: FormSheetSize;
  /**
   * Conteudo do rodape (ex.: botoes Cancelar/Salvar). Se omitido, footer
   * nao e renderizado.
   */
  footer?: React.ReactNode;
  /**
   * Quando true, impede o fechamento (util enquanto uma mutation esta em
   * andamento). Backdrop click, ESC e SheetClose sao ignorados.
   */
  busy?: boolean;
  /** Classes adicionais aplicadas ao corpo rolavel. */
  bodyClassName?: string;
  /** Classes adicionais aplicadas ao container do painel. */
  className?: string;
  children: React.ReactNode;
}

export function FormSheet({
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
}: FormSheetProps) {
  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (busy && !next) return;
      onOpenChange(next);
    },
    [busy, onOpenChange],
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "flex h-full max-w-none flex-col gap-0 rounded-none border-l p-0",
          SIZE_TO_WIDTH[size],
          className,
        )}
      >
        <SheetHeader className="border-b border-[var(--glass-border-subtle)] px-6 py-5">
          <div className="flex items-center gap-2">
            {icon ? (
              <span className="flex h-6 w-6 items-center justify-center text-[var(--text-secondary)]">
                {icon}
              </span>
            ) : null}
            <SheetTitle>{title}</SheetTitle>
          </div>
          {description ? (
            <p className="text-sm text-[var(--text-muted)]">{description}</p>
          ) : null}
        </SheetHeader>

        <div
          className={cn(
            "flex-1 space-y-4 overflow-y-auto px-6 py-5",
            bodyClassName,
          )}
        >
          {children}
        </div>

        {footer ? (
          <SheetFooter className="border-t border-[var(--glass-border-subtle)] px-6 py-4">
            {footer}
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
