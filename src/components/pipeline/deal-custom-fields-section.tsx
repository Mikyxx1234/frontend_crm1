"use client";

import { apiUrl } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { SidebarSection } from "@/components/pipeline/deal-detail/shared";

type FieldWithValue = {
  fieldId: string;
  name: string;
  label: string;
  type: string;
  options: string[];
  required: boolean;
  value: string | null;
};

async function fetchFieldValues(dealId: string): Promise<FieldWithValue[]> {
  const res = await fetch(apiUrl(`/api/deals/${dealId}/custom-fields`));
  if (!res.ok) throw new Error("Erro ao carregar campos");
  return res.json();
}

async function saveFieldValues(dealId: string, values: { fieldId: string; value: string }[]) {
  const res = await fetch(apiUrl(`/api/deals/${dealId}/custom-fields`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  });
  if (!res.ok) throw new Error("Erro ao salvar campos");
  return res.json();
}

export function DealCustomFieldsSection({ dealId }: { dealId: string }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState<Record<string, string>>({});

  const { data: fields = [], isLoading } = useQuery({
    queryKey: ["deal-custom-fields", dealId],
    queryFn: () => fetchFieldValues(dealId),
  });

  const saveMutation = useMutation({
    mutationFn: (values: { fieldId: string; value: string }[]) =>
      saveFieldValues(dealId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-custom-fields", dealId] });
      setEditing(false);
    },
  });

  const startEdit = () => {
    const d: Record<string, string> = {};
    fields.forEach((f) => { d[f.fieldId] = f.value ?? ""; });
    setDraft(d);
    setEditing(true);
  };

  const onSave = () => {
    const values = Object.entries(draft).map(([fieldId, value]) => ({ fieldId, value }));
    saveMutation.mutate(values);
  };

  if (isLoading) return <div className="py-3 text-xs text-muted-foreground">Carregando campos…</div>;
  if (fields.length === 0) return null;

  return (
    <SidebarSection
      title="Campos do negócio"
      action={
        !editing ? (
          <Button type="button" variant="ghost" size="icon" className="size-7 rounded-xl" onClick={startEdit}>
            <Pencil className="size-3.5" />
          </Button>
        ) : (
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="icon" className="size-7 rounded-xl" onClick={() => setEditing(false)}>
              <X className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 rounded-xl text-emerald-600"
              onClick={onSave}
              disabled={saveMutation.isPending}
            >
              <Check className="size-3.5" />
            </Button>
          </div>
        )
      }
    >
      <div className="rounded-lg border border-slate-200 bg-slate-50/80">
        {fields.map((f, i) => (
          <div
            key={f.fieldId}
            className={`flex items-center gap-3 px-3.5 py-2.5 ${i < fields.length - 1 ? "border-b border-slate-200/80" : ""}`}
          >
            <Label className="w-[40%] shrink-0 text-xs font-medium text-slate-500">{f.label}</Label>
            {editing ? (
              <div className="min-w-0 flex-1">
                {f.type === "SELECT" && f.options.length > 0 ? (
                  <SelectNative
                    value={draft[f.fieldId] ?? ""}
                    onChange={(e) => setDraft((p) => ({ ...p, [f.fieldId]: e.target.value }))}
                    className="h-8 w-full rounded-lg border-slate-200 bg-white text-sm"
                  >
                    <option value="">—</option>
                    {f.options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </SelectNative>
                ) : f.type === "BOOLEAN" ? (
                  <SelectNative
                    value={draft[f.fieldId] ?? ""}
                    onChange={(e) => setDraft((p) => ({ ...p, [f.fieldId]: e.target.value }))}
                    className="h-8 w-full rounded-lg border-slate-200 bg-white text-sm"
                  >
                    <option value="">—</option>
                    <option value="true">Sim</option>
                    <option value="false">Não</option>
                  </SelectNative>
                ) : f.type === "DATE" ? (
                  <DatePicker
                    value={draft[f.fieldId] ?? ""}
                    onChange={(value) => setDraft((p) => ({ ...p, [f.fieldId]: value }))}
                  />
                ) : (
                  <Input
                    type={
                      f.type === "NUMBER"
                        ? "number"
                        : f.type === "EMAIL"
                            ? "email"
                            : f.type === "URL"
                              ? "url"
                              : "text"
                    }
                    value={draft[f.fieldId] ?? ""}
                    onChange={(e) => setDraft((p) => ({ ...p, [f.fieldId]: e.target.value }))}
                    className="h-8 w-full rounded-lg border-slate-200 bg-white text-sm"
                  />
                )}
              </div>
            ) : (
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
                {f.value || <span className="font-normal text-slate-400">—</span>}
              </span>
            )}
          </div>
        ))}
      </div>
    </SidebarSection>
  );
}
