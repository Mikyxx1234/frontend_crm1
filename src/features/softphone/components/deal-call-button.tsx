"use client";

import { IconPhone } from "@tabler/icons-react";
import { TooltipGlass } from "@/components/crm/tooltip-glass";
import { useDealDial } from "../hooks/use-deal-dial";
import { useCallsWidget } from "../hooks/use-calls-widget";

interface DealCallButtonProps {
  /** Opcional: no inbox a ligação pode ter só contato, sem negócio. */
  dealId?: string | null;
  phone: string | null;
  contactId?: string;
}

export function DealCallButton({ dealId, phone, contactId }: DealCallButtonProps) {
  // Gate por widget: se a org desinstalou a Telefonia em /widgets, o
  // botão some do card (espelha o comportamento do SoftphoneWidget).
  const callsWidget = useCallsWidget();
  const { dial, canDial, loading } = useDealDial({ dealId, phone, contactId });

  if (!phone) return null;
  if (callsWidget.enabled !== true) return null;

  return (
    <TooltipGlass label={canDial ? `Ligar ${phone}` : "Conecte o softphone"} side="left">
      <button
        type="button"
        disabled={!canDial || loading}
        onClick={dial}
        aria-label={`Ligar para ${phone}`}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/30 bg-[var(--color-success)]/10 text-[var(--color-success)] transition-colors hover:border-emerald-500/60 hover:bg-[var(--color-success)]/20 hover:text-[var(--color-success-text)] disabled:opacity-40 disabled:cursor-not-allowed v2-dark:text-emerald-400 v2-dark:hover:text-emerald-300"
      >
        <IconPhone size={18} stroke={2.1} />
      </button>
    </TooltipGlass>
  );
}
