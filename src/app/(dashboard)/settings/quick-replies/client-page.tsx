"use client";

import { apiUrl } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
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
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";

type QuickReplyRow = {
  id: string;
  title: string;
  content: string;
  category: string | null;
  position: number;
};

async function fetchReplies(): Promise<QuickReplyRow[]> {
  const res = await fetch(apiUrl("/api/quick-replies"));
  if (!res.ok) throw new Error("Erro ao carregar respostas rápidas");
  return res.json();
}

export default function QuickRepliesSettingsPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<QuickReplyRow | null>(null);

  const { data: replies = [], isLoading } = useQuery({
    queryKey: ["quick-replies"],
    queryFn: fetchReplies,
  });

  const createMutation = useMutation({
    mutationFn: async (body: { title: string; content: string; category?: string }) => {
      const res = await fetch(apiUrl("/api/quick-replies"), {
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
      queryClient.invalidateQueries({ queryKey: ["quick-replies"] });
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...body }: { id: string; title: string; content: string; category?: string }) => {
      const res = await fetch(apiUrl(`/api/quick-replies/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Erro ao atualizar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-replies"] });
      setEditing(null);
      setFormOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/api/quick-replies/${id}`), { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick-replies"] });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (r: QuickReplyRow) => {
    setEditing(r);
    setFormOpen(true);
  };

  return (
    <div className="w-full space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Configurações
      </Link>

      <PageHeader
        title="Respostas Rápidas"
        description="Crie mensagens predefinidas para usar no chat com leads."
        icon={<Zap />}
        actions={
          <Button onClick={openCreate} className="gap-2 shadow-sm">
            <Plus className="size-4" /> Nova Resposta
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : replies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 py-16 text-center">
          <Zap className="mx-auto mb-3 size-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhuma resposta rápida cadastrada.</p>
          <Button onClick={openCreate} variant="outline" className="mt-4 gap-2">
            <Plus className="size-4" /> Criar primeira resposta
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {replies.map((r) => (
            <div
              key={r.id}
              className="flex items-start gap-3 rounded-xl border border-border/80 bg-card p-4 shadow-sm transition-colors hover:bg-muted/20"
            >
              <GripVertical className="mt-1 size-4 shrink-0 cursor-grab text-muted-foreground/50" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{r.title}</span>
                  {r.category && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      {r.category}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {r.content}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => openEdit(r)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive/70 hover:text-destructive"
                  onClick={() => deleteMutation.mutate(r.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={(v) => { if (!v) { setFormOpen(false); setEditing(null); } else setFormOpen(true); }}>
        <DialogContent size="md">
          <DialogClose />
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Resposta Rápida" : "Nova Resposta Rápida"}</DialogTitle>
          </DialogHeader>
          <QuickReplyForm
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

function QuickReplyForm({
  initial,
  onSubmit,
  isPending,
  onCancel,
}: {
  initial: QuickReplyRow | null;
  onSubmit: (data: { title: string; content: string; category?: string }) => void;
  isPending: boolean;
  onCancel: () => void;
}) {
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [content, setContent] = React.useState(initial?.content ?? "");
  const [category, setCategory] = React.useState(initial?.category ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onSubmit({ title: title.trim(), content: content.trim(), category: category.trim() || undefined });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="qr-title">Título</Label>
        <Input id="qr-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Saudação inicial" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="qr-content">Conteúdo</Label>
        <textarea
          id="qr-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Texto completo da mensagem…"
          rows={4}
          required
          className="resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-indigo-500/40"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="qr-category">Categoria (opcional)</Label>
        <Input id="qr-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Vendas, Suporte…" />
      </div>
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isPending || !title.trim() || !content.trim()} className="gap-2">
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {initial ? "Salvar" : "Criar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
