"use client";

import { useCallback, useEffect, useState } from "react";

import {
  createEmailCustomFolder,
  deleteEmailCustomFolder,
  listEmailCustomFolders,
  renameEmailCustomFolder,
} from "../api/custom-folders";
import type { EmailCustomFolder } from "../api/types";

/**
 * Hook que gerencia as pastas customizadas. Quando `accountId` é informado
 * filtra apenas pastas daquela conta; caso contrário traz todas (útil pra
 * "Caixa combinada").
 */
export function useEmailCustomFolders(accountId?: string) {
  const [folders, setFolders] = useState<EmailCustomFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listEmailCustomFolders(accountId);
      setFolders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar pastas.");
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => { void reload(); }, [reload]);

  const create = useCallback(
    async (input: { accountId: string; name: string; color?: string | null }) => {
      const folder = await createEmailCustomFolder(input);
      setFolders((prev) => [...prev, folder]);
      return folder;
    },
    [],
  );

  const rename = useCallback(
    async (id: string, input: { name?: string; color?: string | null }) => {
      const updated = await renameEmailCustomFolder(id, input);
      setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, ...updated } : f)));
      return updated;
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    await deleteEmailCustomFolder(id);
    setFolders((prev) => prev.filter((f) => f.id !== id));
  }, []);

  return { folders, loading, error, reload, create, rename, remove };
}
