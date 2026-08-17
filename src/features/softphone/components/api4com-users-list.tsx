"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { IconLoader2, IconSearch } from "@tabler/icons-react";

import { InputGlass } from "@/components/crm/input-glass";
import { useTeamUsersQuery } from "@/features/shared/queries/team-users";
import { TelephonyToggle } from "@/features/telephony/telephony-toggle";
import { cn } from "@/lib/utils";

import { listExtensions } from "../api/extensions";
import type { SipExtension } from "../api/types";

const GRID = "grid-cols-[minmax(0,1.7fr)_minmax(64px,0.6fr)_minmax(96px,0.8fr)_minmax(52px,auto)]";

type StatusKind = "active" | "inactive" | "missing" | "failed" | "pending";

function statusOf(ext?: SipExtension): { kind: StatusKind; text: string } {
  if (!ext) return { kind: "missing", text: "Não criado" };
  if (ext.provisioningStep === "ACTIVE" && ext.telephonyEnabled) {
    return { kind: "active", text: "Ativo" };
  }
  if (ext.provisioningStep === "FAILED") return { kind: "failed", text: "Falhou" };
  if (ext.provisioningStep === "DISABLED" || ext.telephonyEnabled === false) {
    return { kind: "inactive", text: "Inativo" };
  }
  if (ext.provisioningStep && ext.provisioningStep !== "IDLE") {
    return { kind: "pending", text: "Provisionando" };
  }
  return { kind: "missing", text: "Não criado" };
}

function StatusPill({ kind, text }: { kind: StatusKind; text: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-display text-[11px] font-semibold",
        kind === "active" && "bg-emerald-50 text-emerald-700",
        kind === "inactive" && "bg-slate-100 text-slate-500",
        kind === "missing" && "bg-amber-50 text-amber-700",
        kind === "failed" && "bg-red-50 text-red-700",
        kind === "pending" && "bg-amber-50 text-amber-700",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          kind === "active" && "bg-emerald-500",
          kind === "inactive" && "bg-slate-400",
          kind === "missing" && "bg-amber-500",
          kind === "failed" && "bg-red-500",
          kind === "pending" && "bg-amber-500",
        )}
      />
      {text}
    </span>
  );
}

export function Api4ComUsersList() {
  const [q, setQ] = useState("");
  const { data: users = [], isLoading: usersLoading } = useTeamUsersQuery<{
    id: string;
    name: string;
    email: string;
  }>();
  const { data: extensions, isLoading: extLoading } = useQuery({
    queryKey: ["sip-extensions"],
    queryFn: listExtensions,
  });

  const byUserId = useMemo(() => {
    const map = new Map<string, SipExtension>();
    for (const ext of extensions ?? []) map.set(ext.userId, ext);
    return map;
  }, [extensions]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle),
    );
  }, [users, q]);

  const withTelephony = users.filter((u) => {
    const ext = byUserId.get(u.id);
    return ext?.telephonyEnabled && ext.provisioningStep === "ACTIVE";
  }).length;

  if (usersLoading || extLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <IconLoader2 size={14} className="animate-spin" />
        Carregando usuários…
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <p className="text-[13px] text-[var(--text-muted)]">
        Nenhum usuário na organização. Crie a equipe em Configurações → Equipe.
      </p>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <IconSearch
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <InputGlass
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar usuário ou email..."
            className="pl-9"
          />
        </div>
        <p className="shrink-0 text-[12px] text-[var(--text-muted)]">
          {withTelephony} com telefonia · {users.length} usuários
        </p>
      </div>

      <div className="min-w-0 overflow-hidden rounded-[var(--radius-md)] border border-[var(--glass-border)]">
        <div
          className={cn(
            "grid gap-3 border-b border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-3.5 py-2",
            GRID,
          )}
        >
          {["Usuário", "Ramal", "Status", "Telefonia"].map((h) => (
            <span
              key={h}
              className="font-display text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]"
            >
              {h}
            </span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="px-3.5 py-6 text-center text-[13px] text-[var(--text-muted)]">
            Nenhum usuário encontrado.
          </p>
        ) : (
          filtered.map((user) => {
            const ext = byUserId.get(user.id);
            const st = statusOf(ext);
            const ramal = ext?.authUser || "—";
            return (
              <div
                key={user.id}
                className={cn(
                  "grid items-center gap-3 border-b border-[var(--glass-border-subtle)] px-3.5 py-2.5 last:border-b-0",
                  GRID,
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{user.name}</p>
                  <p className="truncate text-[11px] text-[var(--text-muted)]">{user.email}</p>
                </div>
                <p className="truncate font-mono text-[12px] text-[var(--text-primary)]">{ramal}</p>
                <div className="min-w-0">
                  <StatusPill kind={st.kind} text={st.text} />
                  {ext?.provisioningError ? (
                    <p
                      className="mt-1 line-clamp-2 break-words text-[10px] leading-snug text-[var(--color-danger)]"
                      title={ext.provisioningError}
                    >
                      {ext.provisioningError}
                    </p>
                  ) : null}
                </div>
                <div className="flex justify-end">
                  <TelephonyToggle userId={user.id} compact />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
