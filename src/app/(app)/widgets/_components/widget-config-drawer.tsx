"use client";

/**
 * Drawer de configuração do widget — porta de entrada única a partir do
 * card na Central (`/widgets`). Faz lookup no `WIDGET_CONFIG_REGISTRY` e
 * renderiza o painel de config do widget dentro de um FormDialog.
 *
 * O componente do painel é lazy (dynamic import no registry), então o
 * bundle da Central não cresce com configs pesadas.
 */

import { FormDialog } from "@/components/ui/form-dialog";
import { getWidgetConfig } from "@/features/widgets/config-registry";

interface WidgetConfigDrawerProps {
  slug: string | null;
  onClose: () => void;
}

export function WidgetConfigDrawer({ slug, onClose }: WidgetConfigDrawerProps) {
  const entry = slug ? getWidgetConfig(slug) : null;
  const open = !!slug && !!entry;
  const Component = entry?.Component;

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={entry?.title ?? ""}
      description={entry?.description}
      icon={entry?.icon}
      size={entry?.size ?? "lg"}
    >
      {Component ? <Component /> : null}
    </FormDialog>
  );
}
