"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { AUTOMATION_TRIGGER_TYPES, triggerTypeLabel } from "@/lib/automation-workflow";

type Props = {
  triggerType: string;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
};

export function TriggerConfigFields({ triggerType, value, onChange }: Props) {
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v });

  switch (triggerType) {
    case "stage_changed":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tc-from">Estágio de origem (opcional)</Label>
            <Input
              id="tc-from"
              value={String(value.fromStageId ?? "")}
              onChange={(e) => set("fromStageId", e.target.value)}
              placeholder="ID do estágio"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tc-to">Estágio de destino (opcional)</Label>
            <Input
              id="tc-to"
              value={String(value.toStageId ?? "")}
              onChange={(e) => set("toStageId", e.target.value)}
              placeholder="ID do estágio"
            />
          </div>
        </div>
      );
    case "tag_added":
      return (
        <div className="space-y-2">
          <Label htmlFor="tc-tag">Nome da tag</Label>
          <Input
            id="tc-tag"
            value={String(value.tagName ?? "")}
            onChange={(e) => set("tagName", e.target.value)}
          />
        </div>
      );
    case "lead_score_reached":
      return (
        <div className="space-y-2">
          <Label htmlFor="tc-th">Pontuação mínima</Label>
          <Input
            id="tc-th"
            type="number"
            value={value.threshold != null ? String(value.threshold) : ""}
            onChange={(e) => set("threshold", Number(e.target.value) || 0)}
          />
        </div>
      );
    case "deal_created":
    case "deal_won":
    case "deal_lost":
      return (
        <div className="space-y-2">
          <Label htmlFor="tc-pipe">ID do pipeline (opcional)</Label>
          <Input
            id="tc-pipe"
            value={String(value.pipelineId ?? "")}
            onChange={(e) => set("pipelineId", e.target.value)}
          />
        </div>
      );
    case "contact_created":
      return (
        <p className="text-sm text-muted-foreground">Disparado quando um novo contato é criado.</p>
      );
    case "conversation_created":
    case "message_received":
    case "message_sent":
      return (
        <div className="space-y-2">
          <Label htmlFor="tc-ch">Canal (opcional)</Label>
          <SelectNative
            id="tc-ch"
            value={String(value.channel ?? "")}
            onChange={(e) => set("channel", e.target.value)}
          >
            <option value="">Todos os canais</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">E-mail</option>
          </SelectNative>
        </div>
      );
    case "lifecycle_changed":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tc-lf">De (opcional)</Label>
            <Input
              id="tc-lf"
              value={String(value.fromLifecycle ?? value.from ?? "")}
              onChange={(e) => set("fromLifecycle", e.target.value)}
              placeholder="ex.: LEAD"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tc-lt">Para (opcional)</Label>
            <Input
              id="tc-lt"
              value={String(value.toLifecycle ?? value.lifecycleStage ?? "")}
              onChange={(e) => set("toLifecycle", e.target.value)}
              placeholder="ex.: MQL"
            />
          </div>
        </div>
      );
    default:
      return (
        <p className="text-sm text-muted-foreground">Selecione um tipo de gatilho.</p>
      );
  }
}

export function TriggerTypeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (t: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="tc-type">Tipo de gatilho</Label>
      <SelectNative id="tc-type" value={value} onChange={(e) => onChange(e.target.value)}>
        {AUTOMATION_TRIGGER_TYPES.map((t) => (
          <option key={t} value={t}>
            {triggerTypeLabel(t)}
          </option>
        ))}
      </SelectNative>
    </div>
  );
}
