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
  // SOMENTE via env var explícita. NÃO ligar por NODE_ENV: localhost (`next dev`)
  // tambem e "development" e precisa bater no backend real de producao. O sandbox
  // do v0 deve setar NEXT_PUBLIC_PREVIEW_MODE=true no env do build.
  return (process.env.NEXT_PUBLIC_PREVIEW_MODE ?? "").toLowerCase() === "true";
}

/** User mockado retornado quando preview mode está ativo. */
export const PREVIEW_USER = {
  id: "u-marcelo",
  name: "Marcelo Santos",
  email: "marcelo@eduit.com.br",
  role: "OWNER" as const,
  organizationId: "preview-org",
  isSuperAdmin: false,
};
