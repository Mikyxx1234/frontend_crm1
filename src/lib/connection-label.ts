/*
 * Helpers para exibir a CONEXÃO (Channel) por onde uma conversa/mensagem
 * trafega. Permite distinguir, na mesma conversa, contas distintas do mesmo
 * tipo de canal (ex.: dois números de WhatsApp da org).
 *
 * O backend expõe a conexão como `{ id, name, type, phoneNumber }`
 * (ConnectionRefDto em api/conversations/[id]/messages/route.ts e no
 * channelRef das conversas do contato).
 */

export interface ConnectionRef {
  id: string;
  name: string;
  /** Tipo do canal (enum ChannelType do backend: WHATSAPP, INSTAGRAM, ...). */
  type?: string | null;
  phoneNumber?: string | null;
}

/** Rótulo amigável do TIPO de canal (ex.: "WhatsApp", "Instagram"). */
export function channelTypeLabel(type?: string | null): string {
  switch ((type ?? "").toUpperCase()) {
    case "WHATSAPP":
      return "WhatsApp";
    case "INSTAGRAM":
      return "Instagram";
    case "FACEBOOK":
      return "Messenger";
    case "EMAIL":
      return "E-mail";
    case "WEBCHAT":
      return "Webchat";
    default:
      return "Canal";
  }
}

/** Formata o número da conexão (best-effort, sem libs externas). */
export function formatConnectionPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return phone;
  // BR: +55 (DD) 9XXXX-XXXX
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4);
    const mid = rest.length === 9 ? `${rest.slice(0, 5)}-${rest.slice(5)}` : `${rest.slice(0, 4)}-${rest.slice(4)}`;
    return `+55 (${ddd}) ${mid}`;
  }
  return `+${digits}`;
}

/**
 * Rótulo completo: "WhatsApp · Vendas SP · +55 (11) 9..." — omite partes
 * ausentes. Usado no header do chat e no marcador de troca de conexão.
 */
export function formatConnectionLabel(ref: ConnectionRef | null | undefined): string {
  if (!ref) return "";
  const parts: string[] = [channelTypeLabel(ref.type)];
  if (ref.name && ref.name.trim()) parts.push(ref.name.trim());
  const phone = formatConnectionPhone(ref.phoneNumber);
  if (phone) parts.push(phone);
  return parts.join(" · ");
}

/** Rótulo curto: apelido da conexão ou número (para chips compactos). */
export function formatConnectionShort(ref: ConnectionRef | null | undefined): string {
  if (!ref) return "";
  if (ref.name && ref.name.trim()) return ref.name.trim();
  return formatConnectionPhone(ref.phoneNumber) ?? channelTypeLabel(ref.type);
}
