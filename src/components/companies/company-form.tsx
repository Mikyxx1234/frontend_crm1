"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type CompanyFormValues = {
  name: string;
  domain: string;
  industry: string;
  size: string;
  phone: string;
  address: string;
};

export function CompanyForm({
  id,
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = "Salvar",
  className,
}: {
  id?: string;
  defaultValues?: Partial<CompanyFormValues>;
  onSubmit: (values: CompanyFormValues) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  className?: string;
}) {
  const [values, setValues] = useState<CompanyFormValues>({
    name: "",
    domain: "",
    industry: "",
    size: "",
    phone: "",
    address: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultValues) {
      setValues({
        name: defaultValues.name ?? "",
        domain: defaultValues.domain ?? "",
        industry: defaultValues.industry ?? "",
        size: defaultValues.size ?? "",
        phone: defaultValues.phone ?? "",
        address: defaultValues.address ?? "",
      });
    }
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
        name: values.name.trim(),
        domain: values.domain.trim(),
        industry: values.industry.trim(),
        size: values.size.trim(),
        phone: values.phone.trim(),
        address: values.address.trim(),
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
        <Label htmlFor="company-name">Nome</Label>
        <Input
          id="company-name"
          value={values.name}
          onChange={(e) => setValues((s) => ({ ...s, name: e.target.value }))}
          placeholder="Razão social ou nome fantasia"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="company-domain">Domínio</Label>
        <Input
          id="company-domain"
          value={values.domain}
          onChange={(e) => setValues((s) => ({ ...s, domain: e.target.value }))}
          placeholder="exemplo.com.br"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="company-industry">Setor</Label>
        <Input
          id="company-industry"
          value={values.industry}
          onChange={(e) => setValues((s) => ({ ...s, industry: e.target.value }))}
          placeholder="Ex.: tecnologia, educação"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="company-size">Porte</Label>
        <Input
          id="company-size"
          value={values.size}
          onChange={(e) => setValues((s) => ({ ...s, size: e.target.value }))}
          placeholder="Ex.: 1–10, 11–50"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="company-phone">Telefone</Label>
        <Input
          id="company-phone"
          type="tel"
          value={values.phone}
          onChange={(e) => setValues((s) => ({ ...s, phone: e.target.value }))}
          placeholder="+55 …"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="company-address">Endereço</Label>
        <Textarea
          id="company-address"
          value={values.address}
          onChange={(e) => setValues((s) => ({ ...s, address: e.target.value }))}
          placeholder="Rua, número, cidade…"
          rows={3}
          className="min-h-[80px] resize-y"
        />
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
