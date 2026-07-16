"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IconChevronRight as ChevronRight,
  IconChevronLeft as ChevronLeft,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

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
            Escolha o motivo do encerramento. Categorias abrem submotivos até uma folha.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-[220px] flex-col gap-3">
          {path.length > 0 ? (
            <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <button
                type="button"
                className="rounded-md px-1.5 py-0.5 hover:bg-[var(--glass-bg)]"
                onClick={() => setPath([])}
              >
                Início
              </button>
              {path.map((n, i) => (
                <span key={n.id} className="flex items-center gap-1">
                  <ChevronRight size={12} />
                  <button
                    type="button"
                    className="rounded-md px-1.5 py-0.5 hover:bg-[var(--glass-bg)]"
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
            <div className="rounded-lg border border-dashed border-[var(--glass-border)] p-6 text-center text-sm text-[var(--text-muted)]">
              {path.length === 0
                ? "Nenhuma tabulação disponível para este departamento."
                : "Fim do ramo — selecione esta opção para confirmar."}
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {currentChildren.map((n) => {
                const hasChildren = n.children.length > 0;
                const selected =
                  path.length > 0 && path[path.length - 1].id === n.id;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                        selected
                          ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10"
                          : "border-[var(--glass-border)] hover:bg-[var(--glass-bg)]"
                      }`}
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
                      <span className="flex-1 text-sm">{n.name}</span>
                      {hasChildren ? (
                        <ChevronRight size={14} className="text-[var(--text-muted)]" />
                      ) : (
                        <span className="rounded-full bg-[var(--glass-bg)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                          folha
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
