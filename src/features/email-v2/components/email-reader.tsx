"use client";

import * as React from "react";
import { IconExternalLink, IconUser } from "@tabler/icons-react";
import type { EmailDetail } from "../api/types";
import { formatFullDate } from "../utils";
import { HtmlEmailFrame, decodeIfQuotedPrintable } from "./html-email-frame";

// ── SVG icons (DS v2 reference) ────────────────────────────────────────────
const IcoReply = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 17 4 12l5-5"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
  </svg>
);
const IcoForward = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 17 5-5-5-5"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/>
  </svg>
);
const IcoTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>
  </svg>
);
const IcoMail = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-20">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/>
  </svg>
);

// ── Helper ──────────────────────────────────────────────────────────────────
function getInitials(name: string | null, email: string): string {
  const src = name ?? email;
  const parts = src.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}


// ── Componente ──────────────────────────────────────────────────────────────
interface Props {
  email: EmailDetail | null;
  loading: boolean;
  onReply?: () => void;
  onForward?: () => void;
  onDelete?: () => void;
}

export function EmailReader({ email, loading, onReply, onForward, onDelete }: Props) {
  // Estado vazio / loading
  if (loading || !email) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 h-full gap-3 text-[var(--text-muted)]">
        {loading ? (
          <span className="text-sm animate-pulse">Carregando…</span>
        ) : (
          <>
            <IcoMail />
            <p className="text-[13px]">Selecione uma mensagem para lê-la.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Cabeçalho ────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4 border-b border-[var(--glass-border-subtle,var(--glass-border))] flex-shrink-0">
        {/* Assunto */}
        <h2 className="font-display font-extrabold text-[18px] leading-snug tracking-[-0.2px] text-[var(--text-primary)] mb-3">
          {email.subject ?? "(sem assunto)"}
        </h2>

        {/* Meta: avatar + remetente + ações */}
        <div className="flex items-center gap-3">
          {/* Avatar com iniciais */}
          <AvatarInitials name={email.fromName} email={email.fromAddress} />

          {/* Nome + endereço */}
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-[13.5px] text-[var(--text-primary)] leading-tight truncate">
              {email.fromName ?? email.fromAddress}
            </p>
            <p className="text-[12px] text-[var(--text-muted)] leading-tight truncate">
              {email.fromName
                ? `${email.fromAddress} · para ${email.toAddress}`
                : `para ${email.toAddress}`}
            </p>
          </div>

          {/* Data */}
          <span className="text-[11.5px] text-[var(--text-muted)] shrink-0 hidden lg:block">
            {formatFullDate(email.receivedAt)}
          </span>

          {/* Ações */}
          <div className="flex gap-1.5 shrink-0">
            <IconBtn onClick={onReply} label="Responder"><IcoReply /></IconBtn>
            <IconBtn onClick={onForward} label="Encaminhar"><IcoForward /></IconBtn>
            <IconBtn onClick={onDelete} label="Excluir" danger><IcoTrash /></IconBtn>
          </div>
        </div>

        {/* Linha: contato vinculado */}
        {email.contact && (
          <div className="flex items-center gap-1.5 mt-2.5">
            <span className="text-[11px] text-[var(--text-muted)]">Contato:</span>
            <a
              href={`/contacts/${email.contact.id}`}
              className="inline-flex items-center gap-1 text-[12px] text-[var(--brand-primary)] hover:underline font-medium"
            >
              <IconUser size={12} />
              {email.contact.name}
              <IconExternalLink size={10} className="opacity-60" />
            </a>
          </div>
        )}
      </div>

      {/* ── Corpo ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-5 text-[14px] leading-[1.7] text-[var(--text-secondary)]">
        {email.bodyHtml ? (
          <HtmlEmailFrame html={email.bodyHtml} />
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-[14px] leading-[1.7]">
            {email.bodyText ? decodeIfQuotedPrintable(email.bodyText) : "(sem conteúdo)"}
          </pre>
        )}
      </div>

      {/* ── Rodapé ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-5 py-4 border-t border-[var(--glass-border-subtle,var(--glass-border))] flex-shrink-0">
        <button
          onClick={onReply}
          className="inline-flex items-center gap-1.5 font-display font-bold text-[13px] px-4 py-2 rounded-full bg-[var(--brand-primary)] text-white shadow-[0_4px_14px_rgba(91,111,245,0.35)] hover:bg-[var(--brand-primary-dark,#3d52e8)] hover:-translate-y-px transition-all"
        >
          <IcoReply /> Responder
        </button>
        <button
          onClick={onForward}
          className="inline-flex items-center gap-1.5 font-display font-bold text-[13px] px-4 py-2 rounded-full text-[var(--text-secondary)] hover:bg-black/5 transition-colors"
        >
          <IcoForward /> Encaminhar
        </button>
      </div>
    </div>
  );
}

// ── Subcomponentes ──────────────────────────────────────────────────────────
function AvatarInitials({ name, email }: { name: string | null; email: string }) {
  const initials = getInitials(name, email);
  return (
    <span className="w-[42px] h-[42px] rounded-full flex items-center justify-center bg-[var(--brand-secondary,#a78bfa)] text-white font-display font-bold text-[14px] shrink-0 select-none">
      {initials}
    </span>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  danger = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={[
        "w-[34px] h-[34px] rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] flex items-center justify-center transition-all",
        danger
          ? "text-[var(--text-secondary)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] hover:bg-[var(--glass-bg-strong)]"
          : "text-[var(--text-secondary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--glass-bg-strong)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
