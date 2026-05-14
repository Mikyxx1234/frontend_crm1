"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Handshake,
  Info,
  Mail,
  Phone,
  Plus,
  Tag,
  User,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ds } from "@/lib/design-system";
import { dt } from "@/lib/design-tokens";
import { cn, formatCurrency, formatDateTime, tagPillStyle } from "@/lib/utils";

const LIFECYCLE_OPTIONS = [
  { value: "SUBSCRIBER", label: "Assinante" },
  { value: "LEAD", label: "Lead" },
  { value: "MQL", label: "MQL" },
  { value: "SQL", label: "SQL" },
  { value: "OPPORTUNITY", label: "Oportunidade" },
  { value: "CUSTOMER", label: "Cliente" },
  { value: "EVANGELIST", label: "Evangelista" },
  { value: "OTHER", label: "Outro" },
] as const;

const ACTIVITY_TYPE_LABEL: Record<string, string> = {
  CALL: "Ligação",
  EMAIL: "E-mail",
  MEETING: "Reunião",
  TASK: "Tarefa",
  NOTE: "Nota",
  WHATSAPP: "WhatsApp",
  OTHER: "Outro",
};

type ContactDetail = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  leadScore: number | null;
  lifecycleStage: string;
  company: { id: string; name: string } | null;
  tags: { tag: { id: string; name: string; color: string | null } }[];
  deals: {
    id: string;
    title: string;
    value: string;
    status: string;
    stage: { id: string; name: string; color: string | null };
  }[];
  activities: {
    id: string;
    type: string;
    title: string;
    createdAt: string;
    completed: boolean;
  }[];
};

type StageOption = { id: string; name: string; color: string; position: number };

async function fetchContact(id: string): Promise<ContactDetail> {
  const res = await fetch(apiUrl(`/api/contacts/${id}`));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data?.message === "string" ? data.message : "Erro ao carregar contato");
  return data as ContactDetail;
}

type TagRow = { id: string; name: string; color: string | null };

async function fetchAllTags(): Promise<TagRow[]> {
  const res = await fetch(apiUrl("/api/tags"));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return [];
  return Array.isArray(data) ? data : [];
}

async function fetchStages(): Promise<StageOption[]> {
  const res = await fetch(apiUrl("/api/stages"));
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : data.stages ?? [];
}

function Section({
  title,
  icon: Icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border/60 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
      >
        {open ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
        <Icon className="size-3.5 shrink-0 text-indigo-500" />
        {title}
      </button>
      {open ? <div className="space-y-2 pb-3">{children}</div> : null}
    </div>
  );
}

export function ContactInfoPanel({
  contactId,
  onClose,
  className,
}: {
  contactId: string;
  onClose?: () => void;
  className?: string;
}) {
  const queryClient = useQueryClient();
  const { data: sessionData } = useSession();
  const userRole = (sessionData?.user as { role?: string })?.role ?? "MEMBER";
  const canCreateTag = userRole === "ADMIN" || userRole === "MANAGER";

  const [openContact, setOpenContact] = React.useState(true);
  const [openCompany, setOpenCompany] = React.useState(true);
  const [openTags, setOpenTags] = React.useState(true);
  const [openDeals, setOpenDeals] = React.useState(true);
  const [openActivities, setOpenActivities] = React.useState(true);
  const [tagInput, setTagInput] = React.useState("");
  const [showTagSuggestions, setShowTagSuggestions] = React.useState(false);
  const [lifecycleLocal, setLifecycleLocal] = React.useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["contact", contactId, "inbox-panel"],
    queryFn: () => fetchContact(contactId),
    enabled: !!contactId,
  });

  const { data: allTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: fetchAllTags,
    staleTime: 60_000,
  });

  const { data: stages = [] } = useQuery({
    queryKey: ["pipeline-stages"],
    queryFn: fetchStages,
    staleTime: 5 * 60_000,
  });

  React.useEffect(() => {
    if (data?.lifecycleStage) setLifecycleLocal(data.lifecycleStage);
  }, [data?.lifecycleStage]);

  const invalidateContact = () => {
    queryClient.invalidateQueries({ queryKey: ["contact", contactId, "inbox-panel"] });
  };

  const addTagMutation = useMutation({
    mutationFn: async (payload: { tagId?: string; tagName?: string }) => {
      const res = await fetch(apiUrl(`/api/contacts/${contactId}/tags`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Erro ao adicionar tag");
    },
    onSuccess: () => { invalidateContact(); setTagInput(""); setShowTagSuggestions(false); },
  });

  const removeTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const res = await fetch(apiUrl(`/api/contacts/${contactId}/tags`), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId }),
      });
      if (!res.ok) throw new Error("Erro ao remover tag");
    },
    onSuccess: invalidateContact,
  });

  const lifecycleMutation = useMutation({
    mutationFn: async (lifecycleStage: string) => {
      const res = await fetch(apiUrl(`/api/contacts/${contactId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lifecycleStage }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar");
    },
    onSuccess: invalidateContact,
  });

  const moveDealMutation = useMutation({
    mutationFn: async ({ dealId, stageId }: { dealId: string; stageId: string }) => {
      const res = await fetch(apiUrl(`/api/deals/${dealId}/move`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId, position: 0 }),
      });
      if (!res.ok) throw new Error("Erro ao mover deal");
    },
    onSuccess: () => {
      invalidateContact();
      queryClient.invalidateQueries({ queryKey: ["pipeline-board"] });
    },
  });

  const existingTagIds = new Set(data?.tags.map((t) => t.tag.id) ?? []);
  const tagSuggestions = allTags.filter(
    (t) => !existingTagIds.has(t.id) && t.name.toLowerCase().includes(tagInput.toLowerCase())
  );

  const lifecycleLabel =
    LIFECYCLE_OPTIONS.find((o) => o.value === data?.lifecycleStage)?.label ?? data?.lifecycleStage;

  return (
    <aside className={cn("flex w-[300px] shrink-0 flex-col border-l border-border/60 bg-muted/20", className)}>
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Info className="size-4 text-indigo-500" />
          Contato
        </div>
        {onClose && (
          <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={onClose} aria-label="Fechar painel">
            <X className="size-4" />
          </Button>
        )}
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-3">
        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        ) : isError ? (
          <p className="py-6 text-center text-xs text-destructive">
            {error instanceof Error ? error.message : "Erro"}
          </p>
        ) : data ? (
          <>
            <div className="py-3">
              <Link
                href={`/contacts/${data.id}`}
                className="text-base font-semibold text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
              >
                Ver perfil completo →
              </Link>
            </div>

            {/* Contact data */}
            <Section title="Dados" icon={User} open={openContact} onToggle={() => setOpenContact((v) => !v)}>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-foreground">{data.name}</p>
                {data.email && (
                  <a href={`mailto:${data.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-indigo-600">
                    <Mail className="size-3.5 shrink-0" />
                    <span className="truncate text-xs">{data.email}</span>
                  </a>
                )}
                {data.phone && (
                  <a href={`tel:${data.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-indigo-600">
                    <Phone className="size-3.5 shrink-0" />
                    <span className="text-xs">{data.phone}</span>
                  </a>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="secondary" className="text-[10px] font-normal">Ciclo: {lifecycleLabel}</Badge>
                  {data.leadScore != null && (
                    <Badge variant="outline" className="border-indigo-500/30 text-[10px] font-normal">Score: {data.leadScore}</Badge>
                  )}
                </div>
              </div>
              <Separator className="my-3 bg-border/60" />
              <p className="mb-1.5 text-[10px] font-semibold uppercase text-muted-foreground">Alterar estágio</p>
              <div className="flex flex-col gap-2">
                <SelectNative value={lifecycleLocal} onChange={(e) => setLifecycleLocal(e.target.value)} className="h-9 border-indigo-500/20 text-xs">
                  {LIFECYCLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </SelectNative>
                <Button type="button" size="sm" variant="secondary" className="h-8 text-xs"
                  disabled={lifecycleMutation.isPending || lifecycleLocal === data.lifecycleStage}
                  onClick={() => lifecycleMutation.mutate(lifecycleLocal)}>
                  {lifecycleMutation.isPending ? "Salvando…" : "Aplicar estágio"}
                </Button>
              </div>
            </Section>

            {/* Company */}
            <Section title="Empresa" icon={Building2} open={openCompany} onToggle={() => setOpenCompany((v) => !v)}>
              {data.company ? (
                <p className="text-sm text-foreground">{data.company.name}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Sem empresa vinculada</p>
              )}
            </Section>

            {/* Tags — with CRUD */}
            <Section title="Tags" icon={Tag} open={openTags} onToggle={() => setOpenTags((v) => !v)}>
              <div className="flex flex-wrap gap-1.5">
                {data.tags.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Nenhuma tag</span>
                ) : (
                  data.tags.map(({ tag }) => (
                    <span
                      key={tag.id}
                      className={cn(dt.pill.sm, "gap-0.5")}
                      style={tagPillStyle(tag.name, tag.color)}
                    >
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => removeTagMutation.mutate(tag.id)}
                        className="ml-0.5 opacity-70 transition-opacity hover:opacity-100"
                        aria-label={`Remover tag ${tag.name}`}
                      >
                        <X className="size-2.5" />
                      </button>
                    </span>
                  ))
                )}
              </div>
              <div className="relative mt-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (tagInput.trim() && canCreateTag) addTagMutation.mutate({ tagName: tagInput.trim() });
                  }}
                  className="flex gap-1"
                >
                  <Input
                    value={tagInput}
                    onChange={(e) => { setTagInput(e.target.value); setShowTagSuggestions(true); }}
                    onFocus={() => setShowTagSuggestions(true)}
                    placeholder={canCreateTag ? "Buscar ou criar tag…" : "Buscar tag…"}
                    className="h-7 flex-1 text-[11px]"
                  />
                  {canCreateTag && (
                    <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-[10px]" disabled={!tagInput.trim() || addTagMutation.isPending}>
                      <Plus className="size-3" />
                    </Button>
                  )}
                </form>
                {showTagSuggestions && tagInput && tagSuggestions.length > 0 && (
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
            </Section>

            {/* Deals — with stage selector */}
            <Section title="Negócios recentes" icon={Handshake} open={openDeals} onToggle={() => setOpenDeals((v) => !v)}>
              {data.deals.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum negócio</p>
              ) : (
                <ul className="space-y-2">
                  {data.deals.slice(0, 5).map((d) => {
                    const n = Number.parseFloat(d.value);
                    const valueLabel = Number.isFinite(n) ? formatCurrency(n) : d.value;
                    return (
                      <li key={d.id} className="rounded-lg border border-border/60 bg-background/80 px-2.5 py-2 text-xs">
                        <Link href={`/leads/${d.id}`} className="font-medium text-foreground hover:text-indigo-600">
                          {d.title}
                        </Link>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {valueLabel} · {d.status === "OPEN" ? "Aberto" : d.status === "WON" ? "Ganho" : "Perdido"}
                        </p>
                        {d.status === "OPEN" && stages.length > 0 && (
                          <SelectNative
                            value={d.stage.id}
                            onChange={(e) => moveDealMutation.mutate({ dealId: d.id, stageId: e.target.value })}
                            disabled={moveDealMutation.isPending}
                            className="mt-1.5 h-7 text-[10px]"
                          >
                            {stages.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </SelectNative>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>

            {/* Activities */}
            <Section title="Atividades recentes" icon={Info} open={openActivities} onToggle={() => setOpenActivities((v) => !v)}>
              {data.activities.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma atividade</p>
              ) : (
                <ul className="space-y-2">
                  {data.activities.slice(0, 8).map((a) => (
                    <li key={a.id} className="text-xs">
                      <span className="font-medium text-foreground">{ACTIVITY_TYPE_LABEL[a.type] ?? a.type}</span>
                      <p className="text-muted-foreground">{a.title}</p>
                      <p className="text-[10px] text-muted-foreground/80">
                        {formatDateTime(a.createdAt)}{a.completed ? " · Concluída" : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </>
        ) : null}
      </div>
    </aside>
  );
}
