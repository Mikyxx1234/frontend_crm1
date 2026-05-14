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

import { Badge } from "@/components/ui/badge";
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

type TemplateRow = {
  id: string;
  name: string;
  content: string;
  category: string | null;
  language: string;
  status: string;
  channelType: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  PENDING_APPROVAL: "Pendente",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "secondary",
  PENDING_APPROVAL: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
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
      router.replace(qs ? `/settings/message-models?${qs}` : "/settings/message-models?tab=internal");
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
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Configurações
      </Link>

      <PageHeader
        title="Templates no CRM (catálogo interno)"
        icon={<FileText />}
        description={
          <>
            Rascunhos e referência de texto. O campo <strong className="font-medium text-foreground">nome</strong> deve ser
            idêntico ao nome do template <strong className="font-medium text-foreground">aprovado na Meta</strong> — é esse
            valor que o WhatsApp usa no envio.
          </>
        }
        actions={
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} className={`gap-2 ${pageHeaderPrimaryCtaClass}`}>
            <Plus className="size-4" /> Novo Template
          </Button>
        }
      />

      <div className="rounded-lg border border-amber-500/30 bg-amber-50/50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
        <p>
          <strong>Duas coisas diferentes:</strong> esta lista fica só no banco do CRM (atalho na conversa). Já a{" "}
          <Link href="/settings/message-models?tab=whatsapp" className="font-medium text-amber-950 underline underline-offset-2 hover:no-underline dark:text-amber-100">
            Templates Meta (WABA)
          </Link>{" "}
          lista e cria modelos direto na conta comercial.
        </p>
        <p className="mt-2">
          O envio pelo inbox só funciona com <code className="rounded bg-amber-100/80 px-1 text-xs dark:bg-amber-900/50">META_WHATSAPP_ACCESS_TOKEN</code> e{" "}
          <code className="rounded bg-amber-100/80 px-1 text-xs dark:bg-amber-900/50">META_WHATSAPP_PHONE_NUMBER_ID</code> configurados.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 py-16 text-center">
          <FileText className="mx-auto mb-3 size-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhum template cadastrado.</p>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }} variant="outline" className="mt-4 gap-2">
            <Plus className="size-4" /> Criar primeiro template
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
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{t.name}</span>
                    <Badge variant={(STATUS_COLORS[t.status] ?? "secondary") as "default"}>
                      {STATUS_LABELS[t.status] ?? t.status}
                    </Badge>
                    {t.category && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        {t.category}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">{t.language}</span>
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
  const [language, setLanguage] = React.useState(initial?.language ?? "pt_BR");
  const [channelType, setChannelType] = React.useState(initial?.channelType ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;
    onSubmit({
      name: name.trim(),
      content: content.trim(),
      category: category.trim() || undefined,
      language: language.trim() || undefined,
      channelType: channelType || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="tpl-name">Nome (igual ao template na Meta)</Label>
        <Input
          id="tpl-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ex.: call_permission_request_1"
          required
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          snake_case, como no Gerenciador da Meta. O inbox envia este nome, não o texto abaixo.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="tpl-content">Texto de referência (só no CRM)</Label>
        <textarea
          id="tpl-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Olá {{nome}}, bem-vindo(a)!"
          rows={5}
          required
          className="resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-indigo-500/40"
        />
        <p className="text-xs text-muted-foreground">Use {"{{variável}}"} para variáveis dinâmicas.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="tpl-category">Categoria</Label>
          <Input id="tpl-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Marketing, Utilidade…" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="tpl-language">Idioma</Label>
          <SelectNative id="tpl-language" value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="pt_BR">Português (BR)</option>
            <option value="en_US">English (US)</option>
            <option value="es">Español</option>
          </SelectNative>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="tpl-channel">Canal (opcional)</Label>
        <SelectNative id="tpl-channel" value={channelType} onChange={(e) => setChannelType(e.target.value)}>
          <option value="">Todos</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="INSTAGRAM">Instagram</option>
          <option value="FACEBOOK">Facebook</option>
          <option value="EMAIL">E-mail</option>
        </SelectNative>
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
