"use client";

import { useEffect, useState } from "react";
import { IconLoader2 } from "@tabler/icons-react";

import { ButtonGlass } from "@/components/crm/button-glass";
import { InputGlass } from "@/components/crm/input-glass";
import { SwitchGlass } from "@/components/crm/switch-glass";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Transport = "udp" | "tcp" | "tls";

type PbxSettings = {
  sipHost: string;
  sipPort: string;
  transport: Transport;
  codecs: string[];
  recordCalls: boolean;
  maxQueue: string;
};

const STORAGE_KEY = "crm:pbx-settings";

const DEFAULTS: PbxSettings = {
  sipHost: "sip.api4com.com",
  sipPort: "5060",
  transport: "udp",
  codecs: ["g711", "g729", "opus"],
  recordCalls: true,
  maxQueue: "8",
};

const CODECS = [
  { id: "g711", label: "G.711 μ-law" },
  { id: "g729", label: "G.729" },
  { id: "opus", label: "OPUS" },
] as const;

const TRANSPORTS: { id: Transport; label: string }[] = [
  { id: "udp", label: "UDP" },
  { id: "tcp", label: "TCP" },
  { id: "tls", label: "TLS" },
];

function loadSettings(): PbxSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<PbxSettings>) };
  } catch {
    return DEFAULTS;
  }
}

export function PbxSettingsForm() {
  const [settings, setSettings] = useState<PbxSettings>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  function patch(partial: Partial<PbxSettings>) {
    setSettings((s) => ({ ...s, ...partial }));
    setSaved(false);
  }

  function toggleCodec(id: string) {
    setSettings((s) => ({
      ...s,
      codecs: s.codecs.includes(id) ? s.codecs.filter((c) => c !== id) : [...s.codecs, id],
    }));
    setSaved(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.setTimeout(() => {
      setSaving(false);
      setSaved(true);
    }, 250);
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit}>
      <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
        <div className="grid gap-1.5">
          <Label className="text-[13px] font-semibold">Host SIP</Label>
          <InputGlass
            value={settings.sipHost}
            onChange={(e) => patch({ sipHost: e.target.value })}
            placeholder="sip.api4com.com"
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-[13px] font-semibold">Porta</Label>
          <InputGlass
            value={settings.sipPort}
            onChange={(e) => patch({ sipPort: e.target.value.replace(/\D/g, "").slice(0, 5) })}
            inputMode="numeric"
            placeholder="5060"
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label className="text-[13px] font-semibold">Transporte</Label>
        <div className="flex flex-wrap gap-2">
          {TRANSPORTS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => patch({ transport: t.id })}
              className={cn(
                "rounded-lg px-3.5 py-1.5 font-display text-[12px] font-semibold transition-colors",
                settings.transport === t.id
                  ? "bg-[var(--brand-primary)] text-white"
                  : "bg-[var(--glass-bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label className="text-[13px] font-semibold">Codecs habilitados</Label>
        <div className="flex flex-wrap gap-2">
          {CODECS.map((c) => {
            const on = settings.codecs.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCodec(c.id)}
                className={cn(
                  "rounded-full px-3 py-1 font-body text-[12px] transition-colors",
                  on
                    ? "bg-[var(--glass-bg-subtle)] font-medium text-[var(--text-primary)] ring-1 ring-[var(--glass-border)]"
                    : "bg-transparent text-[var(--text-muted)] ring-1 ring-dashed ring-[var(--glass-border)]",
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-4 py-3.5">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[var(--text-primary)]">Gravação de chamadas</p>
          <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
            Armazena o áudio de todas as ligações da fila
          </p>
        </div>
        <SwitchGlass
          checked={settings.recordCalls}
          onChange={(v) => patch({ recordCalls: v })}
          aria-label="Gravação de chamadas"
        />
      </div>

      <div className="grid gap-1.5">
        <Label className="text-[13px] font-semibold">Máximo de chamadas na fila</Label>
        <InputGlass
          value={settings.maxQueue}
          onChange={(e) => patch({ maxQueue: e.target.value.replace(/\D/g, "").slice(0, 3) })}
          inputMode="numeric"
          placeholder="8"
        />
      </div>

      <div className="flex items-center justify-end border-t border-[var(--glass-border-subtle)] pt-4">
        {saved ? (
          <span className="me-auto text-[12px] text-emerald-600">Configuração salva</span>
        ) : null}
        <ButtonGlass type="submit" variant="primary" size="sm" disabled={saving}>
          {saving && <IconLoader2 size={12} className="animate-spin" />}
          Salvar configuração
        </ButtonGlass>
      </div>
    </form>
  );
}
