"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

type SheetContextValue = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
};

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheetContext(component: string) {
  const ctx = React.useContext(SheetContext);
  if (!ctx) {
    throw new Error(`${component} must be used within <Sheet>`);
  }
  return ctx;
}

export interface SheetProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function Sheet({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
}: SheetProps) {
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
    <SheetContext.Provider value={value}>{children}</SheetContext.Provider>
  );
}

export interface SheetTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const SheetTrigger = React.forwardRef<HTMLButtonElement, SheetTriggerProps>(
  ({ onClick, ...props }, ref) => {
    const { onOpenChange } = useSheetContext("SheetTrigger");
    return (
      <button
        ref={ref}
        type="button"
        {...props}
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented) onOpenChange?.(true);
        }}
      />
    );
  }
);
SheetTrigger.displayName = "SheetTrigger";

const sheetPanelVariants = cva(
  "relative z-50 grid gap-4 border border-border bg-background text-foreground shadow-lg transition-[transform,opacity] duration-300 ease-out",
  {
    variants: {
      side: {
        top: "w-full max-h-[85vh] rounded-b-xl",
        bottom: "w-full max-h-[85vh] rounded-t-xl",
        left: "h-full max-w-sm",
        right: "h-full max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
);

const sheetFlexVariants = cva("flex h-full w-full bg-transparent p-0", {
  variants: {
    side: {
      top: "flex-col items-stretch justify-start",
      bottom: "flex-col items-stretch justify-end",
      left: "flex-row items-stretch justify-start",
      right: "flex-row items-stretch justify-end",
    },
  },
  defaultVariants: { side: "right" },
});

export interface SheetContentProps
  extends Omit<React.HTMLAttributes<HTMLDialogElement>, "children">,
    VariantProps<typeof sheetPanelVariants> {
  children: React.ReactNode;
}

const SheetContent = React.forwardRef<HTMLDialogElement, SheetContentProps>(
  ({ className, children, side = "right", ...props }, ref) => {
    const { open, onOpenChange } = useSheetContext("SheetContent");
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
    }, [open]);

    React.useEffect(() => {
      const el = internalRef.current;
      if (!el) return;
      const onClose = () => onOpenChange?.(false);
      el.addEventListener("close", onClose);
      return () => el.removeEventListener("close", onClose);
    }, [onOpenChange]);

    const onBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onOpenChange?.(false);
    };

    if (!mounted) return null;

    return createPortal(
      <dialog
        ref={setRefs}
        className={cn(
          "fixed inset-0 z-50 m-0 max-h-none max-w-none border-0 bg-transparent",
          "backdrop:bg-black/50 backdrop:backdrop-blur-[1px]",
          "open:flex open:h-full open:w-full open:max-h-none open:max-w-none"
        )}
        onCancel={(e) => {
          e.preventDefault();
          onOpenChange?.(false);
        }}
        {...props}
      >
        <div
          className={cn(sheetFlexVariants({ side }))}
          onClick={onBackdropClick}
        >
          <div
            role="document"
            className={cn(sheetPanelVariants({ side }), "overflow-hidden p-6", className)}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        </div>
      </dialog>,
      document.body
    );
  }
);
SheetContent.displayName = "SheetContent";

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col gap-2 text-center sm:text-start", className)}
    {...props}
  />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({
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
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

const SheetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";

export interface SheetCloseProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const SheetClose = React.forwardRef<HTMLButtonElement, SheetCloseProps>(
  ({ className, children, type = "button", onClick, ...props }, ref) => {
    const { onOpenChange } = useSheetContext("SheetClose");
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "absolute end-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none",
          className
        )}
        aria-label="Fechar"
        {...props}
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented) onOpenChange?.(false);
        }}
      >
        {children ?? <X className="size-4" />}
      </button>
    );
  }
);
SheetClose.displayName = "SheetClose";

export {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetClose,
  sheetPanelVariants,
};
