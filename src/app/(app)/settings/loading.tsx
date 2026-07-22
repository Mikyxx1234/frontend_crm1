import { PanelLoading } from "@/components/crm/page-loading";

/** Loader de settings: renderiza DENTRO do `settings/layout.tsx`, que já
 *  mantém NavRail + sidebar persistentes — então só o painel direito exibe
 *  skeleton. */
export default function Loading() {
  return <PanelLoading />;
}
