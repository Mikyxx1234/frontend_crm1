import { notFound } from "next/navigation";

import ShowcaseClient from "./showcase-client";

/**
 * Showcase dev-only dos primitivos de permissão (Fase 1). Substitui o
 * Storybook: lista todos os componentes em seus estados
 * (default / disabled / sensível / herdado / loading / empty).
 * Bloqueado em produção.
 */
export default function DsPermissionsShowcasePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ShowcaseClient />;
}
