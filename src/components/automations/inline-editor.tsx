"use client"

/**
 * Edição inline (sem modal) da config de cada ação dentro do próprio card
 * do canvas. Renderiza os campos a partir do esquema declarativo
 * (`editor-fields.ts`) e popula selects com dados reais (`editor-data.ts`).
 *
 * Toda a UI vive em `.n-config` com as classes `nodrag nopan nowheel` para
 * que digitar/rolar não arraste nem dê pan/zoom no React Flow.
 */
import { useRef, useState } from "react"
import { DropdownGlass, type DropdownOption } from "@/components/crm/dropdown-glass"
import { InputGlass } from "@/components/crm/input-glass"
import { cn } from "@/lib/utils"
import {
  BOOL_OPTS,
  CHANNEL_KIND_OPTS,
  CONDITION_BOOL_FIELDS,
  CONDITION_FIELDS,
  CONDITION_OPS,
  DEAL_STATUS_OPTS,
  STEP_FIELDS,
  WEEK_DAYS,
  type EditorField,
  type SourceKey,
} from "./editor-fields"
import {
  useAiAgentOptions,
  useAutomationOptions,
  useDepartmentOptions,
  useFieldOptions,
  usePipelineOptions,
  useStageOptions,
  useTagOptions,
  useTemplateDetailsMap,
  useTemplateOptions,
  useUserOptions,
  type Opt,
} from "./editor-data"

const CONDITION_FIELD_SET = new Set(CONDITION_FIELDS.map((f) => f.value))
const CUSTOM_FIELD_SENTINEL = "__custom__"

type Cfg = Record<string, unknown>
type StepOpt = { value: string; label: string }

const str = (v: unknown) => (v == null ? "" : String(v))
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0)
let rseq = 0
const rid = (p: string) => `${p}_${Date.now().toString(36)}_${rseq++}`

// ───────────────────────────── Editor raiz ─────────────────────────────

export function NodeConfigEditor({
  stepType,
  config,
  steps,
  onChange,
}: {
  stepType: string
  config: Cfg
  steps: StepOpt[]
  onChange: (next: Cfg) => void
}) {
  const fields = STEP_FIELDS[stepType]
  const set = (key: string, value: unknown) => onChange({ ...config, [key]: value })

  if (!fields) {
    return (
      <div className="n-config nodrag nopan nowheel" onClick={(e) => e.stopPropagation()}>
        <p className="cfg-info">Este bloco não possui configuração.</p>
      </div>
    )
  }

  return (
    <div
      className="n-config nodrag nopan nowheel"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {fields.map((f, i) => (
        <Field key={"key" in f ? f.key : `f${i}`} field={f} config={config} steps={steps} set={set} onChange={onChange} />
      ))}
    </div>
  )
}

// ───────────────────────────── Dispatcher ─────────────────────────────

function Field({
  field,
  config,
  steps,
  set,
  onChange,
}: {
  field: EditorField
  config: Cfg
  steps: StepOpt[]
  set: (k: string, v: unknown) => void
  onChange: (next: Cfg) => void
}) {
  switch (field.kind) {
    case "info":
      return <p className="cfg-info">{field.text}</p>

    case "text":
      return (
        <Labeled label={field.label} optional={field.optional} hint={field.hint}>
          <InputGlass
            className="nodrag"
            value={str(config[field.key])}
            placeholder={field.placeholder}
            onChange={(e) => set(field.key, e.target.value)}
          />
        </Labeled>
      )

    case "tag":
      return <TagInput label={field.label} optional={field.optional} value={str(config[field.key])} onChange={(v) => set(field.key, v)} />

    case "textarea":
      return (
        <Labeled label={field.label} optional={field.optional} hint={field.hint}>
          <textarea
            className="cfg-textarea nodrag"
            rows={3}
            value={str(config[field.key])}
            placeholder={field.placeholder}
            onChange={(e) => set(field.key, e.target.value)}
          />
        </Labeled>
      )

    case "number":
      return (
        <Labeled label={field.label} optional={field.optional} hint={field.hint}>
          <div className="cfg-affix">
            {field.suffix && <span className="cfg-suffix">{field.suffix}</span>}
            <InputGlass
              type="number"
              className="nodrag"
              min={field.min}
              step={field.step}
              value={str(config[field.key])}
              onChange={(e) => set(field.key, e.target.value === "" ? "" : Number(e.target.value))}
            />
          </div>
        </Labeled>
      )

    case "select":
      return (
        <Labeled label={field.label} optional={field.optional} hint={field.hint}>
          <ConfigSelect
            value={str(config[field.key])}
            options={field.options}
            placeholder="Selecione…"
            onChange={(v) => set(field.key, v)}
          />
        </Labeled>
      )

    case "step":
      return (
        <Labeled label={field.label} optional={field.optional} hint={field.hint}>
          <ConfigSelect
            value={str(config[field.key])}
            options={steps}
            placeholder="Selecione um passo…"
            onChange={(v) => set(field.key, v)}
          />
        </Labeled>
      )

    case "source":
      return (
        <Labeled label={field.label} optional={field.optional} hint={field.hint}>
          <SourceSelect
            source={field.source}
            value={str(config[field.key])}
            onChange={(v) => set(field.key, v)}
          />
        </Labeled>
      )

    case "duration":
      return <DurationField label={field.label} ms={num(config[field.key])} onChange={(ms) => set(field.key, ms)} />

    case "hours":
      return (
        <Labeled label={field.label}>
          <div className="cfg-affix">
            <InputGlass
              type="number"
              min={0}
              className="nodrag"
              value={String(Math.round((num(config[field.key]) / 3_600_000) * 100) / 100)}
              onChange={(e) => set(field.key, Math.max(0, Number(e.target.value)) * 3_600_000)}
            />
            <span className="cfg-suffix">h</span>
          </div>
        </Labeled>
      )

    case "delay":
      return <DelayField ms={num(config[field.key])} onChange={(ms) => set(field.key, ms)} />

    case "updateField":
      return <UpdateFieldEditor config={config} onChange={onChange} />

    case "templatePreview":
      return <TemplatePreview templateName={str(config.templateName)} />


    case "builder":
      switch (field.builder) {
        case "buttons":
          return <ButtonsBuilder label={field.label} variant="text" items={asArr(config[field.key])} steps={steps} onChange={(v) => set(field.key, v)} />
        case "buttonsTitle":
          return <ButtonsBuilder label={field.label} variant="title" max={3} items={asArr(config[field.key])} steps={steps} onChange={(v) => set(field.key, v)} />
        case "headers":
          return <HeadersBuilder items={asArr(config[field.key])} onChange={(v) => set(field.key, v)} />
        case "schedule":
          return <ScheduleBuilder items={asArr(config[field.key])} onChange={(v) => set(field.key, v)} />
        case "condition":
          return <ConditionBuilder config={config} steps={steps} onChange={onChange} />
      }
  }
}

function asArr<T = Record<string, unknown>>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

// ───────────────────────────── Primitivos ─────────────────────────────

function Labeled({
  label,
  optional,
  hint,
  children,
}: {
  label: string
  optional?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="cfg-field">
      <span className="cfg-label">
        {label}
        {optional && <em className="cfg-opt">opcional</em>}
      </span>
      {children}
      {hint && <span className="cfg-hint">{hint}</span>}
    </label>
  )
}

function TagInput({
  label,
  optional,
  value,
  onChange,
}: {
  label: string
  optional?: boolean
  value: string
  onChange: (v: string) => void
}) {
  const { options, isLoading } = useTagOptions()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState<string | null>(null)
  const closeT = useRef<ReturnType<typeof setTimeout> | null>(null)

  // query === null → mostra TODAS (foco sem digitar); senão filtra pelo texto.
  const q = (query ?? "").trim().toLowerCase()
  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options
  const exists = options.some((o) => o.value.toLowerCase() === value.trim().toLowerCase())

  const choose = (v: string) => {
    onChange(v)
    setQuery(null)
    setOpen(false)
  }

  return (
    <div className="cfg-field">
      <span className="cfg-label">
        {label}
        {optional && <em className="cfg-opt">opcional</em>}
      </span>
      <div className="cfg-combo">
        <InputGlass
          className="nodrag"
          value={value}
          placeholder={isLoading ? "Carregando tags…" : "Buscar ou criar tag…"}
          onFocus={() => {
            if (closeT.current) clearTimeout(closeT.current)
            setQuery(null)
            setOpen(true)
          }}
          onBlur={() => {
            closeT.current = setTimeout(() => setOpen(false), 160)
          }}
          onChange={(e) => {
            onChange(e.target.value)
            setQuery(e.target.value)
            setOpen(true)
          }}
        />
        {open && (
          <div className="cfg-pop nowheel nopan">
            {isLoading && <div className="cfg-pop-empty">Carregando tags…</div>}
            {!isLoading && filtered.length === 0 && (
              <div className="cfg-pop-empty">{value.trim() ? "Nenhuma tag — Enter cria esta." : "Nenhuma tag cadastrada."}</div>
            )}
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`cfg-pop-item nodrag${o.value === value ? " on" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault()
                  choose(o.value)
                }}
              >
                <span className="cfg-pop-dot" />
                {o.label}
              </button>
            ))}
            {value.trim() && !exists && (
              <button
                type="button"
                className="cfg-pop-item create nodrag"
                onMouseDown={(e) => {
                  e.preventDefault()
                  choose(value.trim())
                }}
              >
                + Criar tag “{value.trim()}”
              </button>
            )}
          </div>
        )}
      </div>
      <span className="cfg-hint">Selecione uma tag existente ou digite para criar uma nova.</span>
    </div>
  )
}

function stopFlowPointer(e: React.PointerEvent) {
  e.stopPropagation()
}

/** Select do DS v2 (DropdownGlass) — substitui `<select>` nativo. */
function ConfigSelect({
  value,
  options,
  placeholder,
  onChange,
  loading,
  allowEmpty = true,
}: {
  value: string
  options: Opt[]
  placeholder?: string
  onChange: (v: string) => void
  loading?: boolean
  allowEmpty?: boolean
}) {
  const ph = loading ? "Carregando…" : (placeholder ?? "Selecione…")
  const missing =
    value && !options.some((o) => o.value === value)
      ? [{ value, label: value }]
      : []
  const dropdownOptions: DropdownOption[] = [
    ...(allowEmpty ? [{ value: "", label: ph }] : []),
    ...missing.map((o) => ({ value: o.value, label: o.label })),
    ...options.map((o) => ({
      value: o.value,
      label: o.label,
      description: o.group,
    })),
  ]

  return (
    <div className="cfg-select-wrap nodrag nopan" onPointerDown={stopFlowPointer}>
      <DropdownGlass
        options={dropdownOptions}
        value={value}
        onValueChange={onChange}
        placeholder={ph}
        matchTriggerWidth
        disabled={loading}
        triggerClassName="!w-full"
      />
    </div>
  )
}

function SourceSelect({ source, value, onChange }: { source: SourceKey; value: string; onChange: (v: string) => void }) {
  switch (source) {
    case "stage":
      return <HookSelect hook={useStageOptions} value={value} onChange={onChange} placeholder="Selecione um estágio…" />
    case "template":
      return <HookSelect hook={useTemplateOptions} value={value} onChange={onChange} placeholder="Selecione um template…" />
    case "automation":
      return <HookSelect hook={useAutomationOptions} value={value} onChange={onChange} placeholder="Selecione uma automação…" />
    case "aiAgentId":
      return <AgentSelect by="id" value={value} onChange={onChange} />
    case "aiAgentUserId":
      return <AgentSelect by="userId" value={value} onChange={onChange} />
    case "owner":
      return <OwnerSelect value={value} onChange={onChange} />
  }
}

function HookSelect({
  hook,
  value,
  onChange,
  placeholder,
}: {
  hook: () => { options: Opt[]; isLoading: boolean }
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const { options, isLoading } = hook()
  return <ConfigSelect value={value} options={options} onChange={onChange} placeholder={placeholder} loading={isLoading} />
}

function AgentSelect({ by, value, onChange }: { by: "id" | "userId"; value: string; onChange: (v: string) => void }) {
  const { options, isLoading } = useAiAgentOptions(by)
  return <ConfigSelect value={value} options={options} onChange={onChange} placeholder="Selecione um agente…" loading={isLoading} />
}

function OwnerSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const users = useUserOptions()
  const agents = useAiAgentOptions("userId")
  const options: Opt[] = [
    ...users.options.map((o) => ({ ...o, group: "Usuários" })),
    ...agents.options.map((o) => ({ ...o, group: "Agentes IA" })),
  ]
  return (
    <ConfigSelect
      value={value}
      options={options}
      onChange={onChange}
      placeholder="Selecione um responsável…"
      loading={users.isLoading || agents.isLoading}
    />
  )
}

// ───────────────────── Duração (h/m/s) e Delay (valor+unidade) ─────────────────────

function DurationField({ label, ms, onChange }: { label: string; ms: number; onChange: (ms: number) => void }) {
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  const emit = (nh: number, nm: number, ns: number) => onChange(nh * 3_600_000 + nm * 60_000 + ns * 1000)
  return (
    <div className="cfg-field">
      <span className="cfg-label">{label}</span>
      <div className="cfg-duration">
        <NumBox v={h} suffix="h" onChange={(x) => emit(x, m, s)} />
        <NumBox v={m} suffix="min" max={59} onChange={(x) => emit(h, x, s)} />
        <NumBox v={s} suffix="seg" max={59} onChange={(x) => emit(h, m, x)} />
      </div>
    </div>
  )
}

function NumBox({ v, suffix, max, onChange }: { v: number; suffix: string; max?: number; onChange: (v: number) => void }) {
  return (
    <div className="cfg-affix">
      <InputGlass
        type="number"
        min={0}
        max={max}
        className="nodrag"
        value={String(v)}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
      />
      <span className="cfg-suffix">{suffix}</span>
    </div>
  )
}

const DELAY_UNITS: Opt[] = [
  { value: "minutes", label: "minutos" },
  { value: "hours", label: "horas" },
  { value: "days", label: "dias" },
]

function DelayField({ ms, onChange }: { ms: number; onChange: (ms: number) => void }) {
  let unit: "minutes" | "hours" | "days" = "minutes"
  let value = Math.round(ms / 60_000)
  if (ms > 0 && ms % 86_400_000 === 0) {
    unit = "days"
    value = ms / 86_400_000
  } else if (ms > 0 && ms % 3_600_000 === 0) {
    unit = "hours"
    value = ms / 3_600_000
  }
  const factor = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 }
  return (
    <div className="cfg-field">
      <span className="cfg-label">Duração</span>
      <div className="cfg-row">
        <InputGlass
          type="number"
          min={0}
          className="nodrag"
          value={String(value)}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value)) * factor[unit])}
        />
        <ConfigSelect value={unit} options={DELAY_UNITS} onChange={(u) => onChange(value * factor[u as keyof typeof factor])} />
      </div>
    </div>
  )
}

// ───────────────────────────── update_field ─────────────────────────────

function UpdateFieldEditor({ config, onChange }: { config: Cfg; onChange: (next: Cfg) => void }) {
  const entity = (str(config.entity) || "contact") as "contact" | "deal"
  const { options, isLoading } = useFieldOptions(entity)
  const set = (k: string, v: unknown) => onChange({ ...config, [k]: v })
  return (
    <>
      <Labeled label="Entidade">
        <ConfigSelect
          value={entity}
          options={[
            { value: "contact", label: "Contato" },
            { value: "deal", label: "Negócio" },
          ]}
          onChange={(v) => onChange({ ...config, entity: v, field: "" })}
        />
      </Labeled>
      <Labeled label="Campo">
        <ConfigSelect value={str(config.field)} options={options} loading={isLoading} onChange={(v) => set("field", v)} placeholder="Selecione o campo…" />
      </Labeled>
      <Labeled label="Valor" hint="Aceita variáveis, ex.: {{lastResponse}}">
        <InputGlass className="nodrag" value={str(config.value)} onChange={(e) => set("value", e.target.value)} />
      </Labeled>
    </>
  )
}

// ─────────────────────── Preview do template WhatsApp ───────────────────────

/** Bloco read-only: corpo do template + botões (quick-reply) do template
 *  selecionado. Dados do mesmo cache de `useTemplateOptions`. */
function TemplatePreview({ templateName }: { templateName: string }) {
  const { detailsMap, isLoading } = useTemplateDetailsMap()
  if (!templateName) return null
  const detail = detailsMap.get(templateName)
  if (isLoading && !detail) {
    return <p className="cfg-info">Carregando preview…</p>
  }
  if (!detail) return null
  const hasBody = detail.bodyPreview.trim() !== ""
  const hasBtns = detail.quickReplies.length > 0
  if (!hasBody && !hasBtns) return null
  return (
    <div className="cfg-field">
      <span className="cfg-label">Pré-visualização</span>
      <div className="cfg-tpl-preview nodrag nowheel">
        {hasBody && <p className="cfg-tpl-body">{detail.bodyPreview}</p>}
        {hasBtns && (
          <div className="cfg-tpl-btns">
            {detail.quickReplies.map((t, i) => (
              <span key={`${t}-${i}`} className="cfg-tpl-btn">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ───────────────────────────── Builders ─────────────────────────────

type BtnItem = { id?: string; text?: string; title?: string; gotoStepId?: string }

function ButtonsBuilder({
  label,
  variant,
  max,
  items,
  steps,
  onChange,
}: {
  label: string
  variant: "text" | "title"
  max?: number
  items: BtnItem[]
  steps: StepOpt[]
  onChange: (v: BtnItem[]) => void
}) {
  const key = variant
  const update = (i: number, patch: Partial<BtnItem>) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  const add = () => onChange([...items, { id: rid("btn"), [key]: "" }])
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const full = max != null && items.length >= max
  return (
    <div className="cfg-field">
      <span className="cfg-label">{label}</span>
      <div className="cfg-list">
        {items.map((it, i) => (
          <div className="cfg-item" key={it.id ?? i}>
            <div className="cfg-item-head">
              <InputGlass
                className="nodrag"
                placeholder={`Botão ${i + 1}`}
                value={str(it[key])}
                onChange={(e) => update(i, { [key]: e.target.value })}
              />
              <button className="cfg-x nodrag" title="Remover" onClick={() => remove(i)}>
                ×
              </button>
            </div>
            <ConfigSelect value={str(it.gotoStepId)} options={steps} placeholder="Ir para passo…" onChange={(v) => update(i, { gotoStepId: v })} />
          </div>
        ))}
      </div>
      {!full && (
        <button className="cfg-add nodrag" onClick={add}>
          + Adicionar botão
        </button>
      )}
    </div>
  )
}

type Header = { key?: string; value?: string }

function HeadersBuilder({ items, onChange }: { items: Header[]; onChange: (v: Header[]) => void }) {
  const update = (i: number, patch: Partial<Header>) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  return (
    <div className="cfg-field">
      <span className="cfg-label">Headers</span>
      <div className="cfg-list">
        {items.map((it, i) => (
          <div className="cfg-row" key={i}>
            <InputGlass className="nodrag" placeholder="Chave" value={str(it.key)} onChange={(e) => update(i, { key: e.target.value })} />
            <InputGlass className="nodrag" placeholder="Valor" value={str(it.value)} onChange={(e) => update(i, { value: e.target.value })} />
            <button className="cfg-x nodrag" title="Remover" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
              ×
            </button>
          </div>
        ))}
      </div>
      <button className="cfg-add nodrag" onClick={() => onChange([...items, { key: "", value: "" }])}>
        + Adicionar header
      </button>
    </div>
  )
}

type Schedule = { days?: number[]; from?: string; to?: string }

function ScheduleBuilder({ items, onChange }: { items: Schedule[]; onChange: (v: Schedule[]) => void }) {
  const update = (i: number, patch: Partial<Schedule>) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  const toggleDay = (i: number, day: number) => {
    const days = new Set(items[i]?.days ?? [])
    days.has(day) ? days.delete(day) : days.add(day)
    update(i, { days: [...days].sort() })
  }
  return (
    <div className="cfg-field">
      <span className="cfg-label">Horários de funcionamento</span>
      <div className="cfg-list">
        {items.map((it, i) => (
          <div className="cfg-item" key={i}>
            <div className="cfg-days">
              {WEEK_DAYS.map((d) => (
                <button
                  key={d.value}
                  className={`cfg-day nodrag${(it.days ?? []).includes(d.value) ? " on" : ""}`}
                  onClick={() => toggleDay(i, d.value)}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <div className="cfg-row">
              <input type="time" className="cfg-input nodrag" value={str(it.from) || "09:00"} onChange={(e) => update(i, { from: e.target.value })} />
              <span className="cfg-dash">→</span>
              <input type="time" className="cfg-input nodrag" value={str(it.to) || "18:00"} onChange={(e) => update(i, { to: e.target.value })} />
              <button className="cfg-x nodrag" title="Remover" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
      <button className="cfg-add nodrag" onClick={() => onChange([...items, { days: [1, 2, 3, 4, 5], from: "09:00", to: "18:00" }])}>
        + Adicionar faixa horária
      </button>
    </div>
  )
}

type Rule = { field?: string; op?: string; value?: unknown }
type Branch = { id?: string; label?: string; rules?: Rule[]; nextStepId?: string }

const NO_VALUE_OPS = new Set(["empty", "not_empty"])

/**
 * Widget de VALOR da regra, escolhido pelo campo/operador selecionado.
 * Cada ramo renderiza um componente próprio que chama seu hook — sem
 * violar as regras de hooks (o condicional é sobre QUAL componente
 * renderiza, não sobre chamar hooks condicionalmente).
 */
function ConditionValue({
  field,
  op,
  value,
  onChange,
}: {
  field: string
  op: string
  value: string
  onChange: (v: string) => void
}) {
  const isTagField = field.endsWith(".tags") || field.endsWith(".tagIds")
  if (op === "has_tag" || op === "not_has_tag" || isTagField) {
    return <HookSelect hook={useTagOptions} value={value} onChange={onChange} placeholder="Selecione uma tag…" />
  }
  if (CONDITION_BOOL_FIELDS.has(field)) {
    return <ConfigSelect value={value} options={BOOL_OPTS} onChange={onChange} placeholder="Sim/Não" />
  }
  if (field.endsWith("assignedToId") || field.endsWith("ownerId")) {
    return <OwnerSelect value={value} onChange={onChange} />
  }
  if (field === "conversation.departmentId") {
    return <HookSelect hook={useDepartmentOptions} value={value} onChange={onChange} placeholder="Selecione um departamento…" />
  }
  if (field === "deal.stageId") {
    return <HookSelect hook={useStageOptions} value={value} onChange={onChange} placeholder="Selecione uma etapa…" />
  }
  if (field === "deal.pipelineId") {
    return <HookSelect hook={usePipelineOptions} value={value} onChange={onChange} placeholder="Selecione um funil…" />
  }
  if (field === "deal.status") {
    return <ConfigSelect value={value} options={DEAL_STATUS_OPTS} onChange={onChange} placeholder="Status…" />
  }
  if (field === "conversation.channel") {
    return <ConfigSelect value={value} options={CHANNEL_KIND_OPTS} onChange={onChange} placeholder="Canal…" />
  }
  return <InputGlass className="nodrag" placeholder="valor" value={value} onChange={(e) => onChange(e.target.value)} />
}

function ConditionBuilder({ config, steps, onChange }: { config: Cfg; steps: StepOpt[]; onChange: (next: Cfg) => void }) {
  const branches = asArr<Branch>(config.branches)
  const setBranches = (b: Branch[]) => onChange({ ...config, branches: b })
  const updateBranch = (bi: number, patch: Partial<Branch>) => setBranches(branches.map((b, i) => (i === bi ? { ...b, ...patch } : b)))
  const updateRule = (bi: number, ri: number, patch: Partial<Rule>) => {
    const rules = (branches[bi]?.rules ?? []).map((r, i) => (i === ri ? { ...r, ...patch } : r))
    updateBranch(bi, { rules })
  }
  return (
    <div className="cfg-field">
      <span className="cfg-label">Condições</span>
      <div className="cfg-list">
        {branches.map((b, bi) => (
          <div className="cfg-branch" key={b.id ?? bi}>
            <div className="cfg-item-head">
              <InputGlass
                className="nodrag"
                placeholder={`Ramo ${bi + 1} (rótulo opcional)`}
                value={str(b.label)}
                onChange={(e) => updateBranch(bi, { label: e.target.value })}
              />
              {branches.length > 1 && (
                <button className="cfg-x nodrag" title="Remover ramo" onClick={() => setBranches(branches.filter((_, i) => i !== bi))}>
                  ×
                </button>
              )}
            </div>
            {(b.rules ?? []).map((r, ri) => {
              const noVal = NO_VALUE_OPS.has(str(r.op))
              const field = str(r.field)
              const isCustom = !!field && !CONDITION_FIELD_SET.has(field)
              return (
                <div className="cfg-rule" key={ri}>
                  <ConfigSelect
                    value={isCustom ? CUSTOM_FIELD_SENTINEL : field}
                    options={[
                      ...CONDITION_FIELDS,
                      { value: CUSTOM_FIELD_SENTINEL, label: "Outro (caminho livre)…" },
                    ]}
                    placeholder="campo"
                    onChange={(v) => {
                      // Trocar de campo zera o valor (o widget muda de tipo).
                      // "Outro" injeta um seed editável (`variables.`).
                      if (v === CUSTOM_FIELD_SENTINEL) {
                        updateRule(bi, ri, { field: "variables.", value: "" })
                      } else {
                        updateRule(bi, ri, { field: v, value: "" })
                      }
                    }}
                  />
                  {isCustom && (
                    <InputGlass
                      className="nodrag"
                      placeholder="caminho (ex.: variables.resposta)"
                      value={field}
                      onChange={(e) => updateRule(bi, ri, { field: e.target.value })}
                    />
                  )}
                  <ConfigSelect value={str(r.op)} options={CONDITION_OPS} placeholder="operador" onChange={(v) => updateRule(bi, ri, { op: v })} />
                  {!noVal && (
                    <ConditionValue
                      field={field}
                      op={str(r.op)}
                      value={str(r.value)}
                      onChange={(v) => updateRule(bi, ri, { value: v })}
                    />
                  )}
                  <button
                    className="cfg-x nodrag"
                    title="Remover regra"
                    onClick={() => updateBranch(bi, { rules: (b.rules ?? []).filter((_, i) => i !== ri) })}
                  >
                    ×
                  </button>
                </div>
              )
            })}
            <button className="cfg-add sm nodrag" onClick={() => updateBranch(bi, { rules: [...(b.rules ?? []), { field: "", op: "eq", value: "" }] })}>
              + regra
            </button>
            <div className="cfg-subrow">
              <span className="cfg-sublabel">Quando bater → ir para</span>
              <ConfigSelect value={str(b.nextStepId)} options={steps} placeholder="passo…" onChange={(v) => updateBranch(bi, { nextStepId: v })} />
            </div>
          </div>
        ))}
      </div>
      <button className="cfg-add nodrag" onClick={() => setBranches([...branches, { id: rid("br"), label: "", rules: [{ field: "", op: "eq", value: "" }] }])}>
        + Adicionar ramo
      </button>
      <div className="cfg-subrow">
        <span className="cfg-sublabel">Nenhuma condição → ir para</span>
        <ConfigSelect value={str(config.elseStepId)} options={steps} placeholder="passo…" onChange={(v) => onChange({ ...config, elseStepId: v })} />
      </div>
    </div>
  )
}
