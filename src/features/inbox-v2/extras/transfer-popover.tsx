"use client";

/*
 * TransferPopover (Inbox v2)
 *
 * Botão ao lado do kebab ("...") no header do chat que permite ao operador
 * TRANSFERIR a conversa para um AGENTE e/ou um DEPARTAMENTO. Ao escolher um
 * departamento, o backend define `conversation.departmentId` e aciona a
 * Distribuição Inteligente escopada a esse departamento (um agente elegível
 * recebe a conversa automaticamente).
 *
 * Estilo casa com o dropdown do ConversationActionsMenu (fundo sólido, sombra
 * suave). Usa dropdown relativo + click-outside, como o kebab.
 */

import { useEffect, useRef, useState } from "react";
import { IconArrowsExchange, IconCheck } from "@tabler/icons-react";

import { ButtonGlass } from "@/components/crm/button-glass";
import { useTeamUsers, useTransferConversation } from "@/features/inbox-v2/hooks";
import { useDepartments } from "@/features/conversations-settings/hooks/use-departments";

interface TransferPopoverProps {
  conversationId: string | null;
  currentAssigneeId?: string | null;
  currentDepartmentId?: string | null;
  disabled?: boolean;
}

export function TransferPopover({
  conversationId,
  currentAssigneeId,
  currentDepartmentId,
  disabled,
}: TransferPopoverProps) {
  const [open, setOpen] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [deptId, setDeptId] = useState<string | null>(null);
  const [agentFilter, setAgentFilter] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: users = [], isLoading: loadingUsers } = useTeamUsers(open);
  const { data: departments = [], isLoading: loadingDepts } = useDepartments();
  const transfer = useTransferConversation();

  // Reseta a seleção sempre que abre.
  useEffect(() => {
    if (!open) return;
    setAgentId(null);
    setDeptId(null);
    setAgentFilter("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const filteredUsers = users.filter((u) =>
    (u.name ?? u.email ?? "")
      .toLowerCase()
      .includes(agentFilter.trim().toLowerCase()),
  );

  const canConfirm =
    !!conversationId &&
    (agentId !== null || deptId !== null) &&
    !transfer.isPending;

  function handleConfirm() {
    if (!conversationId || (agentId === null && deptId === null)) return;
    transfer.mutate(
      {
        conversationId,
        ...(agentId !== null ? { assignedToId: agentId } : {}),
        ...(deptId !== null ? { departmentId: deptId } : {}),
      },
      { onSuccess: () => setOpen(false) },
    );
  }

  return (
    <div ref={containerRef} className="relative inline-flex">
      <ButtonGlass
        variant="glass"
        size="icon"
        title="Transferir conversa"
        disabled={disabled || !conversationId}
        onClick={() => setOpen((v) => !v)}
      >
        <IconArrowsExchange size={18} />
      </ButtonGlass>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-white shadow-[0_12px_32px_rgba(15,23,42,0.12)] v2-dark:bg-[#1a1f2e]">
          <div className="border-b border-[var(--glass-border)] px-3 py-2.5">
            <p className="text-[13px] font-semibold text-[var(--text-primary)]">
              Transferir conversa
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
              Escolha um agente e/ou um departamento.
            </p>
          </div>

          {/* Agente */}
          <div className="px-3 pt-2.5">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Agente
            </p>
            <input
              type="text"
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              placeholder="Buscar pessoa…"
              className="mb-1.5 w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-2.5 py-1.5 text-[12.5px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)]/40"
            />
            <ul className="max-h-32 overflow-y-auto">
              {loadingUsers && (
                <li className="px-2 py-1.5 text-[12px] text-[var(--text-muted)]">
                  Carregando…
                </li>
              )}
              {!loadingUsers && filteredUsers.length === 0 && (
                <li className="px-2 py-1.5 text-[12px] text-[var(--text-muted)]">
                  Ninguém encontrado.
                </li>
              )}
              {filteredUsers.map((u) => {
                const isSelected = agentId === u.id;
                const isCurrent = currentAssigneeId === u.id;
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setAgentId((prev) => (prev === u.id ? null : u.id))
                      }
                      className={`flex w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[12.5px] transition-colors hover:bg-[var(--glass-bg-overlay)] ${
                        isSelected
                          ? "bg-[var(--color-enterprise-bg)] font-semibold text-[var(--brand-primary)]"
                          : "text-[var(--text-primary)]"
                      }`}
                    >
                      <span className="truncate">
                        {u.name ?? u.email ?? "—"}
                        {isCurrent && (
                          <span className="ml-1 text-[11px] text-[var(--text-muted)]">
                            (atual)
                          </span>
                        )}
                      </span>
                      {isSelected && (
                        <IconCheck
                          size={14}
                          className="shrink-0 text-[var(--brand-primary)]"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Departamento */}
          <div className="px-3 pb-2 pt-2.5">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Departamento
            </p>
            <ul className="max-h-32 overflow-y-auto">
              {loadingDepts && (
                <li className="px-2 py-1.5 text-[12px] text-[var(--text-muted)]">
                  Carregando…
                </li>
              )}
              {!loadingDepts && departments.length === 0 && (
                <li className="px-2 py-1.5 text-[12px] text-[var(--text-muted)]">
                  Nenhum departamento.
                </li>
              )}
              {departments.map((d) => {
                const isSelected = deptId === d.id;
                const isCurrent = currentDepartmentId === d.id;
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setDeptId((prev) => (prev === d.id ? null : d.id))
                      }
                      className={`flex w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-[12.5px] transition-colors hover:bg-[var(--glass-bg-overlay)] ${
                        isSelected
                          ? "bg-[var(--color-enterprise-bg)] font-semibold text-[var(--brand-primary)]"
                          : "text-[var(--text-primary)]"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          aria-hidden
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: d.color || "var(--text-muted)" }}
                        />
                        <span className="truncate">
                          {d.name}
                          {isCurrent && (
                            <span className="ml-1 text-[11px] text-[var(--text-muted)]">
                              (atual)
                            </span>
                          )}
                        </span>
                      </span>
                      {isSelected && (
                        <IconCheck
                          size={14}
                          className="shrink-0 text-[var(--brand-primary)]"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--glass-border)] px-3 py-2.5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-[var(--radius-md)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-overlay)]"
            >
              Cancelar
            </button>
            <ButtonGlass
              variant="primary"
              size="sm"
              disabled={!canConfirm}
              onClick={handleConfirm}
            >
              {transfer.isPending ? "Transferindo…" : "Transferir"}
            </ButtonGlass>
          </div>
        </div>
      )}
    </div>
  );
}
