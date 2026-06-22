"use client";

import { useCallback, useEffect, useState } from "react";

import {
  createEmailRule,
  deleteEmailRule,
  listEmailRules,
  updateEmailRule,
} from "../api/rules";
import type { EmailRule, EmailRuleInput } from "../api/types";

export function useEmailRules(accountId?: string) {
  const [rules, setRules] = useState<EmailRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listEmailRules(accountId);
      setRules(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar regras.");
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => { void reload(); }, [reload]);

  const create = useCallback(async (input: EmailRuleInput) => {
    const rule = await createEmailRule(input);
    setRules((prev) => [...prev, rule]);
    return rule;
  }, []);

  const update = useCallback(async (id: string, input: Partial<EmailRuleInput>) => {
    const rule = await updateEmailRule(id, input);
    setRules((prev) => prev.map((r) => (r.id === id ? rule : r)));
    return rule;
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteEmailRule(id);
    setRules((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { rules, loading, error, reload, create, update, remove };
}
