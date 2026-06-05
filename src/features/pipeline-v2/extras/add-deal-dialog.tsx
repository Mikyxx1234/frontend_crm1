"use client";

/*
 * Formulário inline de criação de deal — estilo Kommo CRM.
 * Renderiza DENTRO da coluna (sem portal, sem fixed) logo acima do
 * botão "+ Adicionar negócio". Mantém as mesmas props externas.
 */

import * as React from "react";
import { IconSettings } from "@tabler/icons-react";

import { useCreateDeal } from "@/features/pipeline-v2/hooks";
import { cn } from "@/lib/utils";
import type { StatusFilter } from "@/features/pipeline-v2/api";

interface AddDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stageId: string;
  stageName?: string;
  pipelineId: string | null;
  statusFilter?: StatusFilter;
}

export function AddDealDialog({
  open,
  onOpenChange,
  stageId,
  pipelineId,
  statusFilter = "OPEN",
}: AddDealDialogProps) {
  const createMut = useCreateDeal(pipelineId, statusFilter);

  const [title,          setTitle]        = React.useState("");
  const [value,          setValue]        = React.useState("");
  const [contactName,    setContactName]  = React.useState("");
  const [contactPhone,   setContactPhone] = React.useState("");
  const [contactEmail,   setContactEmail] = React.useState("");
  const [companyName,    setCompanyName]  = React.useState("");
  const [companyAddress, setCompanyAddr]  = React.useState("");

  const titleRef = React.useRef<HTMLInputElement>(null);

  // Foca no campo Nome ao abrir; limpa ao fechar
  React.useEffect(() => {
    if (open) {
      setTimeout(() => titleRef.current?.focus(), 50);
    } else {
      setTitle(""); setValue(""); setContactName(""); setContactPhone("");
      setContactEmail(""); setCompanyName(""); setCompanyAddr("");
    }
  }, [open]);

  // Fecha com ESC
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const num = value.trim() ? parseFloat(value.replace(",", ".")) : undefined;

    createMut.mutate(
      {
        title: t,
        stageId,
        value: Number.isFinite(num) ? (num as number) : undefined,
      },
      {
        onSuccess: async (deal) => {
          // Se houver dados de contato, cria e vincula via /api/contacts
          if (contactName.trim() || contactPhone.trim() || contactEmail.trim()) {
            try {
              await fetch("/api/contacts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name:   contactName.trim() || "Sem nome",
                  phone:  contactPhone.trim() || undefined,
                  email:  contactEmail.trim() || undefined,
                  dealId: (deal as { id?: string })?.id,
                }),
              });
            } catch {
              // silencia — deal já foi criado com sucesso
            }
          }
          onOpenChange(false);
        },
      },
    );
  }

  if (!open) return null;

  const inputBase = cn(
    "w-full bg-transparent px-3 py-2.5",
    "font-display text-[13px] text-[var(--text-primary)]",
    "placeholder:text-[var(--text-muted)]",
    "outline-none transition-colors",
    "focus:bg-[rgba(255,255,255,0.12)]",
  );

  const inputSm = cn(
    "w-full bg-transparent px-3 py-2",
    "font-display text-[12px] text-[var(--text-secondary)]",
    "placeholder:text-[var(--text-muted)]",
    "outline-none transition-colors",
    "focus:bg-[rgba(255,255,255,0.12)]",
  );

  const divider = "border-b border-[var(--glass-border-subtle)]";

  return (
    <div
      style={{ animation: "addDealExpand 180ms cubic-bezier(0.4,0,0.2,1)" }}
      className={cn(
        "mx-2 mb-2 overflow-hidden",
        "rounded-[var(--radius-lg)] border border-[var(--glass-border)]",
        "bg-[var(--glass-bg-strong)] backdrop-blur-[16px]",
        "shadow-[var(--glass-shadow)]",
      )}
    >
      <form onSubmit={handleSubmit}>

        {/* Bloco 1 — Nome + Valor */}
        <div className={divider}>
          <input
            ref={titleRef}
            type="text"
            placeholder="Nome"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={cn(inputBase, divider, "font-semibold")}
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="R$ 0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={inputBase}
          />
        </div>

        {/* Bloco 2 — Contato */}
        <div className={divider}>
          <input
            type="text"
            placeholder="Contato: Primeiro nome"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className={cn(inputSm, divider)}
          />
          <input
            type="tel"
            placeholder="Contato: Telefone"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className={cn(inputSm, divider)}
          />
          <input
            type="email"
            placeholder="Contato: E-mail"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className={inputSm}
          />
        </div>

        {/* Bloco 3 — Empresa */}
        <div className={divider}>
          <input
            type="text"
            placeholder="Empresa: Nome"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className={cn(inputSm, divider)}
          />
          <input
            type="text"
            placeholder="Empresa: Endereço"
            value={companyAddress}
            onChange={(e) => setCompanyAddr(e.target.value)}
            className={inputSm}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center gap-1.5 px-3 py-2.5">
          <button
            type="submit"
            disabled={!title.trim() || createMut.isPending}
            className={cn(
              "rounded-[var(--radius-md)] px-3.5 py-1.5",
              "bg-[var(--brand-primary)] text-white",
              "font-display text-[12px] font-semibold",
              "shadow-[0_4px_14px_rgba(91,111,245,0.35)]",
              "transition-all hover:bg-[var(--brand-primary-dark)] hover:shadow-[0_4px_18px_rgba(91,111,245,0.45)]",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {createMut.isPending ? "Criando..." : "Adicionar"}
          </button>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-2.5 py-1.5 font-display text-[12px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() => {
              // TODO: abrir configurações de campos visíveis
            }}
            className="ml-auto flex items-center gap-1 font-display text-[11px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            title="Configurar campos do formulário"
          >
            <span>Configurações</span>
            <IconSettings size={13} />
          </button>
        </div>

      </form>
    </div>
  );
}
