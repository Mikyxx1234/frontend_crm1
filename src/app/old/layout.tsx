import DashboardShell from "@/components/layout/dashboard-shell";

// Migração v1→v2: todas as rotas `/old/*` serão removidas na Fase 6. Várias
// páginas legadas usam `useSearchParams()` dentro de Client Components sem
// Suspense, o que quebra o prerender estático do Next 15. Forçar `dynamic`
// neste layout evita o erro em todo o ramo legado sem reescrever a UI v1.
export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
