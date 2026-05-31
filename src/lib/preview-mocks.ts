/**
 * PREVIEW MOCKS — catálogo de respostas fake para sandbox do v0.dev.
 *
 * Usado pelo `PreviewMocksInstaller` que faz monkey patch em `window.fetch`
 * quando `NEXT_PUBLIC_PREVIEW_MODE=true`. Cada handler retorna o shape
 * exato esperado pelos `features/*-v2/api/*` (ver `getJson()` que exige
 * corpo não vazio + JSON válido, senão lança "Sessão expirada").
 *
 * Cobertura priorizada (telas que o usuário edita no v0):
 *  - /api/auth/session            → user fake
 *  - /api/conversations           → lista + counts
 *  - /api/conversations/:id/messages → mensagens
 *  - /api/contacts                → 8 contatos
 *  - /api/companies               → 5 empresas
 *  - /api/activities              → tarefas/atividades
 *  - /api/pipelines               → 1 pipeline + stages
 *  - /api/analytics/deals-overview / service-overview → métricas
 *  - /api/users(/me)              → user atual
 *  - /api/tags, /api/channels     → filtros básicos
 *
 * Fallback: qualquer outra `/api/*` GET retorna `{ items: [], total: 0 }`
 * pra não quebrar páginas com "Loading..." infinito.
 */

type MockHandler = (url: URL, init?: RequestInit) => unknown;

/* ────── Fixtures compartilhados ────── */

const USER = {
  id: "preview-user",
  name: "Marcelo (preview)",
  email: "preview@eduit.com.br",
  image: null,
  role: "OWNER" as const,
  organizationId: "preview-org",
  isSuperAdmin: false,
};

const ORG = {
  id: "preview-org",
  name: "EduIT (preview)",
  slug: "eduit-preview",
};

const TAGS = [
  { id: "tag-1", name: "Quente", color: "#ef4444" },
  { id: "tag-2", name: "VIP", color: "#a855f7" },
  { id: "tag-3", name: "Novo lead", color: "#3b82f6" },
  { id: "tag-4", name: "Reativar", color: "#f59e0b" },
];

const COMPANIES = [
  { id: "co-1", name: "Acme Tech", domain: "acme.com", industry: "Software", size: "51-200", phone: "+5511999990001", address: "Av. Paulista, 1000 — São Paulo", createdAt: "2026-04-12T10:00:00Z", _count: { contacts: 14 } },
  { id: "co-2", name: "Globex Logistics", domain: "globex.com.br", industry: "Logística", size: "201-500", phone: "+5511999990002", address: "Rod. Anhanguera, km 23 — Campinas", createdAt: "2026-03-28T10:00:00Z", _count: { contacts: 8 } },
  { id: "co-3", name: "Initech Consultoria", domain: "initech.com", industry: "Consultoria", size: "11-50", phone: "+5511999990003", address: "R. Augusta, 500 — São Paulo", createdAt: "2026-05-05T10:00:00Z", _count: { contacts: 5 } },
  { id: "co-4", name: "Umbrella Saúde", domain: "umbrella.health", industry: "Saúde", size: "1000+", phone: "+5521999990004", address: "Av. Atlântica, 200 — Rio de Janeiro", createdAt: "2026-02-14T10:00:00Z", _count: { contacts: 22 } },
  { id: "co-5", name: "Pied Piper", domain: "piedpiper.com", industry: "Software", size: "1-10", phone: "+5511999990005", address: "R. da Consolação, 1500 — São Paulo", createdAt: "2026-05-20T10:00:00Z", _count: { contacts: 3 } },
];

const CONTACTS = [
  { id: "ct-1", name: "Ana Beatriz Costa",   email: "ana@acme.com",       phone: "+5511988880001", avatarUrl: null, leadScore: 87, lifecycleStage: "QUALIFIED", createdAt: "2026-05-25T14:00:00Z", company: { id: "co-1", name: "Acme Tech",          domain: "acme.com" },        tags: [TAGS[0], TAGS[1]] },
  { id: "ct-2", name: "Bruno Lima",          email: "bruno@globex.com.br", phone: "+5511988880002", avatarUrl: null, leadScore: 65, lifecycleStage: "LEAD",       createdAt: "2026-05-22T11:30:00Z", company: { id: "co-2", name: "Globex Logistics",  domain: "globex.com.br" },   tags: [TAGS[2]] },
  { id: "ct-3", name: "Camila Rodrigues",    email: "camila@initech.com", phone: "+5511988880003", avatarUrl: null, leadScore: 42, lifecycleStage: "LEAD",       createdAt: "2026-05-18T09:15:00Z", company: { id: "co-3", name: "Initech Consultoria", domain: "initech.com" },   tags: [TAGS[3]] },
  { id: "ct-4", name: "Diego Almeida",       email: "diego@umbrella.health", phone: "+5521988880004", avatarUrl: null, leadScore: 91, lifecycleStage: "CUSTOMER",  createdAt: "2026-04-30T16:45:00Z", company: { id: "co-4", name: "Umbrella Saúde",    domain: "umbrella.health" }, tags: [TAGS[1]] },
  { id: "ct-5", name: "Eduarda Silva",       email: "eduarda@piedpiper.com", phone: "+5511988880005", avatarUrl: null, leadScore: 73, lifecycleStage: "QUALIFIED", createdAt: "2026-05-28T08:00:00Z", company: { id: "co-5", name: "Pied Piper",        domain: "piedpiper.com" },   tags: [TAGS[0]] },
  { id: "ct-6", name: "Felipe Martins",      email: "felipe@acme.com",    phone: "+5511988880006", avatarUrl: null, leadScore: 58, lifecycleStage: "LEAD",       createdAt: "2026-05-15T13:20:00Z", company: { id: "co-1", name: "Acme Tech",          domain: "acme.com" },        tags: [] },
  { id: "ct-7", name: "Gabriela Sousa",      email: "gabi@globex.com.br", phone: "+5511988880007", avatarUrl: null, leadScore: 80, lifecycleStage: "CUSTOMER",  createdAt: "2026-04-10T10:00:00Z", company: { id: "co-2", name: "Globex Logistics",  domain: "globex.com.br" },   tags: [TAGS[1], TAGS[3]] },
  { id: "ct-8", name: "Henrique Pereira",    email: null,                  phone: "+5511988880008", avatarUrl: null, leadScore: null, lifecycleStage: null,        createdAt: "2026-05-30T17:00:00Z", company: null,                                                                                  tags: [] },
];

const CHANNELS = [
  { id: "ch-1", name: "WhatsApp Vendas", provider: "WHATSAPP_META", isActive: true },
  { id: "ch-2", name: "WhatsApp Suporte", provider: "WHATSAPP_META", isActive: true },
];

const STAGES = [
  { id: "st-1", name: "Novo lead",   color: "#3b82f6", order: 1 },
  { id: "st-2", name: "Qualificado", color: "#8b5cf6", order: 2 },
  { id: "st-3", name: "Proposta",    color: "#f59e0b", order: 3 },
  { id: "st-4", name: "Negociação",  color: "#10b981", order: 4 },
  { id: "st-5", name: "Ganho",       color: "#22c55e", order: 5 },
  { id: "st-6", name: "Perdido",     color: "#ef4444", order: 6 },
];

const PIPELINES = [
  { id: "pl-1", name: "Pipeline Padrão", isDefault: true },
];

const DEALS = [
  { id: "dl-1", title: "Implantação CRM Acme",          value: 48000, stageId: "st-3", ownerId: USER.id, contactId: "ct-1", companyId: "co-1", probability: 60, expectedClose: "2026-06-15", tags: [TAGS[0]], updatedAt: "2026-05-30T10:00:00Z" },
  { id: "dl-2", title: "Renovação anual Globex",        value: 120000, stageId: "st-4", ownerId: USER.id, contactId: "ct-2", companyId: "co-2", probability: 85, expectedClose: "2026-06-08", tags: [TAGS[1]], updatedAt: "2026-05-31T09:00:00Z" },
  { id: "dl-3", title: "Consultoria Initech Q3",         value: 32000, stageId: "st-2", ownerId: USER.id, contactId: "ct-3", companyId: "co-3", probability: 40, expectedClose: "2026-07-20", tags: [TAGS[2]], updatedAt: "2026-05-28T14:00:00Z" },
  { id: "dl-4", title: "Upsell Umbrella Premium",        value: 95000, stageId: "st-4", ownerId: USER.id, contactId: "ct-4", companyId: "co-4", probability: 75, expectedClose: "2026-06-30", tags: [TAGS[1]], updatedAt: "2026-05-29T16:00:00Z" },
  { id: "dl-5", title: "Trial Pied Piper",                value: 12000, stageId: "st-1", ownerId: USER.id, contactId: "ct-5", companyId: "co-5", probability: 20, expectedClose: "2026-08-10", tags: [TAGS[2]], updatedAt: "2026-05-25T11:00:00Z" },
  { id: "dl-6", title: "Acme — módulo extra",            value: 18500, stageId: "st-5", ownerId: USER.id, contactId: "ct-6", companyId: "co-1", probability: 100, expectedClose: "2026-05-15", tags: [], updatedAt: "2026-05-15T17:00:00Z" },
];

const CONVERSATIONS = [
  { id: "cv-1", contact: CONTACTS[0], lastMessage: { content: "Top! Manda a proposta por favor 🙏", sentAt: "2026-05-31T15:45:00Z", direction: "INBOUND", status: "DELIVERED" }, unreadCount: 2, status: "OPEN",       channel: CHANNELS[0], assignedTo: { id: USER.id, name: USER.name }, updatedAt: "2026-05-31T15:45:00Z", tags: [TAGS[0]] },
  { id: "cv-2", contact: CONTACTS[1], lastMessage: { content: "Beleza, vou avaliar com o time e te retorno",         sentAt: "2026-05-31T14:20:00Z", direction: "OUTBOUND", status: "READ" },      unreadCount: 0, status: "OPEN",       channel: CHANNELS[0], assignedTo: { id: USER.id, name: USER.name }, updatedAt: "2026-05-31T14:20:00Z", tags: [TAGS[1]] },
  { id: "cv-3", contact: CONTACTS[2], lastMessage: { content: "Bom dia, gostaria de saber mais sobre o produto",     sentAt: "2026-05-31T09:10:00Z", direction: "INBOUND", status: "DELIVERED" }, unreadCount: 1, status: "OPEN",       channel: CHANNELS[1], assignedTo: null,                            updatedAt: "2026-05-31T09:10:00Z", tags: [TAGS[2]] },
  { id: "cv-4", contact: CONTACTS[3], lastMessage: { content: "Perfeito, agendado pra amanhã 14h",                    sentAt: "2026-05-30T18:30:00Z", direction: "OUTBOUND", status: "READ" },      unreadCount: 0, status: "RESOLVED",   channel: CHANNELS[0], assignedTo: { id: USER.id, name: USER.name }, updatedAt: "2026-05-30T18:30:00Z", tags: [TAGS[1]] },
  { id: "cv-5", contact: CONTACTS[4], lastMessage: { content: "Estamos avaliando outras opções no momento",          sentAt: "2026-05-30T11:00:00Z", direction: "INBOUND", status: "DELIVERED" }, unreadCount: 0, status: "OPEN",       channel: CHANNELS[0], assignedTo: { id: USER.id, name: USER.name }, updatedAt: "2026-05-30T11:00:00Z", tags: [] },
  { id: "cv-6", contact: CONTACTS[5], lastMessage: { content: "Vou conferir e te aviso até sexta",                    sentAt: "2026-05-29T16:45:00Z", direction: "OUTBOUND", status: "READ" },      unreadCount: 0, status: "OPEN",       channel: CHANNELS[1], assignedTo: { id: USER.id, name: USER.name }, updatedAt: "2026-05-29T16:45:00Z", tags: [TAGS[3]] },
  { id: "cv-7", contact: CONTACTS[6], lastMessage: { content: "Renovamos sim, obrigada!",                              sentAt: "2026-05-28T10:15:00Z", direction: "INBOUND", status: "DELIVERED" }, unreadCount: 0, status: "RESOLVED",   channel: CHANNELS[0], assignedTo: { id: USER.id, name: USER.name }, updatedAt: "2026-05-28T10:15:00Z", tags: [TAGS[1]] },
  { id: "cv-8", contact: CONTACTS[7], lastMessage: { content: "Olá!",                                                  sentAt: "2026-05-31T17:00:00Z", direction: "INBOUND", status: "DELIVERED" }, unreadCount: 1, status: "OPEN",       channel: CHANNELS[0], assignedTo: null,                            updatedAt: "2026-05-31T17:00:00Z", tags: [] },
];

const ACTIVITIES = [
  { id: "ac-1", type: "CALL",    title: "Follow-up Acme",            description: "Ligar pra Ana Beatriz após envio da proposta", completed: false, scheduledAt: "2026-06-02T15:00:00Z", completedAt: null,                  createdAt: "2026-05-31T10:00:00Z", user: { id: USER.id, name: USER.name, email: USER.email, avatarUrl: null }, contact: { id: "ct-1", name: CONTACTS[0].name, email: CONTACTS[0].email }, deal: { id: "dl-1", title: DEALS[0].title, stageId: "st-3" } },
  { id: "ac-2", type: "MEETING", title: "Reunião kickoff Globex",     description: "Apresentação do time + cronograma",            completed: false, scheduledAt: "2026-06-03T10:00:00Z", completedAt: null,                  createdAt: "2026-05-30T12:00:00Z", user: { id: USER.id, name: USER.name, email: USER.email, avatarUrl: null }, contact: { id: "ct-2", name: CONTACTS[1].name, email: CONTACTS[1].email }, deal: { id: "dl-2", title: DEALS[1].title, stageId: "st-4" } },
  { id: "ac-3", type: "TASK",    title: "Preparar proposta Initech",  description: null,                                            completed: false, scheduledAt: "2026-06-01T18:00:00Z", completedAt: null,                  createdAt: "2026-05-29T09:00:00Z", user: { id: USER.id, name: USER.name, email: USER.email, avatarUrl: null }, contact: { id: "ct-3", name: CONTACTS[2].name, email: CONTACTS[2].email }, deal: { id: "dl-3", title: DEALS[2].title, stageId: "st-2" } },
  { id: "ac-4", type: "EMAIL",   title: "Enviar contrato Umbrella",   description: "Anexar contrato + termo aditivo",              completed: true,  scheduledAt: "2026-05-30T14:00:00Z", completedAt: "2026-05-30T14:30:00Z", createdAt: "2026-05-29T10:00:00Z", user: { id: USER.id, name: USER.name, email: USER.email, avatarUrl: null }, contact: { id: "ct-4", name: CONTACTS[3].name, email: CONTACTS[3].email }, deal: { id: "dl-4", title: DEALS[3].title, stageId: "st-4" } },
];

function makeMessages(conversationId: string) {
  const conv = CONVERSATIONS.find((c) => c.id === conversationId) ?? CONVERSATIONS[0];
  return [
    { id: `${conv.id}-m1`, conversationId: conv.id, content: "Olá! Vi seu material no LinkedIn e queria entender melhor a solução.", direction: "INBOUND",  status: "READ",      sentAt: "2026-05-31T09:00:00Z", senderName: conv.contact.name,                                                                                       messageType: "text", attachments: [] },
    { id: `${conv.id}-m2`, conversationId: conv.id, content: "Oi! Obrigado pelo contato 😊 Trabalhamos com CRM completo pra times comerciais — quer agendar 15min essa semana?", direction: "OUTBOUND", status: "READ",      sentAt: "2026-05-31T09:05:00Z", senderName: USER.name,                                                                                                  messageType: "text", attachments: [] },
    { id: `${conv.id}-m3`, conversationId: conv.id, content: "Perfeito! Pode mandar uns horários?",                                            direction: "INBOUND",  status: "READ",      sentAt: "2026-05-31T09:10:00Z", senderName: conv.contact.name,                                                                                       messageType: "text", attachments: [] },
    { id: `${conv.id}-m4`, conversationId: conv.id, content: "Claro! Tenho disponibilidade quinta 14h, sexta 10h ou 16h. Qual te atende melhor?", direction: "OUTBOUND", status: "READ",     sentAt: "2026-05-31T09:12:00Z", senderName: USER.name,                                                                                                  messageType: "text", attachments: [] },
    { id: `${conv.id}-m5`, conversationId: conv.id, content: conv.lastMessage.content,                                                          direction: conv.lastMessage.direction, status: conv.lastMessage.status, sentAt: conv.lastMessage.sentAt, senderName: conv.lastMessage.direction === "INBOUND" ? conv.contact.name : USER.name, messageType: "text", attachments: [] },
  ];
}

const SERVICE_OVERVIEW = {
  summary: {
    total:           { value: "1.284", delta: 12 },
    firstResponse:   { value: "2m 14s", delta: -8 },
    resolutionTime:  { value: "18m 30s", delta: -5 },
    resolutionRate:  { value: "92%",    delta: 3 },
  },
  volumeByDay: [
    { day: "Seg", recebidas: 184, enviadas: 220 },
    { day: "Ter", recebidas: 201, enviadas: 245 },
    { day: "Qua", recebidas: 195, enviadas: 230 },
    { day: "Qui", recebidas: 220, enviadas: 268 },
    { day: "Sex", recebidas: 178, enviadas: 215 },
    { day: "Sab", recebidas: 82,  enviadas: 95  },
    { day: "Dom", recebidas: 45,  enviadas: 50  },
  ],
  responseTimeSeries: Array.from({ length: 24 }, (_, h) => ({ hour: `${String(h).padStart(2,"0")}h`, resposta: 60 + Math.floor(Math.sin(h/3)*40+50), primeira: 30 + Math.floor(Math.cos(h/4)*20+30) })),
  byConnection: [
    { name: "WhatsApp Vendas",  value: 645, color: "#22c55e" },
    { name: "WhatsApp Suporte", value: 412, color: "#3b82f6" },
    { name: "Instagram",        value: 227, color: "#a855f7" },
  ],
  byAttendant: [
    { name: "Marcelo",  value: 412, color: "#3b82f6" },
    { name: "Juliana",  value: 388, color: "#a855f7" },
    { name: "Rafael",   value: 295, color: "#22c55e" },
    { name: "Outros",   value: 189, color: "#94a3b8" },
  ],
  byPlatform: {
    rows: [
      { dia: "01/05", whatsapp: 180, instagram: 45 },
      { dia: "08/05", whatsapp: 210, instagram: 52 },
      { dia: "15/05", whatsapp: 235, instagram: 60 },
      { dia: "22/05", whatsapp: 198, instagram: 48 },
      { dia: "29/05", whatsapp: 245, instagram: 67 },
    ],
    platforms: [
      { key: "whatsapp",  label: "WhatsApp",  color: "#22c55e" },
      { key: "instagram", label: "Instagram", color: "#a855f7" },
    ],
  },
  heatmap: {
    cells: Array.from({ length: 7*24 }, (_, i) => ({ x: i % 24, y: Math.floor(i/24), value: Math.floor(Math.random()*100) })),
    xLabels: Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2,"0")}h`),
    yLabels: ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"],
  },
  attendantRanking: [
    { id: "u-1", name: "Marcelo Silva",  attended: 412, avgResponse: "1m 50s", resolution: 94 },
    { id: "u-2", name: "Juliana Costa",  attended: 388, avgResponse: "2m 10s", resolution: 91 },
    { id: "u-3", name: "Rafael Almeida", attended: 295, avgResponse: "2m 35s", resolution: 89 },
    { id: "u-4", name: "Camila Souza",   attended: 189, avgResponse: "3m 05s", resolution: 86 },
  ],
};

const DEALS_OVERVIEW = {
  stages: [
    { id: "st-1", name: "Novo lead",   color: "#3b82f6", count: 18, value: 245000, entered: 32, exited: 14, lost: 4, won: 0 },
    { id: "st-2", name: "Qualificado", color: "#8b5cf6", count: 12, value: 198000, entered: 14, exited: 10, lost: 3, won: 0 },
    { id: "st-3", name: "Proposta",    color: "#f59e0b", count: 8,  value: 380000, entered: 10, exited: 7,  lost: 2, won: 0 },
    { id: "st-4", name: "Negociação",  color: "#10b981", count: 5,  value: 425000, entered: 7,  exited: 5,  lost: 1, won: 4 },
    { id: "st-5", name: "Ganho",       color: "#22c55e", count: 11, value: 685000, entered: 11, exited: 0,  lost: 0, won: 11 },
    { id: "st-6", name: "Perdido",     color: "#ef4444", count: 7,  value: 0,       entered: 7, exited: 0,  lost: 7, won: 0 },
  ],
  summary: {
    totalValue: 1933000,
    totalDeals: 61,
    winRate: 73,
    avgTicket: 31688,
    deltas: { winRate: 5, avgTicket: 12 },
  },
};

/* ────── Router ────── */

const ROUTES: { test: (url: URL, method: string) => boolean; handler: MockHandler }[] = [
  // Auth — sessão fake (NextAuth client espera esse shape)
  { test: (u) => u.pathname === "/api/auth/session", handler: () => ({ user: USER, expires: new Date(Date.now() + 86400 * 1000 * 30).toISOString() }) },

  // User / org básicos
  { test: (u) => u.pathname === "/api/users/me" || u.pathname === "/api/me", handler: () => ({ user: USER, organization: ORG }) },
  { test: (u) => u.pathname === "/api/users", handler: () => ({ items: [USER], total: 1 }) },
  { test: (u) => u.pathname === "/api/organizations" || u.pathname === "/api/organization", handler: () => ({ items: [ORG], total: 1, organization: ORG }) },

  // Conversations
  { test: (u) => u.pathname === "/api/conversations" && u.searchParams.get("counts") === "1", handler: () => ({
      todos: CONVERSATIONS.length,
      entrada: CONVERSATIONS.filter((c) => c.status === "OPEN" && !c.assignedTo).length,
      esperando: CONVERSATIONS.filter((c) => c.unreadCount > 0).length,
      respondidas: CONVERSATIONS.filter((c) => c.lastMessage.direction === "OUTBOUND").length,
      automacao: 0,
      finalizados: CONVERSATIONS.filter((c) => c.status === "RESOLVED").length,
      erro: 0,
    }) },
  { test: (u) => u.pathname === "/api/conversations", handler: () => ({ items: CONVERSATIONS, total: CONVERSATIONS.length, page: 1, perPage: 60 }) },
  { test: (u) => /^\/api\/conversations\/[^/]+\/messages$/.test(u.pathname), handler: (u) => ({
      messages: makeMessages(u.pathname.split("/")[3]),
      pinnedNoteId: null,
      channelProvider: "WHATSAPP_META",
      session: { active: true, windowEndsAt: new Date(Date.now() + 23 * 3600 * 1000).toISOString() },
    }) },
  { test: (u) => /^\/api\/conversations\/[^/]+\/(actions|read|typing|pin-note)$/.test(u.pathname), handler: () => ({ ok: true }) },
  { test: (u) => u.pathname === "/api/conversations/bulk" || u.pathname === "/api/conversations/create", handler: () => ({ ok: true, conversation: { id: CONVERSATIONS[0].id } }) },

  // Directory
  { test: (u) => u.pathname === "/api/contacts", handler: () => ({ items: CONTACTS, total: CONTACTS.length, page: 1, perPage: 50 }) },
  { test: (u) => /^\/api\/contacts\/[^/]+$/.test(u.pathname), handler: (u) => CONTACTS.find((c) => c.id === u.pathname.split("/")[3]) ?? CONTACTS[0] },
  { test: (u) => u.pathname === "/api/companies", handler: () => ({ items: COMPANIES, total: COMPANIES.length, page: 1, perPage: 50 }) },
  { test: (u) => /^\/api\/companies\/[^/]+$/.test(u.pathname), handler: (u) => COMPANIES.find((c) => c.id === u.pathname.split("/")[3]) ?? COMPANIES[0] },
  { test: (u) => u.pathname === "/api/activities", handler: () => ({ items: ACTIVITIES, total: ACTIVITIES.length, page: 1, perPage: 50 }) },

  // Pipeline / deals
  { test: (u) => u.pathname === "/api/pipelines", handler: () => PIPELINES },
  { test: (u) => /^\/api\/pipelines\/[^/]+\/stages$/.test(u.pathname) || u.pathname === "/api/stages", handler: () => STAGES },
  { test: (u) => u.pathname === "/api/deals", handler: () => ({ items: DEALS, total: DEALS.length, page: 1, perPage: 50 }) },
  { test: (u) => u.pathname === "/api/deal-tags" || u.pathname === "/api/tags", handler: () => ({ items: TAGS, total: TAGS.length }) },
  { test: (u) => /^\/api\/(deals|board)/.test(u.pathname), handler: () => ({ items: DEALS, deals: DEALS, stages: STAGES, total: DEALS.length }) },

  // Analytics / Dashboard v2
  { test: (u) => u.pathname === "/api/analytics/deals-overview", handler: () => DEALS_OVERVIEW },
  { test: (u) => u.pathname === "/api/analytics/service-overview", handler: () => SERVICE_OVERVIEW },

  // Channels
  { test: (u) => u.pathname === "/api/channels", handler: () => ({ items: CHANNELS, total: CHANNELS.length }) },

  // Push / health / noop
  { test: (u) => u.pathname === "/api/health", handler: () => ({ status: "ok", preview: true }) },
  { test: (u) => u.pathname.startsWith("/api/push/"), handler: () => ({ ok: true }) },
  { test: (u) => u.pathname.startsWith("/api/notifications"), handler: () => ({ items: [], total: 0 }) },
];

export function findMockResponse(url: URL, init?: RequestInit): Response | null {
  const method = (init?.method ?? "GET").toUpperCase();
  for (const route of ROUTES) {
    if (route.test(url, method)) {
      const payload = route.handler(url, init);
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json", "X-Preview-Mock": "1" },
      });
    }
  }
  // Fallback: qualquer /api/* GET retorna lista vazia
  if (method === "GET" && url.pathname.startsWith("/api/")) {
    return new Response(JSON.stringify({ items: [], total: 0, page: 1, perPage: 50 }), {
      status: 200,
      headers: { "Content-Type": "application/json", "X-Preview-Mock": "1-fallback" },
    });
  }
  // POST/PUT/PATCH/DELETE não-mapeados: 200 ok
  if (url.pathname.startsWith("/api/")) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", "X-Preview-Mock": "1-mutation" },
    });
  }
  return null;
}
