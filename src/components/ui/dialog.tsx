"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

type DialogContextValue = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext(component: string) {
  const ctx = React.useContext(DialogContext);
  if (!ctx) {
    throw new Error(`${component} must be used within <Dialog>`);
  }
  return ctx;
}

export interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function Dialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
}: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  const value = React.useMemo(
    () => ({ open, onOpenChange: setOpen }),
    [open, setOpen]
  );

  return (
    <DialogContext.Provider value={value}>{children}</DialogContext.Provider>
  );
}

/**
 * Presets de largura pra padronizar modais no app inteiro. Antes cada
 * tela passava `panelClassName="sm:max-w-md"` / `max-w-lg` / etc. de
 * forma inconsistente e o UX ficava "ilha no canto" em monitores
 * grandes quando a modal era pequena demais pro conteúdo.
 *
 * Escolha pela complexidade do formulário:
 * - sm  ~384px : confirmações (AlertDialog), 1-2 campos
 * - md  ~512px : formulário curto (3-5 campos, uma coluna)
 * - lg  ~672px : formulário médio (até 10 campos, grid 2 colunas)
 * - xl  ~896px : formulário complexo (wizard, configuração ampla)
 * - 2xl ~1152px: builders, previews lado-a-lado
 */
export type DialogSize = "sm" | "md" | "lg" | "xl" | "2xl";

const DIALOG_SIZE_CLASS: Record<DialogSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "2xl": "max-w-6xl",
};

export interface DialogContentProps
  extends Omit<React.HTMLAttributes<HTMLDialogElement>, "children"> {
  children: React.ReactNode;
  /** Preset de largura (default: "md"). Chamadores podem ainda
   * sobrescrever via `panelClassName="max-w-..."` — o twMerge no `cn`
   * garante que a última classe vence. */
  size?: DialogSize;
  /** Classes extras no painel interno (conteúdo branco centralizado).
   * Útil pra ajustes pontuais de padding ou overflow. */
  panelClassName?: string;
}

const DialogContent = React.forwardRef<HTMLDialogElement, DialogContentProps>(
  ({ className, children, size = "md", panelClassName, ...props }, ref) => {
    const { open, onOpenChange } = useDialogContext("DialogContent");
    const internalRef = React.useRef<HTMLDialogElement | null>(null);

    const setRefs = React.useCallback(
      (node: HTMLDialogElement | null) => {
        internalRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref != null)
          (ref as React.MutableRefObject<HTMLDialogElement | null>).current =
            node;
      },
      [ref]
    );

    const [mounted, setMounted] = React.useState(false);
    React.useEffect(() => setMounted(true), []);

    React.useEffect(() => {
      const el = internalRef.current;
      if (!el) return;
      if (open) {
        if (!el.open) el.showModal();
      } else if (el.open) {
        el.close();
      }
    }, [open, mounted]);

    React.useEffect(() => {
      const el = internalRef.current;
      if (!el) return;
      const onClose = () => onOpenChange?.(false);
      el.addEventListener("close", onClose);
      return () => el.removeEventListener("close", onClose);
    }, [onOpenChange]);

    const onDialogClick = (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === internalRef.current) onOpenChange?.(false);
    };

    if (!mounted) return null;

    return createPortal(
      <dialog
        ref={setRefs}
        className={cn(
          // `<dialog>` nativo tem estilos do UA (margin: auto, border,
          // etc.) que já tentam centralizar, mas tiramos tudo pra o
          // nosso wrapper controlar layout. `h-full w-full` garante
          // que, mesmo se algum agente de acessibilidade/tema ignorar
          // `open:flex`, o backdrop continue ocupando a tela toda.
          "fixed inset-0 z-50 m-0 h-full max-h-none w-full max-w-none border-0 bg-transparent p-0",
          "backdrop:bg-black/50 backdrop:backdrop-blur-[1px]",
          "open:flex open:items-center open:justify-center open:p-4",
          className
        )}
        onClick={onDialogClick}
        onCancel={(e) => {
          e.preventDefault();
          onOpenChange?.(false);
        }}
        {...props}
      >
        <div
          role="document"
          className={cn(
            // Painel base:
            // - `mx-auto my-auto` é cinto-e-suspensório: se por algum
            //   motivo o variant `open:flex` não for aplicado (certas
            //   extensões/bloqueios de CSS), o painel ainda centraliza.
            // - `max-h-[calc(100dvh-2rem)] + overflow-y-auto` evita
            //   vazamento em mobile quando o form é longo. 100dvh
            //   acompanha a barra de URL no Safari iOS.
            "relative z-50 mx-auto my-auto grid max-h-[calc(100dvh-2rem)] w-full gap-4 overflow-y-auto rounded-xl border border-border bg-background p-6 text-foreground shadow-lg transition-[opacity,transform] duration-200",
            DIALOG_SIZE_CLASS[size],
            panelClassName
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </dialog>,
      document.body
    );
  }
);
DialogContent.displayName = "DialogContent";

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";

export interface DialogCloseProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const DialogClose = React.forwardRef<HTMLButtonElement, DialogCloseProps>(
  ({ className, children, type = "button", onClick, ...props }, ref) => {
    const { onOpenChange } = useDialogContext("DialogClose");
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "absolute end-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none",
          className
        )}
        aria-label="Fechar"
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented) onOpenChange?.(false);
        }}
        {...props}
      >
        {children ?? <X className="size-4" />}
      </button>
    );
  }
);
DialogClose.displayName = "DialogClose";

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
};
