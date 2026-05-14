"use client";

import { apiUrl } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  Building2,
  Check,
  ExternalLink,
  Handshake,
  Mail,
  Pencil,
  Phone,
  Tag,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { CustomFieldsSection } from "@/components/contacts/custom-fields-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { dt } from "@/lib/design-tokens";
import { cn, formatCurrency, tagPillStyle, tagStyle } from "@/lib/utils";

const LIFECYCLE_OPTIONS = [
  { value: "SUBSCRIBER", label: "Assinante", color: "bg-gray-400" },
  { value: "LEAD", label: "Lead", color: "bg-blue-500" },
  { value: "MQL", label: "MQL", color: "bg-amber-500" },
  { value: "SQL", label: "SQL", color: "bg-orange-500" },
  { value: "OPPORTUNITY", label: "Oportunidade", color: "bg-purple-500" },
  { value: "CUSTOMER", label: "Cliente", color: "bg-emerald-500" },
  { value: "EVANGELIST", label: "Evangelista", color: "bg-pink-500" },
  { value: "OTHER", label: "Outro", color: "bg-gray-400" },
] as const;

type ContactDetail = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  lifecycleStage: string;
  source: string | null;
  company: { id: string; name: string } | null;
  assignedTo: { id: string; name: string } | null;
  tags: { tag: { id: string; name: string; color: string } }[];
  deals: {
    id: string;
    title: string;
    value: string | number;
    status: string;
    stage: { id: string; name: string; color: string };
  }[];
};

type Props = {
  contact: ContactDetail;
  onUpdate: (data: Record<string, unknown>) => void;
  isUpdating: boolean;
};

export function LeadInfoPanel({ contact, onUpdate, isUpdating }: Props) {
  const queryClient = useQueryClient();
  const { data: sessionData } = useSession();
  const userRole = (sessionData?.user as { role?: string })?.role ?? "MEMBER";
  const canCreateTag = userRole === "ADMIN" || userRole === "MANAGER";

  const [editingBasic, setEditingBasic] = React.useState(false);
  const [draft, setDraft] = React.useState({ name: "", email: "", phone: "", source: "" });
  const [tagInput, setTagInput] = React.useState("");
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  const { data: allTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => { const r = await fetch(apiUrl("/api/tags")); return r.ok ? r.json() : []; },
    staleTime: 60_000,
  });
  const existingTagIds = new Set(contact.tags?.map((t: { tag: { id: string } }) => t.tag.id) ?? []);
  const tagSuggestions = (allTags as { id: string; name: string; color: string }[]).filter(
    (t) => !existingTagIds.has(t.id) && t.name.toLowerCase().includes(tagInput.toLowerCase()),
  );

  const startEdit = () => {
    setDraft({
      name: contact.name,
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      source: contact.source ?? "",
    });
    setEditingBasic(true);
  };

  const saveBasic = () => {
    const payload: Record<string, unknown> = {};
    if (draft.name.trim() !== contact.name) payload.name = draft.name.trim();
    if (draft.email.trim() !== (contact.email ?? ""))
      payload.email = draft.email.trim() || null;
    if (draft.phone.trim() !== (contact.phone ?? ""))
      payload.phone = draft.phone.trim() || null;
    if (draft.source.trim() !== (contact.source ?? ""))
      payload.source = draft.source.trim() || null;
    if (Object.keys(payload).length > 0) onUpdate(payload);
    setEditingBasic(false);
  };

  const addTagMutation = useMutation({
    mutationFn: async (payload: { tagId?: string; tagName?: string }) => {
      const res = await fetch(apiUrl(`/api/contacts/${contact.id}/tags`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Erro ao adicionar tag");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact", contact.id] });
      setTagInput("");
      setShowSuggestions(false);
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const res = await fetch(apiUrl(`/api/contacts/${contact.id}/tags`), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId }),
      });
      if (!res.ok) throw new Error("Erro ao remover tag");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact", contact.id] });
    },
  });

  const currentStageOpt = LIFECYCLE_OPTIONS.find((o) => o.value === contact.lifecycleStage);

  return (
    <div className="space-y-5 rounded-xl border border-border/80 bg-card p-5 shadow-sm">
      {/* Lifecycle Stage Selector */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Fase do Ciclo
        </Label>
        <div className="flex items-center gap-2">
          <span className={cn("size-2.5 rounded-full", currentStageOpt?.color ?? "bg-gray-400")} />
          <SelectNative
            value={contact.lifecycleStage}
            onChange={(e) => onUpdate({ lifecycleStage: e.target.value })}
            disabled={isUpdating}
            className="h-9 flex-1 text-sm font-medium"
          >
            {LIFECYCLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </SelectNative>
        </div>
      </div>

      <Separator />

      {/* Basic Info */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Dados Básicos
          </h3>
          {!editingBasic ? (
            <Button type="button" variant="ghost" size="icon" className="size-7" onClick={startEdit}>
              <Pencil className="size-3.5" />
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => setEditingBasic(false)}>
                <X className="size-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="size-7 text-emerald-600" onClick={saveBasic} disabled={isUpdating}>
                <Check className="size-3.5" />
              </Button>
            </div>
          )}
        </div>

        {editingBasic ? (
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Nome</Label>
              <Input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">E-mail</Label>
              <Input type="email" value={draft.email} onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Telefone</Label>
              <Input value={draft.phone} onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Fonte</Label>
              <Input value={draft.source} onChange={(e) => setDraft((p) => ({ ...p, source: e.target.value }))} className="h-8 text-sm" placeholder="Ex: Google Ads, Indicação…" />
            </div>
          </div>
        ) : (
          <div className="grid gap-2.5 text-sm">
            <InfoRow icon={<User className="size-3.5" />} label="Nome" value={contact.name} />
            <InfoRow icon={<Mail className="size-3.5" />} label="E-mail" value={contact.email} />
            <InfoRow icon={<Phone className="size-3.5" />} label="Telefone" value={contact.phone} />
            <InfoRow icon={<Building2 className="size-3.5" />} label="Empresa" value={contact.company?.name} />
            {contact.source && <InfoRow icon={<ExternalLink className="size-3.5" />} label="Fonte" value={contact.source} />}
            {contact.assignedTo && <InfoRow icon={<User className="size-3.5" />} label="Responsável" value={contact.assignedTo.name} />}
          </div>
        )}
      </div>

      <Separator />

      {/* Custom Fields */}
      <CustomFieldsSection contactId={contact.id} />

      <Separator />

      {/* Tags */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tags
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {contact.tags.map((t) => (
            <span
              key={t.tag.id}
              className={cn(dt.pill.base, "gap-1 pr-1")}
              style={tagPillStyle(t.tag.name, t.tag.color)}
            >
              {t.tag.name}
              <button
                type="button"
                onClick={() => removeTagMutation.mutate(t.tag.id)}
                className="rounded-sm p-0.5 opacity-60 hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="relative">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (tagInput.trim() && canCreateTag) addTagMutation.mutate({ tagName: tagInput.trim() });
            }}
            className="flex gap-2"
          >
            <Input
              value={tagInput}
              onChange={(e) => { setTagInput(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              placeholder={canCreateTag ? "Buscar ou criar tag…" : "Buscar tag…"}
              className="h-8 flex-1 text-sm"
            />
            {canCreateTag && (
              <Button type="submit" size="sm" variant="outline" className="h-8" disabled={!tagInput.trim() || addTagMutation.isPending}>
                <Tag className="size-3.5" />
              </Button>
            )}
          </form>
          {showSuggestions && tagInput && tagSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-32 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
              {tagSuggestions.slice(0, 8).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => addTagMutation.mutate({ tagId: t.id })}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-muted/50"
                >
                  <span className="size-2 rounded-full" style={{ backgroundColor: t.color || "#6b7280" }} />
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Deals */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Negócios ({contact.deals.length})
        </h3>
        {contact.deals.length === 0 ? (
          <p className="text-xs text-muted-foreground/70">Nenhum negócio vinculado.</p>
        ) : (
          <div className="grid gap-2">
            {contact.deals.map((d) => (
              <Link
                key={d.id}
                href="/pipeline"
                className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm transition-colors hover:bg-muted/60"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Handshake className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">{d.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={dt.pill.sm} style={tagStyle(d.stage.color)}>
                    {d.stage.name}
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                    {formatCurrency(Number(d.value))}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate text-foreground">{value || "—"}</p>
      </div>
    </div>
  );
}
