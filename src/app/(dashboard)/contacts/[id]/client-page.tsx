"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Building2,
  Check,
  ExternalLink,
  Handshake,
  Loader2,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Star,
  User,
  X,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { CustomFieldsSection } from "@/components/contacts/custom-fields-section";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TooltipHost } from "@/components/ui/tooltip";
import { cn, formatCurrency, formatDateTime, getInitials } from "@/lib/utils";

type ContactDetail = {
  id: string; name: string; email: string | null; phone: string | null;
  avatarUrl: string | null; leadScore: number; lifecycleStage: string;
  source: string | null;
  company: { id: string; name: string; domain: string | null } | null;
  assignedTo: { id: string; name: string; email: string } | null;
  tags: { tag: { id: string; name: string; color: string } }[];
  deals: { id: string; title: string; value: string | number; status: string; stage: { id: string; name: string; color: string } }[];
  notes: NoteRow[];
  conversations: { id: string }[];
  createdAt: string; updatedAt: string;
};

type NoteRow = {
  id: string; content: string; createdAt: string; user: { id: string; name: string };
};

const LIFECYCLE_OPTIONS = [
  { value: "SUBSCRIBER", label: "Assinante", color: "#9ca3af" },
  { value: "LEAD", label: "Lead", color: "#3b82f6" },
  { value: "MQL", label: "MQL", color: "#f59e0b" },
  { value: "SQL", label: "SQL", color: "#f97316" },
  { value: "OPPORTUNITY", label: "Oportunidade", color: "#a855f7" },
  { value: "CUSTOMER", label: "Cliente", color: "#10b981" },
  { value: "EVANGELIST", label: "Evangelista", color: "#ec4899" },
  { value: "OTHER", label: "Outro", color: "#6b7280" },
] as const;

class ContactFetchError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function fetchContact(id: string): Promise<ContactDetail> {
  const res = await fetch(apiUrl(`/api/contacts/${id}`));
  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { message?: string };
      detail = body?.message ?? "";
    } catch {
      /* noop */
    }
    throw new ContactFetchError(
      res.status,
      detail || `Erro ao carregar contato (HTTP ${res.status})`,
    );
  }
  return res.json();
}

export default function ContactDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const contactId = params.id;

  const { data: contact, isLoading, isError, error } = useQuery({
    queryKey: ["contact", contactId],
    queryFn: () => fetchContact(contactId),
    enabled: !!contactId,
    retry: (failureCount, err) => {
      if (err instanceof ContactFetchError && err.status === 404) return false;
      return failureCount < 2;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(apiUrl(`/api/contacts/${contactId}`), {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Erro ao atualizar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact", contactId] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[calc(100dvh-3rem)] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !contact) {
    const is404 = error instanceof ContactFetchError && error.status === 404;
    const message = is404
      ? "Contato não encontrado."
      : error instanceof Error
        ? error.message
        : "Erro ao carregar contato.";
    return (
      <div className="flex h-[calc(100dvh-3rem)] flex-col items-center justify-center gap-4">
        <User className="size-12 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">{message}</p>
        {!is404 && (
          <p className="max-w-md text-center text-xs text-muted-foreground/80">
            Se o problema persistir, verifique os logs do servidor — a página de
            detalhes agora carrega cada relação separadamente, então o erro
            impresso indica qual parte falhou.
          </p>
        )}
        <Button variant="outline" onClick={() => router.push("/contacts")}>
          <ArrowLeft className="mr-2 size-4" /> Voltar
        </Button>
      </div>
    );
  }

  const stageOpt = LIFECYCLE_OPTIONS.find((o) => o.value === contact.lifecycleStage);
  const conversationCount = contact.conversations?.length ?? 0;
  const totalValue = contact.deals.reduce((s, d) => s + Number(d.value || 0), 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 md:px-6">

      {/* ═══ HEADER ═══ */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.back()}
            className="mt-1 shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </button>

          <Avatar className="size-14 shrink-0 ring-2 ring-primary/20">
            <AvatarFallback className="bg-linear-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white">
              {getInitials(contact.name)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">{contact.name}</h1>
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ backgroundColor: stageOpt?.color + "18", color: stageOpt?.color }}
              >
                {stageOpt?.label ?? contact.lifecycleStage}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {contact.company && (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="size-3" /> {contact.company.name}
                </span>
              )}
              {contact.source && (
                <span>Fonte: {contact.source}</span>
              )}
              <span>Criado em {formatDateTime(contact.createdAt)}</span>
              {totalValue > 0 && (
                <span className="font-semibold text-foreground">{formatCurrency(totalValue)} em negócios</span>
              )}
            </div>

            {/* Quick actions */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 shadow-sm transition-colors hover:bg-emerald-50"
                >
                  <Phone className="size-3.5" /> {contact.phone}
                </a>
              )}
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm transition-colors hover:bg-blue-50"
                >
                  <Mail className="size-3.5" /> {contact.email}
                </a>
              )}
              {conversationCount > 0 && (
                <Link
                  href="/inbox"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-white px-3 py-1.5 text-xs font-medium text-cyan-700 shadow-sm transition-colors hover:bg-cyan-50"
                >
                  <MessageSquare className="size-3.5" /> Chat
                </Link>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5">
              <Star className="size-3.5 fill-amber-500 text-amber-500" />
              <span className="text-xs font-bold text-amber-800">{contact.leadScore}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ DADOS CADASTRAIS ═══ */}
      <ProfileSection
        contact={contact}
        onUpdate={(d) => updateMutation.mutate(d)}
        isUpdating={updateMutation.isPending}
      />

      {/* ═══ OBSERVAÇÕES ═══ */}
      <ObservacoesSection
        notes={contact.notes}
        contactId={contact.id}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["contact", contactId] })}
      />

      {/* ═══ TAGS ═══ */}
      <TagsSection contact={contact} />

      {/* ═══ CAMPOS PERSONALIZADOS ═══ */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
        <CustomFieldsSection contactId={contact.id} />
      </div>

      {/* ═══ NEGÓCIOS ASSOCIADOS ═══ */}
      <DealsSection contact={contact} />
    </div>
  );
}

// ── Profile / Dados Cadastrais ──

function ProfileSection({ contact, onUpdate, isUpdating }: {
  contact: ContactDetail;
  onUpdate: (data: Record<string, unknown>) => void;
  isUpdating: boolean;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState({ name: "", email: "", phone: "" });

  const startEdit = () => {
    setDraft({ name: contact.name, email: contact.email ?? "", phone: contact.phone ?? "" });
    setEditing(true);
  };

  const save = () => {
    const payload: Record<string, unknown> = {};
    if (draft.name.trim() !== contact.name) payload.name = draft.name.trim();
    if (draft.email.trim() !== (contact.email ?? "")) payload.email = draft.email.trim() || null;
    if (draft.phone.trim() !== (contact.phone ?? "")) payload.phone = draft.phone.trim() || null;
    if (Object.keys(payload).length > 0) onUpdate(payload);
    setEditing(false);
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border/40 px-5 py-3">
        <h2 className="text-sm font-bold text-foreground">Dados Cadastrais</h2>
        {!editing ? (
          <Button type="button" variant="ghost" size="icon" className="size-7" onClick={startEdit}>
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => setEditing(false)}>
              <X className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="size-7 text-emerald-600" onClick={save} disabled={isUpdating}>
              <Check className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      <div className="p-5">
        {editing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {([
              ["Nome", "name", "text"],
              ["E-mail", "email", "email"],
              ["Telefone", "phone", "tel"],
            ] as const).map(([label, key, type]) => (
              <div key={key}>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
                <Input
                  type={type}
                  value={draft[key]}
                  onChange={(e) => setDraft((p) => ({ ...p, [key]: e.target.value }))}
                  className="mt-1 h-9"
                />
              </div>
            ))}
            {contact.source && (
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fonte</label>
                <div className="mt-1 flex h-9 items-center rounded-md border border-border bg-muted/30 px-3 text-sm text-muted-foreground">
                  {contact.source}
                </div>
              </div>
            )}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fase do ciclo</label>
              <SelectNative
                value={contact.lifecycleStage}
                onChange={(e) => onUpdate({ lifecycleStage: e.target.value })}
                disabled={isUpdating}
                className="mt-1 h-9"
              >
                {LIFECYCLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </SelectNative>
            </div>
          </div>
        ) : (
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            <InfoField label="Nome" value={contact.name} />
            <InfoField label="E-mail" value={contact.email} />
            <InfoField label="Telefone" value={contact.phone} />
            <InfoField label="Fonte" value={contact.source} />
            <InfoField label="Empresa" value={contact.company?.name} />
            <InfoField label="Responsável" value={contact.assignedTo?.name} />
            <InfoField label="Fase do ciclo" value={LIFECYCLE_OPTIONS.find((o) => o.value === contact.lifecycleStage)?.label ?? contact.lifecycleStage} />
            <InfoField label="Criado em" value={formatDateTime(contact.createdAt)} />
          </div>
        )}
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-foreground">
        {value || <span className="text-muted-foreground/40">—</span>}
      </p>
    </div>
  );
}

// ── Observações ──

function ObservacoesSection({ notes, contactId, onCreated }: {
  notes: NoteRow[]; contactId: string; onCreated: () => void;
}) {
  const [draft, setDraft] = React.useState("");

  const mutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(apiUrl(`/api/contacts/${contactId}/notes`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Erro");
    },
    onSuccess: () => { setDraft(""); onCreated(); },
  });

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
      <div className="border-b border-border/40 px-5 py-3">
        <h2 className="text-sm font-bold text-foreground">
          Observações
          {notes.length > 0 && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">({notes.length})</span>
          )}
        </h2>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escreva uma observação sobre este contato…"
            rows={2}
            className="flex-1 resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (draft.trim()) mutation.mutate(draft.trim());
              }
            }}
          />
          <Button
            size="icon"
            className="size-10 shrink-0 rounded-xl"
            disabled={!draft.trim() || mutation.isPending}
            onClick={() => { if (draft.trim()) mutation.mutate(draft.trim()); }}
          >
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          </Button>
        </div>

        {notes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground/60">Nenhuma observação registrada.</p>
        ) : (
          <div className="space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="rounded-xl border border-border/40 bg-muted/10 px-4 py-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{n.content}</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-semibold text-primary">{n.user.name}</span>
                  <span>{formatDateTime(n.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tags ──

function TagsSection({ contact }: { contact: ContactDetail }) {
  const queryClient = useQueryClient();
  const { data: sessionData } = useSession();
  const userRole = (sessionData?.user as { role?: string })?.role ?? "MEMBER";
  const canCreateTag = userRole === "ADMIN" || userRole === "MANAGER";

  const [tagInput, setTagInput] = React.useState("");
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  const { data: allTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => { const r = await fetch(apiUrl("/api/tags")); return r.ok ? r.json() : []; },
    staleTime: 60_000,
  });
  const existingIds = new Set(contact.tags.map((t) => t.tag.id));
  const suggestions = (allTags as { id: string; name: string; color: string }[]).filter(
    (t) => !existingIds.has(t.id) && t.name.toLowerCase().includes(tagInput.toLowerCase()),
  );

  const addTag = useMutation({
    mutationFn: async (payload: { tagId?: string; tagName?: string }) => {
      const res = await fetch(apiUrl(`/api/contacts/${contact.id}/tags`), {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Erro");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact", contact.id] });
      setTagInput("");
      setShowSuggestions(false);
    },
  });

  const removeTag = useMutation({
    mutationFn: async (tagId: string) => {
      const res = await fetch(apiUrl(`/api/contacts/${contact.id}/tags`), {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tagId }),
      });
      if (!res.ok) throw new Error("Erro");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contact", contact.id] }),
  });

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
      <div className="border-b border-border/40 px-5 py-3">
        <h2 className="text-sm font-bold text-foreground">Tags</h2>
      </div>
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          {contact.tags.map((t) => (
            <span
              key={t.tag.id}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold shadow-sm"
              style={{ backgroundColor: t.tag.color + "18", color: t.tag.color }}
            >
              {t.tag.name}
              <button
                type="button"
                onClick={() => removeTag.mutate(t.tag.id)}
                className="ml-0.5 rounded-full p-0.5 opacity-50 transition-opacity hover:opacity-100"
              >
                <X className="size-2.5" />
              </button>
            </span>
          ))}
          {contact.tags.length === 0 && (
            <span className="text-xs text-muted-foreground/50">Nenhuma tag</span>
          )}
        </div>

        <div className="relative mt-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (tagInput.trim() && canCreateTag) addTag.mutate({ tagName: tagInput.trim() });
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
              <Button type="submit" size="sm" variant="outline" className="h-8 gap-1 text-xs" disabled={!tagInput.trim() || addTag.isPending}>
                <Plus className="size-3" /> Criar
              </Button>
            )}
          </form>
          {showSuggestions && tagInput && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-36 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
              {suggestions.slice(0, 8).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => addTag.mutate({ tagId: t.id })}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
                >
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: t.color || "#6b7280" }} />
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Deals ──

function DealsSection({ contact }: { contact: ContactDetail }) {
  const markDeal = async (dealId: string, status: "WON" | "LOST") => {
    const res = await fetch(apiUrl(`/api/deals/${dealId}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) window.location.reload();
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
      <div className="border-b border-border/40 px-5 py-3">
        <h2 className="text-sm font-bold text-foreground">
          Negócios Associados
          {contact.deals.length > 0 && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">({contact.deals.length})</span>
          )}
        </h2>
      </div>
      <div className="p-5">
        {contact.deals.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground/60">Nenhum negócio associado a este contato.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {contact.deals.map((d) => (
              <div key={d.id} className="rounded-xl border border-border/50 bg-muted/10 p-4 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Handshake className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm font-semibold text-foreground">{d.title}</span>
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                    {formatCurrency(Number(d.value))}
                  </span>
                </div>

                <DealProductsInline dealId={d.id} />

                <div className="mt-3 flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-semibold"
                    style={{ borderColor: d.stage.color + "50", color: d.stage.color }}
                  >
                    {d.stage.name}
                  </Badge>

                  {d.status === "OPEN" ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => markDeal(d.id, "WON")}
                        className="rounded-md px-2 py-1 text-[10px] font-bold text-emerald-600 transition-colors hover:bg-emerald-50"
                      >
                        Ganho
                      </button>
                      <button
                        onClick={() => markDeal(d.id, "LOST")}
                        className="rounded-md px-2 py-1 text-[10px] font-bold text-red-500 transition-colors hover:bg-red-50"
                      >
                        Perdido
                      </button>
                      <TooltipHost label="Ver no pipeline" side="left">
                        <Link
                          href="/pipeline"
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label="Ver no pipeline"
                        >
                          <ExternalLink className="size-3.5" />
                        </Link>
                      </TooltipHost>
                    </div>
                  ) : (
                    <span className={cn(
                      "text-[10px] font-bold uppercase",
                      d.status === "WON" ? "text-emerald-600" : "text-red-500",
                    )}>
                      {d.status === "WON" ? "Ganho" : "Perdido"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Deal Products Inline ──

type DealProductInlineItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  unit: string;
};

function DealProductsInline({ dealId }: { dealId: string }) {
  const { data: items = [] } = useQuery({
    queryKey: ["deal-products-inline", dealId],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/deals/${dealId}/products`));
      if (!res.ok) return [];
      const data = await res.json();
      return (data.items ?? []) as DealProductInlineItem[];
    },
  });

  if (items.length === 0) return null;

  return (
    <div className="mt-2 space-y-0.5 border-t border-border/30 pt-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between text-[11px]">
          <span className="truncate text-muted-foreground">
            {item.quantity} {item.unit} × {item.productName}
            {item.discount > 0 && <span className="ml-0.5 text-amber-600">-{item.discount}%</span>}
          </span>
          <span className="shrink-0 font-semibold tabular-nums">{formatCurrency(item.total)}</span>
        </div>
      ))}
    </div>
  );
}
