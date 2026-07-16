import {
  IconChecklist,
  IconUsersGroup,
  IconPhone,
  IconCalendarEvent,
  IconMail,
  type IconProps,
} from "@tabler/icons-react"
import type { ComponentType } from "react"

export type ActivityKind = "tarefa" | "reuniao" | "ligacao" | "evento" | "email"
export type ActivityStatus = "pendente" | "concluida"

export interface Activity {
  id: string
  kind: ActivityKind
  title: string
  /** Data/hora de início no formato ISO (YYYY-MM-DDTHH:mm) */
  start: string
  /** Duração em minutos (opcional, para reuniões/eventos) */
  durationMin?: number
  status: ActivityStatus
  /** Contato/lead relacionado */
  withWhom?: string
  notes?: string
  location?: string
  /** Responsável: usuário específico ou departamento (compartilhada). */
  assigneeType?: "user" | "department"
  assigneeUserId?: string | null
  departmentId?: string | null
  /** Rótulo pronto para exibição do responsável (nome do user/depto). */
  assigneeLabel?: string | null
}

export interface ActivityKindMeta {
  label: string
  /** Rótulo no plural para filtros */
  plural: string
  icon: ComponentType<IconProps>
  /** Cor de acento (hex) */
  color: string
  /** Fundo suave para chips/ícones */
  softBg: string
}

export const ACTIVITY_KINDS: Record<ActivityKind, ActivityKindMeta> = {
  tarefa: {
    label: "Tarefa",
    plural: "Tarefas",
    icon: IconChecklist,
    color: "#5b6ff5",
    softBg: "rgba(91,111,245,0.12)",
  },
  reuniao: {
    label: "Reunião",
    plural: "Reuniões",
    icon: IconUsersGroup,
    color: "#a78bfa",
    softBg: "rgba(167,139,250,0.14)",
  },
  ligacao: {
    label: "Ligação",
    plural: "Ligações",
    icon: IconPhone,
    color: "#10b981",
    softBg: "rgba(16,185,129,0.13)",
  },
  evento: {
    label: "Evento",
    plural: "Eventos",
    icon: IconCalendarEvent,
    color: "#f59e0b",
    softBg: "rgba(245,158,11,0.14)",
  },
  email: {
    label: "E-mail",
    plural: "E-mails",
    icon: IconMail,
    color: "#06b6d4",
    softBg: "rgba(6,182,212,0.13)",
  },
}

export const ACTIVITY_KIND_ORDER: ActivityKind[] = ["tarefa", "reuniao", "ligacao", "evento", "email"]

/* ----------------------------- Helpers de data ---------------------------- */

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
]

const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

export const monthLabel = (year: number, month: number) => `${MONTHS[month]} de ${year}`
export { WEEKDAYS_SHORT }

/** Chave YYYY-MM-DD a partir de um Date local (sem fuso). */
export function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Extrai a chave de data (YYYY-MM-DD) de um ISO de atividade. */
export const activityDateKey = (a: Activity) => a.start.slice(0, 10)

/** HH:mm de um ISO de atividade. */
export const activityTime = (a: Activity) => a.start.slice(11, 16)

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Matriz de 6 semanas (42 dias) que cobre o mês, começando no domingo. */
export function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const start = new Date(first)
  start.setDate(1 - first.getDay())
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

export function longDateLabel(d: Date): string {
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`
}

/* -------------------------------- Mock data ------------------------------- */

/** Datas relativas a hoje, para a demo sempre parecer atual. */
function relISO(dayOffset: number, time: string): string {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  return `${dateKey(d)}T${time}`
}

export const activities: Activity[] = [
  {
    id: "a1",
    kind: "reuniao",
    title: "Reunião de descoberta — Grand Italia",
    start: relISO(0, "09:30"),
    durationMin: 45,
    status: "pendente",
    withWhom: "Marina Alves",
    location: "Google Meet",
  },
  {
    id: "a2",
    kind: "ligacao",
    title: "Follow-up de proposta",
    start: relISO(0, "11:00"),
    durationMin: 20,
    status: "pendente",
    withWhom: "Carlos Pereira",
  },
  {
    id: "a3",
    kind: "tarefa",
    title: "Enviar contrato para assinatura",
    start: relISO(0, "14:00"),
    status: "concluida",
    withWhom: "Tech Solutions",
  },
  {
    id: "a4",
    kind: "email",
    title: "Responder dúvidas sobre integração",
    start: relISO(0, "16:30"),
    status: "pendente",
    withWhom: "Fernanda Lima",
  },
  {
    id: "a5",
    kind: "tarefa",
    title: "Atualizar cadastro do lead",
    start: relISO(-1, "10:00"),
    status: "pendente",
    withWhom: "João Mendes",
  },
  {
    id: "a6",
    kind: "reuniao",
    title: "Apresentação da plataforma",
    start: relISO(2, "15:00"),
    durationMin: 60,
    status: "pendente",
    withWhom: "Loja Bella",
    location: "Escritório - Sala 2",
  },
  {
    id: "a7",
    kind: "evento",
    title: "Webinar: Automação de vendas",
    start: relISO(3, "19:00"),
    durationMin: 90,
    status: "pendente",
  },
  {
    id: "a8",
    kind: "ligacao",
    title: "Retomada de contato",
    start: relISO(5, "09:00"),
    durationMin: 15,
    status: "pendente",
    withWhom: "Ana Souza",
  },
  {
    id: "a9",
    kind: "tarefa",
    title: "Preparar proposta comercial",
    start: relISO(-2, "13:00"),
    status: "pendente",
    withWhom: "Restaurante Sabor",
  },
  {
    id: "a10",
    kind: "evento",
    title: "Almoço com cliente",
    start: relISO(1, "12:30"),
    durationMin: 90,
    status: "pendente",
    withWhom: "Pedro Castro",
    location: "Bistrô Central",
  },
]
