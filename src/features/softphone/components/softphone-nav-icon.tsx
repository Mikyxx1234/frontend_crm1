"use client";

/**
 * Ícone de telefonia na NavRail — sob o status do agente (wifi) quando a
 * rail está colapsada; ao lado com pipe quando expandida. Sem badge/ping
 * (o softphone idle sai do canto; chamadas ativas ficam no SoftphoneWidget).
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { IconPhoneFilled } from "@tabler/icons-react";

import { DockButton } from "@/components/crm/floating-dock";
import { cn } from "@/lib/utils";
import { useSoftphone } from "../hooks/use-softphone";
import { useCallsWidget } from "../hooks/use-calls-widget";
import { getMyCredentials } from "../api/extensions";

/** Evento pra o SoftphoneWidget expandir o chip de detalhes (ramal / erro). */
export const SOFTPHONE_EXPAND_EVENT = "crm:softphone-expand";

export function requestSoftphoneExpand() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SOFTPHONE_EXPAND_EVENT));
}

export function SoftphoneNavIcon({
  expanded = false,
  /** Inclui o `|` à esquerda (só renderiza o grupo se o softphone estiver ativo). */
  withPipe = false,
  className,
}: {
  expanded?: boolean;
  withPipe?: boolean;
  className?: string;
}) {
  const { status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";
  const callsWidget = useCallsWidget(isAuthenticated);

  const credentialsQuery = useQuery({
    queryKey: ["softphone", "credentials"],
    queryFn: getMyCredentials,
    enabled: isAuthenticated && callsWidget.enabled === true,
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const softphone = useSoftphone();

  React.useEffect(() => {
    if (!credentialsQuery.data) return;
    if (softphone.status === "disconnected") {
      void softphone.connect();
    }
  }, [credentialsQuery.data, softphone.status, softphone]);

  if (!isAuthenticated) return null;
  if (callsWidget.enabled !== true) return null;
  if (credentialsQuery.isLoading || credentialsQuery.isError || !credentialsQuery.data) {
    return null;
  }

  const ramal = credentialsQuery.data.authUser;
  const isError = softphone.status === "error";
  const isConnecting =
    softphone.status === "connecting" || softphone.status === "disconnected";
  const isConnected =
    softphone.status === "registered" ||
    softphone.status === "call_ringing" ||
    softphone.status === "call_active" ||
    softphone.status === "call_held";

  const title = isError
    ? `Softphone: erro — ${softphone.error ?? "falha"}`
    : isConnecting
      ? "Softphone: conectando…"
      : `Softphone • Ramal ${ramal}`;

  // Verde = registrado/em chamada; cinza = offline/conectando; vermelho = erro.
  const toneClass = isError
    ? "text-[var(--color-danger)] hover:text-[var(--color-danger)]"
    : isConnected
      ? "text-[var(--color-success)] hover:text-[var(--color-success)]"
      : "text-[var(--color-offline,#64748b)] hover:text-[var(--color-offline,#64748b)]";

  const icon = <IconPhoneFilled size={20} className={toneClass} />;

  // Rail colapsada: mesmo tile 44×44 dos demais ícones (cabe em 72px).
  if (!expanded) {
    return (
      <DockButton
        title={title}
        onClick={requestSoftphoneExpand}
        disablePop
        className={cn(toneClass, className)}
      >
        {icon}
      </DockButton>
    );
  }

  const phoneBtn = (
    <button
      type="button"
      onClick={requestSoftphoneExpand}
      aria-label={title}
      title={title}
      className={cn(
        "inline-flex shrink-0 items-center justify-center transition-colors",
        toneClass,
        className,
      )}
    >
      {icon}
    </button>
  );

  if (!withPipe) return phoneBtn;

  return (
    <>
      <span
        className="shrink-0 select-none text-[13px] leading-none text-[var(--nav-text-muted)]/45"
        aria-hidden
      >
        |
      </span>
      {phoneBtn}
    </>
  );
}
