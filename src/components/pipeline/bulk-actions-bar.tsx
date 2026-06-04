"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  CheckCircle2,
  ChevronDown,
  Trash2,
  Trophy,
  UserCog,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { BulkOperationProgressDialog } from "@/components/pipeline/bulk-operation-progress-dialog";
import { LossReasonDialog } from "@/components/pipeline/loss-reason-dialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type StageOption = { id: string; name: string; color?: string };
type UserOption = { id: string; name: string };

type BulkActionsBarProps = {
  selectedCount: number;
  selectedIds: Set<string>;
  onClear: () => void;
  pipelineId: string;
  stages: StageOption[];
  users: UserOption[];
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

export function BulkActionsBar({
  selectedCount,
  selectedIds,
  onClear,
  pipelineId,
  stages,
  users,
}: BulkActionsBarProps) {
  const queryClient = useQueryClient();
  const [moveOpen, setMoveOpen] = React.useState(false);
  const [ownerOpen, setOwnerOpen] = React.useState(false);
  const [lostOpen, setLostOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  // ID e total da BulkOperation atualmente acompanhada. Quando setado,
  // o `BulkOperationProgressDialog` abre e faz polling no backend.
  const [progressOperationId, setProgressOperationId] = React.useState<string | null>(null);
  const [progressTotal, setProgressTotal] = React.useState<number>(0);

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
        setProgressTotal(data.total);
        setProgressOperationId(data.operationId);
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
  if (!showBar && !progressOperationId && !lostOpen && !deleteOpen) return null;

  return (
    <>
      {showBar && (
      <div className="fixed inset-x-0 bottom-6 z-50 flex items-center justify-center px-4 transition-all animate-in slide-in-from-bottom-4 fade-in">
        {/* Em dark, `bg-card/95` resolve a `rgba(255,255,255,0.05)*0.95` ≈ invisível.
            Forçamos um fundo sólido navy + borda visível em dark para a barra
            ficar legível sobre o body/board. `!` necessário pra vencer o
            `bg-transparent`/`text-primary` do variant outline do <Button>. */}
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card/95 px-5 py-3 text-card-foreground shadow-2xl shadow-black/20 backdrop-blur-lg dark:!border-slate-700 dark:!bg-slate-900 dark:!text-slate-100 dark:shadow-black/60">
          <div className="mr-2 flex items-center gap-2 border-r border-border pr-4 dark:border-slate-700/70">
            <CheckCircle2 className="size-4 text-cyan-600 dark:text-cyan-400" />
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
                      mutation.mutate({ dealIds, action: "move_stage", stageId: s.id });
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

          {/* Mark won */}
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-[12px] text-emerald-700 shadow-none hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25"
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
            className="h-8 gap-1.5 rounded-xl border border-rose-200 bg-rose-50 text-[12px] text-rose-700 shadow-none hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25"
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
              className="bg-red-600 text-white hover:bg-red-700"
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

      {/* Progresso de operação async (move_stage > 50 ou async: true) */}
      <BulkOperationProgressDialog
        operationId={progressOperationId}
        optimisticTotal={progressTotal}
        onOpenChange={(open) => {
          if (!open) setProgressOperationId(null);
        }}
        onFinished={() => {
          // Worker terminou — atualiza o board. O toast de status final
          // já é exibido pelo próprio dialog.
          invalidate();
        }}
      />
    </>
  );
}
