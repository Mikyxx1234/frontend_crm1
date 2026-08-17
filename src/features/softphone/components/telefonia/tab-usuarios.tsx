"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";

import { useTeamUsersQuery } from "@/features/shared/queries/team-users";
import { TelephonyToggle } from "@/features/telephony/telephony-toggle";

import { listExtensions } from "../../api/extensions";
import {
  STATUS_LABEL,
  toTelephonyUser,
  type RamalStatus,
} from "../../lib/telephony";

export function TabUsuarios() {
  const [query, setQuery] = useState("");
  const { data: team = [], isLoading: usersLoading } = useTeamUsersQuery<{
    id: string;
    name: string;
    email: string;
  }>();
  const { data: extensions, isLoading: extLoading } = useQuery({
    queryKey: ["sip-extensions"],
    queryFn: listExtensions,
  });

  const users = useMemo(() => {
    const byUserId = new Map((extensions ?? []).map((ext) => [ext.userId, ext]));
    return team.map((u) => toTelephonyUser(u, byUserId.get(u.id)));
  }, [team, extensions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [query, users]);

  const active = users.filter((u) => u.telephonyOn).length;

  if (usersLoading || extLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Carregando usuários…
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum usuário na organização. Crie a equipe em Configurações → Equipe.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar usuário ou email..."
            className="h-10 w-full rounded-xl border border-border bg-secondary/60 pr-3 pl-9 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{active}</span> com telefonia · {users.length}{" "}
          usuários
        </p>
      </div>

      <div className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl bg-secondary/60 px-4 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase sm:grid-cols-[minmax(0,1fr)_5rem_7rem_5rem]">
        <span>Usuário</span>
        <span className="hidden text-center sm:block">Ramal</span>
        <span className="hidden text-center sm:block">Status</span>
        <span className="text-right sm:text-center">Telefonia</span>
      </div>

      <div className="flex flex-col">
        {filtered.map((u) => (
          <div
            key={u.id}
            className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-border px-4 py-3 last:border-0 sm:grid-cols-[minmax(0,1fr)_5rem_7rem_5rem]"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{u.name}</p>
              <p className="truncate text-xs text-muted-foreground">{u.email}</p>
            </div>
            <span className="hidden text-center font-mono text-sm text-muted-foreground tabular-nums sm:block">
              {u.ramal ?? "—"}
            </span>
            <div className="hidden flex-col items-center gap-1 sm:flex">
              <StatusBadge status={u.status} />
              {u.provisioningError ? (
                <p
                  className="line-clamp-2 max-w-28 text-center text-[10px] leading-snug text-destructive"
                  title={u.provisioningError}
                >
                  {u.provisioningError}
                </p>
              ) : null}
            </div>
            <div className="flex justify-end sm:justify-center">
              <TelephonyToggle userId={u.id} compact />
            </div>
          </div>
        ))}

        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
        ) : null}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: RamalStatus }) {
  const styles: Record<RamalStatus, string> = {
    ativo: "bg-success/12 text-success",
    inativo: "bg-muted text-muted-foreground",
    nao_criado: "bg-warning/15 text-warning",
    falhou: "bg-destructive/10 text-destructive",
    provisionando: "bg-warning/15 text-warning",
  };
  const dot: Record<RamalStatus, string> = {
    ativo: "bg-success",
    inativo: "bg-muted-foreground/50",
    nao_criado: "bg-warning",
    falhou: "bg-destructive",
    provisionando: "bg-warning",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      <span className={`size-1.5 rounded-full ${dot[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}
