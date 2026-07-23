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
import { apiUrl } from "@/lib/api"

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
  const q = useQuery({
    queryKey: ["editor-pipelines"],
    staleTime: STALE,
    queryFn: async (): Promise<Opt[]> => {
      const list = asArray(await getJson("/api/pipelines")) as RawPipeline[]
      return list.flatMap((p) =>
        (p.stages ?? []).map((s) => ({ value: s.id, label: s.name, group: p.name })),
      )
    },
  })
  return { options: q.data ?? [], isLoading: q.isLoading }
}

/** Funis (pipelines) → value: pipelineId. Para condições `deal.pipelineId`. */
export function usePipelineOptions() {
  const q = useQuery({
    queryKey: ["editor-pipelines-flat"],
    staleTime: STALE,
    queryFn: async (): Promise<Opt[]> => {
      const list = asArray(await getJson("/api/pipelines")) as RawPipeline[]
      return list.map((p) => ({ value: p.id, label: p.name }))
    },
  })
  return { options: q.data ?? [], isLoading: q.isLoading }
}

type RawDepartment = { id: string; name: string }

/** Departamentos da org → value: departmentId. Para `conversation.departmentId`. */
export function useDepartmentOptions() {
  const q = useQuery({
    queryKey: ["editor-departments"],
    staleTime: STALE,
    queryFn: async (): Promise<Opt[]> => {
      const list = asArray(await getJson("/api/settings/departments")) as RawDepartment[]
      return list.map((d) => ({ value: d.id, label: d.name }))
    },
  })
  return { options: q.data ?? [], isLoading: q.isLoading }
}

type RawUser = { id: string; name?: string; email?: string }

export function useUserOptions() {
  const q = useQuery({
    queryKey: ["editor-users"],
    staleTime: STALE,
    queryFn: async (): Promise<Opt[]> => {
      const list = asArray(await getJson("/api/users")) as RawUser[]
      return list.map((u) => ({
        value: u.id,
        label: u.email ? `${u.name ?? u.email} (${u.email})` : (u.name ?? u.id),
      }))
    },
  })
  return { options: q.data ?? [], isLoading: q.isLoading }
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

type RawTemplate = { metaTemplateName?: string; name?: string; label?: string; languageCode?: string }

export function useTemplateOptions() {
  const q = useQuery({
    queryKey: ["editor-wa-templates"],
    staleTime: STALE,
    queryFn: async (): Promise<Opt[]> => {
      const list = asArray(
        await getJson("/api/whatsapp-template-configs/approved"),
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
  buttons?: { type?: string; text?: string }[]
}

export type TemplateDetail = { bodyPreview: string; quickReplies: string[] }

/**
 * Mapa nome-do-template → { bodyPreview, quickReplies }. Usado pelo nó
 * "Template WhatsApp" para exibir o corpo e derivar os botões de resposta
 * rápida (roteamento). Reusa a MESMA query de useTemplateOptions (cache
 * compartilhado) para não duplicar fetch.
 */
export function useTemplateDetailsMap() {
  const q = useQuery({
    queryKey: ["editor-wa-templates-detail"],
    staleTime: STALE,
    queryFn: async (): Promise<Map<string, TemplateDetail>> => {
      const list = asArray(
        await getJson("/api/whatsapp-template-configs/approved"),
      ) as RawTemplateDetail[]
      const map = new Map<string, TemplateDetail>()
      for (const t of list) {
        const name = t.metaTemplateName ?? t.name ?? ""
        if (!name) continue
        const quickReplies = (t.buttons ?? [])
          .filter((b) => String(b.type).toUpperCase() === "QUICK_REPLY" && (b.text ?? "").trim() !== "")
          .map((b) => b.text!.trim())
        map.set(name, { bodyPreview: (t.bodyPreview ?? "").trim(), quickReplies })
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

type RawCustomField = { id: string; name?: string; label?: string }

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

/** Campos nativos + custom da entidade, para `update_field`. */
export function useFieldOptions(entity: "contact" | "deal") {
  const q = useQuery({
    queryKey: ["editor-custom-fields", entity],
    staleTime: STALE,
    queryFn: async (): Promise<Opt[]> => {
      const list = asArray(await getJson(`/api/custom-fields?entity=${entity}`)) as RawCustomField[]
      return list.map((c) => ({
        value: c.id,
        label: c.label || c.name || c.id,
        group: "Campos personalizados",
      }))
    },
  })
  const builtins = BUILTIN_FIELDS[entity].map((o) => ({ ...o, group: "Campos nativos" }))
  return { options: [...builtins, ...(q.data ?? [])], isLoading: q.isLoading }
}
