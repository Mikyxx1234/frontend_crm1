import { apiUrl } from "@/lib/api";
import type {
  SupportMessage,
  SupportMeta,
  SupportScope,
  SupportTicket,
} from "./types";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? "Erro na requisição de suporte.");
  }
  return res.json() as Promise<T>;
}

export async function getSupportMeta(): Promise<SupportMeta> {
  return json(await fetch(apiUrl("/api/support/meta")));
}

export async function listSupportTickets(
  scope: SupportScope,
): Promise<SupportTicket[]> {
  return json(await fetch(apiUrl(`/api/support/tickets?scope=${scope}`)));
}

export async function createSupportTicket(input: {
  category: string;
  description: string;
}): Promise<SupportTicket> {
  return json(
    await fetch(apiUrl("/api/support/tickets"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function getSupportTicket(id: string): Promise<SupportTicket> {
  return json(await fetch(apiUrl(`/api/support/tickets/${id}`)));
}

export async function listSupportMessages(
  ticketId: string,
): Promise<SupportMessage[]> {
  return json(await fetch(apiUrl(`/api/support/tickets/${ticketId}/messages`)));
}

export async function sendSupportMessage(
  ticketId: string,
  content: string,
): Promise<SupportMessage> {
  return json(
    await fetch(apiUrl(`/api/support/tickets/${ticketId}/messages`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }),
  );
}

export async function claimSupportTicket(ticketId: string): Promise<SupportTicket> {
  return json(
    await fetch(apiUrl(`/api/support/tickets/${ticketId}/claim`), {
      method: "POST",
    }),
  );
}

export async function resolveSupportTicket(
  ticketId: string,
): Promise<SupportTicket> {
  return json(
    await fetch(apiUrl(`/api/support/tickets/${ticketId}/resolve`), {
      method: "POST",
    }),
  );
}
