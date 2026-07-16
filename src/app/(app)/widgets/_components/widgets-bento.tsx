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
 * Grid responsivo dos widgets — DS v2:
 * 1 coluna no mobile; a partir de `sm`, auto-fill com min ~360px.
 */
export function WidgetsBento({
  widgets,
  canManage,
  pendingSlug,
  onInstall,
  onUninstall,
}: WidgetsBentoProps) {
  return (
    <div className="grid min-w-0 auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(min(100%,360px),1fr))] sm:gap-4">
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
