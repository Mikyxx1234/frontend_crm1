"use client";

import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  Loader2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  isBulkOperationFinished,
  useBulkOperation,
  type BulkOperationStatus,
  type BulkOperationStatusResponse,
  type BulkOperationType,
} from "@/hooks/use-bulk-operation";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Partial<Record<BulkOperationType, string>> = {
  DEAL_BULK_MOVE_STAGE: "Mover negócios entre etapas",
  DEAL_BULK_UPDATE_FIELDS: "Atualizar campos personalizados",
};

const STATUS_LABELS: Record<BulkOperationStatus, string> = {
  PENDING: "Aguardando worker",
  PROCESSING: "Processando",
  COMPLETED: "Concluída",
  PARTIAL: "Concluída com falhas",
  FAILED: "Falhou",
  CANCELLED: "Cancelada",
};

const STATUS_BADGE_VARIANT: Record<
  BulkOperationStatus,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  PENDING: "muted",
  PROCESSING: "default",
  COMPLETED: "success",
  PARTIAL: "warning",
  FAILED: "destructive",
  CANCELLED: "muted",
};

function StatusIcon({ status }: { status: BulkOperationStatus | undefined }) {
  if (!status || status === "PENDING") {
    return <CircleDashed className="size-4 animate-pulse text-slate-400" />;
  }
  if (status === "PROCESSING") {
    return <Loader2 className="size-4 animate-spin text-primary" />;
  }
  if (status === "COMPLETED") {
    return <CheckCircle2 className="size-4 text-emerald-600" />;
  }
  if (status === "PARTIAL") {
    return <AlertCircle className="size-4 text-amber-600" />;
  }
  return <XCircle className="size-4 text-rose-600" />;
}

export type BulkOperationProgressDialogProps = {
  /** ID da BulkOperation a acompanhar. Null/undefined = modal fechado. */
  operationId: string | null;
  /** Controlado: o pai decide quando fechar (geralmente seta operationId=null). */
  onOpenChange: (open: boolean) => void;
  /**
   * Callback disparado UMA VEZ quando a operação atinge status terminal
   * (COMPLETED, PARTIAL, FAILED, CANCELLED), independente do modal estar
   * aberto. Tipicamente o consumidor faz `queryClient.invalidateQueries`
   * + limpa estado de seleção. Recebe a resposta completa pra que UIs
   * possam ler `failed`, `succeeded`, etc.
   */
  onFinished?: (data: BulkOperationStatusResponse) => void;
  /** Override do título; default = label do tipo. */
  title?: string;
  /** Override da descrição abaixo do título. */
  description?: string;
  /** Total de itens esperado (vindo do POST 202). Mostrado enquanto o
   *  backend ainda não preencheu `total` ao iniciar. */
  optimisticTotal?: number;
};

/**
 * Modal de acompanhamento de uma operação em massa (BulkOperation).
 * Faz polling via `useBulkOperation` e exibe barra de progresso + lista
 * de erros. Se o usuário fechar antes da operação terminar, mostra um
 * toast informativo — o job continua rodando no worker e o callback
 * `onFinished` ainda dispara quando o status terminal chegar (porque o
 * hook segue ativo enquanto operationId estiver presente).
 *
 * Padrões do projeto seguidos: Dialog/DialogContent glass (size="md"),
 * Badge para status, ícones lucide, toasts sonner. Não toca em query
 * keys de outras features — o invalidate fica a cargo do consumidor.
 */
export function BulkOperationProgressDialog({
  operationId,
  onOpenChange,
  onFinished,
  title,
  description,
  optimisticTotal,
}: BulkOperationProgressDialogProps) {
  const open = !!operationId;
  const { data, error, isLoading } = useBulkOperation(operationId);

  // Garante que `onFinished` e o toast terminal disparem UMA vez por
  // operação. Usamos ref de operationId concluído pra resistir a
  // re-renders e a múltiplas refetches retornando o mesmo terminal.
  const finishedForRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!data) return;
    if (!isBulkOperationFinished(data.status)) return;
    if (finishedForRef.current === data.id) return;
    finishedForRef.current = data.id;

    if (data.status === "COMPLETED") {
      toast.success(
        `Operação concluída — ${data.succeeded} de ${data.total} processados.`,
      );
    } else if (data.status === "PARTIAL") {
      toast.warning(
        `Operação concluída com falhas — ${data.succeeded} ok, ${data.failed} falhas.`,
      );
    } else if (data.status === "FAILED") {
      toast.error(
        `Operação falhou — ${data.failed} erros em ${data.total} itens.`,
      );
    } else if (data.status === "CANCELLED") {
      toast.message("Operação cancelada.");
    }
    onFinished?.(data);
  }, [data, onFinished]);

  // Reset do ref quando troca de operação (modal reabriu com outro id).
  React.useEffect(() => {
    if (
      operationId &&
      finishedForRef.current &&
      finishedForRef.current !== operationId
    ) {
      finishedForRef.current = null;
    }
  }, [operationId]);

  const status = data?.status;
  const isFinished = isBulkOperationFinished(status);
  const total = data?.total ?? optimisticTotal ?? 0;
  const processed = data?.processed ?? 0;
  const progressPercent =
    data?.progressPercent ??
    (total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0);

  const handleOpenChange = (next: boolean) => {
    if (!next && !isFinished && operationId && data) {
      // Fechou no meio do processamento — UX-soft: o worker segue.
      toast.message("A operação continua em segundo plano.", {
        description: `${processed} de ${total} processados até agora.`,
      });
    }
    onOpenChange(next);
  };

  const resolvedTitle =
    title ??
    (data?.type
      ? TYPE_LABELS[data.type] ?? "Operação em massa"
      : "Operação em massa");

  const resolvedDescription =
    description ??
    (isFinished
      ? "Resultado da execução do worker."
      : "Acompanhe o progresso. Você pode fechar este painel a qualquer momento — a operação continua em segundo plano.");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StatusIcon status={status} />
            {resolvedTitle}
          </DialogTitle>
          <DialogDescription>{resolvedDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Bar + porcentagem */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[12px] font-medium text-[var(--color-ink-soft)]">
              <span className="flex items-center gap-2">
                {status && (
                  <Badge variant={STATUS_BADGE_VARIANT[status]}>
                    {STATUS_LABELS[status]}
                  </Badge>
                )}
                <span>
                  {processed} de {total || "?"} processados
                </span>
              </span>
              <span className="tabular-nums">{progressPercent}%</span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-slate-200/70"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-500 ease-out",
                  status === "FAILED" && "bg-rose-500",
                  status === "PARTIAL" && "bg-amber-500",
                  (status === "COMPLETED" || (!isFinished && status === "PROCESSING")) &&
                    "bg-gradient-to-r from-primary to-[var(--color-lavender,#8b5cf6)]",
                  (!status || status === "PENDING") && "bg-slate-400",
                  status === "CANCELLED" && "bg-slate-500",
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Counters */}
          {data && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <Counter label="Total" value={data.total} />
              <Counter
                label="Sucesso"
                value={data.succeeded}
                tone="success"
              />
              <Counter
                label="Falhas"
                value={data.failed}
                tone={data.failed > 0 ? "danger" : "muted"}
              />
            </div>
          )}

          {/* Loading inicial (antes do primeiro fetch retornar) */}
          {isLoading && !data && (
            <p className="text-center text-xs text-[var(--color-ink-muted)]">
              Carregando estado da operação…
            </p>
          )}

          {/* Erro no fetch do status (não erro da operação em si) */}
          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50/70 px-3 py-2 text-xs text-rose-700">
              Não foi possível consultar o progresso: {(error as Error).message}
            </p>
          )}

          {/* Lista de falhas por item */}
          {data && data.errors.length > 0 && (
            <details className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-[var(--color-ink-soft)]">
              <summary className="cursor-pointer font-semibold text-amber-800">
                Ver {data.errors.length} {data.errors.length === 1 ? "erro" : "erros"}
                {data.errorsTruncated && " (truncado)"}
              </summary>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                {data.errors.map((err, i) => (
                  <li
                    key={`${err.itemId}-${i}`}
                    className="rounded-md bg-white/70 px-2 py-1"
                  >
                    <span className="font-mono text-[10px] text-amber-700">
                      {err.itemId}
                    </span>
                    <span className="mx-1">·</span>
                    <span>{err.message}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant={isFinished ? "default" : "outline"}
            onClick={() => handleOpenChange(false)}
          >
            {isFinished ? "Fechar" : "Continuar em segundo plano"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Counter({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "danger" | "muted";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white/60 px-2 py-2 backdrop-blur-sm",
        tone === "success" && "border-emerald-200/80 text-emerald-700",
        tone === "danger" && "border-rose-200/80 text-rose-700",
        tone === "muted" && "border-slate-200/80 text-slate-500",
        tone === "default" && "border-slate-200/80 text-foreground",
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
        {label}
      </div>
      <div className="font-display text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
