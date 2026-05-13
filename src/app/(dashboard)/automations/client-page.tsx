"use client";

import { apiUrl } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Upload, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDateTime } from "@/lib/utils";
import { triggerTypeLabel } from "@/lib/automation-workflow";

type AutomationRow = {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  active: boolean;
  updatedAt: string;
  stepCount?: number;
  _count?: { steps: number };
};

type ListResponse = {
  automations?: AutomationRow[];
  items?: AutomationRow[];
  total: number;
  page: number;
  perPage: number;
};

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { message?: string };
    return j.message ?? `Erro ${res.status}`;
  } catch {
    return `Erro ${res.status}`;
  }
}

function stepCountOf(row: AutomationRow): number {
  if (typeof row.stepCount === "number") return row.stepCount;
  return row._count?.steps ?? 0;
}

function ActiveSwitch({
  active,
  disabled,
  onToggle,
}: {
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 rounded-full border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
        active ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "pointer-events-none block size-5 translate-x-0.5 rounded-full bg-background shadow-sm ring-0 transition-transform",
          active && "translate-x-5",
        )}
      />
    </button>
  );
}

export default function AutomationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 12;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch(apiUrl("/api/automations/import-kommo"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      if (!res.ok) throw new Error(await readErrorMessage(res));
      return (await res.json()) as { automationId: string; message: string; stepCount: number };
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["automations"] });
      router.push(`/automations/${data.automationId}`);
    },
  });

  const debounceRef = useMemo(
    () => ({ t: null as ReturnType<typeof setTimeout> | null }),
    [],
  );
  const onSearchChange = useCallback(
    (v: string) => {
      setSearch(v);
      if (debounceRef.t) clearTimeout(debounceRef.t);
      debounceRef.t = setTimeout(() => {
        setDebounced(v.trim());
        setPage(1);
      }, 320);
    },
    [debounceRef],
  );

  const listQuery = useQuery({
    queryKey: ["automations", { search: debounced, page, perPage }],
    queryFn: async () => {
      const q = new URLSearchParams();
      if (debounced) q.set("search", debounced);
      q.set("page", String(page));
      q.set("perPage", String(perPage));
      const res = await fetch(apiUrl(`/api/automations?${q.toString()}`));
      if (!res.ok) throw new Error(await readErrorMessage(res));
      return (await res.json()) as ListResponse;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/api/automations/${id}/toggle`), {
        method: "POST",
      });
      if (!res.ok) throw new Error(await readErrorMessage(res));
      return (await res.json()) as AutomationRow;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["automations"] });
      const prev = queryClient.getQueryData<ListResponse>([
        "automations",
        { search: debounced, page, perPage },
      ]);
      queryClient.setQueryData<ListResponse>(
        ["automations", { search: debounced, page, perPage }],
        (old) => {
          if (!old) return old;
          const key = old.automations ? "automations" : "items";
          const arr = (old.automations ?? old.items ?? []).map((row) =>
            row.id === id ? { ...row, active: !row.active } : row,
          );
          return { ...old, [key]: arr };
        },
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(
          ["automations", { search: debounced, page, perPage }],
          ctx.prev,
        );
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["automations"] });
    },
  });

  const rows = listQuery.data?.automations ?? listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Automações"
        description="Fluxos disparados por eventos do CRM."
        icon={<Zap />}
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) importMutation.mutate(file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={importMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
              {importMutation.isPending ? "Importando…" : "Importar Bot Kommo"}
            </Button>
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/automations/new">
                <Plus className="size-4" />
                Nova automação
              </Link>
            </Button>
          </>
        }
      />

      {importMutation.isError && (
        <Card className="border-destructive/40">
          <CardContent className="py-3 text-sm text-destructive">
            Falha na importação: {(importMutation.error as Error).message}
          </CardContent>
        </Card>
      )}

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar automações…"
          className="ps-9 h-9"
          aria-label="Buscar automações"
        />
      </div>

      {listQuery.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : listQuery.isError ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">
              Erro ao carregar
            </CardTitle>
            <CardDescription>
              {(listQuery.error as Error).message}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-muted">
              <Zap className="size-6 text-muted-foreground" />
            </span>
            <div>
              <p className="text-sm font-medium">Nenhuma automação ainda</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Crie sua primeira automação para reagir a gatilhos do CRM.
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/automations/new">Nova automação</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {rows.map((row) => (
              <Card
                key={row.id}
                role="link"
                tabIndex={0}
                className={cn(
                  "cursor-pointer border-border/60 shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border-l-4",
                  row.active
                    ? "border-l-emerald-500"
                    : "border-l-muted-foreground/20",
                )}
                onClick={() => router.push(`/automations/${row.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/automations/${row.id}`);
                  }
                }}
              >
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
                  <div className="min-w-0 space-y-0.5">
                    <CardTitle className="line-clamp-1 text-sm font-semibold">
                      {row.name}
                    </CardTitle>
                    {row.description ? (
                      <CardDescription className="line-clamp-1 text-xs">
                        {row.description}
                      </CardDescription>
                    ) : null}
                  </div>
                  <ActiveSwitch
                    active={row.active}
                    disabled={toggleMutation.isPending}
                    onToggle={() => toggleMutation.mutate(row.id)}
                  />
                </CardHeader>
                <CardContent className="flex items-center gap-2 pt-0 text-xs">
                  <Badge
                    variant="secondary"
                    className="font-normal text-[11px] px-1.5 py-0"
                  >
                    {triggerTypeLabel(row.triggerType)}
                  </Badge>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    {stepCountOf(row)} passo{stepCountOf(row) === 1 ? "" : "s"}
                  </span>
                  <span className="ms-auto text-muted-foreground">
                    {formatDateTime(row.updatedAt)}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
