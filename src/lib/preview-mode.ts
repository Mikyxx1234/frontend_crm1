/**
 * PREVIEW MODE
 *
 * Bypass de autenticação para ambientes de preview do v0.dev / sandbox onde
 * cookies cross-origin são bloqueados (cookies `__Host-` / `__Secure-` com
 * `SameSite=Lax` só persistem no domínio que os emite — produção).
 *
 * Ativa SOMENTE quando `NEXT_PUBLIC_PREVIEW_MODE=true` no build.
 * Em produção NUNCA deve estar ligado — fazendo isso, qualquer um navega
 * todas as telas sem login.
 *
 * Usado por:
 *  - middleware.ts (libera todas as rotas)
 *  - app/(auth)/login/client-page.tsx (botão "Entrar (preview)" → /dashboard)
 */

export function isPreviewMode(): boolean {
  return (process.env.NEXT_PUBLIC_PREVIEW_MODE ?? "").toLowerCase() === "true";
}

/** User mockado retornado quando preview mode está ativo. */
export const PREVIEW_USER = {
  id: "preview-user",
  name: "Preview",
  email: "preview@example.com",
  role: "OWNER" as const,
  organizationId: "preview-org",
  isSuperAdmin: false,
};
