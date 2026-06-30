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
        className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-emerald-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <IconPhone size={14} stroke={2.2} />
      </button>
    </TooltipGlass>
  );
}
