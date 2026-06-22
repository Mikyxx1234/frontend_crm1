"use client";

import { useState, useEffect, useCallback } from "react";
import type { EmailAccount } from "../api/types";
import { listEmailAccounts, disconnectEmailAccount, syncEmailAccount } from "../api/accounts";

export function useEmailAccounts() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listEmailAccounts();
      setAccounts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar contas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const disconnect = useCallback(async (id: string) => {
    await disconnectEmailAccount(id);
    await load();
  }, [load]);

  const sync = useCallback(async (id: string) => {
    const result = await syncEmailAccount(id);
    await load();
    return result;
  }, [load]);

  return { accounts, loading, error, reload: load, disconnect, sync };
}
