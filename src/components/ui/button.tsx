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
      else
        (ref as React.MutableRefObject<T | null>).current = value;
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
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:bg-primary/95 hover:-translate-y-0.5",
        destructive:
          "bg-destructive text-destructive-foreground shadow-md hover:shadow-lg hover:bg-destructive/95 hover:-translate-y-0.5",
        outline:
          "border-2 border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground hover:border-accent",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/90 hover:shadow-md",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-lg px-3.5 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "size-10",
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
