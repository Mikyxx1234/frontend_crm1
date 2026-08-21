"use client"

/**
 * Hooks de dados (somente leitura) para a edição inline do editor visual
 * de automações (/automations/editor). Reusa as MESMAS rotas do editor
 * real, normalizando tudo para `{ value, label, group? }`.
 *
 * Nada aqui faz mutação — apenas GET. As queries têm staleTime alto para
 * não refazer fetch a cada card que abrir.
 */
import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { apiUrl } from "@/lib/api"
import { usePipelinesQuery } from "@/features/shared/queries/pipelines"
import { useTeamUsersQuery } from "@/features/shared/queries/team-users"

export type Opt = { value: string; label: string; group?: string }

const STALE = 5 * 60_000

function asArray(json: unknown): unknown[] {
  if (Array.isArray(json)) return json
  if (json && typeof json === "object") {
    const o = json as Record<string, unknown>
    if (Array.isArray(o.items)) return o.items
    if (Array.isArray(o.data)) return o.data
  }
  return []
}

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(apiUrl(path))
  if (!res.ok) throw new Error(`Falha ao carregar ${path}`)
  return res.json()
}

type RawPipeline = { id: string; name: string; stages?: { id: string; name: string }[] }

/** Estágios de todos os funis → value: stageId, group: nome do funil. */
export function useStageOptions() {
  const q = usePipelinesQuery<RawPipeline>()
  const options = useMemo<Opt[]>(
    () =>
      (q.data ?? []).flatMap((p) =>
        (p.stages ?? []).map((s) => ({ value: s.id, label: s.name, group: p.name })),
      ),
    [q.data],
  )
  return { options, isLoading: q.isLoading }
}

/** Funis (pipelines) → value: pipelineId. Para condições `deal.pipelineId`. */
export function usePipelineOptions() {
  const q = usePipelinesQuery<RawPipeline>()
  const options = useMemo<Opt[]>(
    () => (q.data ?? []).map((p) => ({ value: p.id, label: p.name })),
    [q.data],
  )
  return { options, isLoading: q.isLoading }
}

type RawPipelineLossReasonMeta = { reasons?: { id: string; label: string }[] }

/**
 * Motivos de perda cadastrados NO FUNIL (catálogo restrito daquele
 * pipeline, sem "Outro"). Usado pelo node de automação "Perda"
 * (`mark_deal_lost`), que só aceita motivos catalogados. `value` é o
 * `label` — `Deal.lostReason` grava o texto, não o id (mesmo padrão do
 * `LossReasonDialog` do kanban).
 */
export function usePipelineLossReasonOptions(pipelineId?: string | null) {
  const id = pipelineId?.trim() || ""
  const q = useQuery({
    queryKey: ["editor-pipeline-loss-reasons", id],
    staleTime: STALE,
    enabled: !!id,
    queryFn: async (): Promise<Opt[]> => {
      const meta = (await getJson(`/api/pipelines/${id}/loss-reasons`)) as RawPipelineLossReasonMeta
      const reasons = Array.isArray(meta.reasons) ? meta.reasons : []
      return reasons.map((r) => ({ value: r.label, label: r.label }))
    },
  })
  return { options: id ? q.data ?? [] : [], isLoading: id ? q.isLoading : false }
}

type RawDepartment = { id: string; name: string; icon?: string }

/** Departamentos da org → value: departmentId. Para `conversation.departmentId`
 *  e o passo `transfer_department` das automações. */
export function useDepartmentOptions() {
  const q = useQuery({
    queryKey: ["editor-departments"],
    staleTime: STALE,
    queryFn: async (): Promise<Opt[]> => {
      // getJson lança em !ok — não engolir 403/500 como lista vazia
      // (mascarava schema drift / permissão como "sem departamentos").
      const list = asArray(await getJson("/api/settings/departments")) as RawDepartment[]
      return list.map((d) => ({
        value: d.id,
        // Nome puro: o summary do card (`departmentName`) e o executor
        // usam este label — ícone fica só na tela de Configurações.
        label: d.name,
      }))
    },
  })
  return { options: q.data ?? [], isLoading: q.isLoading, isError: q.isError }
}

type RawUser = { id: string; name?: string; email?: string }

export function useUserOptions() {
  // Key canônica de /api/users — o mapeamento p/ `Opt` vira `select`
  // pra não criar um segundo cache do mesmo endpoint.
  const q = useTeamUsersQuery<RawUser>()
  const options = useMemo<Opt[]>(
    () =>
      (q.data ?? []).map((u) => ({
        value: u.id,
        label: u.email ? `${u.name ?? u.email} (${u.email})` : (u.name ?? u.id),
      })),
    [q.data],
  )
  return { options, isLoading: q.isLoading }
}

type RawAgent = { id: string; userId: string; name: string; active?: boolean }

/** Agentes IA ativos. `by="userId"` para ações que transferem o atendimento. */
export function useAiAgentOptions(by: "id" | "userId" = "id") {
  const q = useQuery({
    queryKey: ["editor-ai-agents"],
    staleTime: STALE,
    queryFn: async (): Promise<RawAgent[]> => asArray(await getJson("/api/ai-agents")) as RawAgent[],
  })
  const options: Opt[] = (q.data ?? [])
    .filter((a) => a.active !== false)
    .map((a) => ({ value: by === "userId" ? a.userId : a.id, label: `🤖 ${a.name}` }))
  return { options, isLoading: q.isLoading }
}

type RawTag = { id: string; name: string }

export function useTagOptions() {
  const q = useQuery({
    queryKey: ["editor-tags"],
    staleTime: STALE,
    queryFn: async (): Promise<Opt[]> => {
      const list = asArray(await getJson("/api/tags")) as RawTag[]
      return list.map((t) => ({ value: t.name, label: t.name }))
    },
  })
  return { options: q.data ?? [], isLoading: q.isLoading }
}

type RawChannel = {
  id: string
  name?: string
  type?: string
  status?: string
  phoneNumber?: string | null
}

const CHANNEL_TYPE_LABEL: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Messenger",
  EMAIL: "E-mail",
  WEBCHAT: "Webchat",
}

function formatChannelOptionLabel(c: RawChannel): string {
  const name = c.name?.trim() || "Canal"
  const phone = typeof c.phoneNumber === "string" ? c.phoneNumber.trim() : ""
  const type = CHANNEL_TYPE_LABEL[String(c.type ?? "").toUpperCase()] ?? ""
  const base = phone ? `${name} · ${phone}` : name
  return type ? `${base} (${type})` : base
}

/** Canais da org. value: channelId. Preferência: CONNECTED primeiro. */
export function useChannelOptions() {
  const q = useQuery({
    queryKey: ["editor-channels"],
    staleTime: STALE,
    queryFn: async (): Promise<Opt[]> => {
      const json = await getJson("/api/channels")
      const list = (
        Array.isArray(json)
          ? json
          : Array.isArray((json as { channels?: unknown[] })?.channels)
            ? (json as { channels: unknown[] }).channels
            : asArray(json)
      ) as RawChannel[]
      const connected = list.filter((c) => String(c.status ?? "").toUpperCase() === "CONNECTED")
      const rest = list.filter((c) => String(c.status ?? "").toUpperCase() !== "CONNECTED")
      return [...connected, ...rest].map((c) => ({
        value: c.id,
        label: formatChannelOptionLabel(c),
        group: c.type || undefined,
      }))
    },
  })
  return { options: q.data ?? [], isLoading: q.isLoading }
}

type RawTemplate = { metaTemplateName?: string; name?: string; label?: string; languageCode?: string }

/** Templates aprovados da WABA. Com `channelId`, filtra pelo canal Cloud API. */
export function useTemplateOptions(channelId?: string | null) {
  const q = useQuery({
    queryKey: ["editor-wa-templates", channelId ?? "default"],
    staleTime: STALE,
    queryFn: async (): Promise<Opt[]> => {
      const qs = channelId?.trim()
        ? `?channelId=${encodeURIComponent(channelId.trim())}`
        : ""
      const list = asArray(
        await getJson(`/api/whatsapp-template-configs/approved${qs}`),
      ) as RawTemplate[]
      return list.map((t) => {
        const v = t.metaTemplateName ?? t.name ?? ""
        return { value: v, label: t.label || v }
      })
    },
  })
  return { options: q.data ?? [], isLoading: q.isLoading }
}

type RawTemplateDetail = {
  metaTemplateName?: string
  name?: string
  bodyPreview?: string
  headerPreview?: string
  footerPreview?: string
  buttons?: { type?: string; text?: string }[]
  headerFormat?: string | null
}

export type TemplateButtonKind = "reply" | "url" | "call" | "flow" | "copy"

export type TemplateDetail = {
  bodyPreview: string
  headerPreview: string
  footerPreview: string
  quickReplies: string[]
  headerFormat?: string | null
  buttons: { title: string; kind: TemplateButtonKind }[]
}

/**
 * Mapa nome-do-template → { bodyPreview, quickReplies }. Usado pelo nó
 * "Template WhatsApp" para exibir o corpo e derivar os botões de resposta
 * rápida (roteamento). Reusa a MESMA query de useTemplateOptions (cache
 * compartilhado) para não duplicar fetch.
 */
export function useTemplateDetailsMap(channelId?: string | null) {
  const q = useQuery({
    queryKey: ["editor-wa-templates-detail", channelId ?? "default"],
    staleTime: STALE,
    queryFn: async (): Promise<Map<string, TemplateDetail>> => {
      const qs = channelId?.trim()
        ? `?channelId=${encodeURIComponent(channelId.trim())}`
        : ""
      const list = asArray(
        await getJson(`/api/whatsapp-template-configs/approved${qs}`),
      ) as RawTemplateDetail[]
      const map = new Map<string, TemplateDetail>()
      for (const t of list) {
        const name = t.metaTemplateName ?? t.name ?? ""
        if (!name) continue
        const buttons = (t.buttons ?? [])
          .map((b) => {
            const title = (b.text ?? "").trim()
            if (!title) return null
            const type = String(b.type ?? "").toUpperCase()
            const kind: TemplateButtonKind =
              type === "URL" ? "url"
              : type === "PHONE_NUMBER" || type === "VOICE_CALL" ? "call"
              : type === "FLOW" ? "flow"
              : type === "COPY_CODE" || type === "OTP" ? "copy"
              : "reply"
            return { title, kind }
          })
          .filter((x): x is { title: string; kind: TemplateButtonKind } => Boolean(x))
        const quickReplies = buttons.filter((b) => b.kind === "reply").map((b) => b.title)
        map.set(name, {
          bodyPreview: (t.bodyPreview ?? "").trim(),
          headerPreview: (t.headerPreview ?? "").trim(),
          footerPreview: (t.footerPreview ?? "").trim(),
          quickReplies,
          headerFormat: t.headerFormat ?? null,
          buttons,
        })
      }
      return map
    },
  })
  return { detailsMap: q.data ?? new Map<string, TemplateDetail>(), isLoading: q.isLoading }
}

type RawAutomation = { id: string; name: string }

export function useAutomationOptions() {
  const q = useQuery({
    queryKey: ["editor-automations"],
    staleTime: STALE,
    queryFn: async (): Promise<Opt[]> => {
      const list = asArray(await getJson("/api/automations?perPage=100")) as RawAutomation[]
      return list.map((a) => ({ value: a.id, label: a.name }))
    },
  })
  return { options: q.data ?? [], isLoading: q.isLoading }
}

type RawCustomField = { id: string; name?: string; label?: string; type?: string; options?: string[] }

const BUILTIN_FIELDS: Record<"contact" | "deal", Opt[]> = {
  contact: [
    { value: "name", label: "Nome do contato" },
    { value: "email", label: "E-mail" },
    { value: "phone", label: "Telefone" },
    { value: "source", label: "Origem" },
    { value: "lifecycleStage", label: "Ciclo de vida" },
    { value: "assignedToId", label: "Responsável" },
  ],
  deal: [
    { value: "title", label: "Título do negócio" },
    { value: "value", label: "Valor" },
    { value: "status", label: "Status" },
    { value: "stageId", label: "Etapa (ID)" },
  ],
}

/**
 * Custom fields crus (contato + negócio) para montar tokens de variável
 * (`{{contactCustomFields.<name>}}` / `{{dealCustomFields.<name>}}`) no
 * autocomplete do textarea de mensagem. Retorna o `name` (slug), não o id.
 */
export function useCustomFieldTokens() {
  const contact = useQuery({
    queryKey: ["editor-custom-fields-raw", "contact"],
    staleTime: STALE,
    queryFn: async (): Promise<RawCustomField[]> =>
      asArray(await getJson("/api/custom-fields?entity=contact")) as RawCustomField[],
  })
  const deal = useQuery({
    queryKey: ["editor-custom-fields-raw", "deal"],
    staleTime: STALE,
    queryFn: async (): Promise<RawCustomField[]> =>
      asArray(await getJson("/api/custom-fields?entity=deal")) as RawCustomField[],
  })
  return {
    contact: contact.data ?? [],
    deal: deal.data ?? [],
    isLoading: contact.isLoading || deal.isLoading,
  }
}

/** Campos nativos + custom da entidade, para `update_field`. */
export function useFieldOptions(entity: "contact" | "deal") {
  const q = useQuery({
    queryKey: ["editor-custom-fields", entity],
    staleTime: STALE,
    queryFn: async (): Promise<Opt[]> => {
      const list = asArray(await getJson(`/api/custom-fields?entity=${entity}`)) as RawCustomField[]
      return list
        .filter((c) => c.name || c.id)
        .map((c) => ({
          value: c.name || c.id, // slug — o que o executor espera
          label: c.label && c.name ? `${c.label} (${c.name})` : (c.label || c.name || c.id),
          group: "Campos personalizados",
        }))
    },
  })
  const builtins = BUILTIN_FIELDS[entity].map((o) => ({ ...o, group: "Campos nativos" }))
  return { options: [...builtins, ...(q.data ?? [])], isLoading: q.isLoading }
}

/**
 * Campos personalizados da org para o seletor de `condition`
 * (`contactCustomFields.<name>` / `dealCustomFields.<name>`).
 * Combine com `CONDITION_FIELDS` no consumidor.
 */
export function useConditionFieldOptions() {
  const q = useQuery({
    queryKey: ["editor-condition-custom-fields"],
    staleTime: STALE,
    queryFn: async (): Promise<Opt[]> => {
      const [contacts, deals] = await Promise.all([
        asArray(await getJson("/api/custom-fields?entity=contact")) as RawCustomField[],
        asArray(await getJson("/api/custom-fields?entity=deal")) as RawCustomField[],
      ])
      const contactOpts = contacts
        .filter((c) => (c.name || "").trim())
        .map((c) => ({
          value: `contactCustomFields.${c.name}`,
          label: c.label || c.name || c.id,
          group: "Campos personalizados (contato)",
        }))
      const dealOpts = deals
        .filter((c) => (c.name || "").trim())
        .map((c) => ({
          value: `dealCustomFields.${c.name}`,
          label: c.label || c.name || c.id,
          group: "Campos personalizados (negócio)",
        }))
      return [...contactOpts, ...dealOpts]
    },
  })
  return { options: q.data ?? [], isLoading: q.isLoading }
}

export type CustomFieldConditionMeta = { type: string; options: string[] }

/**
 * Metadados (type + options) dos campos personalizados, indexados pelo
 * MESMO path usado em `field` da condição (`contactCustomFields.<name>` /
 * `dealCustomFields.<name>`). Usado pelo widget de valor da condição para
 * decidir se mostra dropdown (SELECT/MULTI_SELECT/BOOLEAN) ou texto livre.
 * Reusa a query de `useCustomFieldTokens` (mesma queryKey).
 */
export function useCustomFieldConditionMeta() {
  const contact = useQuery({
    queryKey: ["editor-custom-fields-raw", "contact"],
    staleTime: STALE,
    queryFn: async (): Promise<RawCustomField[]> =>
      asArray(await getJson("/api/custom-fields?entity=contact")) as RawCustomField[],
  })
  const deal = useQuery({
    queryKey: ["editor-custom-fields-raw", "deal"],
    staleTime: STALE,
    queryFn: async (): Promise<RawCustomField[]> =>
      asArray(await getJson("/api/custom-fields?entity=deal")) as RawCustomField[],
  })
  const byPath = new Map<string, CustomFieldConditionMeta>()
  for (const c of contact.data ?? []) {
    if (!(c.name || "").trim()) continue
    byPath.set(`contactCustomFields.${c.name}`, {
      type: (c.type || "").toUpperCase(),
      options: c.options ?? [],
    })
  }
  for (const c of deal.data ?? []) {
    if (!(c.name || "").trim()) continue
    byPath.set(`dealCustomFields.${c.name}`, {
      type: (c.type || "").toUpperCase(),
      options: c.options ?? [],
    })
  }
  return { byPath, isLoading: contact.isLoading || deal.isLoading }
}

export type CustomFieldSlugMeta = { type: string; options: string[] }

/**
 * Metadados (type + options) indexados pelo slug (`name`) do custom field,
 * para o nó `update_field` (que grava só o slug em `config.field`).
 * Reusa a queryKey de `useCustomFieldTokens` / `useCustomFieldConditionMeta`.
 */
type RawProduct = { id: string; name?: string; sku?: string | null }

export function useProductOptions() {
  const q = useQuery({
    queryKey: ["editor-products"],
    staleTime: STALE,
    queryFn: async (): Promise<Opt[]> => {
      const json = (await getJson("/api/products?perPage=200")) as Record<string, unknown>
      const list = (
        Array.isArray(json.products) ? json.products : asArray(json)
      ) as RawProduct[]
      return list
        .filter((p) => p.id && (p.name || "").trim())
        .map((p) => ({
          value: p.id,
          label: p.sku ? `${p.name} · ${p.sku}` : p.name || p.id,
        }))
    },
  })
  return { options: q.data ?? [], isLoading: q.isLoading, isError: q.isError }
}

export function useCustomFieldMetaBySlug(entity: "contact" | "deal") {
  const q = useQuery({
    queryKey: ["editor-custom-fields-raw", entity],
    staleTime: STALE,
    queryFn: async (): Promise<RawCustomField[]> =>
      asArray(await getJson(`/api/custom-fields?entity=${entity}`)) as RawCustomField[],
  })
  const bySlug = new Map<string, CustomFieldSlugMeta>()
  for (const c of q.data ?? []) {
    if (!(c.name || "").trim()) continue
    bySlug.set(c.name!, {
      type: (c.type || "").toUpperCase(),
      options: c.options ?? [],
    })
  }
  return { bySlug, isLoading: q.isLoading }
}
