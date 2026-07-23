"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconPlus,
  IconPaperclip,
  IconCamera,
  IconFileText,
  IconLock,
  IconClock,
  IconCheckbox,
  IconCircleCheck,
  IconRotateClockwise,
  IconMessageCode,
  IconBolt,
} from "@tabler/icons-react";

import { ButtonGlass } from "@/components/crm/button-glass";
import { useToggleConversationResolve } from "@/features/inbox-v2/hooks";
import type { InternalTemplateContext } from "@/lib/internal-template-variables";
import type { WhatsappTemplate } from "@/features/inbox-v2/api";

import { FilePickerButton } from "./file-picker-button";
import { TemplatePickerList, InternalTemplatePickerList } from "./template-picker-popover";
import { ScheduleDialog } from "./schedule-dialog";
import { TaskDialog } from "./task-dialog";
import { AutomationPickerList } from "./automation-picker-list";
import { TabulationDialog } from "./tabulation-dialog";

/**
 * Menu unificado "+" do composer (estilo WhatsApp). Reúne as ações
 * do composer do /inbox v1:
 *  - Anexar arquivo
 *  - Templates WhatsApp
 *  - Nota interna (toggle — só quando onToggleNote é passado)
 *  - Agendar mensagem
 *  - Nova tarefa
 *  - Finalizar / Reabrir conversa (só quando isResolved é definido)
 */
export function ComposerMenu({
  conversationId,
  className,
  noteMode,
  onToggleNote,
  isResolved,
  contactId,
  templateContext,
  onPickInternal,
  onPickTemplate,
  onReopenNewConversation,
  departmentId,
  requireTabulationOnClose,
}: {
  conversationId: string | null;
  className?: string;
  noteMode?: boolean;
  onToggleNote?: () => void;
  isResolved?: boolean;
  contactId?: string | null;
  templateContext?: InternalTemplateContext;
  /** Insere o texto do modelo interno (interpolado) no composer para edição.
   *  Se o modelo tiver anexo, `media` é repassado pro composer enviar junto. */
  onPickInternal?: (
    text: string,
    media?: { url: string; name: string | null } | null,
  ) => void;
  /** Abre o painel de validação do template do WhatsApp no composer. */
  onPickTemplate?: (tpl: WhatsappTemplate) => void;
  /** Callback quando "Reabrir" cria novo ticket (modelo de ticket). Ver
   *  ConversationActionsMenu e useToggleConversationResolve. */
  onReopenNewConversation?: (newConversationId: string) => void;
  /** Departamento vinculado — abre modal de tabulacao quando encerrar. */
  departmentId?: string | null;
  requireTabulationOnClose?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"root" | "template" | "internal" | "automation">("root");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [tabulationOpen, setTabulationOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const toggleResolve = useToggleConversationResolve({
    onNewConversation: (newId) => {
      onReopenNewConversation?.(newId);
    },
  });

  function closeMenu() {
    setOpen(false);
    setView("root");
  }

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        closeMenu();
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  function handleToggleResolve() {
    if (!conversationId) return;
    if (!isResolved && requireTabulationOnClose && departmentId) {
      closeMenu();
      setTabulationOpen(true);
      return;
    }
    toggleResolve.mutate(
      { conversationId, action: isResolved ? "reopen" : "resolve" },
      { onSuccess: closeMenu },
    );
  }

  function handleConfirmTabulation(tabulationId: string) {
    if (!conversationId) return;
    toggleResolve.mutate(
      { conversationId, action: "resolve", tabulationId },
      { onSuccess: () => setTabulationOpen(false) },
    );
  }

  const itemClass =
    "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2 text-left text-[12.5px] text-[var(--text-primary)] hover:bg-primary/8 hover:text-primary transition-colors [&>svg]:transition-colors hover:[&>svg]:text-primary";

  return (
    <div className="relative">
      <ButtonGlass
        type="button"
        variant="icon"
        size="icon"
        className={className}
        onClick={() => {
          setOpen((v) => !v);
          setView("root");
        }}
        disabled={!conversationId}
        title="Anexos e mais opções"
      >
        <IconPlus size={22} />
      </ButtonGlass>

      {open && conversationId ? (
        <div
          ref={popoverRef}
          className="absolute bottom-12 left-0 z-30"
          role="menu"
        >
          {view === "root" ? (
            <div
              style={{ backgroundColor: "var(--dropdown-solid-bg)" }}
              className="flex w-56 flex-col gap-px rounded-[var(--radius-lg)] border border-border p-1.5 shadow-2xl ring-1 ring-black/10 dark:ring-white/10"
            >
              <FilePickerButton
                conversationId={conversationId}
                className="w-full justify-start rounded-[var(--radius-sm)] px-3 py-2 text-left text-[12.5px] text-[var(--text-primary)] transition-colors hover:bg-primary/8 hover:text-primary [&>svg]:transition-colors hover:[&>svg]:text-primary"
              >
                <span className="inline-flex items-center gap-2.5">
                  <IconPaperclip size={15} /> Anexar arquivo
                </span>
              </FilePickerButton>

              <FilePickerButton
                conversationId={conversationId}
                accept="image/*"
                capture="environment"
                onOpen={closeMenu}
                className="w-full justify-start rounded-[var(--radius-sm)] px-3 py-2 text-left text-[12.5px] text-[var(--text-primary)] transition-colors hover:bg-primary/8 hover:text-primary [&>svg]:transition-colors hover:[&>svg]:text-primary"
              >
                <span className="inline-flex items-center gap-2.5">
                  <IconCamera size={15} /> Tirar foto
                </span>
              </FilePickerButton>

              <button
                type="button"
                onClick={() => setView("internal")}
                className={itemClass}
              >
                <IconMessageCode size={15} /> Modelos internos
              </button>

              <button
                type="button"
                onClick={() => setView("template")}
                className={itemClass}
              >
                <IconFileText size={15} /> Templates WhatsApp
              </button>

              <button
                type="button"
                onClick={() => setView("automation")}
                className={itemClass}
              >
                <IconBolt size={15} /> Executar automação
              </button>

              {/* Nota interna removida do menu: agora é tab no composer */}

              <button
                type="button"
                onClick={() => {
                  setScheduleOpen(true);
                  closeMenu();
                }}
                className={itemClass}
              >
                <IconClock size={15} /> Agendar mensagem
              </button>

              <button
                type="button"
                onClick={() => {
                  setTaskOpen(true);
                  closeMenu();
                }}
                className={itemClass}
              >
                <IconCheckbox size={15} /> Nova tarefa
              </button>

              {isResolved !== undefined ? (
                <>
                  <div className="my-1 h-px bg-border/60" />
                  <button
                    type="button"
                    disabled={toggleResolve.isPending}
                    onClick={handleToggleResolve}
                    className={`${itemClass} disabled:opacity-50`}
                  >
                    {isResolved ? (
                      <>
                        <IconRotateClockwise size={15} /> Reabrir conversa
                      </>
                    ) : (
                      <>
                        <IconCircleCheck size={15} /> Finalizar conversa
                      </>
                    )}
                  </button>
                </>
              ) : null}
            </div>
          ) : view === "internal" ? (
            <InternalTemplatePickerList
              conversationId={conversationId}
              templateContext={templateContext}
              onClose={closeMenu}
              onPick={onPickInternal}
            />
          ) : view === "automation" ? (
            <AutomationPickerList
              conversationId={conversationId}
              contactId={contactId}
              onClose={closeMenu}
            />
          ) : (
            <TemplatePickerList
              conversationId={conversationId}
              onClose={closeMenu}
              onPick={onPickTemplate}
            />
          )}
        </div>
      ) : null}

      <ScheduleDialog
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        conversationId={conversationId}
      />
      <TaskDialog
        open={taskOpen}
        onClose={() => setTaskOpen(false)}
        conversationId={conversationId}
        contactId={contactId}
      />
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
