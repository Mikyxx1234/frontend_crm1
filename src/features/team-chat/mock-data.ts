import type {
  TeamChatDepartment,
  TeamChatMessage,
  TeamChatNote,
  TeamChatPerson,
  TeamChatRoom,
} from "./types";

export const MOCK_ID_PREFIX = "mock-";

export function isMockId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith(MOCK_ID_PREFIX);
}

export function mergeUniqueById<T extends { id: string }>(real: T[], extra: T[]): T[] {
  const seen = new Set(real.map((item) => item.id));
  return [...real, ...extra.filter((item) => !seen.has(item.id))];
}

function ago(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function person(
  slug: string,
  name: string,
  departmentId: string,
  role: string,
  online: boolean,
  lastSeenMinutes?: number,
): TeamChatPerson {
  return {
    id: `mock-person-${slug}`,
    name,
    avatarUrl: null,
    systemOnline: online,
    lastSeenAt: online ? new Date().toISOString() : ago(lastSeenMinutes ?? 180),
    role,
    departmentId,
  };
}

export const MOCK_DEPARTMENTS: TeamChatDepartment[] = [
  { id: "mock-dept-comercial", name: "Comercial", color: "oklch(0.63 0.18 35)", icon: "briefcase" },
  { id: "mock-dept-cs", name: "Sucesso do Cliente", color: "oklch(0.62 0.13 195)", icon: "heart" },
  { id: "mock-dept-produto", name: "Produto", color: "oklch(0.58 0.2 290)", icon: "sparkles" },
  { id: "mock-dept-ops", name: "Operações", color: "oklch(0.7 0.15 85)", icon: "cog" },
];

export const MOCK_PEOPLE: TeamChatPerson[] = [
  person("ana", "Ana Souza", "mock-dept-comercial", "Account Executive", true),
  person("bruno", "Bruno Lima", "mock-dept-comercial", "Closer", false, 95),
  person("iris", "Iris Mendes", "mock-dept-comercial", "SDR", true),
  person("camila", "Camila Torres", "mock-dept-cs", "CS Manager", true),
  person("diego", "Diego Alves", "mock-dept-cs", "CSM", true),
  person("elena", "Elena Park", "mock-dept-produto", "Product Manager", false, 240),
  person("felipe", "Felipe Costa", "mock-dept-produto", "Designer", true),
  person("gabriela", "Gabriela Nunes", "mock-dept-ops", "Ops", true),
  person("henrique", "Henrique Dias", "mock-dept-ops", "Financeiro", false, 400),
];

const bySlug = Object.fromEntries(MOCK_PEOPLE.map((p) => [p.id.replace("mock-person-", ""), p]));

function dm(slug: string, preview: string, minutes: number, unread: number): TeamChatRoom {
  const peer = bySlug[slug];
  return {
    id: `mock-room-dm-${slug}`,
    kind: "DM",
    name: peer.name,
    topic: null,
    lastMessageAt: ago(minutes),
    lastPreview: preview,
    createdAt: ago(20_000),
    unread,
    peer,
    members: [peer],
    memberCount: 2,
  };
}

function channel(
  slug: string,
  name: string,
  topic: string,
  members: TeamChatPerson[],
  preview: string,
  minutes: number,
  unread: number,
): TeamChatRoom {
  return {
    id: `mock-room-ch-${slug}`,
    kind: "GROUP",
    name,
    topic,
    lastMessageAt: ago(minutes),
    lastPreview: preview,
    createdAt: ago(40_000),
    unread,
    peer: null,
    members,
    memberCount: members.length + 1,
  };
}

export const MOCK_ROOMS: TeamChatRoom[] = [
  dm("ana", "Te mando o deck atualizado até as 16h", 12, 2),
  dm("camila", "O cliente do plano Pro pediu walkthrough", 38, 1),
  dm("iris", "Passei 12 leads quentes no board", 55, 0),
  dm("felipe", "Mandei o ajuste da sidebar no Figma", 90, 0),
  dm("diego", "Posso entrar na call das 15h?", 140, 0),
  dm("gabriela", "Fechei o relatório de ontem", 200, 0),
  dm("bruno", "Fechei a proposta da Horizon", 60 * 22, 0),
  dm("elena", "Vou priorizar o filtro de conversas", 60 * 28, 0),
  dm("henrique", "Nota fiscal da AWS já está no Drive", 60 * 50, 0),
  channel(
    "comercial",
    "comercial",
    "Pipeline e follow-ups da semana",
    [bySlug.ana, bySlug.bruno, bySlug.iris],
    "Ana: Quem pega a Horizon amanhã?",
    18,
    3,
  ),
  channel(
    "plantao",
    "plantão",
    "Fila de atendimento ao vivo",
    [bySlug.camila, bySlug.diego, bySlug.gabriela],
    "Diego: Tô no ponto, podem passar os urgentes",
    44,
    0,
  ),
  channel(
    "produto",
    "produto",
    "Roadmap, bugs e reviews",
    [bySlug.elena, bySlug.felipe, bySlug.ana],
    "Felipe: Publiquei o protótipo da Órbita",
    110,
    1,
  ),
  channel(
    "geral",
    "geral",
    "Avisos do time",
    MOCK_PEOPLE,
    "Gabriela: Daily às 9h30 amanhã",
    60 * 16,
    0,
  ),
  channel(
    "cafe",
    "café",
    "Off-topic e memes do expediente",
    [bySlug.felipe, bySlug.iris, bySlug.diego, bySlug.gabriela],
    "Iris: Alguém topa um café às 16h?",
    70,
    0,
  ),
];

const ME: TeamChatPerson = {
  id: "me",
  name: "Você",
  avatarUrl: null,
  systemOnline: true,
};

function text(
  roomId: string,
  author: TeamChatPerson,
  content: string,
  minutes: number,
  extras?: Partial<TeamChatMessage>,
): TeamChatMessage {
  return {
    id: `mock-msg-${roomId}-${minutes}-${author.id}`,
    roomId,
    authorId: author.id,
    kind: "TEXT",
    content,
    pinned: false,
    reactions: [],
    createdAt: ago(minutes),
    author,
    ...extras,
  };
}

function thread(roomId: string, rows: [TeamChatPerson, string, number, Partial<TeamChatMessage>?][]) {
  return rows.map(([author, content, minutes, extras]) => text(roomId, author, content, minutes, extras));
}

export const MOCK_MESSAGES: Record<string, TeamChatMessage[]> = {
  "mock-room-dm-ana": thread("mock-room-dm-ana", [
    [bySlug.ana, "Oi! Conseguiu olhar a proposta da Horizon?", 180],
    [ME, "Tô vendo agora. O desconto de 12% entra?", 95],
    [bySlug.ana, "Sim, só se fecharem neste mês. Posso mandar o comparativo?", 40],
    [bySlug.ana, "Te mando o deck atualizado até as 16h", 12, { pinned: true }],
  ]),
  "mock-room-dm-camila": thread("mock-room-dm-camila", [
    [bySlug.camila, "Bom dia! O onboarding da Nexus travou no passo 3.", 220],
    [ME, "Vou puxar o log. Eles usam o workspace novo?", 200],
    [bySlug.camila, "O cliente do plano Pro pediu walkthrough", 38],
  ]),
  "mock-room-dm-iris": thread("mock-room-dm-iris", [
    [bySlug.iris, "Passei 12 leads quentes no board", 55],
    [ME, "Show, prioriza quem pediu demo esta semana.", 50],
  ]),
  "mock-room-dm-felipe": thread("mock-room-dm-felipe", [
    [bySlug.felipe, "Mandei o ajuste da sidebar no Figma", 90],
    [ME, "Ficou bem mais próximo do Slack. Curti o preview.", 80],
  ]),
  "mock-room-dm-diego": thread("mock-room-dm-diego", [
    [bySlug.diego, "Posso entrar na call das 15h?", 140],
    [ME, "Pode sim — leva o histórico do ticket 184.", 130],
  ]),
  "mock-room-dm-gabriela": thread("mock-room-dm-gabriela", [
    [bySlug.gabriela, "Fechei o relatório de ontem", 200],
    [ME, "Perfeito, joga no canal #geral também.", 190],
  ]),
  "mock-room-dm-bruno": thread("mock-room-dm-bruno", [
    [bySlug.bruno, "Fechei a proposta da Horizon", 60 * 22],
    [ME, "Arrasou. Manda o valor final no comercial.", 60 * 21],
  ]),
  "mock-room-dm-elena": thread("mock-room-dm-elena", [
    [bySlug.elena, "Vou priorizar o filtro de conversas", 60 * 28],
    [ME, "Isso. Conversas na esquerda, departamentos depois.", 60 * 27],
  ]),
  "mock-room-dm-henrique": thread("mock-room-dm-henrique", [
    [bySlug.henrique, "Nota fiscal da AWS já está no Drive", 60 * 50],
  ]),
  "mock-room-ch-comercial": thread("mock-room-ch-comercial", [
    [bySlug.iris, "Atualizei o board: 8 demos esta semana.", 400],
    [bySlug.bruno, "Horizon pediu cláusula de piloto de 30 dias.", 210],
    [ME, "Aceito o piloto se o contrato anual ficar no papel.", 190],
    [
      bySlug.ana,
      "Quem pega a Horizon amanhã?",
      18,
      { reactions: [{ emoji: "👀", count: 2, mine: false, userIds: [bySlug.bruno.id, bySlug.iris.id] }] },
    ],
  ]),
  "mock-room-ch-plantao": thread("mock-room-ch-plantao", [
    [bySlug.camila, "Fila com 4 conversas em espera.", 180],
    [bySlug.gabriela, "Peguei as duas do WhatsApp.", 120],
    [bySlug.diego, "Tô no ponto, podem passar os urgentes", 44],
  ]),
  "mock-room-ch-produto": thread("mock-room-ch-produto", [
    [bySlug.elena, "Órbita: lista de conversas volta pra esquerda.", 300],
    [bySlug.felipe, "Publiquei o protótipo da Órbita", 110, { pinned: true }],
  ]),
  "mock-room-ch-geral": thread("mock-room-ch-geral", [
    [bySlug.gabriela, "Daily às 9h30 amanhã", 60 * 16],
    [bySlug.ana, "Vou levar o forecast de agosto.", 60 * 15],
  ]),
  "mock-room-ch-cafe": thread("mock-room-ch-cafe", [
    [bySlug.felipe, "Alguém viu o café novo do 3º andar?", 200],
    [bySlug.diego, "Melhor que o da máquina, confirmo.", 160],
    [bySlug.iris, "Alguém topa um café às 16h?", 70],
  ]),
};

export const MOCK_NOTES: Record<string, TeamChatNote[]> = {
  "mock-room-dm-ana": [
    {
      id: "mock-note-ana-1",
      text: "Horizon: desconto 12% só neste mês. Pedir contrato anual.",
      pinned: true,
      createdAt: ago(80),
    },
  ],
  "mock-room-ch-comercial": [
    {
      id: "mock-note-com-1",
      text: "Daily comercial 9h30. Levar forecast e status da Horizon.",
      pinned: false,
      createdAt: ago(60 * 15),
    },
  ],
};

const ACK = [
  (t: string) => `Entendi: ${t} Já olho isso e te retorno.`,
  (t: string) => `Boa. Sobre “${t}” — faz sentido, deixo alinhado com o time.`,
  (t: string) => `Recebido. Vou tratar isso ainda hoje.`,
  (t: string) => `Perfeito, anotei: ${t}`,
  (t: string) => `Show. Qual o prazo que você tem em mente?`,
  (t: string) => `Opa, vi aqui. Acho que dá pra resolver rápido.`,
  (t: string) => `Combinado. Qualquer coisa me chama neste fio.`,
  (t: string) => `Beleza. Posso avançar com isso e te aviso no fim da tarde.`,
];

const BANTER = [
  "Pode deixar comigo.",
  "Tô online — manda o contexto que eu encaixo.",
  "Boa, obrigado por avisar.",
  "Fechado. Te confirmo daqui a pouco.",
  "Hmm, deixa eu checar e já te digo.",
  "Top. Segue que eu acompanho.",
];

function clip(text: string, max = 72) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export function mockReplyText(userText: string, attachments?: { kind?: string; emoji?: string }[]) {
  const sticker = attachments?.find((a) => a.kind === "sticker");
  if (sticker) return sticker.emoji ? `${sticker.emoji} haha, boa` : "Boa figurinha 😄";
  if (attachments?.some((a) => a.kind === "image")) return "Vi a imagem, obrigado! Já comento.";
  if (attachments?.some((a) => a.kind === "audio")) return "Ouvi o áudio — te respondo em texto.";
  if (attachments?.length && !userText.trim()) return "Recebi o arquivo, valeu.";

  const text = clip(userText);
  if (!text) return BANTER[Math.floor(Math.random() * BANTER.length)];
  if (text.length < 8) return BANTER[Math.floor(Math.random() * BANTER.length)];
  return ACK[Math.floor(Math.random() * ACK.length)](text.endsWith(".") ? text : `${text}.`);
}

export function previewOf(content: string, attachments?: { kind?: string; emoji?: string }[]) {
  const text = content.trim();
  if (text) return text;
  const first = attachments?.[0];
  if (!first) return "Mensagem";
  if (first.kind === "sticker") return first.emoji || "Figurinha";
  if (first.kind === "image") return "Foto";
  if (first.kind === "audio") return "Áudio";
  if (first.kind === "video") return "Vídeo";
  return "Anexo";
}

export function findMockDmByPeer(personId: string, rooms: TeamChatRoom[] = MOCK_ROOMS) {
  return rooms.find((r) => r.kind === "DM" && r.peer?.id === personId) ?? null;
}

export function pickMockReplier(room: TeamChatRoom, meId: string): TeamChatPerson {
  if (room.kind === "DM" && room.peer) return room.peer;
  const others = room.members.filter((m) => m.id !== meId && m.id !== "me");
  if (others.length === 0) {
    return room.members[0] ?? { id: "mock-person-ana", name: "Ana Souza", avatarUrl: null, systemOnline: true };
  }
  return others[Math.floor(Math.random() * others.length)];
}
