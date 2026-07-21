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
          {/*
            27/mai/26 — Filtro por status do negocio. Usamos um select
            simples (em vez de multi-select) com 4 opcoes + uma composta
            "Ganho ou Perdido" — esse e o caso pratico que o operador
            mencionou (retencao pos-venda e reengajamento de perdidos
            no mesmo gatilho). Valor armazenado e CSV ("WON,LOST"),
            interpretado no backend como "any of".
          */}
          <div className="space-y-2">
            <Label htmlFor="tc-msg-status">Status do negócio (opcional)</Label>
            <SelectNative
              id="tc-msg-status"
              value={String(value.dealStatus ?? "")}
              onChange={(e) => set("dealStatus", e.target.value)}
            >
              <option value="">Qualquer status</option>
              <option value="OPEN">Em aberto</option>
              <option value="WON">Ganho</option>
              <option value="LOST">Perdido</option>
              <option value="WON,LOST">Ganho ou Perdido</option>
            </SelectNative>
            <p className="text-xs text-muted-foreground">
              {triggerType === "message_received"
                ? "Dispara só quando o contato que enviou a mensagem tem negócio neste status. Use \"Ganho ou Perdido\" para pós-venda e reengajamento."
                : "Dispara só quando a mensagem é enviada para um contato com negócio neste status."}
            </p>
          </div>
        </div>
      );
    case "call_received":
    case "call_made":
      return (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {triggerType === "call_received"
              ? "Disparado quando uma ligação é recebida (encerrada). O contato é resolvido pelo número."
              : "Disparado quando uma ligação realizada é encerrada."}
          </p>
          <div className="space-y-2">
            <Label htmlFor="tc-call-status">Resultado da ligação (opcional)</Label>
            <SelectNative
              id="tc-call-status"
              value={String(value.status ?? "")}
              onChange={(e) => set("status", e.target.value)}
            >
              <option value="">Qualquer ligação</option>
              <option value="answered">Apenas atendidas</option>
              <option value="missed">Apenas não atendidas</option>
            </SelectNative>
          </div>
        </div>
      );
    case "manual":
      return (
        <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
          <p className="font-semibold">Esta automação é disparada manualmente.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Não há filtro automático — ela aparece como opção no botão{" "}
            <span className="font-medium text-foreground">&quot;Rodar automação&quot;</span> dentro
            das conversas do inbox e do detalhe de cada negócio no kanban. Use
            para fluxos sob demanda (ex.: enviar resumo, abrir cobrança,
            transferir para outro setor) que o operador decide quando executar.
          </p>
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
    case "conversation_tabulated":
      return (
        <ConversationTabulatedFields value={value} patch={patch} set={set} />
      );
    default:
      return (
        <p className="text-sm text-muted-foreground">Selecione um tipo de gatilho.</p>
      );
  }
}

// ─────────────────────────────────────────────────────────────
// conversation_tabulated — seletor departamento + arvore
// ─────────────────────────────────────────────────────────────

type TabulationNodeApi = {
  id: string;
  parentId: string | null;
  name: string;
  color: string | null;
  position: number;
  active: boolean;
  children: TabulationNodeApi[];
};

function ConversationTabulatedFields({
  value,
  patch,
  set,
}: {
  value: Record<string, unknown>;
  patch: (n: Record<string, unknown>) => void;
  set: (k: string, v: unknown) => void;
}) {
  const departmentId = String(value.departmentId ?? "");
  const tabulationId = String(value.tabulationId ?? "");

  const departmentsQuery = useQuery({
    queryKey: ["automation-trigger-departments"],
    staleTime: 60_000,
    queryFn: async (): Promise<{ id: string; name: string; icon?: string }[]> => {
      const res = await fetch(apiUrl("/api/settings/departments"));
      if (!res.ok) return [];
      return (await res.json()) as { id: string; name: string; icon?: string }[];
    },
  });

  const treeQuery = useQuery({
    queryKey: ["automation-trigger-tabulations", departmentId],
    enabled: !!departmentId,
    staleTime: 30_000,
    queryFn: async (): Promise<{ tree: TabulationNodeApi[] }> => {
      const res = await fetch(
        apiUrl(`/api/tabulations?departmentId=${encodeURIComponent(departmentId)}`),
      );
      if (!res.ok) return { tree: [] };
      return (await res.json()) as { tree: TabulationNodeApi[] };
    },
  });

  // Achata a arvore em opcoes indentadas: cada nó carrega seu caminho
  // completo pra o operador identificar rapidamente. Categorias tambem
  // podem ser escolhidas (mirar categoria vale pra todos os descendentes).
  const flat = flattenTabulationTree(treeQuery.data?.tree ?? []);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Disparado quando um agente encerra uma conversa e escolhe uma
        tabulação. Filtre por departamento e/ou tabulação; escolher uma
        categoria pai também dispara para todos os itens abaixo dela.
      </p>

      <div className="space-y-2">
        <Label htmlFor="tc-tab-dept">Departamento (opcional)</Label>
        <SelectNative
          id="tc-tab-dept"
          value={departmentId}
          onChange={(e) =>
            patch({
              departmentId: e.target.value,
              tabulationId: "",
              tabulationLabel: "",
            })
          }
        >
          <option value="">Qualquer departamento</option>
          {(departmentsQuery.data ?? []).map((d) => (
            <option key={d.id} value={d.id}>
              {d.icon ? `${d.icon} ` : ""}
              {d.name}
            </option>
          ))}
        </SelectNative>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tc-tab-node">Tabulação (opcional)</Label>
        <SelectNative
          id="tc-tab-node"
          value={tabulationId}
          disabled={!departmentId}
          onChange={(e) => {
            const id = e.target.value;
            const found = flat.find((f) => f.id === id);
            patch({
              tabulationId: id,
              tabulationLabel: found?.label ?? "",
            });
          }}
        >
          <option value="">Qualquer tabulação do departamento</option>
          {flat.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </SelectNative>
        {!departmentId ? (
          <p className="text-xs text-muted-foreground">
            Escolha um departamento para listar as tabulações.
          </p>
        ) : null}
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-unused-expressions */}
      {set && null}
    </div>
  );
}

function flattenTabulationTree(
  nodes: TabulationNodeApi[],
  depth = 0,
  prefix = "",
): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = [];
  for (const n of nodes) {
    const indent = "— ".repeat(depth);
    const path = prefix ? `${prefix} › ${n.name}` : n.name;
    out.push({ id: n.id, label: `${indent}${n.name}` });
    if (n.children.length > 0) {
      out.push(...flattenTabulationTree(n.children, depth + 1, path));
    }
  }
  return out;
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
