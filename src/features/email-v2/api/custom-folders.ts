import { apiUrl } from "@/lib/api";
import type { EmailCustomFolder } from "./types";

export async function listEmailCustomFolders(accountId?: string): Promise<EmailCustomFolder[]> {
  const q = accountId ? `?accountId=${encodeURIComponent(accountId)}` : "";
  const res = await fetch(apiUrl(`/api/email-custom-folders${q}`));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? "Erro ao listar pastas.");
  return (data.folders ?? []) as EmailCustomFolder[];
}

export async function createEmailCustomFolder(input: {
  accountId: string;
  name: string;
  color?: string | null;
}): Promise<EmailCustomFolder> {
  const res = await fetch(apiUrl("/api/email-custom-folders"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? "Erro ao criar pasta.");
  return data.folder as EmailCustomFolder;
}

export async function renameEmailCustomFolder(
  id: string,
  input: { name?: string; color?: string | null },
): Promise<EmailCustomFolder> {
  const res = await fetch(apiUrl(`/api/email-custom-folders/${id}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? "Erro ao renomear pasta.");
  return data.folder as EmailCustomFolder;
}

export async function deleteEmailCustomFolder(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/email-custom-folders/${id}`), { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message ?? "Erro ao remover pasta.");
  }
}
