"use client"

import { cn } from "@/lib/utils"

interface SwitchGlassProps {
  checked: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  size?: "sm" | "md" | "list"
  "aria-label"?: string
  className?: string
}

export function SwitchGlass({
  checked,
  onChange,
  disabled,
  size = "md",
  className,
  ...rest
}: SwitchGlassProps) {
  const dims =
    size === "sm"
      ? { track: "h-5 w-9", knob: "h-3.5 w-3.5", travel: "translate-x-4" }
      : size === "list"
        ? { track: "h-6 w-[42px]", knob: "h-5 w-5", travel: "translate-x-[18px]" }
        : { track: "h-6 w-11", knob: "h-4.5 w-4.5", travel: "translate-x-5" }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={rest["aria-label"]}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
        dims.track,
        checked
          ? "border-transparent bg-[var(--brand-primary)] shadow-[0_2px_8px_rgba(91,111,245,0.35)]"
          : "border-transparent bg-[rgba(120,140,180,0.40)]",
        className,
      )}
      {...rest}
    >
      <span
        className={cn(
          "pointer-events-none ml-0.5 inline-block transform rounded-full bg-white shadow-sm transition-transform duration-200",
          dims.knob,
          checked ? dims.travel : "translate-x-0",
        )}
      />
    </button>
  )
}
