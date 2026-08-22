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

type RawChannel = { id: string; name?: string; type?: string; status?: string }

/** Canais da org (para condições de gatilho "Se canal = X"). value: channelId. */
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
      return list.map((c) => ({
        value: c.id,
        label: c.name || c.id,
        group: c.type || undefined,
      }))
    },
  })
  return { options: q.data ?? [], isLoading: q.isLoading }
}

type RawTemplate = { metaTemplateName?: string; name?: string; label?: string; language?: string; languageCode?: string }

/** Canal da WABA deste passo: `channelId`, único `channelIds`, ou o herdado. */
export function resolveTemplateChannelId(
  config?: { channelId?: unknown; channelIds?: unknown } | null,
  inherited?: string | null,
): string | undefined {
  const c = config ?? {}
  const one = typeof c.channelId === "string" ? c.channelId.trim() : ""
  if (one) return one
  const many = Array.isArray(c.channelIds)
    ? c.channelIds.filter((x): x is string => typeof x === "string" && x.trim() !== "")
    : []
  if (many.length === 1) return many[0]
  const inh = inherited?.trim()
  return inh || undefined
}

/** Templates aprovados da WABA. Com `channelId`, filtra pelo canal Cloud API. */
export function useTemplateOptions(channelId?: string | null) {
  const q = useQuery({
    queryKey: ["editor-wa-templates", channelId ?? "default"],
    staleTime: 60_000,
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
  language?: string
  languageCode?: string
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
  language?: string
  buttons: { title: string; kind: TemplateButtonKind }[]
}

export function getTemplateDetail(
  map: Map<string, TemplateDetail>,
  name: string,
  language?: string | null,
): TemplateDetail | undefined {
  const n = name.trim()
  if (!n) return undefined
  const lang = language?.trim().toLowerCase()
  if (lang) {
    const hit = map.get(`${n}::${lang}`)
    if (hit) return hit
  }
  return map.get(n)
}

export function mergeTemplateQuickReplies(
  prev: { title?: string; text?: string; gotoStepId?: string }[],
  quickReplies: string[],
): { id: string; title: string; gotoStepId: string }[] {
  return quickReplies.map((title, i) => {
    const match = prev.find(
      (p) => (p.title ?? p.text ?? "").trim().toLowerCase() === title.toLowerCase(),
    )
    return { id: `btn_${i}`, title, gotoStepId: match?.gotoStepId ?? "" }
  })
}

/**
 * Mapa nome-do-template → { bodyPreview, quickReplies }. Usado pelo nó
 * "Template WhatsApp" para exibir o corpo e derivar os botões de resposta
 * rápida (roteamento). Com `channelId`, lê a WABA daquele canal — sem isso
 * a Graph devolve o último CONNECTED, que pode ser outro número.
 */
export function useTemplateDetailsMap(channelId?: string | null) {
  const q = useQuery({
    queryKey: ["editor-wa-templates-detail", channelId ?? "default"],
    staleTime: 60_000,
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
        const language = (t.language ?? t.languageCode ?? "pt_BR").trim()
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
        const detail: TemplateDetail = {
          bodyPreview: (t.bodyPreview ?? "").trim(),
          headerPreview: (t.headerPreview ?? "").trim(),
          footerPreview: (t.footerPreview ?? "").trim(),
          quickReplies,
          headerFormat: t.headerFormat ?? null,
          language,
          buttons,
        }
        map.set(`${name}::${language.toLowerCase()}`, detail)
        const existing = map.get(name)
        if (!existing || language.toLowerCase() === "pt_br") map.set(name, detail)
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
