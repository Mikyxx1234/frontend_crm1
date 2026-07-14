"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IconPencil } from "@tabler/icons-react";

import { TooltipGlass } from "@/components/crm/tooltip-glass";
import { updateContact, type ContactWriteBody } from "@/features/directory-v2/api";

export interface ContactEditInitial {
  name: string;
  email?: string | null;
  phone?: string | null;
}

interface ContactEditDialogProps {
  contactId: string;
  initial: ContactEditInitial;
  /** Trigger custom. Default: botão lápis glass. */
  trigger?: React.ReactNode;
  /** Chamado após salvar com sucesso (para invalidações extras do caller). */
  onSaved?: () => void;
}

/**
 * Diálogo reutilizável de edição rápida de contato (nome/e-mail/telefone).
 * Usado em: ContactAside (inbox), DealDetailPanel (pipeline) e onde mais
 * for preciso editar o contato sem sair do fluxo.
 */
export function ContactEditDialog({ contactId, initial, trigger, onSaved }: ContactEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (body: ContactWriteBody) => updateContact(contactId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["v2-contacts"], exact: false });
      qc.invalidateQueries({ queryKey: ["v2-contact", contactId] });
      qc.invalidateQueries({ queryKey: ["contact-sidebar", contactId] });
      qc.invalidateQueries({ queryKey: ["inbox-conversations"], exact: false });
      toast.success("Contato atualizado.");
      onSaved?.();
      setOpen(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar contato.");
    },
  });

  // Re-sincroniza o draft sempre que abrir (valores podem ter mudado).
  useEffect(() => {
    if (open) {
      setName(initial.name);
      setEmail(initial.email ?? "");
      setPhone(initial.phone ?? "");
    }
  }, [open, initial.name, initial.email, initial.phone]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const body: ContactWriteBody = {};
    if (n !== initial.name) body.name = n;
    if (email.trim() !== (initial.email ?? "")) body.email = email.trim() || null;
    if (phone.trim() !== (initial.phone ?? "")) body.phone = phone.trim() || null;
    if (Object.keys(body).length === 0) {
      setOpen(false);
      return;
    }
    mutation.mutate(body);
  }

  const triggerNode = trigger ?? (
    <TooltipGlass label="Editar contato" side="left">
      <span className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-overlay)] hover:text-[var(--brand-primary)]">
        <IconPencil size={14} />
      </span>
    </TooltipGlass>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center bg-transparent p-0"
        aria-label="Editar contato"
      >
        {triggerNode}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-(--z-popover) flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            >
              <form
                onClick={(e) => e.stopPropagation()}
                onSubmit={handleSubmit}
                className="w-[420px] max-w-[90vw] rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-modal)] p-5 shadow-[var(--glass-shadow-lg)] backdrop-blur-xl"
              >
                <h3 className="mb-4 font-display text-base font-bold text-[var(--text-primary)]">
                  Editar contato
                </h3>

                <label className="mb-3 block">
                  <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Nome *
                  </span>
                  <input
                    type="text"
                    autoFocus
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
                  />
                </label>

                <label className="mb-3 block">
                  <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    E-mail
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="maria@empresa.com"
                    className="w-full rounded-[var(--radius-md)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
                  />
                </label>

                <label className="mb-4 block">
                  <span className="mb-1 block font-display text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Telefone
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full rounded-[var(--radius-md)] border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
                  />
                </label>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={mutation.isPending}
                    className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-4 py-1.5 font-display text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--glass-bg-strong)] disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!name.trim() || mutation.isPending}
                    className="rounded-full bg-[var(--brand-primary)] px-4 py-1.5 font-display text-xs font-semibold text-white shadow-[0_4px_14px_rgba(91,111,245,0.35)] transition-all hover:-translate-y-px hover:bg-[var(--brand-primary-dark)] disabled:opacity-60"
                  >
                    {mutation.isPending ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </form>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
