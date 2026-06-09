"use client";

import { useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { apiUrl } from "@/lib/api";

import { useGroups, useRoles } from "./hooks";
import { UserPermissionsView } from "./user-permissions-view";
import type { RoleUser } from "./types";

interface UserWithMeta extends RoleUser {
  role?: string;
  organizationId?: string;
}

function useUsers() {
  return useQuery<UserWithMeta[]>({
    queryKey: ["users-list"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/users"));
      if (!res.ok) throw new Error("Erro ao carregar usuários");
      return res.json() as Promise<UserWithMeta[]>;
    },
  });
}

export function UsersTab() {
  const { data: users = [], isLoading } = useUsers();
  const { data: roles = [] } = useRoles();
  const { data: groups = [] } = useGroups();

  const [search, setSearch] = useState("");
  const [filterRoleId, setFilterRoleId] = useState<string | null>(null);
  const [filterGroupId, setFilterGroupId] = useState<string | null>(null);
  const [viewUserId, setViewUserId] = useState<string | null>(null);
  const [viewUser, setViewUser] = useState<UserWithMeta | null>(null);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    if (q && !u.name?.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q)) return false;
    return true;
  });

  function openUserView(user: UserWithMeta) {
    setViewUser(user);
    setViewUserId(user.id);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Filtros */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2"
            style={{ color: "var(--text-muted)" }}
          />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <select
          value={filterRoleId ?? ""}
          onChange={(e) => setFilterRoleId(e.target.value || null)}
          className="h-8 rounded-[var(--radius-md)] border px-2 text-xs"
          style={{
            borderColor: "var(--glass-border)",
            background: "var(--glass-bg-base)",
            color: "var(--text-secondary)",
          }}
        >
          <option value="">Todos os roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <select
          value={filterGroupId ?? ""}
          onChange={(e) => setFilterGroupId(e.target.value || null)}
          className="h-8 rounded-[var(--radius-md)] border px-2 text-xs"
          style={{
            borderColor: "var(--glass-border)",
            background: "var(--glass-bg-base)",
            color: "var(--text-secondary)",
          }}
        >
          <option value="">Todos os grupos</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>

      {/* Lista */}
      <div
        className="overflow-hidden rounded-[var(--radius-xl)] border"
        style={{ borderColor: "var(--glass-border)", background: "var(--glass-bg-base)" }}
      >
        {isLoading ? (
          <div className="py-12 text-center text-xs" style={{ color: "var(--text-muted)" }}>
            Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs" style={{ color: "var(--text-muted)" }}>
            Nenhum usuário encontrado.
          </div>
        ) : (
          filtered.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              onView={() => openUserView(user)}
            />
          ))
        )}
      </div>

      {/* Sheet de permissões efetivas */}
      <Sheet open={!!viewUserId} onOpenChange={(open) => !open && setViewUserId(null)}>
        <SheetContent side="right" className="w-[380px] overflow-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2 text-sm">
              <ShieldCheck className="size-4" style={{ color: "var(--brand-primary)" }} />
              Permissões efetivas
            </SheetTitle>
          </SheetHeader>
          {viewUserId && (
            <UserPermissionsView
              userId={viewUserId}
              userName={viewUser?.name ?? undefined}
              userEmail={viewUser?.email ?? undefined}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function UserRow({
  user,
  onView,
}: {
  user: UserWithMeta;
  onView: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
      style={{ borderColor: "var(--glass-border-subtle)" }}
    >
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={user.avatarUrl ?? undefined} />
        <AvatarFallback className="text-[11px]">
          {user.name?.slice(0, 2).toUpperCase() ?? "??"}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium" style={{ color: "var(--text-primary)" }}>
          {user.name}
        </p>
        <p className="truncate text-[11px]" style={{ color: "var(--text-muted)" }}>
          {user.email}
        </p>
      </div>

      {user.role && (
        <Badge variant="outline" className="shrink-0 text-[10px]">
          {user.role}
        </Badge>
      )}

      <Button
        size="sm"
        variant="outline"
        onClick={onView}
        className="h-7 shrink-0 gap-1 text-[11px]"
      >
        <ShieldCheck className="size-3" />
        Ver permissões
      </Button>
    </div>
  );
}
