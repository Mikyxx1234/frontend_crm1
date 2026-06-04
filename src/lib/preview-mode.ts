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
  // 1) Via env var explícita (build/runtime). NÃO ligar por NODE_ENV: localhost
  //    (`next dev`) também é "development" e precisa bater no backend real.
  //    `.trim()`: o painel do v0 às vezes salva "true\n", o que furava o match.
  if ((process.env.NEXT_PUBLIC_PREVIEW_MODE ?? "").trim().toLowerCase() === "true") {
    return true;
  }
  // 2) Fallback CLIENT por hostname do v0. CRÍTICO: sem isto, TODO o app
  //    (mocks, sessão fake, hooks v2) ficaria desligado no preview do v0 quando
  //    a env var não é inlinada no build — aí você "entra" mas é tratado como
  //    deslogado e volta pro login. NUNCA casa localhost nem produção.
  return isV0PreviewHost();
}

/**
 * Fallback CLIENT-ONLY: detecta os domínios de preview do v0.dev pelo hostname.
 *
 * Por quê: `NEXT_PUBLIC_PREVIEW_MODE` é inlinado em BUILD time. O sandbox do v0
 * às vezes injeta a var só no runtime, então o bundle do client fica com
 * `undefined` mesmo a variável "estando lá" — o middleware (que lê em runtime)
 * libera as rotas, mas o botão "Entrar (preview)" não renderiza.
 *
 * Esta checagem NUNCA casa `localhost`/`127.0.0.1` nem o domínio de produção
 * (Easypanel), então é seguro: só liga o botão dentro do próprio v0.dev.
 *
 * IMPORTANTE: usar apenas no client, dentro de `useEffect`/após mount, para não
 * gerar hydration mismatch (no SSR `window` é undefined).
 */
export function isV0PreviewHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return (
    host.endsWith(".vusercontent.net") ||
    host.endsWith(".v0.dev") ||
    host.endsWith(".v0.app") ||
    host.endsWith(".v0.build")
  );
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
