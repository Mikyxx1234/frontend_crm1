/**
 * Base URL do backend (Easypanel ou dev local).
 * Ex.: https://api.seudominio.com ou http://localhost:3001
 */
export function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim().replace(/\/$/, "");
}

/**
 * Monta URL absoluta para o backend. `path` deve começar com `/` (ex. `/api/deals`).
 * Em SSR, usa a mesma env; sem env definida, retorna o path relativo (útil só se houver rewrite).
 */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = getApiBaseUrl();
  if (!base) return p;
  return `${base}${p}`;
}
