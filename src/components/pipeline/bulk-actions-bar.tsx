"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

import { LossReasonDialog } from "@/components/pipeline/loss-reason-dialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

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

async function bulkAction(body: Record<string, unknown>) {
  const res = await fetch(apiUrl("/api/deals/bulk"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Erro na ação em massa");
  }
  return res.json();
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

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["pipeline-board", pipelineId] });
  };

  const mutation = useMutation({
    mutationFn: bulkAction,
    onSuccess: (data) => {
      toast.success(`${data.affected ?? 0} negócio(s) atualizados`);
      onClear();
      invalidate();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const dealIds = React.useMemo(() => Array.from(selectedIds), [selectedIds]);

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="fixed inset-x-0 bottom-6 z-50 flex items-center justify-center px-4 transition-all animate-in slide-in-from-bottom-4 fade-in">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-white/95 px-5 py-3 shadow-2xl shadow-slate-500/15 backdrop-blur-lg">
          <div className="mr-2 flex items-center gap-2 border-r border-border pr-4">
            <CheckCircle2 className="size-4 text-cyan-600" />
            <span className="text-[13px] font-bold text-slate-800">
              {selectedCount} selecionado{selectedCount !== 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={onClear}
              className="ml-1 rounded-full p-1 text-[var(--color-ink-muted)] hover:bg-slate-100 hover:text-[var(--color-ink-soft)]"
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
              className="h-8 gap-1.5 rounded-xl text-[12px]"
              disabled={mutation.isPending}
            >
              <ArrowRightLeft className="size-3.5" />
              Mover
              <ChevronDown className="size-3" />
            </Button>
            {moveOpen && (
              <div className="absolute bottom-full left-0 mb-2 min-w-[180px] rounded-xl border border-border bg-white py-1 shadow-xl">
                {stages.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-foreground hover:bg-[var(--color-bg-subtle)]"
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
              className="h-8 gap-1.5 rounded-xl text-[12px]"
              disabled={mutation.isPending}
            >
              <UserCog className="size-3.5" />
              Responsável
              <ChevronDown className="size-3" />
            </Button>
            {ownerOpen && (
              <div className="absolute bottom-full left-0 mb-2 min-w-[180px] rounded-xl border border-border bg-white py-1 shadow-xl">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-[var(--color-ink-muted)] hover:bg-[var(--color-bg-subtle)]"
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
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-foreground hover:bg-[var(--color-bg-subtle)]"
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
            className="h-8 gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-[12px] text-emerald-700 shadow-none hover:bg-emerald-100"
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
            className="h-8 gap-1.5 rounded-xl border border-rose-200 bg-rose-50 text-[12px] text-rose-700 shadow-none hover:bg-rose-100"
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
            className="h-8 gap-1.5 rounded-xl text-[12px] text-slate-500 hover:bg-red-50 hover:text-red-600"
            disabled={mutation.isPending}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" />
            Excluir
          </Button>
        </div>
      </div>

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
    </>
  );
}
