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
 * Grid responsivo dos widgets — visual marketplace (ref. mockup):
 * cards verticais/compridos, ~4 colunas em telas largas.
 */
export function WidgetsBento({
  widgets,
  canManage,
  pendingSlug,
  onInstall,
  onUninstall,
}: WidgetsBentoProps) {
  return (
    <div className="grid min-w-0 auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
