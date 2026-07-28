"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  IconDotsVertical,
  IconSearch,
  IconCircleCheck,
  IconLink,
  IconRotateClockwise,
  IconStarFilled,
  IconUsersGroup,
  IconChevronRight,
  IconLoader2,
} from "@tabler/icons-react";

import { ButtonGlass } from "@/components/crm/button-glass";
import { useToggleConversationResolve } from "@/features/inbox-v2/hooks";
import { RequirePermission } from "@/components/auth/require-permission";
import { useExecuteDistribution } from "@/features/distribution/hooks";
import { apiUrl } from "@/lib/api";
import { TabulationDialog } from "./tabulation-dialog";

interface ConversationActionsMenuProps {
  conversationId: string | null;
  contactId?: string | null;
  isResolved: boolean;
  disabled?: boolean;
  /** Handler opcional pra "Buscar na conversa". Quando ausente, mostra toast "em breve". */
  onSearchInConversation?: () => void;
  /** Abre o painel "Mensagens favoritas" (estrelas do agente logado). */
  onOpenFavorites?: () => void;
  /**
   * Callback disparado quando "Reabrir" cria um novo ticket (modelo de ticket).
   * O caller (ex.: inbox) usa isso para selecionar/navegar para a nova conversa.
   * Recebe o id da nova conversa gerada; o id previo continua acessivel via
   * `conversationId` (que era o anterior).
   */
  onReopenNewConversation?: (newConversationId: string) => void;
  onResolved?: (conversationId: string) => void;
  /** Departamento vinculado a conversa — usado para o modal de tabulacao. */
  departmentId?: string | null;
  /** Se true, o botao "Encerrar" abre um modal exigindo folha da arvore. */
  requireTabulationOnClose?: boolean;
}

export function ConversationActionsMenu({
  conversationId,
  contactId,
  isResolved,
  disabled,
  onSearchInConversation,
  onOpenFavorites,
  onReopenNewConversation,
  onResolved,
  departmentId,
  requireTabulationOnClose,
}: ConversationActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [deptMenuOpen, setDeptMenuOpen] = useState(false);
  const [tabulationOpen, setTabulationOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleResolve = useToggleConversationResolve({
    onNewConversation: (newId) => {
      onReopenNewConversation?.(newId);
    },
    onResolved: (id) => onResolved?.(id),
  });
  const executeDist = useExecuteDistribution();

  const deptsQuery = useQuery({
    queryKey: ["inbox-distribute-departments"],
    queryFn: async (): Promise<Array<{ id: string; name: string }>> => {
      const res = await fetch(apiUrl("/api/settings/departments"), {
        credentials: "include",
      });
      if (!res.ok) return [];
      const raw = (await res.json()) as unknown;
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as { items?: unknown })?.items)
          ? (raw as { items: unknown[] }).items
          : [];
      return (list as Array<{ id: string; name: string }>).map((d) => ({
        id: d.id,
        name: d.name,
      }));
    },
    enabled: open,
    staleTime: 120_000,
  });

  useEffect(() => {
    if (!open) {
      setDeptMenuOpen(false);
      return;
    }
    function onClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setDeptMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function handleToggleResolve() {
    if (!conversationId) return;
    // Encerramento com departamento que exige tabulacao -> abre modal.
    if (!isResolved && requireTabulationOnClose && departmentId) {
      setOpen(false);
      setTabulationOpen(true);
      return;
    }
    toggleResolve.mutate(
      {
        conversationId,
        action: isResolved ? "reopen" : "resolve",
      },
      { onSuccess: () => setOpen(false) },
    );
  }

  function handleConfirmTabulation(tabulationId: string) {
    if (!conversationId) return;
    toggleResolve.mutate(
      { conversationId, action: "resolve", tabulationId },
      { onSuccess: () => setTabulationOpen(false) },
    );
  }

  function handleSearch() {
    setOpen(false);
    if (onSearchInConversation) {
      onSearchInConversation();
    } else {
      toast.info("Busca dentro da conversa: em breve.");
    }
  }

  // Copia o link absoluto da conversa (?c=<id>) para compartilhar — ex.:
  // enviar a um supervisor para ele abrir direto esta conversa.
  async function handleCopyLink() {
    setOpen(false);
    if (!conversationId) return;
    const url = `${window.location.origin}/inbox?c=${conversationId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link da conversa copiado.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  function handleDistributeToDepartment(dept: { id: string; name: string }) {
    if (!conversationId) return;
    executeDist.mutate(
      {
        conversationId,
        contactId: contactId ?? undefined,
        departmentIds: [dept.id],
        reassign: true,
      },
      {
        onSuccess: (result) => {
          setOpen(false);
          setDeptMenuOpen(false);
          if (result.success) {
            toast.success(
              result.selectedUserName
                ? `Distribuído para ${result.selectedUserName} (${dept.name}).`
                : `Distribuído no departamento ${dept.name}.`,
            );
          } else if (result.reason === "NO_ELIGIBLE_RESPONSIBLE") {
            toast.warning(
              `Nenhum agente elegível em ${dept.name}. Lead enviado à fila de espera.`,
            );
          } else if (result.reason === "SMART_DISTRIBUTION_NOT_ENABLED") {
            toast.error("Módulo de Distribuição não habilitado.");
          } else {
            toast.error("Não foi possível distribuir.");
          }
        },
        onError: (err) => toast.error(err.message || "Erro ao distribuir."),
      },
    );
  }

  return (
    <div ref={containerRef} className="relative inline-flex">
      <ButtonGlass
        variant="glass"
        size="icon"
        title="Mais"
        disabled={disabled || !conversationId}
        onClick={() => setOpen((v) => !v)}
      >
        <IconDotsVertical size={18} />
      </ButtonGlass>

      {open && (
        // Dropdown limpo (fundo branco solido, sombra suave) para casar
        // com o padrao dos menus contextuais do CRM. Icones a esquerda,
        // labels a direita — legibilidade + affordance clara.
        <div className="absolute right-0 top-full z-30 mt-2 w-56 overflow-visible rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-white p-1 shadow-[0_12px_32px_rgba(15,23,42,0.12)] v2-dark:bg-[#1a1f2e]">
          <button
            type="button"
            onClick={handleSearch}
            className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg-overlay)]"
          >
            <IconSearch size={16} className="shrink-0 text-[var(--text-muted)]" stroke={2} />
            <span>Buscar na conversa</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            disabled={!conversationId}
            className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg-overlay)] disabled:opacity-50"
          >
            <IconLink size={16} className="shrink-0 text-[var(--text-muted)]" stroke={2} />
            <span>Copiar link da conversa</span>
          </button>

          {onOpenFavorites && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenFavorites();
              }}
              className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg-overlay)]"
            >
              <IconStarFilled size={16} className="shrink-0 text-amber-500" />
              <span>Mensagens favoritas</span>
            </button>
          )}

          {!isResolved && (
            <div className="relative">
              <button
                type="button"
                disabled={executeDist.isPending}
                onClick={() => setDeptMenuOpen((v) => !v)}
                className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg-overlay)] disabled:opacity-50"
              >
                {executeDist.isPending ? (
                  <IconLoader2
                    size={16}
                    className="shrink-0 animate-spin text-[var(--brand-primary)]"
                  />
                ) : (
                  <IconUsersGroup
                    size={16}
                    className="shrink-0 text-[var(--text-muted)]"
                    stroke={2}
                  />
                )}
                <span className="flex-1">Distribuir p/ departamento</span>
                <IconChevronRight size={14} className="shrink-0 text-[var(--text-muted)]" />
              </button>

              {deptMenuOpen && (
                <div className="absolute right-full top-0 z-40 mr-1 w-56 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-white p-1 shadow-[0_12px_32px_rgba(15,23,42,0.12)] v2-dark:bg-[#1a1f2e]">
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                    Escolha o departamento
                  </p>
                  {deptsQuery.isLoading ? (
                    <p className="px-3 py-2 text-[12px] text-[var(--text-muted)]">
                      Carregando…
                    </p>
                  ) : (deptsQuery.data ?? []).length === 0 ? (
                    <p className="px-3 py-2 text-[12px] text-[var(--text-muted)]">
                      Nenhum departamento cadastrado.
                    </p>
                  ) : (
                    <div className="max-h-56 overflow-y-auto">
                      {(deptsQuery.data ?? []).map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          disabled={executeDist.isPending}
                          onClick={() => handleDistributeToDepartment(d)}
                          className="flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-left text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg-overlay)] disabled:opacity-50"
                        >
                          <span className="truncate">{d.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <RequirePermission permission="conversation:resolve">
            <button
              type="button"
              disabled={toggleResolve.isPending}
              onClick={handleToggleResolve}
              className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg-overlay)] disabled:opacity-50"
            >
              {isResolved ? (
                <IconRotateClockwise size={16} className="shrink-0 text-[var(--text-muted)]" stroke={2} />
              ) : (
                <IconCircleCheck size={16} className="shrink-0 text-[var(--text-muted)]" stroke={2} />
              )}
              <span>{isResolved ? "Reabrir conversa" : "Encerrar conversa"}</span>
            </button>
          </RequirePermission>
        </div>
      )}
      <TabulationDialog
        open={tabulationOpen}
        onOpenChange={setTabulationOpen}
        departmentId={departmentId ?? null}
        submitting={toggleResolve.isPending}
        onConfirm={handleConfirmTabulation}
      />
    </div>
  );
}
