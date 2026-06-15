"use client";

import Link from "next/link";
import {
  IconArrowRight,
  IconMessageCircle,
  IconPencil,
  IconShieldCheck,
  IconSignature,
} from "@tabler/icons-react";

import { useUserRole } from "@/hooks/use-user-role";
import { RestrictedScreen } from "@/components/crm/restricted-screen";
import { cn } from "@/lib/utils";
import {
  useConversationFeatures,
  useSaveConversationFeature,
  type ConversationFeatures,
} from "@/features/inbox-v2/hooks";
import { SettingsV2Shell } from "../_v2-shell";

// ─── Toggle row (DS v2 — card glass + ícone-quadrado) ───────────────────────

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start gap-[14px] rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] p-[14px] shadow-[var(--glass-shadow-sm)] backdrop-blur-md transition-all hover:bg-[var(--glass-bg-base)]">
      <div className="flex size-[38px] shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-base)] text-[var(--brand-primary)]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-[14px] font-bold text-[var(--text-primary)]">
          {label}
        </h3>
        <p className="mt-0.5 max-w-[560px] font-body text-[12.5px] leading-snug text-[var(--text-muted)]">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-[42px] shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--input-ring-focus)]",
          checked ? "bg-[var(--brand-primary)]" : "bg-black/[0.14]",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <span
          className={cn(
            "inline-block size-[18px] rounded-full bg-white shadow-[var(--glass-shadow-sm)] transition-transform",
            checked ? "translate-x-[21px]" : "translate-x-[3px]",
          )}
        />
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ConversationsSettingsClientPage() {
  const { role, isSuperAdmin, ready } = useUserRole();
  const isOrgAdmin = isSuperAdmin || role === "ADMIN";

  const { features, isLoading } = useConversationFeatures();
  const saveMutation = useSaveConversationFeature();

  function save(key: keyof ConversationFeatures, value: boolean) {
    saveMutation.mutate({ key, value });
  }

  if (ready && !isOrgAdmin) {
    return (
      <RestrictedScreen
        title="Acesso restrito"
        description="As configurações de conversas são gerenciadas apenas por administradores da organização."
      />
    );
  }

  return (
    <SettingsV2Shell
      title="Conversas"
      description="Funcionalidades das janelas de conversa"
      icon={<IconMessageCircle size={22} />}
    >
      <div className="flex flex-col gap-4">
        {/* ── Assinatura ──────────────────────────────────────────────── */}
        <section className="rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] p-[18px] shadow-[var(--glass-shadow)] backdrop-blur-md">
          <p className="mb-[14px] font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Assinatura do agente
          </p>
          <div className="flex flex-col gap-2.5">
            <ToggleRow
              icon={<IconSignature size={20} />}
              label="Permitir assinatura"
              description="Agentes podem assinar mensagens enviadas com seu nome, habilitado ou desabilitado individualmente no composer."
              checked={features.agentSignatureEnabled}
              onChange={(v) => save("agentSignatureEnabled", v)}
              disabled={isLoading || saveMutation.isPending}
            />
            <ToggleRow
              icon={<IconPencil size={20} />}
              label="Permitir edição da assinatura"
              description="Agentes podem personalizar o texto da assinatura. Quando desativado, somente o nome do perfil é utilizado."
              checked={features.agentSignatureEditable}
              onChange={(v) => save("agentSignatureEditable", v)}
              disabled={
                !features.agentSignatureEnabled ||
                isLoading ||
                saveMutation.isPending
              }
            />
          </div>
        </section>

        {/* ── Atalho para Permissões ──────────────────────────────────── */}
        <Link
          href="/settings/permissions?tab=roles"
          className="group flex items-center gap-[14px] rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] p-[18px] shadow-[var(--glass-shadow)] backdrop-blur-md transition-all hover:-translate-y-px hover:border-[var(--brand-primary)] hover:shadow-[var(--shadow-brand)]"
        >
          <div className="flex size-[42px] shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] text-[var(--brand-primary)]">
            <IconShieldCheck size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[14px] font-bold text-[var(--text-primary)]">
              Permissões de mensageria
            </h3>
            <p className="mt-0.5 max-w-[640px] font-body text-[12.5px] leading-snug text-[var(--text-muted)]">
              As permissões de conversas, canais, templates e campanhas foram
              unificadas com as demais. Gerencie tudo em{" "}
              <strong className="text-[var(--text-secondary)]">
                Configurações › Permissões
              </strong>
              .
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3.5 py-2 font-display text-[12.5px] font-bold text-[var(--brand-primary)] transition-colors group-hover:bg-[var(--brand-primary)] group-hover:text-white">
            Gerenciar permissões
            <IconArrowRight size={14} />
          </span>
        </Link>
      </div>
    </SettingsV2Shell>
  );
}
