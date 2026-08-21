import { apiUrl } from "@/lib/api";
import type { CallPermissionTemplate } from "@/components/inbox/call-permission-template-dialog";

export const CALL_PERMISSION_TPL_STORAGE = "wa_call_permission_tpl";

export async function fetchCallPermissionTemplates(): Promise<CallPermissionTemplate[]> {
  const r = await fetch(apiUrl("/api/meta/whatsapp/call-permission-templates"));
  if (!r.ok) return [];
  const j = (await r.json().catch(() => ({}))) as { items?: CallPermissionTemplate[] };
  return Array.isArray(j.items) ? j.items : [];
}

export async function sendCallPermissionTemplate(args: {
  conversationId: string;
  templateName: string;
  tpl?: CallPermissionTemplate;
}): Promise<{ pending?: boolean; reopenedConversationId?: string }> {
  const r = await fetch(apiUrl("/wa-call-permission"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversationId: args.conversationId,
      templateName: args.templateName,
      languageCode: args.tpl?.language || "pt_BR",
      bodyText: args.tpl?.bodyText,
      headerText: args.tpl?.headerText,
      footerText: args.tpl?.footerText,
      buttons: args.tpl?.buttons,
    }),
  });
  const j = (await r.json().catch(() => ({}))) as {
    message?: string;
    pending?: boolean;
    reopenedConversationId?: string;
  };
  if (!r.ok) {
    const fromApi = typeof j.message === "string" ? j.message.trim() : "";
    throw new Error(
      fromApi ||
        (r.status === 502 || r.status === 504
          ? "O servidor não respondeu a tempo ao enviar o template. Tente novamente."
          : "Erro ao enviar solicitação"),
    );
  }
  try {
    sessionStorage.setItem(CALL_PERMISSION_TPL_STORAGE, args.templateName);
  } catch {
    /* ignore */
  }
  return j;
}
