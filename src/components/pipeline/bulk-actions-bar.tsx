"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Pencil,
  Trash2,
  Trophy,
  UserCog,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  BulkEditFieldsDialog,
  type BulkScopeContext,
} from "@/components/pipeline/bulk-edit-fields-dialog";
import { BulkOperationProgressDialog } from "@/components/pipeline/bulk-operation-progress-dialog";
import { LossReasonDialog } from "@/components/pipeline/loss-reason-dialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useThemeV2 } from "@/hooks/use-theme-v2";

type StageOption = { id: string; name: string; color?: string; isLost?: boolean };
type UserOption = { id: string; name: string };

type BulkActionsBarProps = {
  selectedCount: number;
  selectedIds: Set<string>;
  onClear: () => void;
  pipelineId: string;
  stages: StageOption[];
  users: UserOption[];
  /**
   * Contexto para "selecionar todos que batem no filtro" na edição em massa.
   * Quando ausente, a edição opera só sobre os IDs selecionados.
   */
  scopeContext?: BulkScopeContext;
};

/**
 * Resposta unificada de `POST /api/deals/bulk`. Sync (200) devolve
 * `{ affected, action }`. Async opt-in (202, hoje só `move_stage` com
 * > 50 deals ou `async: true` explícito) devolve `{ operationId, total,
 * action, message }`. Estreitamos via `status` pra que o caller decida
 * abrir o modal de progresso ou apenas exibir o toast histórico.
 */
type SyncBulkResult = {
  kind: "sync";
  status: number;
  affected: number;
  action: string;
};
type AsyncBulkResult = {
  kind: "async";
  status: number;
  operationId: string;
  total: number;
  action: string;
};
type BulkResult = SyncBulkResult | AsyncBulkResult;

async function bulkAction(body: Record<string, unknown>): Promise<BulkResult> {
  const res = await fetch(apiUrl("/api/deals/bulk"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({} as Record<string, unknown>));
  if (!res.ok) {
    // Caso especial: backend criou a BulkOperation mas a fila caiu (503).
    // Ainda assim retornamos o operationId pra que o frontend possa exibi-la
    // no modal e o user veja FAILED ao invés de toast vazio.
    if (res.status === 503 && typeof (data as { operationId?: unknown }).operationId === "string") {
      return {
        kind: "async",
        status: res.status,
        operationId: (data as { operationId: string }).operationId,
        total: typeof (data as { total?: unknown }).total === "number" ? (data as { total: number }).total : 0,
        action: typeof (data as { action?: unknown }).action === "string" ? (data as { action: string }).action : "",
      };
    }
    throw new Error((data as { message?: string }).message ?? "Erro na ação em massa");
  }

  if (res.status === 202 && typeof (data as { operationId?: unknown }).operationId === "string") {
    return {
      kind: "async",
      status: res.status,
      operationId: (data as { operationId: string }).operationId,
      total: typeof (data as { total?: unknown }).total === "number" ? (data as { total: number }).total : 0,
      action: typeof (data as { action?: unknown }).action === "string" ? (data as { action: string }).action : "",
    };
  }

  return {
    kind: "sync",
    status: res.status,
    affected: typeof (data as { affected?: unknown }).affected === "number" ? (data as { affected: number }).affected : 0,
    action: typeof (data as { action?: unknown }).action === "string" ? (data as { action: string }).action : "",
  };
}

/**
 * Persistência leve da operação em massa atualmente acompanhada. Sobrevive
 * a fechar o painel (minimizar) e a recarregar a página, para que o usuário
 * sempre consiga reabrir e ver o resultado final do worker.
 */
const ACTIVE_OP_KEY = "crm:bulk-op:active";
// Janela de restauração: operações persistidas mais antigas que isso são
// descartadas no mount, evitando "pill fantasma" de jobs já purgados no
// backend (que dariam 404 e ficariam repollando para sempre).
const RESTORE_MAX_AGE_MS = 60 * 60 * 1000; // 1h
type PersistedOp = { id: string; total: number };
type StoredOp = PersistedOp & { at: number };

function readPersistedOp(): PersistedOp | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_OP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredOp>;
    if (typeof parsed?.id !== "string" || !parsed.id) return null;
    if (typeof parsed.at === "number" && Date.now() - parsed.at > RESTORE_MAX_AGE_MS) {
      window.localStorage.removeItem(ACTIVE_OP_KEY);
      return null;
    }
    return { id: parsed.id, total: typeof parsed.total === "number" ? parsed.total : 0 };
  } catch {
    /* ignore */
  }
  return null;
}

function writePersistedOp(op: PersistedOp | null) {
  if (typeof window === "undefined") return;
  try {
    if (op) {
      const stored: StoredOp = { ...op, at: Date.now() };
      window.localStorage.setItem(ACTIVE_OP_KEY, JSON.stringify(stored));
    } else {
      window.localStorage.removeItem(ACTIVE_OP_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function BulkActionsBar({
  selectedCount,
  selectedIds,
  onClear,
  pipelineId,
  stages,
  users,
  scopeContext,
}: BulkActionsBarProps) {
  const queryClient = useQueryClient();
  // O CRM aplica `.v2-dark` no <html> (useThemeV2), mas os utilitários
  // `dark:` desta barra só disparam sob `.dark`. Espelhamos a classe `dark`
  // na raiz do componente quando o tema v2 está escuro, ativando de uma vez
  // todos os overrides `dark:` e os tokens shadcn (--card, --popover, etc.).
  const { theme } = useThemeV2();
  const isDark = theme === "dark";
  const [moveOpen, setMoveOpen] = React.useState(false);
  const [ownerOpen, setOwnerOpen] = React.useState(false);
  const [lostOpen, setLostOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [editFieldsOpen, setEditFieldsOpen] = React.useState(false);
  // Mover em massa para o estágio Perdido exige tabulação do motivo —
  // guarda o stage alvo até o usuário confirmar no dialog.
  const [pendingLostMoveStage, setPendingLostMoveStage] =
    React.useState<StageOption | null>(null);

  // ID e total da BulkOperation atualmente acompanhada. Quando setado,
  // o `BulkOperationProgressDialog` abre e faz polling no backend.
  const [progressOperationId, setProgressOperationId] = React.useState<string | null>(null);
  const [progressTotal, setProgressTotal] = React.useState<number>(0);
  // Minimizado: o acompanhamento segue ativo (polling), mas o modal fica
  // oculto e exibimos um pill flutuante para reabrir.
  const [progressMinimized, setProgressMinimized] = React.useState(false);
  // Status terminal capturado para colorir/rotular o pill quando minimizado.
  const [progressDoneStatus, setProgressDoneStatus] = React.useState<string | null>(null);

  // Começa a acompanhar uma operação (centraliza persistência + reset).
  const startTracking = React.useCallback((operationId: string, total: number) => {
    setProgressDoneStatus(null);
    setProgressMinimized(false);
    setProgressTotal(total);
    setProgressOperationId(operationId);
    writePersistedOp({ id: operationId, total });
  }, []);

  // Encerra o acompanhamento de vez (usuário fechou após terminar).
  const stopTracking = React.useCallback(() => {
    setProgressOperationId(null);
    setProgressMinimized(false);
    setProgressDoneStatus(null);
    writePersistedOp(null);
  }, []);

  // Restaura uma operação pendente ao montar (sobrevive a reload). Abre
  // minimizada — o pill aparece e o usuário decide reabrir.
  React.useEffect(() => {
    const persisted = readPersistedOp();
    if (persisted) {
      setProgressTotal(persisted.total);
      setProgressOperationId(persisted.id);
      setProgressMinimized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const invalidate = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["pipeline-board", pipelineId] });
  }, [queryClient, pipelineId]);

  const mutation = useMutation({
    mutationFn: bulkAction,
    onSuccess: (data) => {
      if (data.kind === "async") {
        // Caso 503 (Redis fora): backend já marcou a operação como FAILED,
        // o modal vai ler isso no primeiro poll e exibir o erro. Toast extra
        // só pra deixar claro pro usuário que algo deu errado de fila.
        if (data.status === 503) {
          toast.error("Fila de jobs indisponível — a operação foi marcada como falha.");
        } else {
          toast.success(`Operação enfileirada — ${data.total} negócio(s) em segundo plano.`);
        }
        startTracking(data.operationId, data.total);
        onClear();
        return;
      }
      toast.success(`${data.affected} negócio(s) atualizados`);
      onClear();
      invalidate();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const dealIds = React.useMemo(() => Array.from(selectedIds), [selectedIds]);

  // Mantém o componente montado enquanto:
  //  - há seleção ativa (renderiza a barra)
  //  - OU há operação async em curso (renderiza apenas o Dialog de progresso)
  //
  // Bug histórico: ao enfileirar uma op async chamávamos `onClear()` em
  // seguida ao `setProgressOperationId(...)`. O re-render zerava o
  // `selectedCount`, o componente retornava null, e o Dialog era
  // desmontado antes mesmo de abrir — usuário só via o toast e nenhum
  // progresso visual. A barra fica oculta quando `selectedCount === 0`
  // mas os Dialogs (em particular o de progresso) seguem no DOM.
  const showBar = selectedCount > 0;
  if (!showBar && !progressOperationId && !lostOpen && !deleteOpen && !pendingLostMoveStage && !editFieldsOpen) return null;

  return (
    <>
      {showBar && (
      <div className={cn("fixed inset-x-0 bottom-6 z-50 flex items-center justify-center px-4 transition-all animate-in slide-in-from-bottom-4 fade-in", isDark && "dark")}>
        {/* Em dark, `bg-card/95` resolve a `rgba(255,255,255,0.05)*0.95` ≈ invisível.
            Forçamos um fundo sólido navy + borda visível em dark para a barra
            ficar legível sobre o body/board. `!` necessário pra vencer o
            `bg-transparent`/`text-primary` do variant outline do <Button>. */}
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card/95 px-5 py-3 text-card-foreground shadow-2xl shadow-black/20 backdrop-blur-lg dark:!border-slate-700 dark:!bg-slate-900 dark:!text-slate-100 dark:shadow-black/60">
          <div className="mr-2 flex items-center gap-2 border-r border-border pr-4 dark:border-slate-700/70">
            <CheckCircle2 className="size-4 text-[var(--brand-accent)] dark:text-cyan-400" />
            <span className="text-[13px] font-bold text-foreground dark:text-slate-100">
              {selectedCount} selecionado{selectedCount !== 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={onClear}
              className="ml-1 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {/* Move stage */}
          <div className="relative">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setMoveOpen((v) => !v)}
              className="h-8 gap-1.5 rounded-xl text-[12px] dark:!border-slate-600 dark:!bg-slate-800 dark:!text-slate-100 dark:hover:!bg-slate-700 dark:hover:!text-white"
              disabled={mutation.isPending}
            >
              <ArrowRightLeft className="size-3.5" />
              Mover
              <ChevronDown className="size-3" />
            </Button>
            {moveOpen && (
              <div className="absolute bottom-full left-0 mb-2 min-w-[180px] rounded-xl border border-border bg-popover py-1 text-popover-foreground shadow-xl">
                {stages.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                    onClick={() => {
                      // Estágio Perdido: pede a tabulação do motivo antes.
                      if (s.isLost) {
                        setPendingLostMoveStage(s);
                      } else {
                        mutation.mutate({ dealIds, action: "move_stage", stageId: s.id });
                      }
                      setMoveOpen(false);
                    }}
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: s.color ?? "#2563eb" }}
                    />
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Change owner */}
          <div className="relative">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setOwnerOpen((v) => !v)}
              className="h-8 gap-1.5 rounded-xl text-[12px] dark:!border-slate-600 dark:!bg-slate-800 dark:!text-slate-100 dark:hover:!bg-slate-700 dark:hover:!text-white"
              disabled={mutation.isPending}
            >
              <UserCog className="size-3.5" />
              Responsável
              <ChevronDown className="size-3" />
            </Button>
            {ownerOpen && (
              <div className="absolute bottom-full left-0 mb-2 min-w-[180px] rounded-xl border border-border bg-popover py-1 text-popover-foreground shadow-xl">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  onClick={() => {
                    mutation.mutate({ dealIds, action: "change_owner", ownerId: null });
                    setOwnerOpen(false);
                  }}
                >
                  Sem responsável
                </button>
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                    onClick={() => {
                      mutation.mutate({ dealIds, action: "change_owner", ownerId: u.id });
                      setOwnerOpen(false);
                    }}
                  >
                    {u.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Edit fields/tags */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setEditFieldsOpen(true)}
            className="h-8 gap-1.5 rounded-xl text-[12px] dark:!border-slate-600 dark:!bg-slate-800 dark:!text-slate-100 dark:hover:!bg-slate-700 dark:hover:!text-white"
            disabled={mutation.isPending}
          >
            <Pencil className="size-3.5" />
            Editar campos
          </Button>

          {/* Mark won */}
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 rounded-xl border border-[var(--color-success)]/40 bg-[var(--color-success-bg)] text-[12px] text-[var(--color-success-text)] shadow-none hover:bg-[var(--color-success-bg)] dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ dealIds, action: "mark_won" })}
          >
            <Trophy className="size-3.5" />
            Ganho
          </Button>

          {/* Mark lost */}
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 rounded-xl border border-[var(--color-danger)]/40 bg-[var(--color-danger-bg)] text-[12px] text-[var(--color-danger-text)] shadow-none hover:bg-[var(--color-danger-bg)] dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25"
            disabled={mutation.isPending}
            onClick={() => setLostOpen(true)}
          >
            <XCircle className="size-3.5" />
            Perdido
          </Button>

          {/* Delete */}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 rounded-xl text-[12px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive dark:!text-slate-300 dark:hover:!bg-rose-500/20 dark:hover:!text-rose-300"
            disabled={mutation.isPending}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" />
            Excluir
          </Button>
        </div>
      </div>
      )}

      {/* Lost dialog */}
      <LossReasonDialog
        open={lostOpen}
        onOpenChange={setLostOpen}
        onConfirm={(reason) => {
          mutation.mutate({ dealIds, action: "mark_lost", lostReason: reason });
          setLostOpen(false);
        }}
        isPending={mutation.isPending}
        title={`Marcar ${selectedCount} negócio(s) como perdido`}
      />

      {/* Tabulação ao mover em massa para o estágio Perdido */}
      <LossReasonDialog
        open={!!pendingLostMoveStage}
        onOpenChange={(o) => {
          if (!o) setPendingLostMoveStage(null);
        }}
        onConfirm={(reason) => {
          if (!pendingLostMoveStage) return;
          mutation.mutate({
            dealIds,
            action: "move_stage",
            stageId: pendingLostMoveStage.id,
            lostReason: reason,
          });
          setPendingLostMoveStage(null);
        }}
        isPending={mutation.isPending}
        title={`Mover ${selectedCount} negócio(s) para Perdido`}
        description="Informe o motivo da perda para concluir a movimentação."
      />

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir negócios</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedCount} negócio{selectedCount !== 1 ? "s" : ""}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[var(--color-danger)] text-white hover:bg-[var(--color-danger-dark)]"
              onClick={() => {
                mutation.mutate({ dealIds, action: "delete" });
                setDeleteOpen(false);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edição em massa de campos/tags (sempre async via worker-leads) */}
      <BulkEditFieldsDialog
        open={editFieldsOpen}
        onOpenChange={setEditFieldsOpen}
        dealIds={dealIds}
        scopeContext={scopeContext}
        onEnqueued={(operationId, total) => {
          toast.success(`Operação enfileirada — ${total} negócio(s) em segundo plano.`);
          startTracking(operationId, total);
          onClear();
        }}
      />

      {/* Pill flutuante para reabrir uma operação minimizada / restaurada.
          Fica fora da barra (que some quando a seleção é limpa), garantindo
          que o usuário sempre consiga voltar a ver o progresso/resultado. */}
      {progressOperationId && progressMinimized && (
        <button
          type="button"
          onClick={() => setProgressMinimized(false)}
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-[13px] font-semibold shadow-2xl shadow-black/20 backdrop-blur-lg transition-all animate-in slide-in-from-bottom-4 fade-in",
            isDark && "dark",
            progressDoneStatus === "COMPLETED"
              ? "border-[var(--color-success)]/50 bg-[var(--color-success-bg)] text-[var(--color-success-text)] dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300"
              : progressDoneStatus === "FAILED"
                ? "border-[var(--color-danger)]/50 bg-[var(--color-danger-bg)] text-[var(--color-danger-text)] dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300"
                : progressDoneStatus === "PARTIAL"
                  ? "border-[var(--color-warning)]/50 bg-[var(--color-warn-bg)] text-[var(--color-warning)] dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300"
                  : "border-border bg-card/95 text-card-foreground dark:!border-slate-700 dark:!bg-slate-900 dark:!text-slate-100",
          )}
        >
          {progressDoneStatus ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <Loader2 className="size-4 animate-spin" />
          )}
          {progressDoneStatus ? "Ver resultado da operação" : "Operação em andamento — ver"}
        </button>
      )}

      {/* Progresso de operação async (move_stage > 50, async: true ou edição
          em massa de campos). Permanece montado enquanto houver operação
          acompanhada, mesmo sem seleção. */}
      <BulkOperationProgressDialog
        operationId={progressOperationId}
        optimisticTotal={progressTotal}
        minimized={progressMinimized}
        onMinimize={() => setProgressMinimized(true)}
        onOpenChange={(open) => {
          // Só chega aqui com `open=false` quando a operação já terminou
          // (durante o processamento o dialog chama `onMinimize`).
          if (!open) stopTracking();
        }}
        onFinished={(opData) => {
          // Worker terminou — atualiza o board e marca o status para o pill.
          setProgressDoneStatus(opData.status);
          invalidate();
        }}
      />
    </>
  );
}
