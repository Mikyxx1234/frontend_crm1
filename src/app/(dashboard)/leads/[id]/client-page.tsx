"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Loader2,
  Mail,
  MessageSquare,
  Package,
  Pencil,
  Phone,
  Plus,
  User,
  UserCircle,
  X,
} from "lucide-react";

import { ChatWindow } from "@/components/inbox/chat-window";

import { ContactTimeline } from "@/components/contacts/contact-timeline";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dt } from "@/lib/design-tokens";
import { cn, formatCurrency, formatDateTime, getInitials, tagPillStyle, tagStyle } from "@/lib/utils";

// ── Types ────────────────────────────────────

type ConversationRow = {
  id: string;
  externalId: string | null;
  channel: string;
  status: string;
  inboxName: string | null;
  createdAt: string;
  updatedAt: string;
};

type TagRow = { tag: { id: string; name: string; color: string } };
type StageRow = { id: string; name: string; color: string; position: number };

type ActivityRow = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  completed: boolean;
  scheduledAt: string | null;
  createdAt: string;
  user: { id: string; name: string };
};

type NoteRow = {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string };
};

type DealDetail = {
  id: string;
  number: number;
  title: string;
  value: string | number;
  status: string;
  expectedClose: string | null;
  contact: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    avatarUrl: string | null;
    conversations: ConversationRow[];
    tags: TagRow[];
  } | null;
  stage: {
    id: string;
    name: string;
    color: string;
    position: number;
    pipeline: { id: string; name: string; stages: StageRow[] };
  };
  owner: { id: string; name: string; email: string } | null;
  activities: ActivityRow[];
  notes: NoteRow[];
  createdAt: string;
  updatedAt: string;
};

type DealProductItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  unit: string;
};

type UserOption = { id: string; name: string; email: string; avatarUrl: string | null };
type CatalogProduct = { id: string; name: string; price: number; unit: string; sku?: string | null };

// ── Fetchers ─────────────────────────────────

async function fetchDeal(idOrNumber: string): Promise<DealDetail> {
  const res = await fetch(apiUrl(`/api/deals/${idOrNumber}`));
  if (!res.ok) throw new Error("Erro ao carregar lead");
  return res.json();
}
async function fetchUsers(): Promise<UserOption[]> {
  const res = await fetch(apiUrl("/api/users"));
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items ?? data) as UserOption[];
}
async function fetchDealProducts(dealId: string): Promise<DealProductItem[]> {
  const res = await fetch(apiUrl(`/api/deals/${dealId}/products`));
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items ?? []) as DealProductItem[];
}
async function fetchAllTags(): Promise<{ id: string; name: string; color: string }[]> {
  const res = await fetch(apiUrl("/api/tags"));
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// ══════════════════════════════════════════════
// Main Page — Contact-style 2-column layout
// ══════════════════════════════════════════════

export default function LeadPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const dealParam = params.id;

  const [selectedConv, setSelectedConv] = React.useState<ConversationRow | null>(null);
  const [convStatus, setConvStatus] = React.useState("");
  const [autoLoaded, setAutoLoaded] = React.useState(false);
  const [centerTab, setCenterTab] = React.useState<"chat" | "timeline">("chat");

  const { data: deal, isLoading, isError } = useQuery({
    queryKey: ["deal", dealParam],
    queryFn: () => fetchDeal(dealParam),
    enabled: !!dealParam,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["deal-products", deal?.id],
    queryFn: () => fetchDealProducts(deal!.id),
    enabled: !!deal?.id,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-list"],
    queryFn: fetchUsers,
    staleTime: 5 * 60_000,
  });

  const conversations = deal?.contact?.conversations ?? [];

  React.useEffect(() => {
    if (deal && !autoLoaded && conversations.length > 0 && !selectedConv) {
      setSelectedConv(conversations[0]);
      setConvStatus(conversations[0].status);
      setAutoLoaded(true);
    }
  }, [deal, autoLoaded, selectedConv, conversations]);

  const ownerMutation = useMutation({
    mutationFn: async (ownerId: string | null) => {
      const res = await fetch(apiUrl(`/api/deals/${deal!.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId }),
      });
      if (!res.ok) throw new Error("Erro ao atribuir responsavel");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deal", dealParam] }),
  });

  const moveMutation = useMutation({
    mutationFn: async (stageId: string) => {
      const res = await fetch(apiUrl(`/api/deals/${deal!.id}/move`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId, position: 0 }),
      });
      if (!res.ok) throw new Error("Erro ao mover deal");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal", dealParam] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-board"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-[calc(100dvh-3rem)] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !deal) {
    return (
      <div className="flex h-[calc(100dvh-3rem)] flex-col items-center justify-center gap-4">
        <User className="size-12 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Lead nao encontrado.</p>
        <Button variant="outline" onClick={() => router.push("/pipeline")}>
          <ArrowLeft className="mr-2 size-4" /> Voltar
        </Button>
      </div>
    );
  }

  const contact = deal.contact;
  const pipelineStages = deal.stage.pipeline.stages;
  const activeStageIdx = pipelineStages.findIndex((s) => s.id === deal.stage.id);
  const totalProducts = products.reduce((s, p) => s + p.total, 0);

  return (
    <div className="flex h-[calc(100dvh-3rem)] overflow-hidden -m-6 md:-m-8">
      {/* ═══ LEFT PANEL — Deal Info ═══ */}
      <aside className="flex w-[320px] shrink-0 flex-col border-r border-border/50 bg-card">
        <div className="scrollbar-thin flex-1 overflow-y-auto">
          {/* Header */}
          <div className="border-b border-border/40 p-5">
            <div className="flex items-start gap-3">
              <button
                onClick={() => router.back()}
                className="mt-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
              </button>
              <Avatar className="size-12 shrink-0 ring-2 ring-primary/20">
                <AvatarFallback className="bg-linear-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
                  {contact ? getInitials(contact.name) : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-base font-bold text-foreground">
                  {contact?.name ?? deal.title}
                </h1>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  #{deal.number} · {deal.stage.pipeline.name}
                </p>
                <span
                  className={cn(dt.pill.sm, "mt-1.5 font-bold uppercase tracking-wider")}
                  style={tagStyle(deal.stage.color || "#6366f1")}
                >
                  {deal.stage.name}
                </span>
              </div>
            </div>
          </div>

          {/* Pipeline stage dropdown */}
          <StageDropdown
            stages={pipelineStages}
            activeStageId={deal.stage.id}
            activeStageColor={deal.stage.color}
            onStageChange={(stageId) => moveMutation.mutate(stageId)}
            isMoving={moveMutation.isPending}
          />

          {/* Deal value card */}
          <div className="border-b border-border/40 px-4 py-3">
            <div className="rounded-xl bg-linear-to-br from-emerald-50 to-emerald-100/50 p-3.5 dark:from-emerald-950/40 dark:to-emerald-900/20">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Valor do lead
              </span>
              <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                {formatCurrency(Number(deal.value))}
              </p>
              {products.length > 0 && (
                <p className="mt-0.5 text-[11px] text-emerald-600/70">
                  {products.length} produto{products.length > 1 && "s"} · {formatCurrency(totalProducts)}
                </p>
              )}
            </div>
          </div>

          {/* Contact info */}
          {contact && (
            <div className="border-b border-border/40 px-4 py-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Contato</span>
              <div className="mt-2 space-y-1.5">
                {contact.email && <InfoRow icon={Mail} value={contact.email} copyable />}
                {contact.phone && <InfoRow icon={Phone} value={contact.phone} copyable />}
              </div>
            </div>
          )}

          {/* Owner */}
          <div className="border-b border-border/40 px-4 py-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Responsavel</span>
            <div className="mt-2">
              <OwnerSelector
                currentOwner={deal.owner}
                users={users}
                onChange={(id) => ownerMutation.mutate(id)}
                isPending={ownerMutation.isPending}
              />
            </div>
          </div>

          {/* Tags */}
          <TagsSection contactId={contact?.id} tags={contact?.tags ?? []} dealParam={dealParam} />

          {/* Products */}
          <ProductsSection dealId={deal.id} products={products} dealParam={dealParam} />

          {/* Details */}
          <div className="border-b border-border/40 px-4 py-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Detalhes</span>
            <table className="mt-2 w-full text-xs">
              <tbody>
                <FieldRow label="Pipeline" value={deal.stage.pipeline.name} />
                <FieldRow label="Etapa" value={deal.stage.name} />
                {deal.expectedClose && <FieldRow label="Previsao" value={formatDateTime(deal.expectedClose)} />}
                <FieldRow label="Criado em" value={formatDateTime(deal.createdAt)} />
                <FieldRow label="Status" value={deal.status === "OPEN" ? "Aberto" : deal.status === "WON" ? "Ganho" : "Perdido"} />
              </tbody>
            </table>
          </div>

          {/* Conversations */}
          <div className="px-4 py-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Conversas</span>
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <MessageSquare className="size-5 text-muted-foreground/30" />
                <p className="text-[11px] text-muted-foreground">Nenhuma conversa</p>
              </div>
            ) : (
              <div className="mt-2 space-y-1">
                {conversations.map((c) => {
                  const isActive = selectedConv?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setSelectedConv(c); setConvStatus(c.status); setCenterTab("chat"); }}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                        isActive ? "bg-primary/10" : "hover:bg-muted/50"
                      )}
                    >
                      <div className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg",
                        isActive ? "bg-primary text-primary-foreground" : "bg-emerald-500/10 text-emerald-600"
                      )}>
                        <MessageSquare className="size-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="truncate text-sm font-medium">{c.inboxName || c.channel}</span>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(c.updatedAt), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                      <span className={cn(
                        "size-2 shrink-0 rounded-full",
                        c.status === "OPEN" ? "bg-emerald-500" : "bg-gray-400"
                      )} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ═══ CENTER — Chat / Timeline ═══ */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Tab bar */}
        <div className="flex shrink-0 items-center gap-1 border-b border-border/50 bg-card px-4">
          {([
            { key: "chat" as const, label: "Chat", icon: MessageSquare, count: conversations.length },
            { key: "timeline" as const, label: "Timeline", icon: Clock },
          ]).map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setCenterTab(key)}
              className={cn(
                "relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors",
                centerTab === key ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {label}
              {(count ?? 0) > 0 && (
                <span className="ml-0.5 rounded-full bg-muted px-1.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                  {count}
                </span>
              )}
              {centerTab === key && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Chat tab */}
          {centerTab === "chat" && (
            <>
              {selectedConv ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="flex items-center gap-3 border-b border-border/40 bg-muted/5 px-4 py-2">
                    <button
                      onClick={() => setSelectedConv(null)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <ArrowLeft className="size-4" />
                    </button>
                    <div className="size-8 shrink-0 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <MessageSquare className="size-3.5 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{selectedConv.inboxName || selectedConv.channel}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {convStatus === "OPEN" ? "Aberto" : convStatus === "RESOLVED" ? "Resolvido" : convStatus || selectedConv.status}
                      </p>
                    </div>
                  </div>
                  <ChatWindow
                    conversationId={selectedConv.id}
                    conversationStatus={convStatus || selectedConv.status}
                    onResolve={(s) => setConvStatus(s)}
                    onReopen={(s) => setConvStatus(s)}
                  />
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col">
                  {conversations.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
                      <div className="size-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                        <MessageSquare className="size-7 text-muted-foreground/40" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">Nenhuma conversa</p>
                      <p className="text-xs text-muted-foreground/60">Inicie uma conversa via WhatsApp</p>
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
                      <MessageSquare className="size-7 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">Selecione uma conversa na lateral</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Timeline tab */}
          {centerTab === "timeline" && contact && (
            <div className="scrollbar-thin flex-1 overflow-y-auto p-6">
              <ContactTimeline contactId={contact.id} />
            </div>
          )}
          {centerTab === "timeline" && !contact && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-muted-foreground">Sem contato vinculado para exibir timeline.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Stage Dropdown — Kommo style ────────────

function StageDropdown({ stages, activeStageId, activeStageColor, onStageChange, isMoving }: {
  stages: StageRow[];
  activeStageId: string;
  activeStageColor: string;
  onStageChange: (stageId: string) => void;
  isMoving: boolean;
}) {
  const sorted = [...stages].sort((a, b) => a.position - b.position);
  const activeIdx = sorted.findIndex((s) => s.id === activeStageId);
  const activeStage = activeIdx >= 0 ? sorted[activeIdx] : null;
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const color = activeStageColor || "#0d6efd";

  return (
    <div className="border-b border-border/40 px-4 py-3">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Etapa do pipeline
      </span>
      <div ref={ref} className="relative mt-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          disabled={isMoving}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all",
            open ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40",
            isMoving && "opacity-60"
          )}
        >
          <span
            className="size-3 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="flex-1 truncate text-sm font-semibold text-foreground">
            {isMoving ? "Movendo…" : (activeStage?.name ?? "—")}
          </span>
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
            {activeIdx + 1}/{sorted.length}
          </span>
          <ChevronDown className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )} />
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
            {sorted.map((s, idx) => {
              const isCurrent = s.id === activeStageId;
              const isPast = idx < activeIdx;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    if (!isCurrent) onStageChange(s.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors",
                    isCurrent
                      ? "bg-primary/5 font-semibold text-primary"
                      : "text-foreground hover:bg-muted/50"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white",
                      isCurrent && "ring-2 ring-primary/30"
                    )}
                    style={{ backgroundColor: s.color || "#6c757d" }}
                  >
                    {isPast || isCurrent ? (
                      <Check className="size-3" />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </span>
                  <span className="flex-1 truncate">{s.name}</span>
                  {isCurrent && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      Atual
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Mini progress bar */}
      <div className="mt-2 flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full">
        {sorted.map((s, idx) => (
          <div
            key={s.id}
            className="flex-1 rounded-full transition-colors"
            style={{
              backgroundColor: idx <= activeIdx ? (s.color || "#0d6efd") : "var(--color-muted)",
              opacity: idx <= activeIdx ? 1 : 0.3,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Tags Section — full CRUD ────────────────

function TagsSection({ contactId, tags, dealParam }: {
  contactId?: string;
  tags: TagRow[];
  dealParam: string;
}) {
  const queryClient = useQueryClient();
  const { data: sessionData } = useSession();
  const userRole = (sessionData?.user as { role?: string })?.role ?? "MEMBER";
  const canCreateTag = userRole === "ADMIN" || userRole === "MANAGER";

  const [tagInput, setTagInput] = React.useState("");
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  const { data: allTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: fetchAllTags,
    staleTime: 60_000,
  });

  const existingIds = new Set(tags.map((t) => t.tag.id));
  const suggestions = allTags.filter(
    (t) => !existingIds.has(t.id) && t.name.toLowerCase().includes(tagInput.toLowerCase())
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["deal", dealParam] });
    queryClient.invalidateQueries({ queryKey: ["contact"] });
  };

  const addTag = useMutation({
    mutationFn: async (payload: { tagId?: string; tagName?: string }) => {
      if (!contactId) throw new Error("Sem contato");
      const res = await fetch(apiUrl(`/api/contacts/${contactId}/tags`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Erro ao adicionar tag");
    },
    onSuccess: () => { invalidate(); setTagInput(""); setShowSuggestions(false); },
  });

  const removeTag = useMutation({
    mutationFn: async (tagId: string) => {
      if (!contactId) return;
      const res = await fetch(apiUrl(`/api/contacts/${contactId}/tags`), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId }),
      });
      if (!res.ok) throw new Error("Erro ao remover tag");
    },
    onSuccess: invalidate,
  });

  return (
    <div className="border-b border-border/40 px-4 py-3">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tags</span>
      <div className="mt-2 flex flex-wrap gap-1">
        {tags.map((t) => (
          <span
            key={t.tag.id}
            className={cn(dt.pill.sm, "gap-0.5")}
            style={tagPillStyle(t.tag.name, t.tag.color)}
          >
            {t.tag.name}
            <button
              type="button"
              onClick={() => removeTag.mutate(t.tag.id)}
              className="ml-0.5 opacity-40 hover:opacity-100 transition-opacity"
            >
              <X className="size-2.5" />
            </button>
          </span>
        ))}
        {tags.length === 0 && <span className="text-[10px] text-muted-foreground/50">Nenhuma tag</span>}
      </div>
      {contactId && (
        <div className="relative mt-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (tagInput.trim() && canCreateTag) addTag.mutate({ tagName: tagInput.trim() });
            }}
            className="flex gap-1"
          >
            <Input
              value={tagInput}
              onChange={(e) => { setTagInput(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              placeholder={canCreateTag ? "Buscar ou criar tag…" : "Buscar tag…"}
              className="h-6 flex-1 text-[11px]"
            />
            {canCreateTag && (
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[10px]"
                disabled={!tagInput.trim() || addTag.isPending}
              >
                <Plus className="size-3" />
              </Button>
            )}
          </form>
          {showSuggestions && tagInput && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-32 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
              {suggestions.slice(0, 8).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { addTag.mutate({ tagId: t.id }); }}
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-muted/50"
                >
                  <span className="size-2 rounded-full" style={{ backgroundColor: t.color || "#6b7280" }} />
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Products Section — sidebar ──────────────

function ProductsSection({ dealId, products, dealParam }: {
  dealId: string;
  products: DealProductItem[];
  dealParam: string;
}) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [editingItem, setEditingItem] = React.useState<string | null>(null);
  const [editQty, setEditQty] = React.useState("");
  const [editPrice, setEditPrice] = React.useState("");
  const [editDiscount, setEditDiscount] = React.useState("");

  const { data: catalog = [] } = useQuery({
    queryKey: ["products-catalog-lead", search],
    queryFn: async () => {
      const params = new URLSearchParams({ perPage: "30", active: "true" });
      if (search) params.set("search", search);
      const res = await fetch(apiUrl(`/api/products?${params}`));
      if (!res.ok) return [];
      const data = await res.json();
      return (data.products ?? data.items ?? []) as CatalogProduct[];
    },
    enabled: showAdd,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["deal-products", dealId] });
    queryClient.invalidateQueries({ queryKey: ["deal", dealParam] });
  };

  const addMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await fetch(apiUrl(`/api/deals/${dealId}/products`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) throw new Error("Erro");
    },
    onSuccess: () => { invalidate(); setShowAdd(false); setSearch(""); },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: Record<string, unknown> }) => {
      const res = await fetch(apiUrl(`/api/deals/${dealId}/products/${itemId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro");
    },
    onSuccess: () => { invalidate(); setEditingItem(null); },
  });

  const removeMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(apiUrl(`/api/deals/${dealId}/products/${itemId}`), { method: "DELETE" });
      if (!res.ok) throw new Error("Erro");
    },
    onSuccess: invalidate,
  });

  const startEdit = (p: DealProductItem) => {
    setEditingItem(p.id);
    setEditQty(String(p.quantity));
    setEditPrice(String(p.unitPrice));
    setEditDiscount(String(p.discount));
  };

  const total = products.reduce((s, p) => s + p.total, 0);

  return (
    <div className="border-b border-border/40 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Produtos {products.length > 0 && `(${products.length})`}
        </span>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          {showAdd ? <X className="size-3" /> : <Plus className="size-3" />}
        </button>
      </div>

      {showAdd && (
        <div className="mt-2 space-y-1.5">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            className="h-7 text-[11px]"
            autoFocus
          />
          <div className="max-h-32 overflow-y-auto rounded-lg border border-border bg-background">
            {catalog.length === 0 ? (
              <p className="p-3 text-center text-[10px] text-muted-foreground">
                {search ? "Nenhum encontrado" : "Carregando..."}
              </p>
            ) : catalog.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addMutation.mutate(p.id)}
                disabled={addMutation.isPending}
                className="flex w-full items-center gap-2 border-b border-border/30 px-2.5 py-2 text-left text-xs last:border-0 hover:bg-muted/30"
              >
                <Package className="size-3 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{p.name}</span>
                <span className="shrink-0 text-[10px] font-semibold text-emerald-600">{formatCurrency(p.price)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {products.length === 0 && !showAdd ? (
        <p className="mt-2 text-[10px] text-muted-foreground/50">Nenhum produto associado</p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {products.map((p) => (
            <div key={p.id} className="rounded-lg bg-muted/20 p-2">
              {editingItem === p.id ? (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold">{p.productName}</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div>
                      <label className="text-[9px] text-muted-foreground">Qtd</label>
                      <Input type="number" step="0.01" min="0.01" value={editQty} onChange={(e) => setEditQty(e.target.value)} className="h-6 text-[10px]" />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground">Preco</label>
                      <Input type="number" step="0.01" min="0" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="h-6 text-[10px]" />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground">Desc%</label>
                      <Input type="number" step="0.01" min="0" max="100" value={editDiscount} onChange={(e) => setEditDiscount(e.target.value)} className="h-6 text-[10px]" />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 flex-1 text-[10px]" onClick={() => setEditingItem(null)}>Cancelar</Button>
                    <Button size="sm" className="h-6 flex-1 text-[10px]" disabled={updateMutation.isPending}
                      onClick={() => updateMutation.mutate({ itemId: p.id, data: { quantity: parseFloat(editQty) || 1, unitPrice: parseFloat(editPrice) || 0, discount: parseFloat(editDiscount) || 0 } })}
                    >Salvar</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium">{p.productName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {p.quantity} {p.unit} × {formatCurrency(p.unitPrice)}
                      {p.discount > 0 && <span className="ml-1 text-amber-600">-{p.discount}%</span>}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold tabular-nums text-emerald-600">{formatCurrency(p.total)}</span>
                  <button type="button" onClick={() => startEdit(p)} className="rounded p-0.5 text-muted-foreground/40 hover:text-foreground transition-opacity">
                    <Pencil className="size-2.5" />
                  </button>
                  <button type="button" onClick={() => removeMutation.mutate(p.id)} className="rounded p-0.5 text-muted-foreground/40 hover:text-red-500 transition-colors">
                    <X className="size-2.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
          {products.length > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-950/30">
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">Total</span>
              <span className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{formatCurrency(total)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Owner Selector ──────────────────────────

function OwnerSelector({ currentOwner, users, onChange, isPending }: {
  currentOwner: { id: string; name: string; email: string } | null;
  users: UserOption[];
  onChange: (ownerId: string | null) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={isPending}
        className="group flex w-full items-center gap-2.5 rounded-lg px-1 py-1 text-left transition-colors hover:bg-muted/50"
      >
        {currentOwner ? (
          <>
            <Avatar className="size-7">
              <AvatarFallback className="bg-linear-to-br from-blue-500 to-indigo-600 text-[9px] font-bold text-white">
                {getInitials(currentOwner.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{currentOwner.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">{currentOwner.email}</p>
            </div>
          </>
        ) : (
          <>
            <div className="flex size-7 items-center justify-center rounded-full bg-muted">
              <UserCircle className="size-3.5 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">Sem responsavel</span>
          </>
        )}
        <ChevronDown className={cn("size-3 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted/50"
          >
            <X className="size-3 text-muted-foreground" />
            <span className="text-muted-foreground">Remover responsavel</span>
          </button>
          {users.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => { onChange(u.id); setOpen(false); }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted/50",
                currentOwner?.id === u.id && "bg-primary/5"
              )}
            >
              <Avatar className="size-6">
                <AvatarFallback className="bg-linear-to-br from-blue-500 to-indigo-600 text-[8px] font-bold text-white">
                  {getInitials(u.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{u.name}</p>
              </div>
              {currentOwner?.id === u.id && <Check className="size-3.5 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Info Row (contact info) ─────────────────

function InfoRow({ icon: Icon, value, copyable }: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  copyable?: boolean;
}) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group flex items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-muted/30">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate text-xs">{value}</span>
      {copyable && (
        <button type="button" onClick={copy} className="shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3 text-muted-foreground" />}
        </button>
      )}
    </div>
  );
}

// ── Field Row ───────────────────────────────

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-border/20 last:border-0">
      <td className="py-1.5 pr-3 text-[11px] font-medium text-muted-foreground whitespace-nowrap">{label}</td>
      <td className="py-1.5 text-[12px] text-foreground">{value}</td>
    </tr>
  );
}
