"use client";

/**
 * TransferControl
 * ────────────────
 * Botão "Transferir conversa" + dropdown de seleção de responsável.
 *
 * Antes vivia inline em `app/(dashboard)/inbox/client-page.tsx` dentro do
 * header do chat. Foi extraído pra ser reutilizado pelo `ConversationHeader`
 * unificado (Inbox + Sales Hub) — mesma identidade visual, mesma lógica de
 * loading/permissões, sem duplicação.
 *
 * Decisões de UX:
 *   • Para ADMIN/MANAGER: ícone `ArrowLeftRight` que abre dropdown com a
 *     lista de membros do workspace + opção "Remover responsável".
 *   • Para MEMBER (agente comum): mesmo ícone, mas executa direto a ação
 *     "Atribuir a mim" (single-click), só aparece se a conversa está sem dono.
 *   • A própria atribuição (callback `onAssign`) é controlada pelo pai —
 *     este componente não conhece a API, só dispara o callback.
 */

import * as React from "react";
import { ArrowLeftRight, Check, UserMinus } from "lucide-react";
import { cn } from "@/lib/utils";
import { TooltipHost } from "@/components/ui/tooltip";

export type TransferControlUser = {
  id: string;
  name: string;
  email: string;
};

type TransferControlProps = {
  /** Usuários elegíveis a receber a conversa (somente ADMIN/MANAGER usa). */
  teamUsers: TransferControlUser[];
  /** ID do responsável atual (para marcar com check). */
  currentAssigneeId: string | null | undefined;
  /** ID do agente logado (para mostrar "(você)"). */
  myUserId: string | undefined;
  /** Permissão pra abrir o dropdown completo de transferência. */
  canManageAssignee: boolean;
  /** Loading global (desativa o botão durante a request). */
  loading?: boolean;
  /** Callback de atribuição. `null` = remover responsável. */
  onAssign: (userId: string | null) => void;
};

export function TransferControl({
  teamUsers,
  currentAssigneeId,
  myUserId,
  canManageAssignee,
  loading,
  onAssign,
}: TransferControlProps) {
  const [open, setOpen] = React.useState(false);

  // Caso 1: agente comum sem dono ainda → "Atribuir a mim" direto.
  if (!canManageAssignee) {
    if (!myUserId || currentAssigneeId) return null;
    return (
      <TooltipHost label="Atribuir a mim" side="bottom">
        <button
          type="button"
          disabled={loading}
          onClick={() => onAssign(myUserId)}
          className="p-2 text-slate-400 transition-colors hover:text-accent disabled:opacity-50"
          aria-label="Atribuir a mim"
        >
          <ArrowLeftRight size={20} />
        </button>
      </TooltipHost>
    );
  }

  // Caso 2: ADMIN/MANAGER → dropdown completo.
  return (
    <div className="relative">
      <TooltipHost label="Transferir conversa" side="bottom">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={loading}
          className="p-2 text-slate-400 transition-colors hover:text-slate-600 disabled:opacity-50"
          aria-label="Transferir conversa"
          aria-expanded={open}
        >
          <ArrowLeftRight size={20} />
        </button>
      </TooltipHost>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-100 bg-white p-1.5 shadow-[0_20px_40px_-20px_rgba(15,23,42,0.25)]">
            <p className="px-3 pb-2 pt-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Transferir para
            </p>
            <button
              type="button"
              onClick={() => {
                onAssign(null);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <UserMinus className="size-3.5" />
              </span>
              <span className="flex-1">Remover responsável</span>
            </button>
            {teamUsers.length > 0 && (
              <div className="my-1 h-px bg-slate-100" aria-hidden />
            )}
            <div className="max-h-[280px] overflow-y-auto scrollbar-thin">
              {teamUsers.map((u) => {
                const isSelected = currentAssigneeId === u.id;
                const isMe = u.id === myUserId;
                const initials =
                  u.name
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((p) => p[0]?.toUpperCase() ?? "")
                    .join("") || "?";
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      onAssign(u.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors",
                      isSelected
                        ? "bg-brand-blue/10 text-brand-blue"
                        : "text-slate-800 hover:bg-slate-50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black uppercase",
                        isSelected
                          ? "bg-brand-blue text-white"
                          : "bg-slate-100 text-slate-600",
                      )}
                    >
                      {initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-[13px]",
                          isSelected ? "font-bold" : "font-semibold",
                        )}
                      >
                        {u.name}
                        {isMe && (
                          <span className="ml-1 text-[11px] font-normal text-slate-400">
                            (você)
                          </span>
                        )}
                      </span>
                      {u.email && (
                        <span className="block truncate text-[11px] text-slate-400">
                          {u.email}
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <Check
                        className="size-4 shrink-0 text-brand-blue"
                        strokeWidth={2.5}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
