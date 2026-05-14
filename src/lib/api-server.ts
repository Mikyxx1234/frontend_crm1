/**
 * Fetch SSR-friendly contra o backend, repassando cookies da request
 * atual pra autenticar. Use em Server Components que precisam de dados
 * frescos no SSR.
 *
 * Diferente do `fetch` direto no `/api/...` (que funciona em RSC graças
 * ao rewrite no `next.config.ts`), aqui usamos a URL absoluta do backend
 * (`NEXT_PUBLIC_API_BASE_URL`). Isso garante que mesmo se o rewrite for
 * desabilitado por algum motivo, ainda funcione no SSR.
 *
 * IMPORTANTE: chame só de Server Components / Route Handlers / Server
 * Actions. Em client components use `apiUrl()` + fetch normal.
 */
// Não importamos "server-only" porque ele não está nas deps do frontend.
// O fato de importar `next/headers` já garante que este módulo só
// pode ser usado em Server Components / Route Handlers / Server Actions
// (Next quebra em runtime se chamado de client component).
import { cookies, headers } from "next/headers";

export function backendBase(): string {
  const v = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim().replace(/\/$/, "");
  if (!v) throw new Error("NEXT_PUBLIC_API_BASE_URL não configurado");
  return v;
}

export async function apiServerFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const base = backendBase();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  // Encaminha o cookie da request atual pra autenticar com a sessão.
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  // Passa o user-agent original pra logs do backend manterem rastreabilidade.
  const h = await headers();
  const ua = h.get("user-agent") ?? "crm-frontend-ssr";

  const finalInit: RequestInit = {
    ...init,
    headers: {
      ...(init.headers as Record<string, string> | undefined),
      cookie: cookieHeader,
      "user-agent": ua,
      accept: "application/json",
    },
    cache: "no-store",
  };

  return fetch(url, finalInit);
}

/**
 * Wrapper conveniente para GET. Retorna o body já parseado ou null se 401/404.
 * Em outros erros, lança.
 */
export async function apiServerGet<T = unknown>(path: string): Promise<T | null> {
  const res = await apiServerFetch(path, { method: "GET" });
  if (res.status === 401 || res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`apiServerGet ${path}: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}
