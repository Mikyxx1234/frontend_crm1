import { formatDistanceToNow, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatRelativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const date = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  } catch {
    return "";
  }
}

export function formatFullDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const date = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
    return format(date, "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return "";
  }
}
