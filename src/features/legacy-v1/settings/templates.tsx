"use client";

import { apiUrl } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconArrowLeft as ArrowLeft, IconCopy as Copy, IconFileText as FileText, IconStack as Layers, IconLoader2 as Loader2, IconMessage as MessageSquare, IconPencil as Pencil, IconPlus as Plus, IconTrash as Trash2, IconVariable as Variable } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, pageHeaderPrimaryCtaClass } from "@/components/ui/page-header";
import { DropdownGlass } from "@/components/crm/dropdown-glass";
import { Skeleton } from "@/components/ui/skeleton";
import { InternalTemplateVariablePicker } from "@/components/templates/internal-template-variable-picker";
import { cn } from "@/lib/utils";
import {
  HubChip,
  HubPanel,
  HubStat,
  HubStatGrid,
  HubSubHeader,
  HubToolbar,
} from "./message-models/hub-ui";

type TemplateRow = {
  id: string;
  name: string;
  content: string;
  category: string | null;
  language: string;
  status: string;
  channelType: string | null;
};

const CHANNEL_LABELS: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  EMAIL: "E-mail",
};

async function fetchTemplates(): Promise<TemplateRow[]> {
  const res = await fetch(apiUrl("/api/templates"));
  if (!res.ok) throw new Error("Erro ao carregar templates");
  return res.json();
}

export default function TemplatesSettingsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TemplateRow | null>(null);

  React.useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    queueMicrotask(() => {
      setEditing(null);
      setFormOpen(true);
      const sp = new URLSearchParams(searchParams.toString());
      sp.delete("new");
      const qs = sp.toString();
      router.replace(qs ? `/old/settings/message-models?${qs}` : "/old/settings/message-models?tab=internal");
    });
  }, [router, searchParams]);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: fetchTemplates,
  });

  const createMutation = useMutation({
    mutationFn: async (body: { name: string; content: string; category?: string; language?: string; channelType?: string }) => {
      const res = await fetch(apiUrl("/api/templates"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message ?? "Erro ao criar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...body }: { id: string; name: string; content: string; category?: string; language?: string; channelType?: string | null }) => {
      const res = await fetch(apiUrl(`/api/templates/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Erro ao atualizar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      setEditing(null);
      setFormOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/api/templates/${id}`), { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });

  const [query, setQuery] = React.useState("");
  const [catFilter, setCatFilter] = React.useState<string>("all");

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    for (const t of templates) set.add(t.category?.trim() || "Sem categoria");
    return [...set];
  }, [templates]);

  const withVariables = React.useMemo(
    () => templates.filter((t) => /\{\{.*?\}\}/.test(t.content ?? "")).length,
    [templates],
  );
  const distinctChannels = React.useMemo(() => {
    const set = new Set<string>();
    for (const t of templates) if (t.channelType) set.add(t.channelType);
    return set.size;
  }, [templates]);

  const grouped = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = templates.filter((t) => {
      const cat = t.category?.trim() || "Sem categoria";
      const okC = catFilter === "all" || cat === catFilter;
      const okQ =
        !q || t.name.toLowerCase().includes(q) || (t.content ?? "").toLowerCase().includes(q);
      return okC && okQ;
    });
    const map = new Map<string, TemplateRow[]>();
    for (const t of filtered) {
      const cat = t.category?.trim() || "Sem categoria";
      const arr = map.get(cat) ?? [];
      arr.push(t);
      map.set(cat, arr);
    }
    return [...map.entries()];
  }, [templates, query, catFilter]);

  return (
    <div className={embedded ? "w-full space-y-4" : "w-full space-y-6"}>
      {embedded ? null : (
        <>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="size-4" /> Configurações
          </Link>

          <PageHeader
            title="Modelos internos de mensagem"
            icon={<FileText />}
            description={
              <>
                Mensagens prontas guardadas no CRM, usadas como atalho de resposta nas conversas. Use{" "}
                <code className="rounded bg-muted px-1 text-xs">{"{{variável}}"}</code> para campos dinâmicos
                (ex.: <code className="rounded bg-muted px-1 text-xs">{"{{nome}}"}</code>).
              </>
            }
            actions={
              <Button onClick={() => { setEditing(null); setFormOpen(true); }} className={`gap-2 ${pageHeaderPrimaryCtaClass}`}>
                <Plus className="size-4" /> Novo modelo
              </Button>
            }
          />
        </>
      )}

      {embedded ? (
        <HubSubHeader
          icon={<FileText className="size-[22px]" />}
          title="Modelos internos de mensagem"
          actions={
            <Button type="button" size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="size-4" />
              <span className="ml-2">Nova mensagem interna</span>
            </Button>
          }
        >
          Mensagens prontas e reutilizáveis em qualquer canal do CRM — atalhos de resposta para
          agilizar o atendimento. Use{" "}
          <code className="rounded-[var(--radius-sm)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]">
            {"{{variável}}"}
          </code>{" "}
          para inserir campos dinâmicos do contato e do negócio (ex.:{" "}
          <code className="rounded-[var(--radius-sm)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]">
            {"{{nome}}"}
          </code>
          ).
        </HubSubHeader>
      ) : null}

      <HubStatGrid>
        <HubStat tone="brand" icon={<FileText className="size-5" />} value={templates.length} label="Modelos internos" />
        <HubStat tone="violet" icon={<Layers className="size-5" />} value={categories.length} label="Categorias" />
        <HubStat tone="warn" icon={<Variable className="size-5" />} value={withVariables} label="Com variáveis" />
        <HubStat tone="success" icon={<MessageSquare className="size-5" />} value={distinctChannels} label="Canais usados" />
      </HubStatGrid>

      <HubPanel>
        <HubToolbar
          searchValue={query}
          onSearchChange={setQuery}
          placeholder="Buscar por nome ou conteúdo..."
        >
          <HubChip active={catFilter === "all"} onClick={() => setCatFilter("all")} count={templates.length}>
            Todos
          </HubChip>
          {categories.map((c) => (
            <HubChip
              key={c}
              active={catFilter === c}
              onClick={() => setCatFilter(c)}
              count={templates.filter((t) => (t.category?.trim() || "Sem categoria") === c).length}
            >
              {c}
            </HubChip>
          ))}
        </HubToolbar>

        {isLoading ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-3.5 p-[18px]">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-44 rounded-[var(--radius-lg)]" />)}
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center gap-2.5 px-5 py-14 text-center">
            <FileText className="size-10 text-[var(--glass-border)]" />
            <div className="font-bold text-[var(--text-secondary)]">Nenhum modelo encontrado</div>
            <div className="text-[13px] text-[var(--text-muted)]">Tente outra busca ou crie um novo modelo interno.</div>
            <Button onClick={() => { setEditing(null); setFormOpen(true); }} variant="outline" className="mt-2 gap-2">
              <Plus className="size-4" /> Novo modelo
            </Button>
          </div>
        ) : (
          grouped.map(([cat, items]) => (
            <div key={cat}>
              <div className="flex items-center gap-2.5 px-[18px] pb-2 pt-4">
                <span className="flex size-[26px] items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]">
                  <Layers className="size-[15px]" />
                </span>
                <span className="text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">{cat}</span>
                <span className="rounded-[var(--radius-full)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-2 py-px text-[11px] font-bold text-[var(--text-muted)]">
                  {items.length}
                </span>
                <span className="h-px flex-1 bg-[var(--glass-border-subtle)]" />
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-3.5 px-[18px] pb-[18px] pt-1.5">
                {items.map((t) => (
                  <InternalTemplateCard
                    key={t.id}
                    template={t}
                    category={cat}
                    onEdit={() => { setEditing(t); setFormOpen(true); }}
                    onDelete={() => deleteMutation.mutate(t.id)}
                    deleting={deleteMutation.isPending}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => { setEditing(null); setFormOpen(true); }}
                  className="flex min-h-[170px] flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-[1.5px] border-dashed border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[13px] font-bold text-[var(--text-muted)] transition-colors hover:border-[var(--brand-primary)] hover:bg-[var(--color-enterprise-bg)] hover:text-[var(--brand-primary)]"
                >
                  <span className="flex size-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] text-[var(--brand-primary)]">
                    <Plus className="size-5" />
                  </span>
                  Novo em {cat}
                </button>
              </div>
            </div>
          ))
        )}
      </HubPanel>

      <Dialog open={formOpen} onOpenChange={(v) => { if (!v) { setFormOpen(false); setEditing(null); } else setFormOpen(true); }}>
        <DialogContent size="lg">
          <DialogClose />
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Template" : "Novo Template"}</DialogTitle>
          </DialogHeader>
          <TemplateForm
            initial={editing}
            onSubmit={(data) => {
              if (editing) {
                updateMutation.mutate({ id: editing.id, ...data });
              } else {
                createMutation.mutate(data);
              }
            }}
            isPending={createMutation.isPending || updateMutation.isPending}
            onCancel={() => { setFormOpen(false); setEditing(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateForm({
  initial,
  onSubmit,
  isPending,
  onCancel,
}: {
  initial: TemplateRow | null;
  onSubmit: (data: { name: string; content: string; category?: string; language?: string; channelType?: string }) => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  const [name, setName] = React.useState(initial?.name ?? "");
  const [content, setContent] = React.useState(initial?.content ?? "");
  const [category, setCategory] = React.useState(initial?.category ?? "");
  const [channelType, setChannelType] = React.useState(initial?.channelType ?? "");
  const language = initial?.language ?? "pt_BR";
  const contentRef = React.useRef<HTMLTextAreaElement | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;
    onSubmit({
      name: name.trim(),
      content: content.trim(),
      category: category.trim() || undefined,
      language,
      channelType: channelType || undefined,
    });
  };

  // Insere o token na posição do cursor da textarea — preserva o que
  // já foi digitado e move o cursor pro fim do token inserido.
  const insertToken = (token: string) => {
    const el = contentRef.current;
    const start = el?.selectionStart ?? content.length;
    const end = el?.selectionEnd ?? content.length;
    const next = content.slice(0, start) + token + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + token.length;
      el?.setSelectionRange(pos, pos);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="tpl-name">Nome do modelo</Label>
        <Input
          id="tpl-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ex.: Boas-vindas, Pedido de orçamento, Pós-venda"
          required
        />
        <p className="text-xs text-[var(--text-muted)]">
          Nome curto e descritivo para encontrar rápido na hora de responder.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="tpl-content">Mensagem</Label>
        <textarea
          id="tpl-content"
          ref={contentRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Olá {{contato.primeiroNome}}, tudo bem? Vi seu interesse no negócio {{negocio.titulo}}..."
          rows={6}
          required
          className="resize-none rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/40"
        />
        <p className="text-xs text-[var(--text-muted)]">
          Clique em uma variável abaixo para inseri-la na posição do cursor. Na hora de
          enviar, o CRM substitui automaticamente pelo valor real do contato e do negócio.
        </p>
      </div>

      <InternalTemplateVariablePicker onSelect={insertToken} />

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="tpl-category">Categoria (opcional)</Label>
          <Input
            id="tpl-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Vendas, Suporte, Pós-venda…"
          />
        </div>
        <div className="grid gap-2">
          <Label>Canal (opcional)</Label>
          <DropdownGlass
            options={[
              { value: "", label: "Todos os canais" },
              { value: "WHATSAPP", label: "WhatsApp" },
              { value: "INSTAGRAM", label: "Instagram" },
              { value: "FACEBOOK", label: "Facebook" },
              { value: "EMAIL", label: "E-mail" },
            ]}
            value={channelType}
            onValueChange={(v) => setChannelType(v)}
            triggerClassName="w-full"
          />
        </div>
      </div>
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isPending || !name.trim() || !content.trim()} className="gap-2">
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {initial ? "Salvar" : "Criar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function highlightVars(content: string): React.ReactNode {
  const parts = content.split(/(\{\{.*?\}\})/g);
  return parts.map((p, i) =>
    /^\{\{.*\}\}$/.test(p) ? (
      <span
        key={i}
        className="rounded-[var(--radius-sm)] bg-[var(--color-enterprise-bg)] px-1 font-mono text-[11.5px] text-[var(--brand-primary-dark)]"
      >
        {p}
      </span>
    ) : (
      <React.Fragment key={i}>{p}</React.Fragment>
    ),
  );
}

function InternalTemplateCard({
  template,
  category,
  onEdit,
  onDelete,
  deleting,
}: {
  template: TemplateRow;
  category: string;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const vars = React.useMemo(
    () => [...new Set((template.content?.match(/\{\{(.*?)\}\}/g) ?? []))],
    [template.content],
  );
  const channel = template.channelType ? CHANNEL_LABELS[template.channelType] ?? template.channelType : null;

  return (
    <div className="group flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] shadow-[var(--glass-shadow-sm)] transition-all hover:-translate-y-0.5 hover:border-[var(--input-border-focus)] hover:shadow-[var(--glass-shadow)]">
      <div className="flex items-start gap-2.5 px-3.5 pt-3.5">
        <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] text-[var(--brand-primary)]">
          <FileText className="size-[17px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold leading-tight text-[var(--text-primary)]">{template.name}</div>
          <div className="mt-0.5 text-[11px] font-semibold text-[var(--text-muted)]">{category}</div>
        </div>
        <div className="flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            aria-label="Editar"
            onClick={onEdit}
            className="flex size-[30px] items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)] transition-colors hover:border-[var(--input-border-focus)] hover:text-[var(--brand-primary)]"
          >
            <Pencil className="size-[15px]" />
          </button>
          <button
            type="button"
            aria-label="Excluir"
            onClick={onDelete}
            disabled={deleting}
            className="flex size-[30px] items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] text-[var(--text-muted)] transition-colors hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] disabled:opacity-50"
          >
            <Trash2 className="size-[15px]" />
          </button>
        </div>
      </div>
      <div className="px-3.5 pt-2.5">
        <p className="line-clamp-3 whitespace-pre-line rounded-[var(--radius-md)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-3 py-2.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
          {highlightVars(template.content ?? "")}
        </p>
      </div>
      {vars.length ? (
        <div className="flex flex-wrap items-center gap-1.5 px-3.5 pt-2.5">
          {vars.map((v) => (
            <span
              key={v}
              className="rounded-[var(--radius-sm)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] px-1.5 py-0.5 font-mono text-[10.5px] text-[var(--text-secondary)]"
            >
              {v}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-auto flex items-center justify-between gap-2.5 px-3.5 py-3 pt-3">
        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[var(--text-muted)]">
          {channel ?? "Todos os canais"}
        </span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(template.content ?? "");
          }}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-full)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-1.5 text-[12px] font-bold text-[var(--brand-primary)] transition-colors hover:border-[var(--input-border-focus)] hover:bg-[var(--color-enterprise-bg)]"
        >
          <Copy className="size-3.5" /> Copiar
        </button>
      </div>
    </div>
  );
}

