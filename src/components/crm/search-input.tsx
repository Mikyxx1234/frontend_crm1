"use client";

import { IconSearch } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Largura do container. Default `w-80` (padrão de contatos/empresas). */
  className?: string;
}

/**
 * Barra de busca padronizada do segmento /v2 (glass, lupa à esquerda,
 * `h-9`). Fonte única de verdade do visual usado em Contatos, Empresas,
 * Deals (kanban/lista) e Conversas — evita drift entre as telas.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar...",
  className,
}: SearchInputProps) {
  return (
    <div className={cn("relative w-80", className)}>
      <IconSearch
        size={15}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
      />
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] pl-9 pr-4 font-body text-[13px] text-[var(--text-primary)] shadow-[var(--glass-shadow-sm)] outline-none placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--input-ring-focus)]"
      />
    </div>
  );
}
