import { Suspense } from "react";

import { RoleEditorPage } from "./role-editor-page";

export const dynamic = "force-dynamic";

/**
 * Página dedicada de edição/criação de role.
 *
 * `roleId === "new"` → modo criação; qualquer outro valor é o id (cuid)
 * de um role existente. Substitui o antigo Sheet lateral, dando largura
 * total à matriz de permissões.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) {
  const { roleId } = await params;
  return (
    <Suspense>
      <RoleEditorPage roleId={roleId} />
    </Suspense>
  );
}
