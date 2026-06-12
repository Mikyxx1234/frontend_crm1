"use client";

import { useQuery } from "@tanstack/react-query";

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
      <Label htmlFor={id}>Funil de destino</Label>
      <select
        id={id}
        value={value ?? ""}
        disabled={disabled || isLoading}
        onChange={(e) => onChange(e.target.value ? e.target.value : null)}
        className="w-full rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-2.5 font-body text-[13px] text-[var(--text-primary)] disabled:opacity-60"
      >
        <option value="">Padrão da organização</option>
        {pipelines.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.isDefault ? " (padrão)" : ""}
          </option>
        ))}
      </select>
      <p className="text-xs text-[var(--text-muted)]">
        Novos leads que chegarem por este canal entram neste funil. Conversas
        que já existem não são movidas.
      </p>
    </div>
  );
}
