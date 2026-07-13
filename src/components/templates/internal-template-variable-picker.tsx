"use client";

/**
 * Picker de variáveis para **templates internos** do CRM. Renderizado
 * abaixo da textarea no form de criação/edição em
 * `/old/settings/message-models?tab=internal`.
 *
 * Diferente do picker do step Webhook, aqui há só um alvo possível
 * (a textarea de mensagem), então a API é bem mais simples: o pai
 * passa `onSelect(token)` que insere o token na posição corrente do
 * cursor.
 */

import * as React from "react";
import { IconChevronDown as ChevronDown, IconVariable as Variable, IconSearch as Search } from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import {
  INTERNAL_TEMPLATE_VARIABLE_GROUPS,
  INTERNAL_TEMPLATE_VARIABLE_OPTIONS,
} from "@/lib/internal-template-variables";

type Props = {
  onSelect: (token: string) => void;
  className?: string;
  /** Permite começar fechado pra não competir com o foco da textarea. */
  defaultOpen?: boolean;
};

export function InternalTemplateVariablePicker({
  onSelect,
  className,
  defaultOpen = true,
}: Props) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [search, setSearch] = React.useState("");

  const grouped = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return INTERNAL_TEMPLATE_VARIABLE_GROUPS.map((group) => ({
      group,
      items: INTERNAL_TEMPLATE_VARIABLE_OPTIONS.filter(
        (opt) =>
          opt.group === group &&
          (q === "" ||
            opt.label.toLowerCase().includes(q) ||
            opt.token.toLowerCase().includes(q) ||
            (opt.hint?.toLowerCase().includes(q) ?? false)),
      ),
    })).filter((g) => g.items.length > 0);
  }, [search]);

  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)]",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-[var(--glass-bg-strong)]"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Variable className="size-3.5 text-[var(--text-muted)]" />
          <span className="font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
            Variáveis disponíveis
          </span>
          <span className="hidden truncate text-[11.5px] text-[var(--text-muted)] sm:inline">
            · clique para inserir no cursor da mensagem
          </span>
        </div>
        <ChevronDown
          className={cn(
            "size-3.5 text-[var(--text-muted)] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-[var(--glass-border-subtle)] p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar (ex.: nome, telefone, valor)"
              className="w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] py-1.5 pl-8 pr-2 font-body text-[12.5px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)]"
            />
          </div>

          {grouped.length === 0 ? (
            <p className="px-1 py-2 text-[11.5px] text-[var(--text-muted)]">
              Nenhuma variável encontrada para &quot;{search}&quot;.
            </p>
          ) : (
            <div className="max-h-60 space-y-3 overflow-y-auto pr-1">
              {grouped.map((g) => (
                <div key={g.group}>
                  <div className="mb-1 px-1 font-display text-[10.5px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    {g.group}
                  </div>
                  <div className="grid gap-1">
                    {g.items.map((opt) => (
                      <button
                        key={opt.token}
                        type="button"
                        // CRÍTICO: `onMouseDown.preventDefault` impede que
                        // o clique no botão tire o foco da textarea — sem
                        // isso o cursor "some" e o token cai no final.
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onSelect(opt.token)}
                        className="flex items-start gap-2 rounded-[var(--radius-md)] px-2 py-1.5 text-left transition-colors hover:bg-[var(--glass-bg-strong)]"
                      >
                        <code className="mt-0.5 shrink-0 rounded-[var(--radius-sm)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-base)] px-1.5 py-0.5 font-mono text-[10.5px] text-[var(--text-secondary)]">
                          {opt.token}
                        </code>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-semibold text-[var(--text-primary)]">
                            {opt.label}
                          </span>
                          {opt.hint && (
                            <span className="block truncate text-[10.5px] text-[var(--text-muted)]">
                              {opt.hint}
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
