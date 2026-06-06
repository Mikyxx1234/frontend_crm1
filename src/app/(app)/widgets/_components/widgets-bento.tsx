"use client";

import { WidgetCard } from "./widget-card";

import type { WidgetDto } from "@/features/widgets/types";

interface WidgetsBentoProps {
  widgets: WidgetDto[];
  canManage: boolean;
  pendingSlug: string | null;
  onInstall: (slug: string) => void;
  onUninstall: (slug: string) => void;
}

/**
 * Grid responsivo estilo bento para os widgets. Em telas pequenas vira
 * coluna unica; a partir de `sm` usa 2 colunas e, em `xl`, 3 colunas.
 */
export function WidgetsBento({
  widgets,
  canManage,
  pendingSlug,
  onInstall,
  onUninstall,
}: WidgetsBentoProps) {
  return (
    <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {widgets.map((widget) => (
        <WidgetCard
          key={widget.slug}
          widget={widget}
          canManage={canManage}
          pending={pendingSlug === widget.slug}
          onInstall={onInstall}
          onUninstall={onUninstall}
        />
      ))}
    </div>
  );
}
