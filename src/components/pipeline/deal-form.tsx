"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  value: z.number().min(0, "Valor inválido"),
  stageId: z.string().min(1, "Selecione um estágio"),
  contactId: z.string().optional(),
  ownerId: z.string().optional(),
  expectedClose: z.string().optional(),
});

export type DealFormValues = z.infer<typeof formSchema>;

type DealFormProps = {
  mode: "create" | "edit";
  dealId?: string;
  stages: { id: string; name: string }[];
  defaultValues?: Partial<{
    title: string;
    value: number;
    stageId: string;
    contactId: string | null;
    expectedClose: string | null;
  }>;
  /** Nome do contato já vinculado (modo edição) */
  initialContactName?: string | null;
  onSuccess: () => void;
  onCancel?: () => void;
  submitLabel?: string;
};

type UserOption = { id: string; name: string; email: string };

async function fetchUsers(): Promise<UserOption[]> {
  const res = await fetch(apiUrl("/api/users"));
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items ?? data) as UserOption[];
}

async function fetchContacts(search: string) {
  const q = search.trim() ? `&search=${encodeURIComponent(search.trim())}` : "";
  const res = await fetch(apiUrl(`/api/contacts?perPage=50${q}`));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.message === "string" ? data.message : "Erro ao buscar contatos");
  }
  const list = Array.isArray(data) ? data : data.items ?? data.contacts ?? [];
  return list as { id: string; name: string; email: string | null }[];
}

export function DealForm({
  mode,
  dealId,
  stages,
  defaultValues,
  initialContactName,
  onSuccess,
  onCancel,
  submitLabel,
}: DealFormProps) {
  const [contactSearch, setContactSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [contactPickerOpen, setContactPickerOpen] = React.useState(false);
  const [selectedContactLabel, setSelectedContactLabel] = React.useState("");

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(contactSearch), 300);
    return () => window.clearTimeout(t);
  }, [contactSearch]);

  const { data: users = [] } = useQuery({
    queryKey: ["users-list"],
    queryFn: fetchUsers,
    staleTime: 5 * 60_000,
  });

  const { data: contacts = [], isFetching: contactsLoading } = useQuery({
    queryKey: ["contacts", "pipeline-pick", debouncedSearch],
    queryFn: () => fetchContacts(debouncedSearch),
    staleTime: 30_000,
  });

  const form = useForm<DealFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: defaultValues?.title ?? "",
      value: defaultValues?.value ?? 0,
      stageId: defaultValues?.stageId ?? stages[0]?.id ?? "",
      contactId: defaultValues?.contactId ?? "",
      ownerId: "",
      expectedClose: defaultValues?.expectedClose
        ? defaultValues.expectedClose.slice(0, 10)
        : "",
    },
  });

  React.useEffect(() => {
    if (defaultValues && mode === "edit") {
      form.reset({
        title: defaultValues.title ?? "",
        value: Number(defaultValues.value ?? 0),
        stageId: defaultValues.stageId ?? stages[0]?.id ?? "",
        contactId: defaultValues.contactId ?? "",
        expectedClose: defaultValues.expectedClose
          ? defaultValues.expectedClose.slice(0, 10)
          : "",
      });
    }
  }, [defaultValues, mode, form, stages]);

  React.useEffect(() => {
    if (initialContactName && defaultValues?.contactId) {
      setSelectedContactLabel(initialContactName);
    }
  }, [initialContactName, defaultValues?.contactId]);

  const contactIdWatch = form.watch("contactId");

  const mutation = async (values: DealFormValues) => {
    const body: Record<string, unknown> = {
      title: values.title.trim(),
      value: values.value,
      stageId: values.stageId,
    };
    if (values.expectedClose?.trim()) {
      body.expectedClose = new Date(values.expectedClose + "T12:00:00").toISOString();
    }
    if (values.contactId?.trim()) {
      body.contactId = values.contactId.trim();
    } else if (mode === "edit") {
      body.contactId = null;
    }
    if (values.ownerId?.trim()) {
      body.ownerId = values.ownerId.trim();
    }

    if (mode === "create") {
      const res = await fetch(apiUrl("/api/deals"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.message === "string" ? data.message : "Erro ao criar negócio");
      }
      return data;
    }

    if (!dealId) throw new Error("ID do negócio ausente");
    const res = await fetch(apiUrl(`/api/deals/${dealId}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof data?.message === "string" ? data.message : "Erro ao atualizar negócio");
    }
    return data;
  };

  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const onSubmit = form.handleSubmit(async (values: DealFormValues) => {
    setError(null);
    setPending(true);
    try {
      await mutation(values);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo deu errado.");
    } finally {
      setPending(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="deal-title">Título</Label>
        <Input id="deal-title" {...form.register("title")} placeholder="Ex.: Licença anual — Escola X" />
        {form.formState.errors.title ? (
          <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="deal-value">Valor (R$)</Label>
        <Input
          id="deal-value"
          type="number"
          step="0.01"
          min={0}
          {...form.register("value", {
            setValueAs: (v) => {
              if (v === "" || v == null) return 0;
              const n = Number(v);
              return Number.isFinite(n) ? n : 0;
            },
          })}
        />
        {form.formState.errors.value ? (
          <p className="text-xs text-destructive">{form.formState.errors.value.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="deal-stage">Estágio</Label>
        <SelectNative id="deal-stage" {...form.register("stageId")}>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </SelectNative>
        {form.formState.errors.stageId ? (
          <p className="text-xs text-destructive">{form.formState.errors.stageId.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>Contato (opcional)</Label>
        <Input
          placeholder="Buscar por nome ou e-mail…"
          value={contactSearch}
          onChange={(e) => {
            setContactSearch(e.target.value);
            setContactPickerOpen(true);
          }}
          onFocus={() => setContactPickerOpen(true)}
        />
        {contactIdWatch ? (
          <p className="text-xs text-muted-foreground">
            Selecionado: {selectedContactLabel || contactIdWatch}
            <button
              type="button"
              className="ms-2 text-primary underline"
              onClick={() => {
                form.setValue("contactId", "");
                setSelectedContactLabel("");
              }}
            >
              limpar
            </button>
          </p>
        ) : null}
        {contactPickerOpen ? (
          <div
            className={cn(
              "max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-sm"
            )}
          >
            {contactsLoading ? (
              <p className="p-3 text-xs text-muted-foreground">Buscando…</p>
            ) : contacts.length === 0 ? (
              <p className="p-3 text-xs text-muted-foreground">Nenhum contato encontrado.</p>
            ) : (
              <ul className="divide-y divide-border">
                {contacts.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted/80"
                      onClick={() => {
                        form.setValue("contactId", c.id);
                        setSelectedContactLabel(c.name);
                        setContactPickerOpen(false);
                        setContactSearch("");
                      }}
                    >
                      <span className="font-medium">{c.name}</span>
                      {c.email ? (
                        <span className="text-xs text-muted-foreground">{c.email}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="deal-owner">Responsavel (opcional)</Label>
        <SelectNative
          id="deal-owner"
          {...form.register("ownerId")}
        >
          <option value="">Sem responsavel</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </SelectNative>
      </div>

      <div className="space-y-2">
        <Label htmlFor="deal-close">Fechamento esperado</Label>
        <DatePicker
          value={form.watch("expectedClose") ?? ""}
          onChange={(value) => form.setValue("expectedClose", value, { shouldDirty: true })}
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : submitLabel ?? (mode === "create" ? "Criar negócio" : "Salvar")}
        </Button>
      </div>
    </form>
  );
}
