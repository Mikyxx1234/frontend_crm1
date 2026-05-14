"use client";

import { apiUrl } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  Plus,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SelectNative } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type UserRole = "ADMIN" | "MANAGER" | "MEMBER";

type UserRow = { id: string; name: string; email: string; role: UserRole };

const ROLE_PT: Record<UserRole, string> = {
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  MEMBER: "Membro",
};

const ROLE_BADGE: Record<UserRole, string> = {
  ADMIN: "border-transparent bg-violet-500/15 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  MANAGER: "border-transparent bg-blue-500/15 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  MEMBER: "border-transparent bg-muted text-muted-foreground",
};

const ROLES: UserRole[] = ["ADMIN", "MANAGER", "MEMBER"];

async function parseJsonError(res: Response, fallback: string): Promise<never> {
  const data = (await res.json().catch(() => ({}))) as { message?: string };
  throw new Error(typeof data.message === "string" ? data.message : fallback);
}

async function fetchUsers(): Promise<UserRow[]> {
  const res = await fetch(apiUrl("/api/users"));
  if (!res.ok) await parseJsonError(res, "Erro ao carregar equipe.");
  return res.json();
}

export default function TeamSettingsPage() {
  const qc = useQueryClient();
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [inviteName, setInviteName] = React.useState("");
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [invitePassword, setInvitePassword] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<UserRole>("MEMBER");

  // Dialog de troca de senha administrativa. Guardamos o usuário-alvo
  // pra poder exibir nome/e-mail no título e desambiguar do convite
  // (que cria usuário novo e tem UX distinta).
  const [passwordTarget, setPasswordTarget] = React.useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<UserRow | null>(null);

  const {
    data: users = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["users-list"],
    queryFn: fetchUsers,
    enabled: status === "authenticated",
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      const res = await fetch(apiUrl(`/api/users/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) await parseJsonError(res, "Erro ao atualizar função.");
      return res.json() as Promise<UserRow>;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["users-list"] }),
  });

  const updatePassword = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const res = await fetch(apiUrl(`/api/users/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) await parseJsonError(res, "Erro ao trocar senha.");
      return res.json();
    },
    onSuccess: (_data, vars) => {
      const targetName = passwordTarget?.name ?? "o usuário";
      // Próprio usuário trocou a própria senha: avisar que precisa
      // entrar de novo (o NextAuth mantém o cookie, mas a senha antiga
      // não serve mais em nenhum outro dispositivo).
      if (vars.id === session?.user?.id) {
        toast.success("Sua senha foi atualizada.");
      } else {
        toast.success(`Senha de ${targetName} atualizada.`);
      }
      setPasswordTarget(null);
      setNewPassword("");
      setConfirmPassword("");
      setShowPassword(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao trocar senha.");
    },
  });

  const openPasswordDialog = React.useCallback((u: UserRow) => {
    setPasswordTarget(u);
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }, []);

  const closePasswordDialog = React.useCallback(() => {
    if (updatePassword.isPending) return;
    setPasswordTarget(null);
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }, [updatePassword.isPending]);

  const passwordMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmitPassword =
    newPassword.length >= 6 &&
    newPassword === confirmPassword &&
    !updatePassword.isPending;

  const invite = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/users"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          password: invitePassword,
          role: inviteRole,
        }),
      });
      if (!res.ok) await parseJsonError(res, "Erro ao convidar membro.");
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["users-list"] });
      setInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
      setInvitePassword("");
      setInviteRole("MEMBER");
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/api/users/${id}`), { method: "DELETE" });
      if (!res.ok) await parseJsonError(res, "Erro ao excluir usuário.");
      return res.json() as Promise<{ ok: true }>;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["users-list"] });
      toast.success("Usuário excluído com sucesso.");
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir usuário.");
    },
  });

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/settings"
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Voltar às configurações
          </Link>
          <PageHeader
            title="Equipe"
            description="Gerencie membros e permissões"
            icon={<Users />}
          />
        </div>
        <Button className="shrink-0 gap-2" onClick={() => setInviteOpen(true)}>
          <Plus className="size-4" />
          Convidar membro
        </Button>
      </div>

      {isError && error instanceof Error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error.message}
        </p>
      ) : null}

      <div className="grid gap-3">
        {isLoading ? (
          [0, 1].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{u.name}</span>
                  <Badge
                    variant="outline"
                    className={cn("font-medium", ROLE_BADGE[u.role])}
                  >
                    <Shield className="me-1 size-3 opacity-70" />
                    {ROLE_PT[u.role]}
                  </Badge>
                </div>
                <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                  <Mail className="size-3.5 shrink-0 opacity-70" />
                  {u.email}
                </p>
              </div>
              <div className="flex w-full shrink-0 flex-col gap-2 sm:w-48">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    Função
                  </span>
                  <SelectNative
                    value={u.role}
                    disabled={updateRole.isPending || !isAdmin}
                    onChange={(e) => {
                      const next = e.target.value as UserRole;
                      if (next === u.role) return;
                      updateRole.mutate({ id: u.id, role: next });
                    }}
                    className="bg-background"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_PT[r]}
                      </option>
                    ))}
                  </SelectNative>
                </div>
                {isAdmin ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="justify-center gap-1.5"
                      onClick={() => openPasswordDialog(u)}
                    >
                      <KeyRound className="size-3.5" />
                      Senha
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="justify-center gap-1.5"
                      onClick={() => setDeleteTarget(u)}
                    >
                      <Trash2 className="size-3.5" />
                      Excluir
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {updateRole.isError ? (
        <p className="text-center text-sm text-destructive">
          {updateRole.error instanceof Error ? updateRole.error.message : "Erro ao atualizar."}
        </p>
      ) : null}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar membro</DialogTitle>
            <DialogDescription>
              Novo usuário acessa com o e-mail e a senha informados abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <label htmlFor="invite-name" className="text-sm font-medium">
                Nome
              </label>
              <Input
                id="invite-name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Nome completo"
                autoComplete="name"
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="invite-email" className="text-sm font-medium">
                E-mail
              </label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@empresa.com"
                autoComplete="email"
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="invite-password" className="text-sm font-medium">
                Senha inicial
              </label>
              <Input
                id="invite-password"
                type="password"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <div className="grid gap-1.5">
              <span className="text-sm font-medium">Função</span>
              <SelectNative
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UserRole)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_PT[r]}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>
          {invite.isError && invite.error instanceof Error ? (
            <p className="text-sm text-destructive">{invite.error.message}</p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button
              type="button"
              disabled={invite.isPending || !inviteName.trim() || !inviteEmail.trim() || invitePassword.length < 6}
              onClick={() => invite.mutate()}
              className="gap-2"
            >
              {invite.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Enviar convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={passwordTarget != null}
        onOpenChange={(open) => {
          if (!open) closePasswordDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-4 text-violet-500" />
              Trocar senha
            </DialogTitle>
            <DialogDescription>
              {passwordTarget ? (
                <>
                  Defina uma nova senha para{" "}
                  <span className="font-medium text-foreground">
                    {passwordTarget.name}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    ({passwordTarget.email})
                  </span>
                  . O próximo login usará esta senha.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <label htmlFor="new-password" className="text-sm font-medium">
                Nova senha
              </label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Mínimo de 6 caracteres.
              </p>
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="confirm-password" className="text-sm font-medium">
                Confirmar nova senha
              </label>
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              {passwordMismatch ? (
                <p className="text-[11px] text-destructive">
                  As senhas não coincidem.
                </p>
              ) : null}
            </div>
          </div>
          {updatePassword.isError && updatePassword.error instanceof Error ? (
            <p className="text-sm text-destructive">
              {updatePassword.error.message}
            </p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={closePasswordDialog}
              disabled={updatePassword.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!canSubmitPassword}
              onClick={() => {
                if (!passwordTarget) return;
                updatePassword.mutate({
                  id: passwordTarget.id,
                  password: newPassword,
                });
              }}
              className="gap-2"
            >
              {updatePassword.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <KeyRound className="size-4" />
              )}
              Salvar nova senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open && !deleteUser.isPending) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="size-4 text-destructive" />
              Excluir usuário
            </DialogTitle>
            <DialogDescription>
              {deleteTarget ? (
                <>
                  Esta ação remove o acesso de{" "}
                  <span className="font-medium text-foreground">{deleteTarget.name}</span>{" "}
                  (<span className="text-muted-foreground">{deleteTarget.email}</span>).
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          {deleteUser.isError && deleteUser.error instanceof Error ? (
            <p className="text-sm text-destructive">{deleteUser.error.message}</p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteUser.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteUser.isPending || !deleteTarget}
              onClick={() => {
                if (!deleteTarget) return;
                deleteUser.mutate(deleteTarget.id);
              }}
              className="gap-2"
            >
              {deleteUser.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Confirmar exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
