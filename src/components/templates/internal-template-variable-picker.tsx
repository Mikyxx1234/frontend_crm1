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
        "rounded-xl border border-border/60 bg-muted/20",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/40"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Variable className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold">
            Variáveis disponíveis
          </span>
          <span className="hidden truncate text-[11px] text-muted-foreground sm:inline">
            · clique para inserir no cursor da mensagem
          </span>
        </div>
        <ChevronDown
          className={cn(
            "size-3.5 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-border/60 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar (ex.: nome, telefone, valor)"
              className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-2 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {grouped.length === 0 ? (
            <p className="px-1 py-2 text-[11px] text-muted-foreground">
              Nenhuma variável encontrada para &quot;{search}&quot;.
            </p>
          ) : (
            <div className="max-h-60 space-y-3 overflow-y-auto pr-1">
              {grouped.map((g) => (
                <div key={g.group}>
                  <div className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
                        className="flex items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted"
                      >
                        <code className="mt-0.5 shrink-0 rounded bg-background px-1.5 py-0.5 font-mono text-[10px] text-foreground shadow-sm">
                          {opt.token}
                        </code>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-foreground">
                            {opt.label}
                          </span>
                          {opt.hint && (
                            <span className="block truncate text-[10px] text-muted-foreground">
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
