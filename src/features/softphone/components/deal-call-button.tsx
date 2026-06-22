"use client";

import { IconPhone } from "@tabler/icons-react";
import { TooltipGlass } from "@/components/crm/tooltip-glass";
import { useDealDial } from "../hooks/use-deal-dial";

interface DealCallButtonProps {
  dealId: string;
  phone: string | null;
  contactId?: string;
}

export function DealCallButton({ dealId, phone, contactId }: DealCallButtonProps) {
  const { dial, canDial, loading } = useDealDial({ dealId, phone, contactId });

  if (!phone) return null;

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
