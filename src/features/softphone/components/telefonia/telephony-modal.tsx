"use client";

import { useEffect, useState } from "react";
import { Phone, Cloud, Users, Server, X } from "lucide-react";

import { TabIntegracao } from "./tab-integracao";
import { TabUsuarios } from "./tab-usuarios";
import { TabPbx } from "./tab-pbx";

type TabId = "integracao" | "usuarios" | "pbx";

const TABS: { id: TabId; label: string; icon: typeof Cloud }[] = [
  { id: "integracao", label: "Integração", icon: Cloud },
  { id: "usuarios", label: "Usuários", icon: Users },
  { id: "pbx", label: "PBX", icon: Server },
];

export function TelephonyModal({ onClose }: { onClose?: () => void }) {
  const [tab, setTab] = useState<TabId>("usuarios");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="telefonia-ip-theme fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-foreground/30 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="telefonia-title"
        className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Phone className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="telefonia-title" className="text-xl font-bold tracking-tight text-foreground">
                Telefonia IP
              </h2>
              <p className="text-sm text-muted-foreground">Token, webhook e ramais da equipe</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-6">
          <div
            role="tablist"
            aria-label="Seções"
            className="inline-flex items-center gap-1 rounded-xl bg-secondary/60 p-1"
          >
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.id)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none ${
                    active ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-5 pb-6">
          {tab === "integracao" ? <TabIntegracao /> : null}
          {tab === "usuarios" ? <TabUsuarios /> : null}
          {tab === "pbx" ? <TabPbx /> : null}
        </div>
      </div>
    </div>
  );
}
