"use client";

import { apiUrl } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  Edit,
  Globe,
  Mail,
  MapPin,
  Phone,
  Tag,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { CompanyForm } from "@/components/companies/company-form";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, getInitials } from "@/lib/utils";

type UserBrief = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
};

type ContactBrief = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  lifecycleStage: string;
  assignedTo: UserBrief | null;
  tags: { tag: { id: string; name: string; color: string } }[];
};

type CompanyDetail = {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  contacts: ContactBrief[];
  _count: { contacts: number };
};

function lifecycleBadgeVariant(
  stage: string
): "default" | "secondary" | "outline" | "success" | "warning" {
  switch (stage) {
    case "SUBSCRIBER":
      return "secondary";
    case "LEAD":
      return "default";
    case "MQL":
    case "SQL":
      return "warning";
    case "OPPORTUNITY":
    case "CUSTOMER":
      return "success";
    case "EVANGELIST":
      return "outline";
    default:
      return "secondary";
  }
}

function lifecycleLabel(stage: string): string {
  const map: Record<string, string> = {
    SUBSCRIBER: "Assinante",
    LEAD: "Lead",
    MQL: "MQL",
    SQL: "SQL",
    OPPORTUNITY: "Oportunidade",
    CUSTOMER: "Cliente",
    EVANGELIST: "Evangelista",
    OTHER: "Outro",
  };
  return map[stage] ?? stage;
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { message?: string };
    return j.message ?? `Erro ${res.status}`;
  } catch {
    return `Erro ${res.status}`;
  }
}

export default function CompanyDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const companyQuery = useQuery({
    queryKey: ["company", id],
    queryFn: async (): Promise<CompanyDetail> => {
      const res = await fetch(apiUrl(`/api/companies/${id}`));
      if (!res.ok) throw new Error(await readErrorMessage(res));
      return res.json();
    },
    enabled: Boolean(id),
  });

  const updateMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(apiUrl(`/api/companies/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readErrorMessage(res));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company", id] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setEditOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl(`/api/companies/${id}`), { method: "DELETE" });
      if (!res.ok) throw new Error(await readErrorMessage(res));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      router.push("/companies");
    },
  });

  const company = companyQuery.data;

  if (companyQuery.isLoading) {
    return (
      <div className="w-full space-y-6">
        <Skeleton className="h-10 w-48 rounded-md" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (companyQuery.isError || !company) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <p className="text-destructive">
          {(companyQuery.error as Error)?.message ?? "Empresa não encontrada."}
        </p>
        <Button variant="outline" asChild>
          <Link href="/companies">
            <ArrowLeft className="size-4" />
            Voltar às empresas
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit gap-2 ps-0 text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link href="/companies">
            <ArrowLeft className="size-4" />
            Empresas
          </Link>
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-xl border-2 border-primary/20 bg-primary/5 shadow-sm">
              <Building2 className="size-8 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {company.name}
              </h1>
              {company.industry ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {company.industry}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setEditOpen(true)}
            >
              <Edit className="size-4" />
              Editar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4" />
              Excluir
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="size-4 text-primary" />
              Domínio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {company.domain?.trim() ? (
                <a
                  href={`https://${company.domain.replace(/^https?:\/\//, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline"
                >
                  {company.domain}
                </a>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Porte</CardTitle>
            <CardDescription>Número de colaboradores (referência)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {company.size?.trim() ? company.size : "—"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="size-4 text-primary" />
              Telefone
            </CardTitle>
          </CardHeader>
          <CardContent>
            {company.phone?.trim() ? (
              <a
                href={`tel:${company.phone}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                {company.phone}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">
              {company.address?.trim() ? company.address : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="size-5 text-primary" />
            Contatos ({company.contacts.length})
          </CardTitle>
          <CardDescription>
            Pessoas vinculadas a esta empresa.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          {company.contacts.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              Nenhum contato associado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="ps-6">Contato</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Estágio</TableHead>
                  <TableHead className="pe-6">Tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {company.contacts.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/contacts/${c.id}`)}
                  >
                    <TableCell className="ps-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9 border border-border">
                          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                            {getInitials(c.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{c.name}</p>
                          {c.phone ? (
                            <p className="text-xs text-muted-foreground">
                              {c.phone}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {c.email ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Mail className="size-3.5 shrink-0" />
                          <span className="truncate max-w-[200px]">
                            {c.email}
                          </span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={lifecycleBadgeVariant(c.lifecycleStage)}>
                        {lifecycleLabel(c.lifecycleStage)}
                      </Badge>
                    </TableCell>
                    <TableCell className="pe-6">
                      <div className="flex flex-wrap gap-1">
                        {c.tags.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          c.tags.map((t) => (
                            <Badge
                              key={t.tag.id}
                              variant="outline"
                              className="text-[10px] font-normal"
                            >
                              <Tag className="me-1 size-3 opacity-60" />
                              {t.tag.name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent size="lg" panelClassName="max-h-[90dvh] overflow-y-auto">
          <DialogClose />
          <DialogHeader>
            <DialogTitle>Editar empresa</DialogTitle>
            <DialogDescription>
              Atualize os dados cadastrais.
            </DialogDescription>
          </DialogHeader>
          <CompanyForm
            id={company.id}
            defaultValues={{
              name: company.name,
              domain: company.domain ?? "",
              industry: company.industry ?? "",
              size: company.size ?? "",
              phone: company.phone ?? "",
              address: company.address ?? "",
            }}
            submitLabel="Salvar alterações"
            onCancel={() => setEditOpen(false)}
            onSubmit={async (values) => {
              const payload: Record<string, unknown> = {
                name: values.name,
                domain: values.domain.trim() ? values.domain.trim() : null,
                industry: values.industry.trim()
                  ? values.industry.trim()
                  : null,
                size: values.size.trim() ? values.size.trim() : null,
                phone: values.phone.trim() ? values.phone.trim() : null,
                address: values.address.trim() ? values.address.trim() : null,
              };
              await updateMutation.mutateAsync(payload);
            }}
          />
          {updateMutation.isError ? (
            <DialogFooter>
              <p className="text-sm text-destructive">
                {(updateMutation.error as Error).message}
              </p>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent size="sm">
          <DialogClose />
          <DialogHeader>
            <DialogTitle>Excluir empresa?</DialogTitle>
            <DialogDescription>
              Os contatos vinculados serão desassociados desta empresa. Esta
              ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? "Excluindo…" : "Excluir"}
            </Button>
          </DialogFooter>
          {deleteMutation.isError ? (
            <p className="text-sm text-destructive">
              {(deleteMutation.error as Error).message}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
