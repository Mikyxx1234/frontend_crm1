"use client";

import { useCallback, useState } from "react";
import { useSoftphone } from "./use-softphone";

interface UseDealDialOptions {
  /** Opcional: ligações do inbox podem ter só contato, sem negócio. */
  dealId?: string | null;
  phone: string | null;
  contactId?: string;
}

export function useDealDial({ dealId, phone, contactId }: UseDealDialOptions) {
  const softphone = useSoftphone();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDial = !!phone && softphone.isConnected && softphone.status === "registered";

  const dial = useCallback(async () => {
    if (!phone || !softphone.isConnected) {
      setError("Softphone não conectado ou telefone ausente.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (softphone.status !== "registered") {
        await softphone.connect();
      }
      softphone.dial(phone, { dealId: dealId ?? undefined, contactId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao discar");
    } finally {
      setLoading(false);
    }
  }, [phone, dealId, contactId, softphone]);

  return { dial, canDial, loading, error };
}
