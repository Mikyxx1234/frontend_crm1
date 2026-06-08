"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import type { AppUserRole } from "@/lib/auth-types";

export interface UserRoleInfo {
  role: AppUserRole | null;
  isSuperAdmin: boolean;
  /** ADMIN ou MANAGER (ou super-admin) — acesso de gestão. */
  isManagerUp: boolean;
  /** A sessão já resolveu (status !== "loading"). */
  ready: boolean;
}

/**
 * Fonte única do papel do usuário no client, derivada da sessão NextAuth.
 * Use `isManagerUp` para gatear recursos restritos a ADMIN/MANAGER
 * (ex.: Logs, Distribuição, Automações, presença de agentes no dashboard).
 */
export function useUserRole(): UserRoleInfo {
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: AppUserRole } | undefined)?.role ?? null;
  const isSuperAdmin = Boolean(
    (session?.user as { isSuperAdmin?: boolean } | undefined)?.isSuperAdmin,
  );
  const isManagerUp = isSuperAdmin || role === "ADMIN" || role === "MANAGER";
  return { role, isSuperAdmin, isManagerUp, ready: status !== "loading" };
}

/**
 * Guarda de página restrita a ADMIN/MANAGER. Redireciona membros (ou não
 * autenticados) para `redirectTo` assim que a sessão resolve. Retorna o
 * `UserRoleInfo` para a página decidir o que renderizar durante o load.
 */
export function useRequireManager(redirectTo = "/dashboard"): UserRoleInfo {
  const info = useUserRole();
  const router = useRouter();
  useEffect(() => {
    if (info.ready && !info.isManagerUp) {
      router.replace(redirectTo);
    }
  }, [info.ready, info.isManagerUp, redirectTo, router]);
  return info;
}
