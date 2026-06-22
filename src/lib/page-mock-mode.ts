import { isPreviewMode } from "@/lib/preview-mode";

/**
 * Modo mock de páginas operacionais (logs, calls, activities, distribution, campaigns…).
 *
 * Ativação:
 *   - preview v0 (`NEXT_PUBLIC_PREVIEW_MODE` / hostname v0)
 *   - env `NEXT_PUBLIC_MOCK_PAGES=1`
 *   - URL `?mock=1` (persiste em localStorage `page-mock`)
 *   - console `localStorage.setItem("page-mock","1")`
 */
export function isPageMockMode(): boolean {
  if (isPreviewMode()) return true;
  if (process.env.NEXT_PUBLIC_MOCK_PAGES === "1") return true;
  if (typeof window === "undefined") return false;
  try {
    const qs = new URLSearchParams(window.location.search).get("mock");
    if (qs === "1") {
      window.localStorage.setItem("page-mock", "1");
      return true;
    }
    if (qs === "0") {
      window.localStorage.removeItem("page-mock");
      return false;
    }
    return (
      window.localStorage.getItem("page-mock") === "1" ||
      window.localStorage.getItem("dir-mock") === "1"
    );
  } catch {
    return false;
  }
}

/** Exibe dados de demonstração quando a API não retornou itens (sem filtros ativos). */
export function shouldAutoDemoEmpty(opts: {
  realCount: number;
  hasFilters: boolean;
  isLoading: boolean;
  /** Quando true, também demonstra em falha de API (útil em dev sem backend). */
  isError?: boolean;
  forceDemo?: boolean;
}): boolean {
  if (opts.forceDemo || isPageMockMode()) return !opts.hasFilters;
  if (opts.hasFilters || opts.isLoading) return false;
  if (opts.realCount > 0) return false;
  return opts.isError === true || opts.realCount === 0;
}
