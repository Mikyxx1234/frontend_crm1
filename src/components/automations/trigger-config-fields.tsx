"use client";

import { useQuery } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { apiUrl } from "@/lib/api";
import { AUTOMATION_TRIGGER_TYPES, triggerTypeLabel } from "@/lib/automation-workflow";

type Props = {
  triggerType: string;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
};

// Estrutura espelha o retorno de `GET /api/pipelines` no backend.
type PipelineStage = { id: string; name: string };
type Pipeline = { id: string; name: string; stages: PipelineStage[] };

/**
 * Hook compartilhado entre os blocos que precisam exibir dropdowns de
 * pipeline/estágio (stage_changed, deal_created, contact_created,
 * message_received/sent). Mesmo `queryKey` reusado entre instâncias —
 * graças ao cache do react-query, abrir o config dialog não bate duas
 * vezes no backend.
 */
function usePipelines() {
  return useQuery({
    queryKey: ["pipelines-for-trigger"],
    staleTime: 60_000,
    queryFn: async (): Promise<Pipeline[]> => {
      const res = await fetch(apiUrl("/api/pipelines"));
      if (!res.ok) return [];
      return (await res.json()) as Pipeline[];
    },
  });
}

/**
 * Dropdown agrupado de estágios. Ao escolher um estágio, devolve junto
 * o `ownerPipelineId` — quando o operador não filtrou pipeline antes, o
 * componente pai preenche pipelineId automaticamente. Quando não há
 * estágios cadastrados, cai num input livre (escape hatch para casos
 * de seed ainda não rodado).
 *
 * 27/mai/26 — API trocada de dois callbacks separados (`onChange` +
 * `onPipelineChange`) pra um único callback emitindo o par. Isso
 * fechou um bug onde os dois `set(k, v)` consecutivos no pai usavam o
 * mesmo `value` do closure, e o segundo (`pipelineId`) sobrescrevia o
 * primeiro (`stageId`) — visualmente o select voltava pra "Qualquer
 * estágio" logo após o clique.
 */
function StageSelect({
  id,
  label,
  helper,
  value,
  onChange,
  pipelinesFromValue,
}: {
  id: string;
  label: string;
  helper?: string;
  value: string;
  onChange: (stageId: string, ownerPipelineId: string | null) => void;
  pipelinesFromValue?: string;
}) {
  const { data: pipelines = [], isLoading } = usePipelines();
  // Se o operador filtrou por pipeline antes do estágio, mostramos só os
  // estágios desse pipeline. Sem pipeline filtrado, mostramos todos
  // agrupados.
  const visiblePipelines = pipelinesFromValue
    ? pipelines.filter((p) => p.id === pipelinesFromValue)
    : pipelines;
  const allStages = visiblePipelines.flatMap((p) => p.stages);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">Carregando estágios…</p>
      </div>
    );
  }

  if (allStages.length === 0) {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value, null)}
          placeholder="ID do estágio"
        />
        {helper ? (
          <p className="text-xs text-muted-foreground">{helper}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <SelectNative
        id={id}
        value={value}
        onChange={(e) => {
          const sid = e.target.value;
          const owner = sid
            ? pipelines.find((p) => p.stages.some((s) => s.id === sid)) ?? null
            : null;
          onChange(sid, owner?.id ?? null);
        }}
      >
        <option value="">Qualquer estágio</option>
        {visiblePipelines.map((p) => (
          <optgroup key={p.id} label={p.name}>
            {p.stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </optgroup>
        ))}
      </SelectNative>
      {helper ? (
        <p className="text-xs text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}

function PipelineSelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (pipelineId: string) => void;
}) {
  const { data: pipelines = [], isLoading } = usePipelines();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">Carregando pipelines…</p>
      </div>
    );
  }

  if (pipelines.length === 0) {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="ID do pipeline"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <SelectNative
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Qualquer pipeline</option>
        {pipelines.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </SelectNative>
    </div>
  );
}

export function TriggerConfigFields({ triggerType, value, onChange }: Props) {
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v });
  // Patch parcial — usado quando uma mesma interação muda mais de um
  // campo (ex.: ao escolher um estágio, preencher pipelineId junto).
  const patch = (next: Record<string, unknown>) => onChange({ ...value, ...next });

  switch (triggerType) {
    case "stage_changed":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <StageSelect
            id="tc-from"
            label="Estágio de origem (opcional)"
            value={String(value.fromStageId ?? "")}
            onChange={(sid) => set("fromStageId", sid)}
          />
          <StageSelect
            id="tc-to"
            label="Estágio de destino"
            value={String(value.toStageId ?? "")}
            onChange={(sid) => set("toStageId", sid)}
            helper="Deixe em branco para qualquer destino."
          />
        </div>
      );
      // (stage_changed não usa pipelineId no config — só estágios.)
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
        <div className="grid gap-4 sm:grid-cols-2">
          <PipelineSelect
            id="tc-pipe"
            label="Pipeline (opcional)"
            value={String(value.pipelineId ?? "")}
            onChange={(pid) => {
              // Trocou de pipeline: limpa stageId se o atual não pertencer
              // ao novo pipeline. Evita filtro inconsistente do tipo
              // "pipeline A, estágio do B".
              patch({ pipelineId: pid, stageId: pid ? String(value.stageId ?? "") : "" });
            }}
          />
          <StageSelect
            id="tc-stage"
            label="Estágio (opcional)"
            value={String(value.stageId ?? "")}
            onChange={(sid, ownerPid) =>
              patch({
                stageId: sid,
                // Só preenche pipelineId quando o usuário ainda não tinha
                // setado um (senão respeita a escolha explícita do operador).
                ...(ownerPid && !value.pipelineId ? { pipelineId: ownerPid } : {}),
              })
            }
            pipelinesFromValue={String(value.pipelineId ?? "")}
            helper="Dispara só quando o negócio entra neste estágio."
          />
        </div>
      );
    case "contact_created":
      return (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Disparado quando um novo contato é criado. Opcionalmente,
            restrinja a um pipeline/estágio — o filtro só vale se o auto-deal
            já tiver sido criado no momento do evento.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <PipelineSelect
              id="tc-cc-pipe"
              label="Pipeline (opcional)"
              value={String(value.pipelineId ?? "")}
              onChange={(pid) =>
                patch({ pipelineId: pid, stageId: pid ? String(value.stageId ?? "") : "" })
              }
            />
            <StageSelect
              id="tc-cc-stage"
              label="Estágio (opcional)"
              value={String(value.stageId ?? "")}
              onChange={(sid, ownerPid) =>
                patch({
                  stageId: sid,
                  ...(ownerPid && !value.pipelineId ? { pipelineId: ownerPid } : {}),
                })
              }
              pipelinesFromValue={String(value.pipelineId ?? "")}
            />
          </div>
        </div>
      );
    case "conversation_created":
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
    case "message_received":
    case "message_sent":
      return (
        <div className="space-y-3">
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
          <div className="grid gap-4 sm:grid-cols-2">
            <PipelineSelect
              id="tc-msg-pipe"
              label="Pipeline (opcional)"
              value={String(value.pipelineId ?? "")}
              onChange={(pid) =>
                patch({ pipelineId: pid, stageId: pid ? String(value.stageId ?? "") : "" })
              }
            />
            <StageSelect
              id="tc-msg-stage"
              label="Estágio (opcional)"
              value={String(value.stageId ?? "")}
              onChange={(sid, ownerPid) =>
                patch({
                  stageId: sid,
                  ...(ownerPid && !value.pipelineId ? { pipelineId: ownerPid } : {}),
                })
              }
              pipelinesFromValue={String(value.pipelineId ?? "")}
              helper={
                triggerType === "message_received"
                  ? "Dispara só quando o lead que enviou a mensagem está neste estágio."
                  : "Dispara só quando a mensagem é enviada para um lead neste estágio."
              }
            />
          </div>
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
