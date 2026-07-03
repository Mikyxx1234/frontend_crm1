"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconLoader2, IconPlus, IconWebhook } from "@tabler/icons-react";
import { SelectNative } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const BASE = "/api";

interface ProviderConfig {
  id: string;
  providerKey: string;
  webhookUrl: string;
  authMode: string;
  isActive: boolean;
}

async function listConfigs(): Promise<ProviderConfig[]> {
  const res = await fetch(`${BASE}/call-provider-configs`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data as { configs: ProviderConfig[] }).configs ?? [];
}

async function createConfig(body: Record<string, unknown>) {
  const res = await fetch(`${BASE}/call-provider-configs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Erro");
  }
  return res.json();
}

export function ProviderConfigForm() {
  const queryClient = useQueryClient();
  const { data: configs } = useQuery({
    queryKey: ["call-provider-configs"],
    queryFn: listConfigs,
  });

  const [showForm, setShowForm] = useState(false);
  const [providerKey, setProviderKey] = useState("api4com");
  const [authMode, setAuthMode] = useState("TOKEN");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [recordingDelivery, setRecordingDelivery] = useState("URL");

  const mutation = useMutation({
    mutationFn: () =>
      createConfig({ providerKey, authMode, webhookSecret, recordingDelivery }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-provider-configs"] });
      setShowForm(false);
      setWebhookSecret("");
    },
  });

  return (
    <div className="flex flex-col gap-4">
      {configs?.map((c) => (
        <div
          key={c.id}
          className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-3"
        >
          <IconWebhook size={16} className="text-[var(--text-muted)]" />
          <div className="flex flex-1 flex-col">
            <span className="text-sm font-medium text-[var(--text-primary)]">{c.providerKey}</span>
            <span className="text-xs text-[var(--text-muted)] truncate">{c.webhookUrl}</span>
          </div>
          <span
            className={`text-xs ${c.isActive ? "text-[var(--color-success)]/80" : "text-[var(--text-muted)]"}`}
          >
            {c.isActive ? "Ativo" : "Inativo"}
          </span>
        </div>
      ))}

      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex h-9 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-dashed border-[var(--glass-border)] text-sm text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <IconPlus size={14} /> Adicionar Provedor
        </button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="flex flex-col gap-3 rounded-[var(--radius-sm)] border border-[var(--glass-border)] p-3"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--text-muted)]">Provedor</label>
            <SelectNative
              value={providerKey}
              onChange={(e) => setProviderKey(e.target.value)}
              className="h-8 text-sm"
            >
              <option value="api4com">Api4Com</option>
              <option value="generic_sip">PBX Genérico</option>
            </SelectNative>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--text-muted)]">Auth Mode</label>
            <SelectNative
              value={authMode}
              onChange={(e) => setAuthMode(e.target.value)}
              className="h-8 text-sm"
            >
              <option value="TOKEN">Token</option>
              <option value="HMAC">HMAC</option>
            </SelectNative>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--text-muted)]">Webhook Secret</label>
            <Input
              type="text"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="Token secreto para validar webhooks"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--text-muted)]">Recording Delivery</label>
            <SelectNative
              value={recordingDelivery}
              onChange={(e) => setRecordingDelivery(e.target.value)}
              className="h-8 text-sm"
            >
              <option value="URL">URL (mp3)</option>
              <option value="INLINE">Inline</option>
              <option value="FETCH_LATER">Buscar depois</option>
            </SelectNative>
          </div>

          {mutation.isError && (
            <p className="text-xs text-[var(--color-danger)]">{(mutation.error as Error)?.message}</p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!webhookSecret || mutation.isPending}
              className="flex h-8 items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--accent)] px-3 text-xs font-medium text-white disabled:opacity-50"
            >
              {mutation.isPending && <IconLoader2 size={12} className="animate-spin" />}
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="h-8 rounded-[var(--radius-sm)] px-3 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
