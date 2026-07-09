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
        className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_4px_14px_rgba(16,185,129,0.45)] ring-4 ring-emerald-500/15 transition-all hover:bg-emerald-600 hover:shadow-[0_6px_18px_rgba(16,185,129,0.55)] hover:ring-emerald-500/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:ring-0"
      >
        <IconPhone size={18} stroke={2.4} />
      </button>
    </TooltipGlass>
  );
}
