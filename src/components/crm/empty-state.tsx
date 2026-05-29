import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Estado vazio padrão do DS glass. Usado em listas/tabelas v2 quando
 * a busca/filtro não retorna resultados ou a entidade ainda não tem
 * registros.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-16 text-center",
        className,
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)] shadow-[var(--glass-shadow-sm)]">
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-display text-[15px] font-bold text-[var(--text-secondary)]">{title}</p>
        {description && (
          <p className="font-body text-[13px] text-[var(--text-muted)]">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
