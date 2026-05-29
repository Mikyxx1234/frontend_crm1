import { cn } from "@/lib/utils";

interface StageDotProps {
  color: string;
  label: string;
  className?: string;
}

/** Indicador de etapa: bolinha colorida + rótulo. Usado na visão Lista. */
export function StageDot({ color, label, className }: StageDotProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
      <span className="font-display text-[13px] font-semibold text-[var(--text-secondary)]">
        {label}
      </span>
    </span>
  );
}
