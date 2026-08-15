"use client";

import { useEffect, useState, type FormEvent, type HTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  PBX_CODECS,
  PBX_DEFAULTS,
  PBX_STORAGE_KEY,
  PBX_TRANSPORTS,
  type PbxSettings,
  type PbxTransport,
} from "../../lib/telephony";

function loadSettings(): PbxSettings {
  if (typeof window === "undefined") return PBX_DEFAULTS;
  try {
    const raw = window.localStorage.getItem(PBX_STORAGE_KEY);
    if (!raw) return PBX_DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<PbxSettings> & {
      sipHost?: string;
      sipPort?: string;
      transport?: string;
      recordCalls?: boolean;
      maxQueue?: string;
    };
    return {
      host: parsed.host ?? parsed.sipHost ?? PBX_DEFAULTS.host,
      porta: parsed.porta ?? parsed.sipPort ?? PBX_DEFAULTS.porta,
      transporte: (parsed.transporte ??
        (parsed.transport ? String(parsed.transport).toUpperCase() : PBX_DEFAULTS.transporte)) as PbxTransport,
      codecs: parsed.codecs?.length ? parsed.codecs : PBX_DEFAULTS.codecs,
      gravacao: parsed.gravacao ?? parsed.recordCalls ?? PBX_DEFAULTS.gravacao,
      filaMax: parsed.filaMax ?? (parsed.maxQueue ? Number(parsed.maxQueue) : PBX_DEFAULTS.filaMax),
    };
  } catch {
    return PBX_DEFAULTS;
  }
}

export function TabPbx() {
  const [settings, setSettings] = useState<PbxSettings>(PBX_DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  function patch(partial: Partial<PbxSettings>) {
    setSettings((s) => ({ ...s, ...partial }));
  }

  function toggleCodec(codec: string) {
    setSettings((s) => ({
      ...s,
      codecs: s.codecs.includes(codec) ? s.codecs.filter((c) => c !== codec) : [...s.codecs, codec],
    }));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    window.localStorage.setItem(PBX_STORAGE_KEY, JSON.stringify(settings));
    window.setTimeout(() => setSaving(false), 250);
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={onSubmit}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field
          label="Host SIP"
          className="sm:col-span-2"
          value={settings.host}
          onChange={(host) => patch({ host })}
          mono
        />
        <Field
          label="Porta"
          value={settings.porta}
          onChange={(porta) => patch({ porta: porta.replace(/\D/g, "").slice(0, 5) })}
          inputMode="numeric"
          mono
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-foreground">Transporte</label>
        <div className="flex gap-2">
          {PBX_TRANSPORTS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => patch({ transporte: t })}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                t === settings.transporte
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-foreground">Codecs habilitados</label>
        <div className="flex flex-wrap gap-2">
          {PBX_CODECS.map((c) => {
            const on = settings.codecs.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCodec(c)}
                className={cn(
                  "rounded-full px-3 py-1 font-mono text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                  on ? "bg-secondary/60 text-foreground" : "bg-transparent text-muted-foreground ring-1 ring-border ring-dashed",
                )}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Gravação de chamadas</p>
          <p className="text-xs text-muted-foreground">Armazena o áudio de todas as ligações da fila.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.gravacao}
          aria-label="Gravação de chamadas"
          onClick={() => patch({ gravacao: !settings.gravacao })}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
            settings.gravacao ? "bg-primary" : "bg-muted-foreground/30",
          )}
        >
          <span
            className={cn(
              "inline-block size-5 rounded-full bg-background shadow-sm transition-transform",
              settings.gravacao ? "translate-x-[22px]" : "translate-x-0.5",
            )}
          />
        </button>
      </div>

      <Field
        label="Máximo de chamadas na fila"
        value={String(settings.filaMax)}
        onChange={(v) => patch({ filaMax: Number(v.replace(/\D/g, "").slice(0, 3) || 0) })}
        inputMode="numeric"
        mono
      />

      <div className="mt-1 flex justify-end border-t border-border pt-4">
        <Button type="submit" size="lg" className="h-10 rounded-xl px-5" disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          Salvar configuração
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  className,
  inputMode,
  mono,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  mono?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label className="text-sm font-semibold text-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        className={cn(
          "h-11 w-full rounded-xl border border-border bg-secondary/60 px-4 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
          mono && "font-mono tabular-nums",
        )}
      />
    </div>
  );
}
