"use client";

import * as React from "react";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import {
  DropdownGlass,
  FILTER_FIELD_INPUT_CLASS,
  FILTER_FIELD_ITEM_CLASS,
  FILTER_FIELD_MENU_CLASS,
  FILTER_FIELD_TRIGGER_CLASS,
} from "@/components/crm/dropdown-glass";
import { useModalPortalContainer } from "@/components/ui/modal-portal-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AUTOMATION_TRIGGER_TYPES, triggerTypeLabel } from "@/lib/automation-workflow";

import { useTagOptions } from "./editor-data";

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
/**
 * Multi-seleção de estágios. Permite escolher 1..N estágios (ou "Qualquer
 * estágio" = nenhum). Emite o array de ids + o `ownerPipelineId` quando há
 * exatamente 1 selecionado (pra o pai auto-preencher o pipeline). Sem
 * estágios cadastrados, cai num input livre (IDs separados por vírgula).
 */
function StageMultiSelect({
  id,
  label,
  helper,
  values,
  onChange,
  pipelinesFromValue,
}: {
  id: string;
  label: string;
  helper?: string;
  values: string[];
  onChange: (stageIds: string[], ownerPipelineId: string | null) => void;
  pipelinesFromValue?: string;
}) {
  const { data: pipelines = [], isLoading } = usePipelines();
  const portalContainer = useModalPortalContainer();
  const [q, setQ] = React.useState("");

  // Se o operador filtrou por pipeline antes do estágio, mostramos só os
  // estágios desse pipeline. Sem pipeline filtrado, mostramos todos
  // agrupados.
  const visiblePipelines = pipelinesFromValue
    ? pipelines.filter((p) => p.id === pipelinesFromValue)
    : pipelines;
  const allStages = visiblePipelines.flatMap((p) => p.stages);

  const ownerOf = (ids: string[]): string | null =>
    ids.length === 1
      ? pipelines.find((p) => p.stages.some((s) => s.id === ids[0]))?.id ?? null
      : null;

  const toggle = (sid: string) => {
    const next = values.includes(sid)
      ? values.filter((v) => v !== sid)
      : [...values, sid];
    onChange(next, ownerOf(next));
  };

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
          value={values.join(", ")}
          onChange={(e) =>
            onChange(
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
              null,
            )
          }
          placeholder="IDs dos estágios (separados por vírgula)"
        />
        {helper ? (
          <p className="text-xs text-muted-foreground">{helper}</p>
        ) : null}
      </div>
    );
  }

  const triggerLabel =
    values.length === 0
      ? "Qualquer estágio"
      : values.length === 1
        ? allStages.find((s) => s.id === values[0])?.name ?? "1 estágio"
        : `${values.length} estágios selecionados`;

  const matchesQuery = (name: string) =>
    !q.trim() || name.toLowerCase().includes(q.trim().toLowerCase());

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <DropdownPrimitive.Root
        modal={false}
        onOpenChange={(o) => {
          if (!o) setQ("");
        }}
      >
        <DropdownPrimitive.Trigger asChild suppressHydrationWarning>
          <button
            type="button"
            className={cn(
              FILTER_FIELD_TRIGGER_CLASS,
              "group",
              values.length > 0 && "text-[var(--text-primary)]",
            )}
          >
            <span className="min-w-0 flex-1 truncate text-left">
              {triggerLabel}
            </span>
            <IconChevronDown
              size={15}
              className="ml-auto shrink-0 text-current opacity-60 transition-transform duration-200 group-data-[state=open]:rotate-180"
            />
          </button>
        </DropdownPrimitive.Trigger>

        <DropdownPrimitive.Portal container={portalContainer ?? undefined}>
          <DropdownPrimitive.Content
            align="start"
            sideOffset={6}
            className={cn(
              FILTER_FIELD_MENU_CLASS,
              "min-w-[var(--radix-dropdown-menu-trigger-width)]",
            )}
          >
            <div className="p-1 pb-1.5">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                // Deixa Radix cuidar de navegação (setas/enter/esc); as demais
                // teclas ficam no input (senão o typeahead do menu rouba).
                onKeyDown={(e) => {
                  if (!["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key))
                    e.stopPropagation();
                }}
                placeholder="Buscar estágio…"
                className={FILTER_FIELD_INPUT_CLASS}
              />
            </div>
            {values.length > 0 ? (
              <DropdownPrimitive.Item
                onSelect={(e) => {
                  e.preventDefault();
                  onChange([], null);
                }}
                className={cn(
                  FILTER_FIELD_ITEM_CLASS,
                  "text-[var(--text-muted)]",
                )}
              >
                Limpar seleção
              </DropdownPrimitive.Item>
            ) : null}
            {visiblePipelines.map((p) => {
              const stages = p.stages.filter((s) => matchesQuery(s.name));
              if (stages.length === 0) return null;
              return (
                <DropdownPrimitive.Group key={p.id}>
                  <DropdownPrimitive.Label className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    {p.name}
                  </DropdownPrimitive.Label>
                  {stages.map((s) => {
                    const checked = values.includes(s.id);
                    return (
                      <DropdownPrimitive.CheckboxItem
                        key={s.id}
                        checked={checked}
                        onSelect={(e) => e.preventDefault()}
                        onCheckedChange={() => toggle(s.id)}
                        className={FILTER_FIELD_ITEM_CLASS}
                      >
                        <span
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                            checked
                              ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                              : "border-[var(--glass-border)]",
                          )}
                        >
                          {checked ? <IconCheck size={12} /> : null}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{s.name}</span>
                      </DropdownPrimitive.CheckboxItem>
                    );
                  })}
                </DropdownPrimitive.Group>
              );
            })}
          </DropdownPrimitive.Content>
        </DropdownPrimitive.Portal>
      </DropdownPrimitive.Root>
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
      <DropdownGlass
        triggerClassName="w-full"
        placeholder="Qualquer pipeline"
        value={value}
        options={[
          { value: "", label: "Qualquer pipeline" },
          ...pipelines.map((p) => ({ value: p.id, label: p.name })),
        ]}
        onValueChange={onChange}
      />
    </div>
  );
}

/**
 * Dropdown de tags cadastradas na org (`GET /api/tags`). Salva o NOME
 * da tag (não o id) — o backend do gatilho `tag_added` dispara por nome.
 * Sem tags cadastradas, cai num input livre (mesmo escape hatch do
 * PipelineSelect). Se o valor atual não estiver mais na lista (tag
 * renomeada/apagada), inclui uma option extra pra não perder a seleção.
 */
function TagSelect({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (tagName: string) => void;
}) {
  const { options: tags, isLoading } = useTagOptions();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">Carregando tags…</p>
      </div>
    );
  }

  if (tags.length === 0) {
    return (
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nome da tag"
        />
      </div>
    );
  }

  const hasCurrent = value.length > 0 && tags.some((t) => t.value === value);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {/* DropdownGlass (não SelectNative): o <select> nativo ignora o tema
          escuro na lista de options do SO/browser. */}
      <DropdownGlass
        triggerClassName="w-full"
        placeholder="Selecione uma tag…"
        value={value}
        options={[
          { value: "", label: "Selecione uma tag…" },
          ...(!hasCurrent && value
            ? [{ value, label: `${value} (valor personalizado)` }]
            : []),
          ...tags.map((t) => ({ value: t.value, label: t.label })),
        ]}
        onValueChange={onChange}
      />
    </div>
  );
}

/**
 * Lê os estágios selecionados de um campo do config, aceitando o formato
 * novo (array `<key>Ids`) e o legado (string `<key>Id`). Ex.: key="stage"
 * → lê `stageIds` (array) ou `stageId` (legado).
 */
function readStageIdsFromConfig(
  value: Record<string, unknown>,
  key: string,
): string[] {
  const arr = value[`${key}Ids`];
  if (Array.isArray(arr)) {
    return arr.filter((x): x is string => typeof x === "string" && x !== "");
  }
  const single = value[`${key}Id`];
  return typeof single === "string" && single ? [single] : [];
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
          <StageMultiSelect
            id="tc-from"
            label="Estágio(s) de origem (opcional)"
            values={readStageIdsFromConfig(value, "fromStage")}
            onChange={(sids) => patch({ fromStageIds: sids, fromStageId: "" })}
          />
          <StageMultiSelect
            id="tc-to"
            label="Estágio(s) de destino"
            values={readStageIdsFromConfig(value, "toStage")}
            onChange={(sids) => patch({ toStageIds: sids, toStageId: "" })}
            helper="Deixe vazio para qualquer destino. Pode escolher mais de um."
          />
        </div>
      );
      // (stage_changed não usa pipelineId no config — só estágios.)
    case "tag_added":
      return (
        <TagSelect
          id="tc-tag"
          label="Nome da tag"
          value={String(value.tagName ?? "")}
          onChange={(tagName) => set("tagName", tagName)}
        />
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
              // Trocou de pipeline: limpa estágios (evita filtro
              // inconsistente do tipo "pipeline A, estágio do B").
              patch({ pipelineId: pid, stageIds: [], stageId: "" });
            }}
          />
          <StageMultiSelect
            id="tc-stage"
            label="Estágio(s) (opcional)"
            values={readStageIdsFromConfig(value, "stage")}
            onChange={(sids, ownerPid) =>
              patch({
                stageIds: sids,
                stageId: "",
                // Só preenche pipelineId quando o usuário ainda não tinha
                // setado um (senão respeita a escolha explícita do operador).
                ...(ownerPid && !value.pipelineId ? { pipelineId: ownerPid } : {}),
              })
            }
            pipelinesFromValue={String(value.pipelineId ?? "")}
            helper="Dispara quando o negócio entra em algum destes estágios."
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
                patch({ pipelineId: pid, stageIds: [], stageId: "" })
              }
            />
            <StageMultiSelect
              id="tc-cc-stage"
              label="Estágio(s) (opcional)"
              values={readStageIdsFromConfig(value, "stage")}
              onChange={(sids, ownerPid) =>
                patch({
                  stageIds: sids,
                  stageId: "",
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
          <DropdownGlass
            triggerClassName="w-full"
            placeholder="Todos os canais"
            value={String(value.channel ?? "")}
            options={[
              { value: "", label: "Todos os canais" },
              { value: "whatsapp", label: "WhatsApp" },
              { value: "email", label: "E-mail" },
            ]}
            onValueChange={(v) => set("channel", v)}
          />
        </div>
      );
    case "message_received":
    case "message_sent":
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="tc-ch">Canal (opcional)</Label>
            <DropdownGlass
              triggerClassName="w-full"
              placeholder="Todos os canais"
              value={String(value.channel ?? "")}
              options={[
                { value: "", label: "Todos os canais" },
                { value: "whatsapp", label: "WhatsApp" },
                { value: "email", label: "E-mail" },
              ]}
              onValueChange={(v) => set("channel", v)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <PipelineSelect
              id="tc-msg-pipe"
              label="Pipeline (opcional)"
              value={String(value.pipelineId ?? "")}
              onChange={(pid) =>
                patch({ pipelineId: pid, stageIds: [], stageId: "" })
              }
            />
            <StageMultiSelect
              id="tc-msg-stage"
              label="Estágio(s) (opcional)"
              values={readStageIdsFromConfig(value, "stage")}
              onChange={(sids, ownerPid) =>
                patch({
                  stageIds: sids,
                  stageId: "",
                  ...(ownerPid && !value.pipelineId ? { pipelineId: ownerPid } : {}),
                })
              }
              pipelinesFromValue={String(value.pipelineId ?? "")}
              helper={
                triggerType === "message_received"
                  ? "Dispara quando o lead que enviou a mensagem está em algum destes estágios."
                  : "Dispara quando a mensagem é enviada para um lead em algum destes estágios."
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
            <DropdownGlass
              triggerClassName="w-full"
              placeholder="Qualquer status"
              value={String(value.dealStatus ?? "")}
              options={[
                { value: "", label: "Qualquer status" },
                { value: "OPEN", label: "Em aberto" },
                { value: "WON", label: "Ganho" },
                { value: "LOST", label: "Perdido" },
                { value: "WON,LOST", label: "Ganho ou Perdido" },
              ]}
              onValueChange={(v) => set("dealStatus", v)}
            />
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
            <DropdownGlass
              triggerClassName="w-full"
              placeholder="Qualquer ligação"
              value={String(value.status ?? "")}
              options={[
                { value: "", label: "Qualquer ligação" },
                { value: "answered", label: "Apenas atendidas" },
                { value: "missed", label: "Apenas não atendidas" },
              ]}
              onValueChange={(v) => set("status", v)}
            />
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
        <DropdownGlass
          triggerClassName="w-full"
          placeholder="Qualquer departamento"
          value={departmentId}
          options={[
            { value: "", label: "Qualquer departamento" },
            ...(departmentsQuery.data ?? []).map((d) => ({
              value: d.id,
              label: d.icon ? `${d.icon} ${d.name}` : d.name,
            })),
          ]}
          onValueChange={(v) =>
            patch({
              departmentId: v,
              tabulationId: "",
              tabulationLabel: "",
            })
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tc-tab-node">Tabulação (opcional)</Label>
        <DropdownGlass
          triggerClassName="w-full"
          placeholder="Qualquer tabulação do departamento"
          value={tabulationId}
          disabled={!departmentId}
          searchable
          options={[
            { value: "", label: "Qualquer tabulação do departamento" },
            ...flat.map((f) => ({ value: f.id, label: f.label })),
          ]}
          onValueChange={(id) => {
            const found = flat.find((f) => f.id === id);
            patch({
              tabulationId: id,
              tabulationLabel: found?.label ?? "",
            });
          }}
        />
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
      <DropdownGlass
        triggerClassName="w-full"
        value={value}
        searchable
        options={AUTOMATION_TRIGGER_TYPES.map((t) => ({
          value: t,
          label: triggerTypeLabel(t),
        }))}
        onValueChange={onChange}
      />
    </div>
  );
}
