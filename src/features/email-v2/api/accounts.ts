import { apiUrl } from "@/lib/api";
import type { EmailAccount, ConnectEmailInput, ApiFieldError } from "./types";

export async function listEmailAccounts(): Promise<EmailAccount[]> {
  const res = await fetch(apiUrl("/api/email-accounts"));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? "Erro ao listar contas.");
  return (data.accounts ?? []) as EmailAccount[];
}

export async function testEmailConnection(
  input: ConnectEmailInput,
): Promise<{ ok: true } | ApiFieldError> {
  const res = await fetch(apiUrl("/api/email-accounts/test"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json().catch(() => ({ ok: false, field: "email", message: "Erro inesperado." }));
}

export async function connectEmailAccount(
  input: ConnectEmailInput,
): Promise<{ ok: true; account: EmailAccount } | ApiFieldError> {
  const res = await fetch(apiUrl("/api/email-accounts"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json().catch(() => ({ ok: false, field: "email", message: "Erro inesperado." }));
}

export async function disconnectEmailAccount(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/email-accounts/${id}`), { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? "Erro ao desconectar conta.");
  }
}

export async function syncEmailAccount(
  id: string,
): Promise<{ synced: number; skipped: number; errors: number }> {
  const res = await fetch(apiUrl(`/api/email-accounts/${id}/sync`), { method: "POST" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? "Erro ao sincronizar.");
  return data;
}
