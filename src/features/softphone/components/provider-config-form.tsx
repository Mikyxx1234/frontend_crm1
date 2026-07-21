"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconLoader2, IconPlus, IconWebhook } from "@tabler/icons-react";
import { DropdownGlass } from "@/components/crm/dropdown-glass";
import { InputGlass } from "@/components/crm/input-glass";
import { Label } from "@/components/ui/label";
import { ButtonGlass } from "@/components/crm/button-glass";

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

const PROVIDER_OPTIONS = [
  { value: "api4com", label: "Api4Com" },
  { value: "generic_sip", label: "PBX Genérico" },
];

const AUTH_MODE_OPTIONS = [
  { value: "TOKEN", label: "Token" },
  { value: "HMAC", label: "HMAC" },
];

const RECORDING_OPTIONS = [
  { value: "URL", label: "URL (mp3)" },
  { value: "INLINE", label: "Inline" },
  { value: "FETCH_LATER", label: "Buscar depois" },
];

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
    <div className="flex min-w-0 w-full flex-col gap-4">
      {configs?.map((c) => (
        <div
          key={c.id}
          className="flex min-w-0 items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] p-3"
        >
          <IconWebhook size={16} className="shrink-0 text-[var(--text-muted)]" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-medium text-[var(--text-primary)]">{c.providerKey}</span>
            <span className="truncate text-xs text-[var(--text-muted)]">{c.webhookUrl}</span>
          </div>
          <span
            className={`shrink-0 text-xs ${c.isActive ? "text-[var(--color-success)]/80" : "text-[var(--text-muted)]"}`}
          >
            {c.isActive ? "Ativo" : "Inativo"}
          </span>
        </div>
      ))}

      {!showForm ? (
        <ButtonGlass
          type="button"
          variant="glass"
          onClick={() => setShowForm(true)}
          className="w-full border-dashed"
        >
          <IconPlus size={14} /> Adicionar Provedor
        </ButtonGlass>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="grid gap-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg-overlay)] p-4"
        >
          <div className="grid gap-1.5">
            <Label>Provedor</Label>
            <DropdownGlass
              options={PROVIDER_OPTIONS}
              value={providerKey}
              onValueChange={setProviderKey}
              triggerClassName="w-full"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Auth Mode</Label>
            <DropdownGlass
              options={AUTH_MODE_OPTIONS}
              value={authMode}
              onValueChange={setAuthMode}
              triggerClassName="w-full"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Webhook Secret</Label>
            <InputGlass
              type="text"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="Token secreto para validar webhooks"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Recording Delivery</Label>
            <DropdownGlass
              options={RECORDING_OPTIONS}
              value={recordingDelivery}
              onValueChange={setRecordingDelivery}
              triggerClassName="w-full"
            />
          </div>

          {mutation.isError && (
            <p className="text-[11px] text-[var(--color-danger)]">{(mutation.error as Error)?.message}</p>
          )}

          <div className="flex gap-2">
            <ButtonGlass
              type="submit"
              variant="primary"
              size="sm"
              disabled={!webhookSecret || mutation.isPending}
            >
              {mutation.isPending && <IconLoader2 size={12} className="animate-spin" />}
              Salvar
            </ButtonGlass>
            <ButtonGlass
              type="button"
              variant="glass"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              Cancelar
            </ButtonGlass>
          </div>
        </form>
      )}
    </div>
  );
}
