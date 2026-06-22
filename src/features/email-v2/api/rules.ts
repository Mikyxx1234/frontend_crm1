import { apiUrl } from "@/lib/api";
import type { EmailRule, EmailRuleInput } from "./types";

export async function listEmailRules(accountId?: string): Promise<EmailRule[]> {
  const q = accountId ? `?accountId=${encodeURIComponent(accountId)}` : "";
  const res = await fetch(apiUrl(`/api/email-rules${q}`));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? "Erro ao listar regras.");
  return (data.rules ?? []) as EmailRule[];
}

export async function createEmailRule(input: EmailRuleInput): Promise<EmailRule> {
  const res = await fetch(apiUrl("/api/email-rules"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? "Erro ao criar regra.");
  return data.rule as EmailRule;
}

export async function updateEmailRule(
  id: string,
  input: Partial<EmailRuleInput>,
): Promise<EmailRule> {
  const res = await fetch(apiUrl(`/api/email-rules/${id}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? "Erro ao atualizar regra.");
  return data.rule as EmailRule;
}

export async function deleteEmailRule(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/email-rules/${id}`), { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? "Erro ao remover regra.");
  }
}
