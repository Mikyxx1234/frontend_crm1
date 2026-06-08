"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, UserPlus, Users, X } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import {
  useAddGroupMember,
  useCreateGroup,
  useDeleteGroup,
  useGroup,
  useRemoveGroupMember,
  useRoles,
  useUpdateGroup,
  useUpdateGroupMember,
} from "./hooks";
import type { RoleSummary } from "./types";

const CHANNEL_OPTIONS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "email", label: "E-mail" },
  { value: "meta", label: "Meta Ads" },
] as const;

interface GroupEditorProps {
  groupId: string | null;
  onClose: () => void;
  onSaved?: (id: string) => void;
}

export function GroupEditor({ groupId, onClose, onSaved }: GroupEditorProps) {
  const isNew = groupId === null;

  const { data: group, isLoading: groupLoading } = useGroup(groupId);
  const { data: roles = [], isLoading: rolesLoading } = useRoles();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();
  const addMember = useAddGroupMember();
  const removeMember = useRemoveGroupMember();
  const updateMember = useUpdateGroupMember();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [roleId, setRoleId] = useState<string | null>(null);
  const [channelGrants, setChannelGrants] = useState<Set<string>>(new Set());
  const [addUserSearch, setAddUserSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description ?? "");
      setColor(group.color ?? "#6366f1");
      setRoleId(group.roleId);
      setChannelGrants(new Set(group.channelGrants));
    }
  }, [group]);

  const loading = groupLoading || rolesLoading;
  const saving = createGroup.isPending || updateGroup.isPending;
  const deleting = deleteGroup.isPending;

  function toggleChannel(ch: string) {
    setChannelGrants((prev) => {
      const next = new Set(prev);
      if (next.has(ch)) next.delete(ch);
      else next.add(ch);
      return next;
    });
  }

  async function handleSave() {
    setError(null);
    const data = {
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      roleId: roleId || null,
      channelGrants: Array.from(channelGrants),
    };
    try {
      if (isNew) {
        const created = await createGroup.mutateAsync(data);
        onSaved?.(created.id);
      } else if (groupId) {
        await updateGroup.mutateAsync({ id: groupId, ...data });
        onSaved?.(groupId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    }
  }

  async function handleDelete() {
    if (!groupId || !deleteConfirm) { setDeleteConfirm(true); return; }
    try {
      await deleteGroup.mutateAsync(groupId);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao deletar.");
      setDeleteConfirm(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!groupId) return;
    try {
      await removeMember.mutateAsync({ groupId, userId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao remover membro.");
    }
  }

  async function handleMemberRoleChange(userId: string, newRoleId: string | null) {
    if (!groupId) return;
    try {
      await updateMember.mutateAsync({ groupId, userId, roleId: newRoleId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar override.");
    }
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="size-5 animate-spin" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  const members = group?.members ?? [];

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Users className="size-4" style={{ color: "var(--brand-primary)" }} />
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {isNew ? "Novo grupo" : (group?.name ?? "")}
        </span>
      </div>

      {/* Nome + Cor + Role */}
      <div className="grid grid-cols-[1fr_40px_1fr] gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Nome</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Time SP"
            className="h-8 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Cor</Label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-full cursor-pointer rounded-[var(--radius-sm)] border"
            style={{ borderColor: "var(--glass-border)" }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Role padrão</Label>
          <SelectNative
            value={roleId ?? ""}
            onChange={(e) => setRoleId(e.target.value || null)}
            className="h-8 text-xs"
          >
            <option value="">Nenhum</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </SelectNative>
        </div>
      </div>

      {/* Descrição */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Descrição</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Opcional"
          className="h-8 text-xs"
        />
      </div>

      {/* Canais permitidos */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          Canais permitidos
        </Label>
        <div className="flex flex-wrap gap-2">
          {CHANNEL_OPTIONS.map((ch) => {
            const on = channelGrants.has(ch.value);
            return (
              <button
                key={ch.value}
                type="button"
                onClick={() => toggleChannel(ch.value)}
                className={cn(
                  "rounded-[var(--radius-md)] border px-3 py-1.5 text-xs font-medium transition-all",
                  on
                    ? "border-[var(--brand-primary)] bg-[rgba(91,111,245,0.1)] text-[var(--brand-primary)]"
                    : "border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--text-muted)] hover:border-[var(--brand-primary)/50]",
                )}
              >
                {ch.label}
              </button>
            );
          })}
        </div>
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          Nenhum selecionado = sem restrição de canal
        </p>
      </div>

      {/* Membros */}
      {!isNew && (
        <div className="flex flex-col gap-2">
          <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Membros ({members.length})
          </Label>

          {members.length > 0 && (
            <div
              className="overflow-hidden rounded-[var(--radius-lg)] border"
              style={{ borderColor: "var(--glass-border)" }}
            >
              {members.map((m) => (
                <div
                  key={m.userId}
                  className="flex items-center gap-3 border-b px-3 py-2 last:border-b-0"
                  style={{ borderColor: "var(--glass-border-subtle)" }}
                >
                  <Avatar className="size-7 shrink-0">
                    <AvatarImage src={m.user.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {m.user.name?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                      {m.user.name}
                    </p>
                    <p className="truncate text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {m.user.email}
                    </p>
                  </div>
                  <SelectNative
                    value={m.roleId ?? ""}
                    onChange={(e) =>
                      void handleMemberRoleChange(m.userId, e.target.value || null)
                    }
                    className="h-7 w-[130px] text-[10px]"
                  >
                    <option value="">Herdar do grupo</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </SelectNative>
                  <button
                    type="button"
                    onClick={() => void handleRemoveMember(m.userId)}
                    className="rounded p-1 transition-colors hover:bg-red-50 hover:text-red-600"
                    style={{ color: "var(--text-muted)" }}
                    title="Remover do grupo"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <UserPlus className="size-3.5 shrink-0" style={{ color: "var(--text-muted)" }} />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Adicione membros pela aba Usuários
            </p>
          </div>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertTriangle className="size-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Ações */}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => void handleSave()} disabled={saving || !name.trim()} className="h-8 text-xs">
          {saving && <Loader2 className="mr-1.5 size-3 animate-spin" />}
          Salvar
        </Button>
        <Button size="sm" variant="outline" onClick={onClose} className="h-8 text-xs">
          Cancelar
        </Button>
        {!isNew && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleDelete()}
            disabled={deleting}
            className={cn(
              "ml-auto h-8 text-xs",
              deleteConfirm
                ? "border-red-400 bg-red-50 text-red-700"
                : "text-red-600 hover:text-red-700",
            )}
          >
            {deleteConfirm ? "Confirmar exclusão" : "Excluir grupo"}
          </Button>
        )}
      </div>
    </div>
  );
}
