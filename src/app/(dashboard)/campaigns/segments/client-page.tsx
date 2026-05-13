"use client";

import { apiUrl } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Loader2,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { pageHeaderDescriptionClass, pageHeaderTitleClass } from "@/components/ui/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Segment = {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  createdAt: string;
};

type FilterState = {
  search?: string;
  lifecycleStage?: string;
  tagIds?: string[];
};

export default function SegmentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [segName, setSegName] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  const segmentsQuery = useQuery({
    queryKey: ["segments"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/segments"));
      const data = await res.json();
      return (data.segments ?? []) as Segment[];
    },
  });

  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/tags"));
      const data = await res.json();
      return (data.tags ?? data ?? []) as { id: string; name: string; color: string }[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = editingId ? `/api/segments/${editingId}` : "/api/segments";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(apiUrl(url), {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: segName, filters }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? "Erro ao salvar segmento.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["segments"] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/api/segments/${id}`), { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["segments"] }),
  });

  async function loadPreview() {
    try {
      const res = await fetch(apiUrl("/api/campaigns/preview"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters }),
      });
      const data = await res.json();
      setPreviewCount(data.count ?? 0);
    } catch {
      setPreviewCount(null);
    }
  }

  function openNew() {
    setEditingId(null);
    setSegName("");
    setFilters({});
    setPreviewCount(null);
    setDialogOpen(true);
  }

  function openEdit(seg: Segment) {
    setEditingId(seg.id);
    setSegName(seg.name);
    setFilters((seg.filters ?? {}) as FilterState);
    setPreviewCount(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setSegName("");
    setFilters({});
    setPreviewCount(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/campaigns")}>
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className={pageHeaderTitleClass}>Segmentos</h1>
          <p className={pageHeaderDescriptionClass}>
            Crie e gerencie filtros salvos para usar nas campanhas.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="size-4" />
          Novo segmento
        </Button>
      </div>

      {segmentsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (segmentsQuery.data ?? []).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <Users className="size-12 text-muted-foreground/40" />
            <div className="text-center">
              <CardTitle className="text-lg">Nenhum segmento</CardTitle>
              <CardDescription className="mt-1">
                Crie segmentos para organizar seus contatos e usar em campanhas.
              </CardDescription>
            </div>
            <Button onClick={openNew} className="gap-2">
              <Plus className="size-4" />
              Novo segmento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(segmentsQuery.data ?? []).map((seg) => {
            const f = seg.filters as FilterState;
            const filterParts: string[] = [];
            if (f.lifecycleStage) filterParts.push(f.lifecycleStage);
            if (f.tagIds?.length) filterParts.push(`${f.tagIds.length} tag(s)`);
            if (f.search) filterParts.push(`"${f.search}"`);

            return (
              <Card
                key={seg.id}
                className="cursor-pointer transition-all hover:shadow-md hover:ring-1 hover:ring-primary/20"
                onClick={() => openEdit(seg)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{seg.name}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(seg.id);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {filterParts.length > 0 ? filterParts.join(" · ") : "Sem filtros"}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar segmento" : "Novo segmento"}
            </DialogTitle>
            <DialogDescription>
              Configure os filtros para agrupar contatos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Ex.: Clientes VIP"
                value={segName}
                onChange={(e) => setSegName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Busca por nome/telefone</Label>
              <Input
                placeholder="Opcional..."
                value={filters.search ?? ""}
                onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
              />
            </div>

            <div className="space-y-2">
              <Label>Estágio de vida</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={filters.lifecycleStage ?? ""}
                onChange={(e) =>
                  setFilters({ ...filters, lifecycleStage: e.target.value || undefined })
                }
              >
                <option value="">Todos</option>
                <option value="SUBSCRIBER">Subscriber</option>
                <option value="LEAD">Lead</option>
                <option value="MQL">MQL</option>
                <option value="SQL">SQL</option>
                <option value="OPPORTUNITY">Opportunity</option>
                <option value="CUSTOMER">Customer</option>
                <option value="EVANGELIST">Evangelist</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {(tagsQuery.data ?? []).map((tag) => {
                  const selected = filters.tagIds?.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        const current = filters.tagIds ?? [];
                        setFilters({
                          ...filters,
                          tagIds: selected
                            ? current.filter((id) => id !== tag.id)
                            : [...current, tag.id],
                        });
                      }}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors",
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/30",
                      )}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={loadPreview} className="gap-2">
                <Search className="size-3.5" />
                Preview
              </Button>
              {previewCount !== null ? (
                <Badge variant="secondary">{previewCount} contatos</Badge>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !segName.trim()}
            >
              {saveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
          <DialogClose />
        </DialogContent>
      </Dialog>
    </div>
  );
}
