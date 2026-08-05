import { redirect } from "next/navigation";

import { NativeRootGate } from "@/components/layout/native-root-gate";
import { auth } from "@/lib/auth-public";
import { LandingClient } from "./landing-client";

/**
 * Raiz pública. No frontend separado decidimos só com a session (JWT):
 *  - Não logado (web): landing com form de signup.
 *  - Não logado (APK): redireciona para /login (NativeRootGate).
 *  - `?cadastro=empresa`: força a landing mesmo no APK (link "cadastre sua empresa").
 *  - Logado com organizationId: vai pro dashboard.
 *  - Logado sem organizationId mas super-admin: painel /admin.
 */
export default async function RootPage({
  searchParams,
}: {
  searchParams?: Promise<{ cadastro?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    const u = session.user as {
      id: string;
      organizationId?: string | null;
      isSuperAdmin?: boolean;
    };
    if (u.isSuperAdmin && !u.organizationId) {
      redirect("/admin/organizations");
    }
    if (u.organizationId) {
      redirect("/dashboard");
    }
  }

  const sp = (await searchParams) ?? {};
  if (sp.cadastro === "empresa") {
    return <LandingClient />;
  }

  return <NativeRootGate />;
}
