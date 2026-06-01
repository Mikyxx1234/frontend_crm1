"use client";

import { apiUrl } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
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
import { SelectNative } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { InternalTemplateVariablePicker } from "@/components/templates/internal-template-variable-picker";

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

export default function TemplatesSettingsPage() {
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
      router.replace(qs ? `/settings/message-models?${qs}` : "/old/settings/message-models?tab=internal");
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

  return (
    <div className="w-full space-y-6">
      <Link
        href="/old/settings"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
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

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 py-16 text-center">
          <FileText className="mx-auto mb-3 size-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhum modelo cadastrado.</p>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} variant="outline" className="mt-4 gap-2">
            <Plus className="size-4" /> Criar primeiro modelo
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-border/80 bg-card p-4 shadow-sm transition-colors hover:bg-muted/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{t.name}</span>
                    {t.channelType && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        {CHANNEL_LABELS[t.channelType] ?? t.channelType}
                      </span>
                    )}
                    {t.category && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        {t.category}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground line-clamp-3">
                    {t.content}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => { setEditing(t); setFormOpen(true); }}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive/70 hover:text-destructive"
                    onClick={() => deleteMutation.mutate(t.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
        <p className="text-xs text-muted-foreground">
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
          className="resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-indigo-500/40"
        />
        <p className="text-xs text-muted-foreground">
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
          <Label htmlFor="tpl-channel">Canal (opcional)</Label>
          <SelectNative
            id="tpl-channel"
            value={channelType}
            onChange={(e) => setChannelType(e.target.value)}
          >
            <option value="">Todos os canais</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="FACEBOOK">Facebook</option>
            <option value="EMAIL">E-mail</option>
          </SelectNative>
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
