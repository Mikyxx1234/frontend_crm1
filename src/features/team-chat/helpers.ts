import type { DirectRow, TeamChatDepartment, TeamChatPerson } from "./types";

export const REACTION_EMOJIS = ["🔥", "👍", "❤️", "🎉", "👏", "😂", "🙌", "👀"] as const;

const GRADIENTS = [
  "linear-gradient(140deg, oklch(0.58 0.23 278), oklch(0.53 0.24 274))",
  "linear-gradient(140deg, oklch(0.63 0.25 350), oklch(0.6 0.25 348))",
  "linear-gradient(140deg, oklch(0.62 0.13 195), oklch(0.58 0.13 200))",
  "linear-gradient(140deg, oklch(0.6 0.2 25), oklch(0.57 0.21 22))",
  "linear-gradient(140deg, oklch(0.62 0.16 150), oklch(0.58 0.15 155))",
  "linear-gradient(140deg, oklch(0.58 0.18 300), oklch(0.52 0.2 280))",
];

export type ChatPerson = {
  id: string;
  name: string;
  initials: string;
  gradient: string;
  presence: "online" | "offline";
  avatarUrl?: string | null;
};

export function initialsOf(name: string) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function hashOf(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function normalizeAvatarUrl(url?: string | null): string | null {
  const value = url?.trim();
  if (!value) return null;
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:") ||
    value.startsWith("blob:") ||
    value.startsWith("/")
  ) {
    return value;
  }
  return `/${value}`;
}

export function toPerson(
  p: Pick<TeamChatPerson, "id" | "name" | "avatarUrl" | "systemOnline">,
): ChatPerson {
  const name = p.name?.trim() || "Colega";
  return {
    id: p.id,
    name,
    initials: initialsOf(name),
    gradient: GRADIENTS[hashOf(p.id) % GRADIENTS.length],
    presence: p.systemOnline ? "online" : "offline",
    avatarUrl: normalizeAvatarUrl(p.avatarUrl),
  };
}

export function formatClock(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function formatListTime(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (same(d, today)) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (same(d, yest)) return "Ontem";
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 6);
  if (d > weekAgo) return d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function formatDayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (same(d, today)) return "Hoje";
  if (same(d, yest)) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function dayKey(iso: string) {
  return new Date(iso).toDateString();
}

export const presenceLabel = {
  online: "Disponível",
  offline: "Offline",
} as const;

export const UNASSIGNED_DEPT_ID = "__none__";

export type DepartmentDirectSection = {
  id: string;
  name: string;
  color: string | null;
  rows: DirectRow[];
};

export function groupDirectsByDepartment(
  directs: DirectRow[],
  departments: TeamChatDepartment[],
): DepartmentDirectSection[] {
  if (departments.length === 0) {
    return directs.length > 0 ? [{ id: "directs", name: "Diretas", color: null, rows: directs }] : [];
  }

  const known = new Map(departments.map((d) => [d.id, d]));
  const buckets = new Map<string, DirectRow[]>();
  for (const row of directs) {
    const raw = row.person.departmentId;
    const id = raw && known.has(raw) ? raw : UNASSIGNED_DEPT_ID;
    const list = buckets.get(id);
    if (list) list.push(row);
    else buckets.set(id, [row]);
  }

  const sections: DepartmentDirectSection[] = departments
    .filter((d) => (buckets.get(d.id)?.length ?? 0) > 0)
    .map((d) => ({ id: d.id, name: d.name, color: d.color, rows: buckets.get(d.id)! }));

  const none = buckets.get(UNASSIGNED_DEPT_ID);
  if (none?.length) {
    sections.push({ id: UNASSIGNED_DEPT_ID, name: "Sem departamento", color: null, rows: none });
  }
  return sections;
}

const FAVORITES_KEY = "orbita-chat-favorites";

export function loadOrbitaFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function saveOrbitaFavorites(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

export function favoriteKey(row: { roomId?: string | null; personId?: string | null }) {
  return row.roomId || (row.personId ? `person:${row.personId}` : "");
}

export function meFromSession(
  name: string | null | undefined,
  id: string,
  avatarUrl?: string | null,
): ChatPerson {
  const display = name?.trim() || "Você";
  return {
    id: id || "me",
    name: display,
    initials: initialsOf(display),
    gradient: "linear-gradient(140deg, oklch(0.58 0.23 278), oklch(0.53 0.24 274))",
    presence: "online",
    avatarUrl: normalizeAvatarUrl(avatarUrl),
  };
}
