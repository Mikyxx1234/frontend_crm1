"use client";

import { IconCheck, IconMinus } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

interface CheckboxGlassProps {
  checked?: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
  "aria-label"?: string;
  className?: string;
}

/** Checkbox no estilo do DS glass, com estados marcado/indeterminado. */
export function CheckboxGlass({
  checked = false,
  indeterminate = false,
  onChange,
  className,
  ...rest
}: CheckboxGlassProps) {
  const active = checked || indeterminate;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={rest["aria-label"]}
      onClick={(e) => {
        e.stopPropagation();
        onChange?.(!checked);
      }}
      className={cn(
        "flex h-[18px] w-[18px] shrink-0 cursor-pointer items-center justify-center rounded-[5px] border transition-all",
        active
          ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
          : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-transparent hover:border-[var(--brand-primary)]",
        className,
      )}
    >
      {indeterminate ? (
        <IconMinus size={13} strokeWidth={3} />
      ) : (
        <IconCheck size={13} strokeWidth={3} />
      )}
    </button>
  );
}
