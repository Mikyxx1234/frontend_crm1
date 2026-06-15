"use client";

import { useQuery } from "@tanstack/react-query";

import { DropdownGlass } from "@/components/crm/dropdown-glass";
import { Label } from "@/components/ui/label";
import { listPipelines } from "@/features/inbox-v2/api/misc";

/**
 * Select "Funil de destino" reutilizado na configuração de canal (diálogo
 * simples e painel Meta). Valor `null` = usa o funil padrão da organização
 * (comportamento legado). Só afeta novos leads que chegarem pelo canal.
 */
export function ChannelPipelineSelect({
  value,
  onChange,
  id = "channel-default-pipeline",
  disabled,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  id?: string;
  disabled?: boolean;
}) {
  const { data: pipelines = [], isLoading } = useQuery({
    queryKey: ["pipelines-channel-select"],
    queryFn: listPipelines,
  });

  return (
    <div className="space-y-2">
      <Label>Funil de destino</Label>
      <DropdownGlass
        options={[
          { value: "", label: "Padrão da organização" },
          ...pipelines.map((p) => ({
            value: p.id,
            label: `${p.name}${p.isDefault ? " (padrão)" : ""}`,
          })),
        ]}
        value={value ?? ""}
        onValueChange={(v) => onChange(v || null)}
        disabled={disabled || isLoading}
        triggerClassName="w-full"
      />
      <p className="text-xs text-[var(--text-muted)]">
        Novos leads que chegarem por este canal entram neste funil. Conversas
        que já existem não são movidas.
      </p>
    </div>
  );
}
