export type DemandUser = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type DemandItemKind =
  | "FEATURE"
  | "IMPROVEMENT"
  | "BUG"
  | "REQUEST"
  | "TASK";

export type DemandPriority = "NONE" | "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type DemandItem = {
  id: string;
  number: number;
  title: string;
  description: string;
  kind: DemandItemKind;
  priority: DemandPriority;
  position: number;
  votesCount: number;
  tags: string[];
  boardId: string;
  stageId: string;
  requesterId: string;
  assigneeId: string | null;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  requester: DemandUser;
  assignee: DemandUser | null;
  votedByMe?: boolean;
};

export type DemandComment = {
  id: string;
  content: string;
  createdAt: string;
  author: DemandUser;
};

export type DemandEvent = {
  id: string;
  type: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
  actor: DemandUser | null;
};

export type DemandItemDetail = DemandItem & {
  comments: DemandComment[];
  events: DemandEvent[];
  votedByMe: boolean;
};

export type DemandStage = {
  id: string;
  name: string;
  key: string;
  color: string | null;
  position: number;
  isTerminal: boolean;
  items?: DemandItem[];
};

export type DemandBoardLite = {
  id: string;
  name: string;
  slug: string;
  kind: string;
  color: string | null;
  description: string | null;
  position: number;
  isDefault: boolean;
  itemCount: number;
  stages: DemandStage[];
};

export type DemandBoardDetail = {
  id: string;
  name: string;
  slug: string;
  kind: string;
  color: string | null;
  description: string | null;
  isDefault: boolean;
  stages: Array<DemandStage & { items: DemandItem[] }>;
};

export const KIND_LABEL: Record<DemandItemKind, string> = {
  FEATURE: "Feature",
  IMPROVEMENT: "Melhoria",
  BUG: "Bug",
  REQUEST: "Solicitação",
  TASK: "Tarefa",
};

export const PRIORITY_LABEL: Record<DemandPriority, string> = {
  NONE: "—",
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export const EVENT_LABEL: Record<string, string> = {
  CREATED: "criou",
  MOVED: "moveu",
  UPDATED: "atualizou",
  COMMENTED: "comentou",
  ASSIGNED: "atribuiu",
  VOTED: "votou",
  COMPLETED: "concluiu",
};
