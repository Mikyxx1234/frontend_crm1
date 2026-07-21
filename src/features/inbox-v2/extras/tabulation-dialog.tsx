"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IconChevronRight as ChevronRight,
  IconChevronLeft as ChevronLeft,
  IconCheck,
  IconCircleDot,
  IconFolder,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { getTabulations, type TabulationNode } from "../api/conversations";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentId: string | null;
  /** Callback recebe o id da folha escolhida. */
  onConfirm: (tabulationId: string) => void;
  /** Se true, permite fechar sem escolher (uso opcional em ambientes que
   *  nao exigem). Default false (exige selecao). */
  optional?: boolean;
  submitting?: boolean;
};

/**
 * Modal drill-down para selecionar uma tabulacao (folha) ao encerrar
 * uma conversa. A UI navega nivel a nivel: cada nó com filhos abre uma
 * proxima "coluna" (breadcrumbs). Confirmar so eh habilitado quando o
 * ponteiro atual eh folha.
 */
export function TabulationDialog({
  open,
  onOpenChange,
  departmentId,
  onConfirm,
  optional,
  submitting,
}: Props) {
  const query = useQuery({
    queryKey: ["inbox-tabulations", departmentId ?? ""],
    queryFn: () => getTabulations(departmentId!),
    enabled: open && !!departmentId,
    staleTime: 30_000,
  });

  // path[]: caminho atual (categoria pai -> ... -> nó selecionado).
  // Se o ultimo do path for folha, permite confirmar.
  const [path, setPath] = useState<TabulationNode[]>([]);

  useEffect(() => {
    if (!open) setPath([]);
  }, [open]);

  const currentChildren: TabulationNode[] = useMemo(() => {
    if (!query.data) return [];
    const last = path[path.length - 1];
    if (!last) return query.data.tree.filter((n) => n.active);
    return last.children.filter((n) => n.active);
  }, [query.data, path]);

  const isLeafSelected =
    path.length > 0 && path[path.length - 1].children.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Selecione a tabulação</DialogTitle>
          <DialogDescription>
            Escolha o motivo do encerramento. Os níveis abrem submotivos até um nível final.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-[220px] flex-col gap-3">
          {path.length > 0 ? (
            <div className="flex flex-wrap items-center gap-0.5 font-body text-[12px] text-[var(--text-muted)]">
              <button
                type="button"
                className="rounded-[var(--radius-sm)] px-1.5 py-0.5 font-medium transition-colors hover:bg-[var(--glass-bg-base)] hover:text-[var(--text-primary)]"
                onClick={() => setPath([])}
              >
                Início
              </button>
              {path.map((n, i) => (
                <span key={n.id} className="flex items-center gap-0.5">
                  <ChevronRight size={13} className="opacity-60" />
                  <button
                    type="button"
                    className={cn(
                      "rounded-[var(--radius-sm)] px-1.5 py-0.5 font-medium transition-colors hover:bg-[var(--glass-bg-base)] hover:text-[var(--text-primary)]",
                      i === path.length - 1 && "text-[var(--brand-primary)]",
                    )}
                    onClick={() => setPath((prev) => prev.slice(0, i + 1))}
                  >
                    {n.name}
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          {query.isLoading ? (
            <div className="py-8 text-center text-sm text-[var(--text-muted)]">
              Carregando…
            </div>
          ) : query.isError ? (
            <div className="py-8 text-center text-sm text-[var(--color-danger)]">
              Erro ao carregar tabulações.
            </div>
          ) : currentChildren.length === 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--glass-border)] p-6 text-center font-body text-[13px] text-[var(--text-muted)]">
              {path.length === 0
                ? "Nenhuma tabulação disponível para este departamento."
                : "Fim do ramo — selecione esta opção para confirmar."}
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {currentChildren.map((n) => {
                const hasChildren = n.children.length > 0;
                const selected =
                  path.length > 0 && path[path.length - 1].id === n.id;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-3 rounded-[var(--radius-lg)] border px-2.5 py-2 text-left transition-colors",
                        selected
                          ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/8"
                          : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] hover:border-[var(--brand-primary)]/40 hover:bg-[var(--glass-bg-base)]",
                      )}
                      onClick={() => {
                        if (hasChildren) {
                          setPath((prev) => [...prev, n]);
                        } else {
                          // Folha: substitui o ultimo item (ou fixa)
                          setPath((prev) => {
                            const next = [...prev];
                            if (next.length > 0 && next[next.length - 1].children.length === 0) {
                              next[next.length - 1] = n;
                              return next;
                            }
                            return [...prev, n];
                          });
                        }
                      }}
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
                          hasChildren
                            ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                            : selected
                              ? "bg-[var(--brand-primary)] text-white"
                              : "bg-[var(--glass-bg-base)] text-[var(--text-secondary)]",
                        )}
                      >
                        {hasChildren ? <IconFolder size={17} /> : <IconCircleDot size={17} />}
                      </span>
                      <span className="flex-1 truncate font-display text-[13.5px] font-semibold text-[var(--text-primary)]">
                        {n.name}
                      </span>
                      {hasChildren ? (
                        <ChevronRight size={16} className="shrink-0 text-[var(--text-muted)]" />
                      ) : selected ? (
                        <IconCheck size={16} className="shrink-0 text-[var(--brand-primary)]" />
                      ) : (
                        <span className="shrink-0 rounded-full bg-[var(--glass-bg-base)] px-2 py-0.5 font-display text-[9.5px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                          Selecionar
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter>
          {path.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPath((prev) => prev.slice(0, -1))}
            >
              <ChevronLeft size={14} className="mr-1" /> Voltar
            </Button>
          ) : null}
          <div className="flex-1" />
          {optional ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Fechar
            </Button>
          )}
          <Button
            type="button"
            disabled={!isLeafSelected || submitting}
            onClick={() => {
              const leaf = path[path.length - 1];
              if (!leaf || leaf.children.length > 0) return;
              onConfirm(leaf.id);
            }}
          >
            {submitting ? "Encerrando…" : "Confirmar encerramento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
