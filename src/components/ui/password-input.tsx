"use client";

import * as React from "react";
import { IconEye, IconEyeOff } from "@tabler/icons-react";

import { InputGlass } from "@/components/crm/input-glass";
import { cn } from "@/lib/utils";

/**
 * Input de senha com toggle de visibilidade (olho) — DS v2.
 * Reaproveita o `InputGlass` (mesmos tokens/foco) e sobrepõe um botão
 * para alternar entre `password` e `text`. Encaminha `className` e `ref`.
 */
export type PasswordInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
>;

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    return (
      <div className="relative min-w-0">
        <InputGlass
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn("pr-10", className)}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors hover:text-[var(--brand-primary)]"
        >
          {visible ? <IconEyeOff size={16} /> : <IconEye size={16} />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
