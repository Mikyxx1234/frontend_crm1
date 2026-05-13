"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ContactFormValues = {
  name: string;
  email: string;
  phone: string;
  lifecycleStage: string;
  source: string;
  companyId: string;
};

const LIFECYCLE_OPTIONS = [
  { value: "SUBSCRIBER", label: "Assinante" },
  { value: "LEAD", label: "Lead" },
  { value: "MQL", label: "MQL" },
  { value: "SQL", label: "SQL" },
  { value: "OPPORTUNITY", label: "Oportunidade" },
  { value: "CUSTOMER", label: "Cliente" },
  { value: "EVANGELIST", label: "Evangelista" },
  { value: "OTHER", label: "Outro" },
] as const;

export type CompanyOption = { id: string; name: string };

export function ContactForm({
  id,
  defaultValues,
  companies,
  onSubmit,
  onCancel,
  submitLabel = "Salvar",
  className,
}: {
  id?: string;
  defaultValues?: Partial<ContactFormValues>;
  companies: CompanyOption[];
  onSubmit: (values: ContactFormValues) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  className?: string;
}) {
  const [values, setValues] = useState<ContactFormValues>({
    name: "",
    email: "",
    phone: "",
    lifecycleStage: "LEAD",
    source: "",
    companyId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!defaultValues) return;
    setValues({
      name: defaultValues.name ?? "",
      email: defaultValues.email ?? "",
      phone: defaultValues.phone ?? "",
      lifecycleStage: defaultValues.lifecycleStage ?? "LEAD",
      source: defaultValues.source ?? "",
      companyId: defaultValues.companyId ?? "",
    });
  }, [defaultValues, id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!values.name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        ...values,
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        source: values.source.trim(),
        companyId: values.companyId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("grid gap-4", className)}>
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="contact-name">Nome</Label>
        <Input
          id="contact-name"
          value={values.name}
          onChange={(e) => setValues((s) => ({ ...s, name: e.target.value }))}
          placeholder="Nome completo"
          required
          autoComplete="name"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="contact-email">E-mail</Label>
        <Input
          id="contact-email"
          type="email"
          value={values.email}
          onChange={(e) => setValues((s) => ({ ...s, email: e.target.value }))}
          placeholder="email@empresa.com"
          autoComplete="email"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="contact-phone">Telefone</Label>
        <Input
          id="contact-phone"
          type="tel"
          value={values.phone}
          onChange={(e) => setValues((s) => ({ ...s, phone: e.target.value }))}
          placeholder="+55 …"
          autoComplete="tel"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="contact-stage">Estágio do ciclo</Label>
        <SelectNative
          id="contact-stage"
          value={values.lifecycleStage}
          onChange={(e) =>
            setValues((s) => ({ ...s, lifecycleStage: e.target.value }))
          }
        >
          {LIFECYCLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </SelectNative>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="contact-source">Origem</Label>
        <Input
          id="contact-source"
          value={values.source}
          onChange={(e) => setValues((s) => ({ ...s, source: e.target.value }))}
          placeholder="Ex.: site, indicação, evento"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="contact-company">Empresa</Label>
        <SelectNative
          id="contact-company"
          value={values.companyId}
          onChange={(e) =>
            setValues((s) => ({ ...s, companyId: e.target.value }))
          }
        >
          <option value="">Nenhuma empresa</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectNative>
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Salvando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
