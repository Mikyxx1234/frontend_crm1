"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Loader2, Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
  useCreateRole,
  useDeleteRole,
  usePermissionsCatalog,
  useRole,
  useUpdateRole,
} from "./hooks";
import type { ActionDef, ResourceDef } from "./types";

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
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (role) {
      setName(role.name);
      setDescription(role.description ?? "");
      setChecked(new Set(role.permissions));
    }
  }, [role]);

  const isSystem = role?.isSystem ?? false;
  const loading = roleLoading || catalogLoading;
  const saving = createRole.isPending || updateRole.isPending;
  const deleting = deleteRole.isPending;

  function togglePermission(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSave() {
    setError(null);
    const permissions = Array.from(checked);
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
        <Loader2 className="size-5 animate-spin" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Shield className="size-4" style={{ color: "var(--brand-primary)" }} />
        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {isNew ? "Novo role" : (role?.name ?? "")}
        </span>
        {isSystem && (
          <Badge variant="outline" className="ml-auto text-[10px]">
            Preset do sistema
          </Badge>
        )}
      </div>

      {/* Campos de nome / descrição */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Nome</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSystem && !isNew}
            placeholder="Ex.: Supervisor SP"
            className="h-8 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Descrição</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSystem && !isNew}
            placeholder="Opcional"
            className="h-8 text-xs"
          />
        </div>
      </div>

      {/* Matriz de permissões */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          Permissões
        </Label>
        <div
          className="overflow-auto rounded-[var(--radius-lg)] border"
          style={{
            borderColor: "var(--glass-border)",
            background: "var(--glass-bg-base)",
            maxHeight: "420px",
          }}
        >
          {(catalog?.resources ?? []).map((res) => (
            <PermissionSection
              key={res.resource}
              resource={res}
              checked={checked}
              onToggle={togglePermission}
            />
          ))}
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertTriangle className="size-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Ações */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => void handleSave()}
          disabled={saving || (!isNew && !name.trim())}
          className="h-8 text-xs"
        >
          {saving && <Loader2 className="mr-1.5 size-3 animate-spin" />}
          Salvar
        </Button>
        <Button size="sm" variant="outline" onClick={onClose} className="h-8 text-xs">
          Cancelar
        </Button>
        {!isNew && !isSystem && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleDelete()}
            disabled={deleting}
            className={cn(
              "ml-auto h-8 text-xs",
              deleteConfirm
                ? "border-red-400 bg-red-50 text-red-700 hover:bg-red-100"
                : "text-red-600 hover:text-red-700",
            )}
          >
            {deleting ? (
              <Loader2 className="mr-1.5 size-3 animate-spin" />
            ) : null}
            {deleteConfirm ? "Confirmar exclusão" : "Deletar role"}
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── PermissionSection ───────────────────────────────────────────────────── */

function PermissionSection({
  resource,
  checked,
  onToggle,
}: {
  resource: ResourceDef;
  checked: Set<string>;
  onToggle: (key: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const allKeys = resource.actions.map((a) => `${resource.resource}:${a.action}`);
  const checkedCount = allKeys.filter((k) => checked.has(k)).length;

  return (
    <div className="border-b last:border-b-0" style={{ borderColor: "var(--glass-border-subtle)" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-[var(--glass-bg-overlay)]"
      >
        {open ? (
          <ChevronDown className="size-3.5 shrink-0" style={{ color: "var(--text-muted)" }} />
        ) : (
          <ChevronRight className="size-3.5 shrink-0" style={{ color: "var(--text-muted)" }} />
        )}
        <span className="flex-1 text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
          {resource.label}
        </span>
        {checkedCount > 0 && (
          <span
            className="text-[10px] font-medium"
            style={{ color: "var(--brand-primary)" }}
          >
            {checkedCount}/{allKeys.length}
          </span>
        )}
      </button>

      {open && (
        <ul className="pb-1">
          {resource.actions.map((action) => (
            <PermissionRow
              key={action.action}
              resource={resource.resource}
              action={action}
              checked={checked}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function PermissionRow({
  resource,
  action,
  checked,
  onToggle,
}: {
  resource: string;
  action: ActionDef;
  checked: Set<string>;
  onToggle: (key: string) => void;
}) {
  const key = `${resource}:${action.action}`;
  const isChecked = checked.has(key);

  return (
    <li>
      <label
        className="flex cursor-pointer items-center gap-3 py-1.5 pl-10 pr-4 transition-colors hover:bg-[var(--glass-bg-overlay)]"
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => onToggle(key)}
          className="size-3.5 rounded accent-[var(--brand-primary)]"
        />
        <span
          className={cn("flex-1 text-xs", action.destructive ? "text-red-600" : "")}
          style={action.destructive ? {} : { color: "var(--text-secondary)" }}
        >
          {action.label}
        </span>
        <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
          {key}
        </span>
      </label>
    </li>
  );
}
