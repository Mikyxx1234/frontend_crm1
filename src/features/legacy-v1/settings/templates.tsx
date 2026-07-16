"use client";

import { apiUrl } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconArrowLeft as ArrowLeft, IconCopy as Copy, IconFileText as FileText, IconStack as Layers, IconLoader2 as Loader2, IconMessage as MessageSquare, IconPencil as Pencil, IconPlus as Plus, IconTrash as Trash2, IconVariable as Variable } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ButtonGlass } from "@/components/crm/button-glass";
import { InputGlass } from "@/components/crm/input-glass";
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
    <div className={embedded ? "min-w-0 w-full max-w-full space-y-3 sm:space-y-4" : "min-w-0 w-full space-y-6"}>
      {embedded ? null : (
        <>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="size-4" /> Configurações
          </Link>

          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-[20px] font-extrabold tracking-tight text-[var(--text-primary)]">Modelos internos de mensagem</h1>
              <p className="mt-0.5 font-body text-[13px] text-[var(--text-muted)]">
                Mensagens prontas guardadas no CRM, usadas como atalho de resposta nas conversas. Use{" "}
                <code className="rounded-[var(--radius-sm)] bg-[var(--glass-bg-strong)] px-1 font-mono text-xs">{"{{variável}}"}</code>{" "}
                para campos dinâmicos.
              </p>
            </div>
            <ButtonGlass variant="primary" onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-2 shrink-0">
              <Plus className="size-4" /> Novo modelo
            </ButtonGlass>
          </div>
        </>
      )}

      {embedded ? (
        <HubSubHeader
          icon={<FileText className="size-[22px]" />}
          title="Modelos internos de mensagem"
          actions={
            <ButtonGlass type="button" variant="primary" size="sm" onClick={() => { setEditing(null); setFormOpen(true); }} className="gap-1.5">
              <Plus className="size-4" />
              Nova mensagem interna
            </ButtonGlass>
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
          <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] sm:gap-3.5 sm:p-[18px]">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-44 rounded-[var(--radius-lg)]" />)}
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center gap-2.5 px-5 py-14 text-center">
            <FileText className="size-10 text-[var(--glass-border)]" />
            <div className="font-bold text-[var(--text-secondary)]">Nenhum modelo encontrado</div>
            <div className="text-[13px] text-[var(--text-muted)]">Tente outra busca ou crie um novo modelo interno.</div>
            <ButtonGlass onClick={() => { setEditing(null); setFormOpen(true); }} className="mt-2 gap-1.5">
              <Plus className="size-4" /> Novo modelo
            </ButtonGlass>
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
              <div className="grid grid-cols-1 gap-3 px-3 pb-3 pt-1.5 sm:grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] sm:gap-3.5 sm:px-[18px] sm:pb-[18px]">
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
        <DialogContent
          size="lg"
          panelClassName="max-w-[min(40rem,calc(100vw-1.25rem))]"
          bodyClassName="gap-3 overflow-x-hidden p-4 sm:gap-4 sm:p-6"
        >
          <DialogClose />
          <DialogHeader className="pr-10">
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
    <form onSubmit={handleSubmit} className="min-w-0 w-full space-y-3 sm:space-y-4">
      <div className="grid min-w-0 gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="tpl-name" className={FIELD_LABEL_CLASS}>
            Nome do modelo
          </label>
          <InputGlass
            id="tpl-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex.: Boas-vindas, Pós-venda"
            required
            className="min-w-0 max-w-full"
          />
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="tpl-category" className={FIELD_LABEL_CLASS}>
              Categoria
            </label>
            <InputGlass
              id="tpl-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Vendas, Suporte…"
              className="min-w-0 max-w-full"
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <label className={FIELD_LABEL_CLASS}>Canal</label>
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
              triggerClassName="w-full min-w-0 max-w-full"
            />
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="tpl-content" className={FIELD_LABEL_CLASS}>
              Mensagem
            </label>
            <textarea
              id="tpl-content"
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Olá {{contato.primeiroNome}}, tudo bem? Vi seu interesse no negócio {{negocio.titulo}}..."
              rows={5}
              required
              className="min-h-[120px] w-full min-w-0 max-w-full resize-y rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-2.5 font-body text-[13px] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/10 sm:px-3.5"
            />
            <p className="text-pretty break-words font-body text-[11.5px] leading-snug text-[var(--text-muted)]">
              Clique numa variável abaixo para inserir no cursor — o CRM substitui pelo valor real na hora de enviar.
            </p>
          </div>

          <InternalTemplateVariablePicker onSelect={insertToken} defaultOpen={false} />
        </div>

        <div className="min-w-0">
          <InternalTemplatePreview name={name} content={content} channelType={channelType} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--glass-border-subtle)] pt-3 sm:pt-4">
        <ButtonGlass type="button" onClick={onCancel}>Cancelar</ButtonGlass>
        <ButtonGlass type="submit" variant="primary" disabled={isPending || !name.trim() || !content.trim()} className="gap-2">
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {initial ? "Salvar" : "Criar"}
        </ButtonGlass>
      </div>
    </form>
  );
}

/** Rótulo padrão dos campos do form — mesma escala usada em todo o hub
 * (Modelos de mensagem) e no assistente de templates WhatsApp/Meta. */
const FIELD_LABEL_CLASS =
  "font-display text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]";

/**
 * Pré-visualização em tempo real do modelo interno (espelha o padrão já
 * usado no assistente de templates WhatsApp/Meta — `WhatsappTemplatePreview`
 * em `whatsapp-templates.tsx` — porém em bolha neutra, já que o modelo
 * interno pode ser usado em qualquer canal).
 */
function InternalTemplatePreview({
  name,
  content,
  channelType,
}: {
  name: string;
  content: string;
  channelType: string;
}) {
  const channelLabel = channelType ? CHANNEL_LABELS[channelType] ?? channelType : "Todos os canais";
  return (
    <aside aria-label="Pré-visualização da mensagem" className="min-w-0 space-y-2">
      <p className={FIELD_LABEL_CLASS}>Pré-visualização</p>
      <div className="min-w-0 overflow-hidden rounded-[var(--radius-card)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] shadow-[var(--glass-shadow-sm)]">
        <div className="flex min-w-0 items-center gap-2 border-b border-[var(--glass-border-subtle)] px-3 py-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-enterprise-bg)] text-[var(--brand-primary)]">
            <FileText className="size-3.5" />
          </span>
          <span className="min-w-0 truncate text-[12px] font-bold text-[var(--text-primary)]">
            {name.trim() || "Novo modelo"}
          </span>
        </div>
        <div className="min-w-0 p-3">
          <div className="break-words whitespace-pre-wrap rounded-xl rounded-tl-sm bg-[var(--glass-bg-strong)] px-3 py-2.5 text-[12.5px] leading-relaxed text-[var(--text-secondary)] shadow-sm">
            {content.trim() ? (
              highlightVars(content)
            ) : (
              <span className="text-[var(--text-muted)] opacity-60">A mensagem aparece aqui…</span>
            )}
          </div>
        </div>
        <div className="border-t border-[var(--glass-border-subtle)] px-3 py-2 text-[11px] font-semibold text-[var(--text-muted)]">
          {channelLabel}
        </div>
      </div>
    </aside>
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
    <div className="group flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-base)] shadow-[var(--glass-shadow-sm)] transition-all hover:-translate-y-0.5 hover:border-[var(--input-border-focus)] hover:shadow-[var(--glass-shadow)]">
      <div className="flex items-start gap-2.5 px-3.5 pt-3.5">
        <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-overlay)] text-[var(--brand-primary)]">
          <FileText className="size-[17px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-bold leading-tight text-[var(--text-primary)]">{template.name}</div>
          <div className="mt-0.5 truncate text-[11px] font-semibold text-[var(--text-muted)]">{category}</div>
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
      <div className="mt-auto flex min-w-0 flex-wrap items-center justify-between gap-2 px-3.5 py-3 pt-3">
        <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-[11.5px] font-semibold text-[var(--text-muted)]">
          {channel ?? "Todos os canais"}
        </span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(template.content ?? "");
          }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-full)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] px-3 py-1.5 text-[12px] font-bold text-[var(--brand-primary)] transition-colors hover:border-[var(--input-border-focus)] hover:bg-[var(--color-enterprise-bg)]"
        >
          <Copy className="size-3.5" /> Copiar
        </button>
      </div>
    </div>
  );
}

