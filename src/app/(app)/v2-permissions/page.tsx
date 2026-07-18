import { redirect } from "next/navigation";

export const metadata = {
  title: "Permissões",
};

/**
 * Alias canônico v2 para a tela de permissões. A implementação real (papéis +
 * usuários, com visibilidade por etapa/funil e permissões por campo absorvidas
 * no papel) vive em `/settings/permissions` — manter só um destino evita drift
 * de UI e de RBAC.
 *
 * Mantém-se este path estável para deep-links externos ("v2") e para diferenciar
 * da rota legacy `/old/settings/permissions` (shadcn v1).
 */
export default async function V2PermissionsRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolved = (await searchParams) ?? {};
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(resolved)) {
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, v);
    } else if (typeof value === "string") {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  redirect(qs ? `/settings/permissions?${qs}` : "/settings/permissions");
}
