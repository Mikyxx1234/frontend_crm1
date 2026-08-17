/**
 * Nome do ator em linhas EVENT do chat: primeiro + segundo nome.
 * User.name é o campo canônico — sem firstName/lastName.
 */

const RESERVED = new Set([
  "agente ia",
  "sistema",
  "automação",
  "automacao",
]);

export function isReservedEventActor(
  label: string | null | undefined,
): boolean {
  const n = (label ?? "").trim().toLowerCase();
  if (!n) return false;
  if (RESERVED.has(n)) return true;
  return n.startsWith("agente ia");
}

export function isGenericHumanEventActor(
  label: string | null | undefined,
): boolean {
  const n = (label ?? "").trim().toLowerCase();
  return n === "" || n === "agente";
}

export function formatHumanEventActorName(
  name?: string | null,
  email?: string | null,
): string {
  const raw = (name ?? "").trim();
  if (raw.includes("@") && !/\s/.test(raw)) {
    return raw.split("@")[0] || "";
  }
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]} ${parts[1]}`;
  if (parts.length === 1) return parts[0];
  const local = (email ?? "").trim().split("@")[0];
  return local || "";
}

export function resolveEventActorLabel(
  stored: string | null | undefined,
  fromActor?: { name?: string | null; email?: string | null },
): string {
  const raw = (stored ?? "").trim();
  if (raw && isReservedEventActor(raw)) return raw;
  if (raw && !isGenericHumanEventActor(raw)) {
    return formatHumanEventActorName(raw) || raw;
  }
  const looked = formatHumanEventActorName(fromActor?.name, fromActor?.email);
  if (looked) return looked;
  return raw || "Agente";
}
