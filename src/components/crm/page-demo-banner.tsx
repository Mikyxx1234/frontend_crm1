import { cn } from "@/lib/utils";

interface PageDemoBannerProps {
  children: React.ReactNode;
  className?: string;
}

/** Banner padrão para modo demonstração (`shouldAutoDemoEmpty` / `?mock=1`). */
export function PageDemoBanner({ children, className }: PageDemoBannerProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--brand-primary)]/20 bg-[var(--color-enterprise-bg)] px-3 py-2 font-body text-[12px] text-[var(--brand-primary)]",
        className,
      )}
    >
      <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-primary)]" />
      {children}
    </div>
  );
}
