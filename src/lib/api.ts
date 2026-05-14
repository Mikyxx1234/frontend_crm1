/**
 * Base URL do backend separado.
 *
 * NOTA: este helper é exposto APENAS para os poucos casos que precisam
 * de URL absoluta (ex.: abrir um WebSocket, montar um link externo). Para
 * fetches normais em client components, use `apiUrl()` e deixe o rewrite
 * do Next (`next.config.ts > rewrites()`) cuidar do proxy — assim a
 * chamada fica same-origin com o domínio do frontend e o cookie de
 * sessão (SameSite=Lax) viaja junto, sem precisar de CORS no backend.
 */
export function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim().replace(/\/$/, "");
}

/**
 * Retorna o path relativo (ex.: `/api/deals`) para uso em `fetch` de
 * client components. O rewrite do `next.config.ts` mapeia `/api/*` pro
 * backend separado em runtime, mantendo a chamada same-origin com o
 * frontend — necessário para que o browser anexe o cookie `authjs.session-token`
 * (SameSite=Lax não viaja em fetches cross-site).
 *
 * Para chamadas SSR / Route Handler / Server Action, use `apiServerFetch`
 * de `@/lib/api-server` (URL absoluta + cookies forward).
 */
export function apiUrl(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}
