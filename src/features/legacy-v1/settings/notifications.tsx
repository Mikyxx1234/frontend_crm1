"use client";

import { IconBell as Bell, IconBellOff as BellOff, IconCheck as Check, IconLoader2 as Loader2, IconDeviceMobile as Smartphone, IconX as X } from "@tabler/icons-react";

import { ButtonGlass } from "@/components/crm/button-glass";
import { GlassCard } from "@/components/crm/glass-card";
import { usePushSubscription } from "@/hooks/use-push-subscription";
import { cn } from "@/lib/utils";

/**
 * /settings/notifications — pagina central de preferencias de
 * push notifications.
 *
 * Mostra:
 *  - Estado atual (suportado, permissao, subscrito).
 *  - Botao toggle ativar/desativar.
 *  - Estado do dispositivo (browser, standalone, etc).
 *  - Avisos quando algo nao esta disponivel (browser antigo,
 *    permissao bloqueada, etc).
 */
export default function NotificationsSettingsPage() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  } = usePushSubscription();

  const isBlocked = permission === "denied";
  const canToggle = isSupported && !isBlocked && !isLoading;

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <div className="space-y-4">
      <GlassCard variant="overlay" className="p-8">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-2xl text-white",
              isSubscribed
                ? "bg-[var(--color-success)] shadow-green-glow"
                : "bg-cyan-500 shadow-[var(--shadow-lavender-glow)]",
            )}
          >
            {isSubscribed ? (
              <Bell className="size-5" strokeWidth={2.4} />
            ) : (
              <BellOff className="size-5" strokeWidth={2.4} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-extrabold tracking-tight text-[var(--text-primary)]">
              Notificações push neste dispositivo
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {isSubscribed
                ? "Você receberá um aviso instantâneo aqui sempre que um cliente responder, mesmo com o app fechado."
                : "Ative para receber novos contatos em tempo real, sem precisar abrir o EduIT."}
            </p>

            {!isSupported && (
              <Alert
                kind="warn"
                title="Navegador sem suporte"
                description="Este navegador não tem Web Push. Use Chrome, Edge, Firefox, Brave ou Safari atualizado para receber notificações."
              />
            )}

            {isSupported && isBlocked && (
              <Alert
                kind="warn"
                title="Permissão bloqueada"
                description="Você ou o sistema bloquearam notificações. Abra as configurações do navegador (cadeado na barra de endereço) e permita notificações para o EduIT."
              />
            )}

            {error && (
              <Alert
                kind="error"
                title="Algo deu errado"
                description={`Detalhe técnico: ${error}. Tente recarregar a página.`}
              />
            )}

            <div className="mt-5 flex items-center gap-3">
              <ButtonGlass
                type="button"
                onClick={handleToggle}
                disabled={!canToggle}
                variant={isSubscribed ? "glass" : "primary"}
                className="h-11 px-5 text-sm font-bold"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" strokeWidth={2.4} />
                ) : isSubscribed ? (
                  <BellOff className="size-4" strokeWidth={2.4} />
                ) : (
                  <Bell className="size-4" strokeWidth={2.4} />
                )}
                {isLoading
                  ? "Aguarde…"
                  : isSubscribed
                    ? "Desativar notificações"
                    : "Ativar notificações"}
              </ButtonGlass>

              <StatusChip
                label={isSubscribed ? "Ativo" : "Inativo"}
                ok={isSubscribed}
              />
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard variant="overlay" className="p-8">
        <h2 className="font-display text-lg font-extrabold tracking-tight text-[var(--text-primary)]">
          Sobre o aplicativo
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Para receber notificações no celular como um app nativo,
          instale o EduIT na tela inicial.
        </p>

        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[var(--glass-bg-subtle)] p-4">
          <Smartphone className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="text-sm text-[var(--text-muted)]">
            <p className="font-bold text-[var(--text-secondary)]">Como instalar</p>
            <ul className="mt-2 space-y-1.5 text-[13px]">
              <li>
                <span className="font-semibold text-[var(--text-primary)]">
                  Android (Chrome / Edge):
                </span>{" "}
                toque em ⋮ → &quot;Instalar app&quot; ou aceite o banner de
                instalação que aparece no rodapé.
              </li>
              <li>
                <span className="font-semibold text-[var(--text-primary)]">
                  iPhone (Safari):
                </span>{" "}
                toque em Compartilhar → &quot;Adicionar à Tela de Início&quot;.
              </li>
              <li>
                <span className="font-semibold text-[var(--text-primary)]">Desktop:</span>{" "}
                ícone de instalação (⊕) na barra de endereço, ao lado do cadeado.
              </li>
            </ul>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function Alert({
  kind,
  title,
  description,
}: {
  kind: "warn" | "error" | "info";
  title: string;
  description: string;
}) {
  const styles = {
    warn: {
      bg: "bg-[color-mix(in_srgb,var(--color-warning)_10%,transparent)] border-[var(--color-warning)]/30",
      text: "text-[var(--color-warning)]",
      title: "text-[var(--color-warning)]",
    },
    error: {
      bg: "bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)] border-[var(--color-danger)]/30",
      text: "text-[var(--color-danger)]",
      title: "text-[var(--color-danger)]",
    },
    info: {
      bg: "bg-[color-mix(in_srgb,var(--color-info)_10%,transparent)] border-[var(--color-info)]/30",
      text: "text-[var(--color-info)]",
      title: "text-[var(--color-info)]",
    },
  }[kind];

  return (
    <div
      className={cn(
        "mt-4 flex items-start gap-2.5 rounded-xl border p-3",
        styles.bg,
      )}
    >
      <div className="min-w-0">
        <p className={cn("text-[13px] font-bold", styles.title)}>{title}</p>
        <p className={cn("mt-0.5 text-[12px] font-medium", styles.text)}>
          {description}
        </p>
      </div>
    </div>
  );
}

function StatusChip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-full px-2.5",
        "text-[11px] font-semibold uppercase tracking-[0.14em]",
        ok
          ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
          : "bg-[var(--glass-bg-strong)] text-[var(--text-muted)]",
      )}
    >
      {ok ? (
        <Check className="size-3" strokeWidth={3} />
      ) : (
        <X className="size-3" strokeWidth={3} />
      )}
      {label}
    </span>
  );
}
