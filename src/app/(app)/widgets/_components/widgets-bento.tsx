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
 * Grid responsivo dos widgets — DS v2 (fiel ao mockup widgets.html):
 * `repeat(auto-fill, minmax(360px, 1fr))` com gap de 16px. Preenche
 * automaticamente conforme a largura, sem breakpoints fixos.
 */
export function WidgetsBento({
  widgets,
  canManage,
  pendingSlug,
  onInstall,
  onUninstall,
}: WidgetsBentoProps) {
  return (
    <div className="grid auto-rows-fr grid-cols-[repeat(auto-fill,minmax(360px,1fr))] gap-4">
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
