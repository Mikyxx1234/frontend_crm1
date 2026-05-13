"use client";

import { apiUrl } from "@/lib/api";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConfirm } from "@/hooks/use-confirm";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutList,
  Loader2,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  ContactForm,
  type CompanyOption,
} from "@/components/contacts/contact-form";
import { ChatAvatar } from "@/components/inbox/chat-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
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
import { TooltipHost } from "@/components/ui/tooltip";
import { cn, formatCurrency, resolveContactAvatarDisplayUrl } from "@/lib/utils";

type TagRow = { id: string; name: string; color: string };

type ContactRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  // `avatarUrl` já é retornado pelo `getContacts` (select inclui o
  // campo desde sempre); só estava ausente do tipo do client. Adicionar
  // aqui é o que destrava o `<ChatAvatar imageUrl={...}>` mostrar a
  // foto real do contato em vez do cartoon faceless.
  avatarUrl: string | null;
  leadScore: number;
  lifecycleStage: string;
  createdAt: string;
  company: { id: string; name: string; domain: string | null } | null;
  tags: TagRow[];
  totalValue: number;
  dealCount: number;
  avgTicket: number;
  purchaseCycleDays: number;
  daysSinceLastPurchase: number;
};

type ContactsListResponse = {
  items?: ContactRow[];
  contacts?: ContactRow[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

const LIFECYCLE_OPTIONS = [
  { value: "", label: "Todos os estagios" },
  { value: "SUBSCRIBER", label: "Assinante" },
  { value: "LEAD", label: "Lead" },
  { value: "MQL", label: "MQL" },
  { value: "SQL", label: "SQL" },
  { value: "OPPORTUNITY", label: "Oportunidade" },
  { value: "CUSTOMER", label: "Cliente" },
  { value: "EVANGELIST", label: "Evangelista" },
  { value: "OTHER", label: "Outro" },
] as const;

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDate().toString().padStart(2, "0");
  const months = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  return `${day} de ${months[d.getMonth()]} ${d.getFullYear()}`;
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { message?: string };
    return j.message ?? `Erro ${res.status}`;
  } catch {
    return `Erro ${res.status}`;
  }
}

export default function ContactsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [lifecycleStage, setLifecycleStage] = useState("");
  const [tagId, setTagId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch((prev) => {
        const next = search.trim();
        if (next !== prev) setPage(1);
        return next;
      });
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: async (): Promise<TagRow[]> => {
      const res = await fetch(apiUrl("/api/tags"));
      if (!res.ok) throw new Error(await readErrorMessage(res));
      return res.json();
    },
  });

  const { data: companyOptions = [] } = useQuery({
    queryKey: ["companies", "options"],
    queryFn: async (): Promise<CompanyOption[]> => {
      const res = await fetch(apiUrl("/api/companies?perPage=100&page=1"));
      if (!res.ok) throw new Error(await readErrorMessage(res));
      const json = (await res.json()) as {
        items?: { id: string; name: string }[];
        companies?: { id: string; name: string }[];
      };
      const rows = json.items ?? json.companies ?? [];
      return rows.map((c) => ({ id: c.id, name: c.name }));
    },
    enabled: createOpen,
  });

  const listQuery = useQuery({
    queryKey: [
      "contacts",
      { debouncedSearch, lifecycleStage, tagId, page, perPage: 20 },
    ],
    queryFn: async (): Promise<ContactsListResponse> => {
      const qs = new URLSearchParams();
      if (debouncedSearch) qs.set("search", debouncedSearch);
      if (lifecycleStage) qs.set("lifecycleStage", lifecycleStage);
      if (tagId) qs.set("tagIds", tagId);
      qs.set("page", String(page));
      qs.set("perPage", "20");
      const res = await fetch(apiUrl(`/api/contacts?${qs.toString()}`));
      if (!res.ok) throw new Error(await readErrorMessage(res));
      return res.json();
    },
  });

  const contacts = useMemo(() => {
    const raw = listQuery.data;
    if (!raw) return [];
    return (raw.items ?? raw.contacts ?? []) as ContactRow[];
  }, [listQuery.data]);

  const totalPages = listQuery.data?.totalPages ?? 1;
  const total = listQuery.data?.total ?? 0;

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/api/contacts/${id}`), { method: "DELETE" });
      if (!res.ok) throw new Error(await readErrorMessage(res));
    },
    onMutate: (id) => setDeletingId(id),
    onSettled: () => setDeletingId(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-board"] });
    },
    onError: (err) => {
      toast.error((err as Error).message);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(apiUrl("/api/contacts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readErrorMessage(res));
      return res.json() as Promise<{ id: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setCreateOpen(false);
    },
  });

  const allSelected = contacts.length > 0 && contacts.every((c) => selected.has(c.id));
  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(contacts.map((c) => c.id)));
    }
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <PageHeader
          title="Leads"
          description="Consulte, crie, modifique ou remova seus leads."
          icon={<Users />}
        />
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative w-full sm:w-auto">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar..."
            className="h-9 w-full pl-8 text-sm sm:w-[180px]"
          />
        </div>
        {!listQuery.isLoading && (
          <span className="text-xs text-muted-foreground tabular-nums sm:text-sm">
            {total.toLocaleString("pt-BR")} resultados
          </span>
        )}

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 px-2.5 text-sm sm:px-3"
            onClick={() => setShowFilters((v) => !v)}
          >
            <Filter className="size-3.5" />
            <span className="hidden sm:inline">Filtros</span>
          </Button>
          <TooltipHost label="Visualização em lista" side="bottom" className="hidden sm:inline-flex">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              aria-label="Visualização em lista"
            >
              <LayoutList className="size-4" />
            </Button>
          </TooltipHost>
          <Button
            type="button"
            size="sm"
            className="h-9 gap-1.5 bg-emerald-600 px-2.5 text-sm text-white hover:bg-emerald-700 sm:px-3"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">Novo Lead</span>
          </Button>
        </div>
      </div>

      {/* Filters row */}
      {showFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
          <SelectNative
            value={lifecycleStage}
            onChange={(e) => { setLifecycleStage(e.target.value); setPage(1); }}
            className="h-8 text-xs"
          >
            {LIFECYCLE_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>{o.label}</option>
            ))}
          </SelectNative>
          {tags.length > 0 && (
            <SelectNative
              value={tagId}
              onChange={(e) => { setTagId(e.target.value); setPage(1); }}
              className="h-8 text-xs"
            >
              <option value="">Todas as tags</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </SelectNative>
          )}
        </div>
      )}

      {/* ── MOBILE: lista vertical de cards (< md) ──
          A tabela de 7 colunas tem `min-w-[960px]` e gera scroll
          horizontal terrivel em mobile. Em telas < md mostramos
          cards empilhados focados no essencial: avatar, nome,
          telefone, total, tags. Toque no card abre o detail. */}
      <div className="space-y-2 md:hidden">
        {listQuery.isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] w-full rounded-xl" />
          ))
        ) : listQuery.isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
            {(listQuery.error as Error).message}
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-card py-16 text-center">
            <User className="size-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhum lead encontrado.</p>
          </div>
        ) : (
          contacts.map((c) => (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/contacts/${c.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/contacts/${c.id}`);
                }
              }}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-sm transition-colors active:bg-muted",
                selected.has(c.id) && "border-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/10",
              )}
            >
              <ChatAvatar
                user={{
                  id: c.id,
                  name: c.name,
                  imageUrl: resolveContactAvatarDisplayUrl(c.avatarUrl),
                }}
                phone={c.phone ?? undefined}
                channel="whatsapp"
                size={44}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-bold text-foreground">{c.name}</p>
                  <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                    {formatShortDate(c.createdAt)}
                  </span>
                </div>
                {c.phone && (
                  <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
                    <Phone className="size-3 shrink-0 text-muted-foreground/50" />
                    <span className="truncate tabular-nums">{c.phone}</span>
                  </p>
                )}
                <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5 font-semibold text-foreground">
                    {formatCurrency(c.totalValue)}
                  </span>
                  <span className="text-muted-foreground/60">{c.dealCount} compra{c.dealCount !== 1 ? "s" : ""}</span>
                  {c.tags && c.tags.length > 0 && (
                    <span className="ml-auto flex items-center gap-1">
                      {c.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag.id}
                          className="rounded px-1.5 py-0.5 text-[9px] font-semibold leading-none"
                          style={{ backgroundColor: tag.color + "1f", color: tag.color }}
                        >
                          {tag.name.length > 8 ? tag.name.slice(0, 8) + "…" : tag.name}
                        </span>
                      ))}
                      {c.tags.length > 2 && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                          +{c.tags.length - 2}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── DESKTOP: tabela 7-col com scroll horizontal (md+) ── */}
      <div className="hidden overflow-x-auto rounded-xl border border-border/60 bg-card shadow-sm md:block">
        {/* Header row */}
        <div className="grid min-w-[960px] grid-cols-[40px_minmax(180px,1.5fr)_140px_160px_340px_140px_48px] items-center border-b border-border/60 bg-muted/30 px-3 py-2.5">
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="size-4 rounded border-border accent-indigo-600"
            />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Nome
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Contatos
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tags
          </span>
          <span className="text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Dados
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Data de criacao
          </span>
          <span />
        </div>

        {/* Body */}
        {listQuery.isLoading ? (
          <div className="min-w-[960px] divide-y divide-border/20">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-3 py-3">
                <Skeleton className="h-10 w-full rounded" />
              </div>
            ))}
          </div>
        ) : listQuery.isError ? (
          <div className="py-16 text-center text-sm text-destructive">
            {(listQuery.error as Error).message}
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-20 text-center">
            <User className="size-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              Nenhum lead encontrado.
            </p>
          </div>
        ) : (
          <div className="min-w-[960px] divide-y divide-border/20">
            {contacts.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                whileHover={{ backgroundColor: "var(--color-muted)" }}
                className={cn(
                  "grid grid-cols-[40px_minmax(180px,1.5fr)_140px_160px_340px_140px_48px] items-center px-3 py-2.5 transition-colors cursor-pointer",
                  selected.has(c.id) && "bg-indigo-50/50 dark:bg-indigo-950/10",
                )}
                onClick={() => router.push(`/contacts/${c.id}`)}
              >
                {/* Checkbox */}
                <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleOne(c.id)}
                    className="size-4 rounded border-border accent-indigo-600"
                  />
                </div>

                {/* Name + Ticket medio.
                    Avatar unificado com o resto do app (Inbox / Sales Hub
                    / Kanban): `ChatAvatar` cuida da cor determinística
                    derivada do contato, da foto real (`imageUrl`) quando
                    cadastrada, do cartoon faceless de fallback e do
                    badge verde do canal WhatsApp. Mesmo tamanho usado
                    no Presence Dashboard (36px) — equilibrado pra
                    listagem em tabela. */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <ChatAvatar
                    user={{
                      id: c.id,
                      name: c.name,
                      imageUrl: resolveContactAvatarDisplayUrl(c.avatarUrl),
                    }}
                    phone={c.phone ?? undefined}
                    channel="whatsapp"
                    size={36}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold leading-tight text-foreground">
                      {c.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground/60">
                      Ticket medio{" "}
                      <span className="font-medium text-muted-foreground">
                        {formatCurrency(c.avgTicket)}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-1.5 min-w-0">
                  {c.phone ? (
                    <>
                      <Phone className="size-3 shrink-0 text-muted-foreground/50" />
                      <span className="truncate text-xs text-muted-foreground">{c.phone}</span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground/30">—</span>
                  )}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 min-w-0">
                  {c.tags && c.tags.length > 0 ? (
                    <>
                      {c.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center rounded-lg px-1.5 py-0.5 text-[10px] font-medium leading-none"
                          style={{
                            backgroundColor: tag.color + "18",
                            color: tag.color,
                          }}
                        >
                          {tag.name.length > 14 ? tag.name.slice(0, 14) + "..." : tag.name}
                        </span>
                      ))}
                      {c.tags.length > 2 && (
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          +{c.tags.length - 2}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/30">—</span>
                  )}
                </div>

                {/* Data: Total | Compras | Ciclo | Ultima */}
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground/50">Total</p>
                    <p className="text-xs font-semibold tabular-nums text-foreground">
                      {formatCurrency(c.totalValue)}
                    </p>
                  </div>
                  <DataBubble
                    value={c.dealCount}
                    label="Compras"
                    color={c.dealCount > 0 ? "emerald" : "gray"}
                  />
                  <DataBubble
                    value={`${c.purchaseCycleDays}d`}
                    label="Ciclo de compra"
                    color="gray"
                  />
                  <DataBubble
                    value={`${c.daysSinceLastPurchase}d`}
                    label="Ultima compra"
                    color="gray"
                  />
                </div>

                {/* Created */}
                <span className="text-xs text-muted-foreground">
                  {formatShortDate(c.createdAt)}
                </span>

                {/* Actions */}
                <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                  <TooltipHost label="Excluir" side="left">
                  <button
                    type="button"
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                    aria-label="Excluir"
                    disabled={deleteMutation.isPending}
                    onClick={async () => {
                      if (c.dealCount > 0) {
                        toast.warning(`Não é possível excluir "${c.name}": possui ${c.dealCount} negócio${c.dealCount !== 1 ? "s" : ""} vinculado${c.dealCount !== 1 ? "s" : ""}. Remova ou transfira os negócios antes.`);
                        return;
                      }
                      const ok = await confirm({
                        title: "Excluir contato",
                        description: `Excluir "${c.name}" e todos os seus dados?`,
                        confirmLabel: "Excluir",
                        variant: "destructive",
                      });
                      if (ok) deleteMutation.mutate(c.id);
                    }}
                  >
                    {deletingId === c.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </button>
                  </TooltipHost>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {total.toLocaleString("pt-BR")} lead{total !== 1 ? "s" : ""}
          {totalPages > 1 && (
            <span className="text-muted-foreground/60">
              {" "} · Pagina {page}/{totalPages}
            </span>
          )}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={page <= 1 || listQuery.isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="flex h-7 min-w-7 items-center justify-center rounded bg-indigo-600 px-2 text-xs font-medium text-white">
              {page}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={page >= totalPages || listQuery.isLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent size="lg" panelClassName="max-h-[90dvh] overflow-y-auto">
          <DialogClose />
          <DialogHeader>
            <DialogTitle>Novo lead</DialogTitle>
            <DialogDescription>
              Preencha os dados principais. Voce pode complementar depois na ficha do contato.
            </DialogDescription>
          </DialogHeader>
          {createOpen ? (
            <ContactForm
              companies={companyOptions}
              submitLabel="Criar lead"
              onCancel={() => setCreateOpen(false)}
              onSubmit={async (values) => {
                const payload: Record<string, unknown> = {
                  name: values.name,
                  lifecycleStage: values.lifecycleStage,
                };
                if (values.email.trim()) payload.email = values.email.trim();
                if (values.phone.trim()) payload.phone = values.phone.trim();
                if (values.source.trim()) payload.source = values.source.trim();
                if (values.companyId) payload.companyId = values.companyId;
                await createMutation.mutateAsync(payload);
              }}
            />
          ) : null}
          {createMutation.isError ? (
            <DialogFooter>
              <p className="text-sm text-destructive">
                {(createMutation.error as Error).message}
              </p>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DataBubble({
  value,
  label,
  color,
}: {
  value: number | string;
  label: string;
  color: "emerald" | "gray";
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className={cn(
          "flex size-8 items-center justify-center rounded-full text-xs font-bold tabular-nums",
          color === "emerald"
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "bg-muted text-muted-foreground",
        )}
      >
        {value}
      </div>
      <span className="max-w-[60px] text-center text-[8px] leading-tight text-muted-foreground/50">
        {label}
      </span>
    </div>
  );
}
