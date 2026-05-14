"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus, Save, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { FlowDefinitionUpsertInput } from "@/services/whatsapp-flow-definitions";
import { cn } from "@/lib/utils";

type FlowMapping = {
  targetKind: string;
  nativeKey: string | null;
  customFieldId: string | null;
} | null;

type FlowFieldRow = {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  required: boolean;
  sortOrder: number;
  mapping: FlowMapping;
};

type FlowScreenRow = {
  id: string;
  title: string;
  sortOrder: number;
  fields: FlowFieldRow[];
};

type FlowDefDetail = {
  id: string;
  name: string;
  status: string;
  flowCategory: string;
  metaFlowId: string | null;
  screens: FlowScreenRow[];
};

type CustomFieldOpt = { id: string; label: string; name: string };

const FIELD_TYPES = ["TEXT", "EMAIL", "PHONE", "TEXTAREA"] as const;

const NATIVE_KEYS = [
  { value: "", label: "— (sem mapeamento)" },
  { value: "name", label: "Nome (contato)" },
  { value: "phone", label: "Telefone" },
  { value: "email", label: "E-mail" },
];

function toUpsertInput(d: FlowDefDetail): FlowDefinitionUpsertInput {
  return {
    name: d.name,
    flowCategory: d.flowCategory,
    screens: d.screens.map((s, si) => ({
      title: s.title,
      sortOrder: si,
      fields: s.fields.map((f, fi) => ({
        fieldKey: f.fieldKey,
        label: f.label,
        fieldType: f.fieldType,
        required: f.required,
        sortOrder: fi,
        mapping: f.mapping
          ? {
              targetKind: f.mapping.targetKind as "CONTACT_NATIVE" | "CUSTOM_FIELD",
              nativeKey: f.mapping.nativeKey,
              customFieldId: f.mapping.customFieldId,
            }
          : null,
      })),
    })),
  };
}

function newScreen(sortOrder: number): FlowScreenRow {
  return {
    id: `local-${Date.now()}-${sortOrder}`,
    title: `Tela ${sortOrder + 1}`,
    sortOrder,
    fields: [],
  };
}

function newField(screen: FlowScreenRow): FlowFieldRow {
  const n = screen.fields.length + 1;
  return {
    id: `local-f-${Date.now()}-${n}`,
    fieldKey: `campo_${n}`,
    label: `Campo ${n}`,
    fieldType: "TEXT",
    required: false,
    sortOrder: n - 1,
    mapping: null,
  };
}

export default function FlowDefinitionEditorPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const queryClient = useQueryClient();

  const { data: customFields = [] } = useQuery({
    queryKey: ["custom-fields", "contact", "flow-editor"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/custom-fields?entity=contact"));
      if (!r.ok) return [] as CustomFieldOpt[];
      const j: unknown = await r.json();
      return Array.isArray(j) ? (j as CustomFieldOpt[]) : [];
    },
  });

  const { data: loaded, isLoading } = useQuery({
    queryKey: ["whatsapp-flow-definition", id],
    queryFn: async () => {
      const r = await fetch(apiUrl(`/api/whatsapp-flow-definitions/${encodeURIComponent(id)}`));
      if (!r.ok) throw new Error("Flow não encontrado.");
      return r.json() as Promise<FlowDefDetail>;
    },
    enabled: Boolean(id),
  });

  const [draft, setDraft] = React.useState<FlowDefDetail | null>(null);
  const [selectedScreenIdx, setSelectedScreenIdx] = React.useState(0);

  React.useEffect(() => {
    if (!loaded) return;
    queueMicrotask(() => {
      setDraft(loaded);
      setSelectedScreenIdx(0);
    });
  }, [loaded]);

  const saveMutation = useMutation({
    mutationFn: async (input: FlowDefinitionUpsertInput) => {
      const r = await fetch(apiUrl(`/api/whatsapp-flow-definitions/${encodeURIComponent(id)}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(typeof j?.message === "string" ? j.message : "Erro ao guardar.");
      return j as FlowDefDetail;
    },
    onSuccess: (row) => {
      setDraft(row);
      queryClient.setQueryData(["whatsapp-flow-definition", id], row);
      queryClient.invalidateQueries({ queryKey: ["whatsapp-flow-definitions"] });
      toast.success("Rascunho guardado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(apiUrl(`/api/whatsapp-flow-definitions/${encodeURIComponent(id)}/publish`), {
        method: "POST",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const ve = Array.isArray(j.validationErrors) ? j.validationErrors : [];
        const extra = ve.length ? ` (${JSON.stringify(ve).slice(0, 400)})` : "";
        throw new Error((typeof j?.message === "string" ? j.message : "Erro ao publicar.") + extra);
      }
      return j as { metaFlowId: string };
    },
    onSuccess: (out) => {
      toast.success(`Publicado. flow_id: ${out.metaFlowId}`);
      void queryClient.invalidateQueries({ queryKey: ["whatsapp-flow-definition", id] });
      void queryClient.invalidateQueries({ queryKey: ["whatsapp-flow-definitions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateDraft = React.useCallback((updater: (d: FlowDefDetail) => FlowDefDetail) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const base = JSON.parse(JSON.stringify(prev)) as FlowDefDetail;
      return updater(base);
    });
  }, []);

  const activeScreen =
    draft && draft.screens.length > 0
      ? draft.screens[selectedScreenIdx] ?? draft.screens[0]
      : null;

  if (!id) {
    return <p className="text-sm text-muted-foreground">ID inválido.</p>;
  }

  if (isLoading || !draft) {
    return (
      <div className="w-full space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (draft.status !== "DRAFT") {
    return (
      <div className="w-full space-y-4">
        <Link
          href="/settings/message-models?tab=flows"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Modelos de mensagem
        </Link>
        <p className="text-sm text-muted-foreground">
          Este flow já está <strong>{draft.status}</strong> na Meta (id:{" "}
          <code className="text-xs">{draft.metaFlowId ?? "—"}</code>). Só é possível editar rascunhos no CRM.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/settings/message-models?tab=flows"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Modelos de mensagem
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saveMutation.isPending || publishMutation.isPending}
            onClick={() => saveMutation.mutate(toUpsertInput(draft))}
          >
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            <span className="ml-2">Guardar rascunho</span>
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={
              publishMutation.isPending ||
              saveMutation.isPending ||
              !draft.screens.some((s) => s.fields.length > 0)
            }
            onClick={async () => {
              try {
                await saveMutation.mutateAsync(toUpsertInput(draft));
                await publishMutation.mutateAsync();
              } catch {
                /* toasts handled by mutations */
              }
            }}
          >
            {publishMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            <span className="ml-2">Publicar na Meta</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
        <div className="space-y-2 rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Telas</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => {
                setDraft((prev) => {
                  if (!prev) return prev;
                  const next = newScreen(prev.screens.length);
                  const screens = [...prev.screens, next];
                  setSelectedScreenIdx(screens.length - 1);
                  return { ...prev, screens };
                });
              }}
            >
              <Plus className="size-4" />
            </Button>
          </div>
          <ul className="space-y-1">
            {draft.screens.map((s, idx) => (
              <li key={s.id} className="flex items-stretch gap-1">
                <button
                  type="button"
                  className={cn(
                    "min-w-0 flex-1 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    idx === selectedScreenIdx ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted",
                  )}
                  onClick={() => setSelectedScreenIdx(idx)}
                >
                  <span className="truncate">{s.title || `Tela ${idx + 1}`}</span>
                </button>
                {draft.screens.length > 1 ? (
                  <button
                    type="button"
                    className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remover tela"
                    onClick={() => {
                      const prevLen = draft.screens.length;
                      setDraft((prev) => {
                        if (!prev) return prev;
                        const screens = prev.screens.filter((_, i) => i !== idx);
                        return { ...prev, screens: screens.length ? screens : [newScreen(0)] };
                      });
                      setSelectedScreenIdx((cur) => {
                        const newLen = Math.max(1, prevLen - 1);
                        let next = cur;
                        if (idx < cur) next = cur - 1;
                        else if (idx === cur) next = Math.min(cur, newLen - 1);
                        return Math.max(0, Math.min(next, newLen - 1));
                      });
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4 rounded-lg border border-border bg-card p-4">
          <div>
            <Label>Título do flow</Label>
            <Input
              value={draft.name}
              onChange={(e) => updateDraft((d) => ({ ...d, name: e.target.value }))}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Categoria Meta</Label>
            <SelectNative
              value={draft.flowCategory || "LEAD_GENERATION"}
              onChange={(e) => updateDraft((d) => ({ ...d, flowCategory: e.target.value }))}
              className="mt-1 w-full"
            >
              <option value="LEAD_GENERATION">LEAD_GENERATION</option>
              <option value="SIGN_UP">SIGN_UP</option>
              <option value="SIGN_IN">SIGN_IN</option>
              <option value="APPOINTMENT_BOOKING">APPOINTMENT_BOOKING</option>
              <option value="CONTACT_US">CONTACT_US</option>
              <option value="CUSTOMER_SUPPORT">CUSTOMER_SUPPORT</option>
              <option value="SURVEY">SURVEY</option>
              <option value="OTHER">OTHER</option>
            </SelectNative>
          </div>
          {activeScreen ? (
            <>
              <div>
                <Label>Título da tela (CRM)</Label>
                <Input
                  value={activeScreen.title}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateDraft((d) => {
                      const screens = d.screens.map((s, i) =>
                        i === selectedScreenIdx ? { ...s, title: v } : s,
                      );
                      return { ...d, screens };
                    });
                  }}
                  className="mt-1"
                />
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Campos</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateDraft((d) => {
                      const screens = d.screens.map((s, i) => {
                        if (i !== selectedScreenIdx) return s;
                        return { ...s, fields: [...s.fields, newField(s)] };
                      });
                      return { ...d, screens };
                    });
                  }}
                >
                  <Plus className="size-3.5" /> Campo
                </Button>
              </div>
              <div className="space-y-3">
                {activeScreen.fields.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Adicione pelo menos um campo antes de publicar.</p>
                ) : (
                  activeScreen.fields.map((f, fi) => (
                    <div key={f.id} className="rounded-lg border border-border/80 bg-muted/20 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-muted-foreground">Campo {fi + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive"
                          onClick={() => {
                            updateDraft((d) => {
                              const screens = d.screens.map((s, i) => {
                                if (i !== selectedScreenIdx) return s;
                                return { ...s, fields: s.fields.filter((x) => x.id !== f.id) };
                              });
                              return { ...d, screens };
                            });
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs">Chave (slug)</Label>
                          <Input
                            value={f.fieldKey}
                            onChange={(e) => {
                              const v = e.target.value.replace(/[^a-zA-Z0-9_]/g, "_");
                              updateDraft((d) => {
                                const screens = d.screens.map((s, i) => {
                                  if (i !== selectedScreenIdx) return s;
                                  const fields = s.fields.map((x) => (x.id === f.id ? { ...x, fieldKey: v } : x));
                                  return { ...s, fields };
                                });
                                return { ...d, screens };
                              });
                            }}
                            className="mt-0.5 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Rótulo</Label>
                          <Input
                            value={f.label}
                            onChange={(e) => {
                              const v = e.target.value;
                              updateDraft((d) => {
                                const screens = d.screens.map((s, i) => {
                                  if (i !== selectedScreenIdx) return s;
                                  const fields = s.fields.map((x) => (x.id === f.id ? { ...x, label: v } : x));
                                  return { ...s, fields };
                                });
                                return { ...d, screens };
                              });
                            }}
                            className="mt-0.5 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Tipo</Label>
                          <SelectNative
                            value={f.fieldType}
                            onChange={(e) => {
                              const v = e.target.value;
                              updateDraft((d) => {
                                const screens = d.screens.map((s, i) => {
                                  if (i !== selectedScreenIdx) return s;
                                  const fields = s.fields.map((x) =>
                                    x.id === f.id ? { ...x, fieldType: v } : x,
                                  );
                                  return { ...s, fields };
                                });
                                return { ...d, screens };
                              });
                            }}
                            className="mt-0.5 w-full"
                          >
                            {FIELD_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </SelectNative>
                        </div>
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={f.required}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              updateDraft((d) => {
                                const screens = d.screens.map((s, i) => {
                                  if (i !== selectedScreenIdx) return s;
                                  const fields = s.fields.map((x) =>
                                    x.id === f.id ? { ...x, required: checked } : x,
                                  );
                                  return { ...s, fields };
                                });
                                return { ...d, screens };
                              });
                            }}
                          />
                          Obrigatório
                        </label>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : null}
        </div>

        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Pré-visualização</p>
          <div className="mx-auto max-w-[260px] rounded-[24px] border-4 border-slate-800 bg-white p-3 shadow-lg">
            <p className="text-center text-[10px] font-medium text-slate-500">WhatsApp</p>
            <div className="mt-2 max-h-[320px] space-y-2 overflow-y-auto text-xs">
              {draft.screens.map((s, si) => (
                <div key={s.id} className={cn("space-y-1", si !== selectedScreenIdx && "opacity-40")}>
                  {s.title ? <p className="font-semibold text-slate-900">{s.title}</p> : null}
                  {s.fields.map((f) => (
                    <div key={f.id} className="rounded border border-slate-200 bg-slate-50 px-2 py-1">
                      <span className="text-[10px] text-slate-500">{f.label}</span>
                      <div className="mt-0.5 h-6 rounded bg-white ring-1 ring-slate-200" />
                    </div>
                  ))}
                </div>
              ))}
              <div className="pt-2">
                <div className="rounded-full bg-emerald-600 py-1.5 text-center text-[11px] font-medium text-white">
                  Concluir
                </div>
              </div>
            </div>
          </div>
          {activeScreen && activeScreen.fields.length > 0 ? (
            <div className="space-y-2 border-t border-border pt-2">
              <p className="text-xs font-semibold text-muted-foreground">Mapeamento (CRM)</p>
              <p className="text-[10px] leading-snug text-muted-foreground">
                Escolha o destino de cada campo para automações futuras (respostas de Flow na inbox).
              </p>
              {activeScreen.fields.map((f) => (
                <div key={`map-${f.id}`} className="rounded border border-border/60 bg-card p-2">
                  <p className="mb-1 truncate text-[11px] font-medium">{f.label}</p>
                  <SelectNative
                    value={
                      f.mapping?.targetKind === "CUSTOM_FIELD" && f.mapping.customFieldId
                        ? `cf:${f.mapping.customFieldId}`
                        : f.mapping?.targetKind === "CONTACT_NATIVE" && f.mapping.nativeKey
                          ? `n:${f.mapping.nativeKey}`
                          : ""
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      updateDraft((d) => {
                        const screens = d.screens.map((s, i) => {
                          if (i !== selectedScreenIdx) return s;
                          const fields = s.fields.map((x) => {
                            if (x.id !== f.id) return x;
                            if (!v) return { ...x, mapping: null };
                            if (v.startsWith("cf:")) {
                              return {
                                ...x,
                                mapping: {
                                  targetKind: "CUSTOM_FIELD",
                                  nativeKey: null,
                                  customFieldId: v.slice(3),
                                },
                              };
                            }
                            if (v.startsWith("n:")) {
                              return {
                                ...x,
                                mapping: {
                                  targetKind: "CONTACT_NATIVE",
                                  nativeKey: v.slice(2),
                                  customFieldId: null,
                                },
                              };
                            }
                            return x;
                          });
                          return { ...s, fields };
                        });
                        return { ...d, screens };
                      });
                    }}
                    className="w-full text-xs"
                  >
                    <option value="">—</option>
                    <optgroup label="Contato (nativo)">
                      {NATIVE_KEYS.filter((o) => o.value).map((o) => (
                        <option key={o.value} value={`n:${o.value}`}>
                          {o.label}
                        </option>
                      ))}
                    </optgroup>
                    {customFields.length ? (
                      <optgroup label="Campos personalizados">
                        {customFields.map((cf) => (
                          <option key={cf.id} value={`cf:${cf.id}`}>
                            {cf.label}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                  </SelectNative>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
