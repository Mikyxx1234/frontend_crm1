"use client";

import { apiUrl } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Globe,
  Plus,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useRef, useState } from "react";

import { CompanyForm } from "@/components/companies/company-form";
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
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

type CompanyRow = {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  createdAt: string;
  _count: { contacts: number };
};

type CompaniesListResponse = {
  items?: CompanyRow[];
  companies?: CompanyRow[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { message?: string };
    return j.message ?? `Erro ${res.status}`;
  } catch {
    return `Erro ${res.status}`;
  }
}

export default function CompaniesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [createOpen, setCreateOpen] = useState(false);

  const onSearchDebouncedRef = useRef<(q: string) => void>(() => {});
  const [debouncedSearch, setDebouncedSearch] = useState("");
  onSearchDebouncedRef.current = (q: string) => {
    setDebouncedSearch(q);
    setPage(1);
  };

  useEffect(() => {
    const t = window.setTimeout(
      () => onSearchDebouncedRef.current(deferredSearch.trim()),
      300
    );
    return () => window.clearTimeout(t);
  }, [deferredSearch]);

  const listQuery = useQuery({
    queryKey: ["companies", { debouncedSearch, page, perPage: 20 }],
    queryFn: async (): Promise<CompaniesListResponse> => {
      const qs = new URLSearchParams();
      if (debouncedSearch) qs.set("search", debouncedSearch);
      qs.set("page", String(page));
      qs.set("perPage", "20");
      const res = await fetch(apiUrl(`/api/companies?${qs.toString()}`));
      if (!res.ok) throw new Error(await readErrorMessage(res));
      return res.json();
    },
  });

  const companies =
    listQuery.data?.items ?? listQuery.data?.companies ?? [];
  const totalPages = listQuery.data?.totalPages ?? 1;
  const total = listQuery.data?.total ?? 0;

  const createMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(apiUrl("/api/companies"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readErrorMessage(res));
      return res.json() as Promise<{ id: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setCreateOpen(false);
    },
  });

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Empresas"
        description="Contas e organizações vinculadas aos seus contatos."
        icon={<Building2 />}
        actions={
          <Button
            type="button"
            className="gap-2 shadow-sm"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" />
            Nova Empresa
          </Button>
        }
      />

      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
        <Label htmlFor="company-search" className="sr-only">
          Buscar empresas
        </Label>
        <div className="relative">
          <Search className="pointer-events-none absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="company-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, domínio ou setor…"
            className="ps-10"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="ps-4">Nome</TableHead>
              <TableHead>Domínio</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead className="text-end">Contatos</TableHead>
              <TableHead className="pe-4">Criada em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQuery.isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5} className="ps-4 pe-4">
                    <Skeleton className="h-10 w-full rounded-md" />
                  </TableCell>
                </TableRow>
              ))
            ) : listQuery.isError ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-sm text-destructive"
                >
                  {(listQuery.error as Error).message}
                </TableCell>
              </TableRow>
            ) : companies.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-12 text-center text-muted-foreground"
                >
                  <Building2 className="mx-auto mb-2 size-8 opacity-40" />
                  <p>Nenhuma empresa encontrada.</p>
                </TableCell>
              </TableRow>
            ) : (
              companies.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/companies/${c.id}`)}
                >
                  <TableCell className="ps-4 font-medium">
                    <span className="inline-flex items-center gap-2">
                      <Building2 className="size-4 text-primary/80" />
                      {c.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.domain ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Globe className="size-3.5 shrink-0 opacity-60" />
                        {c.domain}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{c.industry ?? "—"}</TableCell>
                  <TableCell className="text-end tabular-nums">
                    {c._count.contacts}
                  </TableCell>
                  <TableCell className="pe-4 text-muted-foreground">
                    {formatDate(c.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          {total} empresa{total !== 1 ? "s" : ""}
          {totalPages > 1 ? (
            <span className="text-muted-foreground/80">
              {" "}
              · Página {page} de {totalPages}
            </span>
          ) : null}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={page <= 1 || listQuery.isLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="size-4" />
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={page >= totalPages || listQuery.isLoading}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent size="lg" panelClassName="max-h-[90dvh] overflow-y-auto">
          <DialogClose />
          <DialogHeader>
            <DialogTitle>Nova empresa</DialogTitle>
            <DialogDescription>
              Cadastre uma organização para associar aos contatos.
            </DialogDescription>
          </DialogHeader>
          {createOpen ? (
            <CompanyForm
              submitLabel="Criar empresa"
              onCancel={() => setCreateOpen(false)}
              onSubmit={async (values) => {
                const payload: Record<string, unknown> = {
                  name: values.name,
                };
                if (values.domain.trim()) payload.domain = values.domain.trim();
                if (values.industry.trim())
                  payload.industry = values.industry.trim();
                if (values.size.trim()) payload.size = values.size.trim();
                if (values.phone.trim()) payload.phone = values.phone.trim();
                if (values.address.trim())
                  payload.address = values.address.trim();
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
