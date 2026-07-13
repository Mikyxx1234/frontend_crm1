"use client";

import { useChatTheme } from "@/hooks/use-chat-theme";

/**
 * Client wrapper que aplica `data-chat-theme` no `<html>` conforme a
 * preferência salva do usuário (`GET /api/profile → chatTheme`).
 *
 * Fica dentro do `(app)/layout.tsx` — todas as rotas autenticadas passam
 * por aqui, então basta sincronizar o atributo no root uma vez que todos
 * os componentes que consomem `--chat-bubble-*` reagem automaticamente.
 */
export function ChatThemeApplier() {
  useChatTheme();
  return null;
}
