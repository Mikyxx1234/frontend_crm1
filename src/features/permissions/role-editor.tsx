"use client";

import { useState, useEffect, useMemo } from "react";
import {
  IconAlertTriangle,
  IconKey,
  IconLoader2,
  IconShield,
  IconUsers,
} from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import {
  useCreateRole,
  useDeleteRole,
  usePermissionsCatalog,
  useRole,
  useUpdateRole,
} from "./hooks";
import {
  RolePermissionsEditor,
  type PermissionsEditorMode,
} from "./role-permissions-editor";

interface RoleEditorProps {
  roleId: string | null;
  onClose: () => void;
  onSaved?: (id: string) => void;
}

export function RoleEditor({ roleId, onClose, onSaved }: RoleEditorProps) {
  const isNew = roleId === null;

  const { data: role, isLoading: roleLoading } = useRole(roleId);
  const { data: catalog, isLoading: catalogLoading } = usePermissionsCatalog();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<PermissionsEditorMode>("levels");
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const allCatalogKeys = useMemo(
    () =>
      (catalog?.resources ?? []).flatMap((r) =>
        r.actions.map((a) => `${r.resource}:${a.action}`),
      ),
    [catalog?.resources],
  );

  // Editor unificado: exibe TODAS as permissões do catálogo, incluindo
  // mensageria (conversas, canais, templates, campanhas). A gestão de
  // mensageria foi consolidada aqui — em /settings/conversations sobrou
  // apenas um atalho.
  const editorResources = catalog?.resources ?? [];

  useEffect(() => {
    if (role) {
      setName(role.name);
      setDescription(role.description ?? "");
      if (role.permissions.includes("*")) {
        setChecked(new Set(allCatalogKeys));
      } else {
        setChecked(new Set(role.permissions));
      }
    }
  }, [role, allCatalogKeys]);

  const isSystem = role?.isSystem ?? false;
  const isAdminPreset = role?.systemPreset === "ADMIN";
  const loading = roleLoading || catalogLoading;
  const saving = createRole.isPending || updateRole.isPending;
  const deleting = deleteRole.isPending;

  // Contadores do resumo (coluna de identidade). `nav:*` são derivadas,
  // então não entram na contagem de "permissões ativas".
  const permsCount = Array.from(checked).filter(
    (k) => !k.startsWith("nav:"),
  ).length;
  const usersCount = role?._count?.assignments ?? 0;

  async function handleSave() {
    setError(null);
    const permissions = isAdminPreset
      ? ["*"]
      : Array.from(checked);
    try {
      if (isNew) {
        const created = await createRole.mutateAsync({ name: name.trim(), description: description.trim(), permissions });
        onSaved?.(created.id);
      } else if (roleId) {
        await updateRole.mutateAsync({
          id: roleId,
          ...(isSystem ? {} : { name: name.trim(), description: description.trim() }),
          permissions,
        });
        onSaved?.(roleId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    }
  }

  async function handleDelete() {
    if (!roleId || !deleteConfirm) { setDeleteConfirm(true); return; }
    setError(null);
    try {
      await deleteRole.mutateAsync(roleId);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao deletar.");
      setDeleteConfirm(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <IconLoader2 className="size-5 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  const fieldsDisabled = isSystem && !isNew;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
      {/* ── COLUNA ESQUERDA: identidade do role (fixa) ─────────────────── */}
      <aside className="flex flex-col gap-3 lg:sticky lg:top-2">
        <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] shadow-[var(--glass-shadow-sm)]">
          {/* Cabeçalho: ícone + nome + badge de preset */}
          <div className="flex flex-col items-center gap-2.5 border-b border-[var(--glass-border-subtle)] px-6 py-5 text-center">
            <div className="flex size-12 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] text-[var(--brand-primary)]">
              <IconShield size={22} />
            </div>
            <h2 className="font-display text-[14px] font-bold leading-tight text-[var(--text-primary)]">
              {isNew ? "Novo role" : (role?.name ?? "")}
            </h2>
            {isSystem && (
              <Badge variant="outline" className="text-[10px]">
                Preset do sistema
              </Badge>
            )}
          </div>

          {/* Campos editáveis + resumo */}
          <div className="flex flex-col gap-3.5 px-5 py-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Nome</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={fieldsDisabled}
                placeholder="Ex.: Supervisor SP"
                className="h-8 text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Descrição</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={fieldsDisabled}
                placeholder="Opcional"
                className="h-8 text-xs"
              />
            </div>

            {/* Resumo */}
            <div className="flex flex-col gap-1.5 rounded-[var(--radius-md)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-subtle)] p-3">
              <div className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                <IconKey size={13} className="shrink-0 text-[var(--brand-primary)]" />
                <span>
                  <strong className="text-[var(--text-primary)]">
                    {isAdminPreset ? "Todas" : permsCount}
                  </strong>{" "}
                  {isAdminPreset ? "as permissões" : "permissões ativas"}
                </span>
              </div>
              {!isNew && (
                <div className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                  <IconUsers size={13} className="shrink-0 text-[var(--text-muted)]" />
                  <span>
                    <strong className="text-[var(--text-primary)]">{usersCount}</strong>{" "}
                    usuário(s) com este role
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="flex flex-col gap-2 border-t border-[var(--glass-border-subtle)] px-5 py-4">
            <Button
              size="sm"
              onClick={() => void handleSave()}
              disabled={saving || (!isNew && !name.trim())}
              className="h-9 w-full justify-center text-xs"
            >
              {saving && <IconLoader2 className="mr-1.5 size-3 animate-spin" />}
              Salvar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="h-9 w-full justify-center text-xs"
            >
              Cancelar
            </Button>
            {!isNew && !isSystem && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleDelete()}
                disabled={deleting}
                className={cn(
                  "mt-1 h-9 w-full justify-center text-xs",
                  deleteConfirm
                    ? "border-[var(--color-destructive)] bg-[var(--color-destructive-soft)] text-[var(--color-destructive)]"
                    : "text-[var(--color-destructive)]",
                )}
              >
                {deleting ? <IconLoader2 className="mr-1.5 size-3 animate-spin" /> : null}
                {deleteConfirm ? "Confirmar exclusão" : "Deletar role"}
              </Button>
            )}
          </div>
        </div>

        {/* Erro */}
        {error && (
          <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-destructive)] bg-[var(--color-destructive-soft)] px-3 py-2 text-xs text-[var(--color-destructive)]">
            <IconAlertTriangle className="size-3.5 shrink-0" />
            {error}
          </div>
        )}
      </aside>

      {/* ── COLUNA DIREITA: matriz de permissões ───────────────────────── */}
      <div className="flex min-w-0 flex-col gap-3 rounded-[var(--radius-xl)] border border-[var(--glass-border)] bg-[var(--glass-bg-panel)] p-5 shadow-[var(--glass-shadow-sm)]">
        <RolePermissionsEditor
          resources={editorResources}
          checked={checked}
          onChange={setChecked}
          mode={mode}
          onModeChange={setMode}
          disabled={isAdminPreset || saving}
        />
        {isAdminPreset && (
          <p className="text-[11px] text-[var(--text-muted)]">
            O preset Admin sempre possui acesso total (
            <code className="font-mono">*</code>) — as permissões não são editáveis.
          </p>
        )}
      </div>
    </div>
  );
}
