import type {
  AutomationListItemDto,
  AutomationListPage,
  FetchAutomationsParams,
} from "./api";

function ago(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

const MOCK_ITEMS: AutomationListItemDto[] = [
  {
    id: "auto-1",
    name: "redireciona2310",
    description: "Distribui novos negócios do pipeline de Atendimento para o agente de IA.",
    triggerType: "DEAL_CREATED",
    triggerConfig: null,
    active: true,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(2),
    stepCount: 3,
    stepTypes: ["assign_owner", "send_message", "wait"],
    runs: 302,
    runsToday: 28,
    successRate: 97,
    lastRunAt: ago(4),
  },
  {
    id: "auto-2",
    name: "Agente IA",
    description: "Responde mensagens recebidas no WhatsApp e qualifica o lead automaticamente.",
    triggerType: "MESSAGE_RECEIVED",
    triggerConfig: null,
    active: true,
    createdAt: daysAgo(45),
    updatedAt: daysAgo(1),
    stepCount: 2,
    stepTypes: ["send_message", "update_field"],
    runs: 412,
    runsToday: 64,
    successRate: 99,
    lastRunAt: ago(1),
  },
  {
    id: "auto-3",
    name: "Boas-vindas WhatsApp",
    description: "Dispara uma sequência de boas-vindas quando a tag de novo cliente é adicionada.",
    triggerType: "TAG_ADDED",
    triggerConfig: null,
    active: false,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(5),
    stepCount: 4,
    stepTypes: ["send_message", "wait", "send_email", "create_task"],
    runs: 188,
    runsToday: 0,
    successRate: 94,
    lastRunAt: daysAgo(2),
  },
  {
    id: "auto-4",
    name: "Follow-up proposta",
    description: "Cria atividades de follow-up e move o negócio quando a etapa é alterada.",
    triggerType: "STAGE_CHANGED",
    triggerConfig: null,
    active: true,
    createdAt: daysAgo(40),
    updatedAt: daysAgo(3),
    stepCount: 5,
    stepTypes: ["create_task", "send_email", "wait", "send_message", "update_field"],
    runs: 96,
    runsToday: 7,
    successRate: 91,
    lastRunAt: ago(26),
  },
  {
    id: "auto-5",
    name: "Pós-venda automático",
    description: "Agenda contato de pós-venda e atualiza o lead score ao ganhar o negócio.",
    triggerType: "DEAL_WON",
    triggerConfig: null,
    active: false,
    createdAt: daysAgo(90),
    updatedAt: daysAgo(10),
    stepCount: 3,
    stepTypes: ["create_task", "send_email", "update_field"],
    runs: 54,
    runsToday: 0,
    successRate: 88,
    lastRunAt: daysAgo(6),
  },
  {
    id: "auto-6",
    name: "Recuperação de perdidos",
    description: "Notifica o gestor e cria tarefa de reengajamento quando o negócio é perdido.",
    triggerType: "DEAL_LOST",
    triggerConfig: null,
    active: true,
    createdAt: daysAgo(20),
    updatedAt: daysAgo(1),
    stepCount: 2,
    stepTypes: ["send_email", "create_task"],
    runs: 41,
    runsToday: 3,
    successRate: 85,
    lastRunAt: ago(180),
  },
];

export function mockAutomationsPage(
  params: FetchAutomationsParams = {},
): AutomationListPage {
  const page = params.page ?? 1;
  const perPage = params.perPage ?? 30;
  let items = [...MOCK_ITEMS];

  if (params.active === true) items = items.filter((a) => a.active);
  if (params.active === false) items = items.filter((a) => !a.active);

  const q = params.search?.trim().toLowerCase();
  if (q) {
    items = items.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.description ?? "").toLowerCase().includes(q) ||
        a.triggerType.toLowerCase().includes(q),
    );
  }

  const total = items.length;
  const start = (page - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    total,
    page,
    perPage,
  };
}

export const MOCK_AUTOMATIONS_PAGE = mockAutomationsPage({ perPage: 200 });
