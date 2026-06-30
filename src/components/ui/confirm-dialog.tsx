"use client";

import * as React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Hook que devolve uma função `confirm()` Promise-based, equivalente
 * a `window.confirm` mas renderizado com o DS v2 (AlertDialog).
 *
 * Uso:
 *   const { confirm, dialog } = useConfirm();
 *   ...
 *   if (await confirm({ title: "Excluir?", description: "..." })) { ... }
 *   ...
 *   return <>{...} {dialog}</>;
 *
 * Por que não global? Mantemos o estado local pra cada componente que
 * usa, evita acoplamento via contexto e o `dialog` JSX é trivial de
 * incluir. Quando precisarmos de uso global, basta promover esse hook
 * para Provider + Context.
 */
export type ConfirmOptions = {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Quando true, o botão de confirmação fica em vermelho (ação destrutiva). */
  destructive?: boolean;
};

type ConfirmState = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

export function useConfirm() {
  const [state, setState] = React.useState<ConfirmState | null>(null);

  const confirm = React.useCallback(
    (opts: ConfirmOptions): Promise<boolean> =>
      new Promise<boolean>((resolve) => {
        setState({ ...opts, resolve });
      }),
    [],
  );

  function handleClose(value: boolean) {
    if (!state) return;
    state.resolve(value);
    setState(null);
  }

  const dialog = (
    <AlertDialog open={!!state} onOpenChange={(o) => { if (!o) handleClose(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state?.title}</AlertDialogTitle>
          {state?.description && (
            <AlertDialogDescription>{state.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handleClose(false)}>
            {state?.cancelLabel ?? "Cancelar"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => handleClose(true)}
            variant={state?.destructive ? "destructive" : "default"}
          >
            {state?.confirmLabel ?? "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, dialog };
}
