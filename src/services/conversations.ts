/**
 * Stub no frontend. Re-exporta apenas os tipos que componentes UI precisam
 * para tipar props e resultados do `/api/conversations` (que roda no backend).
 *
 * MANTENHA EM SINCRONIA com `crm-backend/src/services/conversations.ts` se
 * tipos novos forem expostos via API.
 */

export type InboxCategoryTab =
  | "meus"
  | "nao_atribuidos"
  | "bot"
  | "todos_admin"
  | "outros_agentes"
  | "minha_equipe";

export type InboxTab = InboxCategoryTab | "todos";
