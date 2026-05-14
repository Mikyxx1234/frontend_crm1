"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

function mergeRefs<T>(
  ...refs: (React.Ref<T> | undefined)[]
): React.RefCallback<T> {
  return (value) => {
    for (const ref of refs) {
      if (ref == null) continue;
      if (typeof ref === "function") ref(value);
      else (ref as React.MutableRefObject<T | null>).current = value;
    }
  };
}

function Slot({
  children,
  ...props
}: React.ComponentPropsWithoutRef<"span"> & {
  children: React.ReactElement;
  ref?: React.Ref<unknown>;
}) {
  const { ref: refFromProps, ...rest } = props;
  if (!React.isValidElement(children)) {
    throw new Error("Slot expects a single valid React element child.");
  }
  const child = children as React.ReactElement<{
    ref?: React.Ref<unknown>;
    className?: string;
    style?: React.CSSProperties;
  }>;
  return React.cloneElement(child, {
    ...rest,
    ...child.props,
    ref: mergeRefs(
      refFromProps as React.Ref<unknown> | undefined,
      child.props.ref
    ),
    className: cn(
      (rest as { className?: string }).className,
      child.props.className
    ),
    style: {
      ...(rest as { style?: React.CSSProperties }).style,
      ...child.props.style,
    },
  } as never);
}

const buttonVariants = cva(
  // Base: Lumen — fonte Inter, peso 600, radius 8px, transição suave
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        // Índigo sólido — CTA primário (Lumen)
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary-dark hover:shadow-[var(--shadow-indigo-glow)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md",
        // Ghost com borda — ação secundária
        outline:
          "border border-border bg-background text-foreground shadow-sm hover:bg-bg-subtle hover:border-border",
        // Superfície sutil
        secondary:
          "bg-bg-muted text-foreground border border-border shadow-sm hover:bg-bg-hover",
        // Fantasma sem borda
        ghost: "text-ink-soft hover:bg-bg-muted hover:text-foreground",
        // Link
        link: "text-primary underline-offset-4 hover:underline",
        // Lavanda — IA / Copilot
        ai:
          "bg-lavender text-lavender-foreground shadow-sm hover:opacity-90 hover:shadow-[var(--shadow-lavender-glow)]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm:      "h-7 rounded-md px-3 text-xs",
        lg:      "h-11 rounded-xl px-6 text-base",
        icon:    "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    if (asChild) {
      const { children, ...rest } = props;
      if (!React.isValidElement(children)) {
        throw new Error("asChild requires a single React element child.");
      }
      return (
        <Slot
          ref={ref as React.Ref<unknown>}
          className={cn(buttonVariants({ variant, size, className }))}
          {...(rest as React.ComponentPropsWithoutRef<"span">)}
        >
          {children}
        </Slot>
      );
    }
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
