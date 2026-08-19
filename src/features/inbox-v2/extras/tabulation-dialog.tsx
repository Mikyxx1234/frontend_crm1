"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  IconChevronRight as ChevronRight,
  IconChevronLeft as ChevronLeft,
  IconCheck,
  IconCircleDot,
  IconFolder,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { InputGlass } from "@/components/crm/input-glass";

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
import { SkipAutomationsCheckbox } from "./skip-automations-option";

function normalizeSearch(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Resultado de busca no ramo atual: o nó e o caminho relativo até ele. */
type SearchHit = { node: TabulationNode; trail: TabulationNode[] };

function collectSearchHits(
  nodes: TabulationNode[],
  q: string,
  trail: TabulationNode[] = [],
): SearchHit[] {
  const hits: SearchHit[] = [];
  for (const node of nodes) {
    if (!node.active) continue;
    if (normalizeSearch(node.name).includes(q)) {
      hits.push({ node, trail });
    }
    if (node.children.length > 0) {
      hits.push(...collectSearchHits(node.children, q, [...trail, node]));
    }
  }
  return hits;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentId: string | null;
  /** Callback recebe o id da folha escolhida. */
  onConfirm: (
    tabulationId: string,
    extra?: { skipAutomations?: boolean },
  ) => void;
  /** Se true, permite fechar sem escolher (uso opcional em ambientes que
   *  nao exigem). Default false (exige selecao). */
  optional?: boolean;
  submitting?: boolean;
  /** ADMIN: mostra checkbox para encerrar sem disparar automações. */
  allowSkipAutomations?: boolean;
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
  allowSkipAutomations,
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
  const [skipAutomations, setSkipAutomations] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setPath([]);
      setSkipAutomations(false);
      setSearch("");
      return;
    }
    const t = window.setTimeout(() => searchRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [open]);

  const currentChildren: TabulationNode[] = useMemo(() => {
    if (!query.data) return [];
    const last = path[path.length - 1];
    if (!last) return query.data.tree.filter((n) => n.active);
    // Folha selecionada: lista os irmãos para o item (e a busca) permanecer visível.
    if (last.children.length === 0) {
      const parent = path[path.length - 2];
      const siblings = parent ? parent.children : query.data.tree;
      return siblings.filter((n) => n.active);
    }
    return last.children.filter((n) => n.active);
  }, [query.data, path]);

  const listed: SearchHit[] = useMemo(() => {
    const q = normalizeSearch(search.trim());
    if (!q) return currentChildren.map((node) => ({ node, trail: [] }));
    return collectSearchHits(currentChildren, q);
  }, [currentChildren, search]);

  const isSearching = normalizeSearch(search.trim()).length > 0;

  const isLeafSelected =
    path.length > 0 && path[path.length - 1].children.length === 0;

  function selectNode(n: TabulationNode, trail: TabulationNode[]) {
    if (n.children.length > 0) setSearch("");
    setPath((prev) => {
      const base =
        prev.length > 0 && prev[prev.length - 1].children.length === 0
          ? prev.slice(0, -1)
          : prev;
      return [...base, ...trail, n];
    });
  }

  // Cada nível volta ao topo da lista: sem isso, ao entrar num submotivo a
  // lista curta herda o scroll do nível anterior e parece vazia/cortada.
  const listRef = useRef<HTMLUListElement | null>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [path.length, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        className="open:p-3 sm:open:p-4"
        bodyClassName="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4 sm:gap-4 sm:p-6"
        panelClassName="h-[min(80vh,680px)] max-h-[calc(100dvh-1.5rem)] sm:max-h-[min(80vh,720px)]"
      >
        <DialogHeader className="shrink-0 text-left">
          <DialogTitle className="pr-8 text-[17px] leading-snug sm:text-lg">
            Selecione a tabulação
          </DialogTitle>
          <DialogDescription className="text-pretty text-[13px] leading-relaxed sm:text-sm">
            Escolha o motivo do encerramento. Os níveis abrem submotivos até um nível final.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0">
          <InputGlass
            ref={searchRef}
            type="search"
            withSearch
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar tabulação..."
            aria-label="Pesquisar tabulação"
            autoComplete="off"
          />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2.5 sm:gap-3">
          {path.length > 0 ? (
            <div className="flex min-w-0 flex-wrap items-center gap-0.5 font-body text-[12px] text-[var(--text-muted)]">
              <button
                type="button"
                className="rounded-[var(--radius-sm)] px-1.5 py-0.5 font-medium transition-colors hover:bg-[var(--glass-bg-base)] hover:text-[var(--text-primary)]"
                onClick={() => {
                  setSearch("");
                  setPath([]);
                }}
              >
                Início
              </button>
              {path.map((n, i) => (
                <span key={n.id} className="flex min-w-0 max-w-full items-center gap-0.5">
                  <ChevronRight size={13} className="shrink-0 opacity-60" />
                  <button
                    type="button"
                    className={cn(
                      "min-w-0 max-w-[min(100%,14rem)] truncate rounded-[var(--radius-sm)] px-1.5 py-0.5 text-left font-medium transition-colors hover:bg-[var(--glass-bg-base)] hover:text-[var(--text-primary)]",
                      i === path.length - 1 && "text-[var(--brand-primary)]",
                    )}
                    title={n.name}
                    onClick={() => {
                      setSearch("");
                      setPath((prev) => prev.slice(0, i + 1));
                    }}
                  >
                    {n.name}
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          {query.isLoading ? (
            <div className="flex flex-1 items-center justify-center py-8 text-center text-sm text-[var(--text-muted)]">
              Carregando…
            </div>
          ) : query.isError ? (
            <div className="flex flex-1 items-center justify-center py-8 text-center text-sm text-[var(--color-danger)]">
              Erro ao carregar tabulações.
            </div>
          ) : listed.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--glass-border)] p-4 text-center font-body text-[13px] text-[var(--text-muted)] sm:p-6">
              {isSearching
                ? `Nenhuma tabulação encontrada para “${search.trim()}”.`
                : path.length === 0
                  ? "Nenhuma tabulação disponível para este departamento."
                  : "Fim do ramo — selecione esta opção para confirmar."}
            </div>
          ) : (
            <ul
              ref={listRef}
              className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain"
            >
              {listed.map(({ node: n, trail }) => {
                const hasChildren = n.children.length > 0;
                const selected =
                  path.length > 0 && path[path.length - 1].id === n.id;
                const trailLabel = trail.map((t) => t.name).join(" › ");
                return (
                  <li key={[...trail.map((t) => t.id), n.id].join(":")} className="min-w-0">
                    <button
                      type="button"
                      className={cn(
                        "flex w-full min-w-0 items-center gap-2.5 rounded-[var(--radius-lg)] border px-2.5 py-2.5 text-left transition-colors sm:gap-3 sm:py-2.5",
                        selected
                          ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/8"
                          : "border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] hover:border-[var(--brand-primary)]/40 hover:bg-[var(--glass-bg-base)]",
                      )}
                      onClick={() => selectNode(n, trail)}
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] sm:size-9",
                          hasChildren
                            ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                            : selected
                              ? "bg-[var(--brand-primary)] text-white"
                              : "bg-[var(--glass-bg-base)] text-[var(--text-secondary)]",
                        )}
                      >
                        {hasChildren ? <IconFolder size={17} /> : <IconCircleDot size={17} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block break-words font-display text-[13px] font-semibold leading-snug text-[var(--text-primary)] sm:truncate sm:text-[13.5px]">
                          {n.name}
                        </span>
                        {trailLabel ? (
                          <span className="mt-0.5 block truncate font-body text-[11px] text-[var(--text-muted)]">
                            {trailLabel}
                          </span>
                        ) : null}
                      </span>
                      {hasChildren ? (
                        <ChevronRight size={16} className="shrink-0 text-[var(--text-muted)]" />
                      ) : selected ? (
                        <IconCheck size={16} className="shrink-0 text-[var(--brand-primary)]" />
                      ) : (
                        <span className="hidden shrink-0 rounded-full bg-[var(--glass-bg-base)] px-2 py-0.5 font-display text-[9.5px] font-bold uppercase tracking-wider text-[var(--text-secondary)] sm:inline">
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

        {allowSkipAutomations ? (
          <div className="shrink-0">
            <SkipAutomationsCheckbox
              checked={skipAutomations}
              onChange={setSkipAutomations}
            />
          </div>
        ) : null}

        {/* Sem flex-1 spacer: no mobile (flex-col-reverse) ele esticava o
            rodapé e deixava a modal desproporcional. */}
        <DialogFooter className="shrink-0 !flex-col-reverse gap-2 border-t border-[var(--glass-border-subtle)] pt-3 sm:!flex-row sm:items-center sm:border-0 sm:pt-0">
          {path.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full sm:mr-auto sm:w-auto"
              onClick={() => {
                setSearch("");
                setPath((prev) => prev.slice(0, -1));
              }}
            >
              <ChevronLeft size={14} className="mr-1" /> Voltar
            </Button>
          ) : null}
          {optional ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Fechar
            </Button>
          )}
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={!isLeafSelected || submitting}
            onClick={() => {
              const leaf = path[path.length - 1];
              if (!leaf || leaf.children.length > 0) return;
              onConfirm(
                leaf.id,
                allowSkipAutomations ? { skipAutomations } : undefined,
              );
            }}
          >
            {submitting ? "Encerrando…" : "Confirmar encerramento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
