"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { IconLoader2, IconDeviceFloppy } from "@tabler/icons-react";
import { createExtension } from "../api/extensions";
import { Input } from "@/components/ui/input";

export function ExtensionSettingsForm() {
  const [label, setLabel] = useState("");
  const [sipUri, setSipUri] = useState("");
  const [authUser, setAuthUser] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [wsServer, setWsServer] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      createExtension({ label, sipUri, authUser, authPassword, wsServer }),
  });

  const fields = [
    { label: "Label (nome do ramal)", value: label, set: setLabel, placeholder: "Meu Ramal" },
    { label: "SIP URI", value: sipUri, set: setSipUri, placeholder: "sip:1001@pbx.empresa.com" },
    { label: "Auth User (ramal)", value: authUser, set: setAuthUser, placeholder: "1001" },
    { label: "Senha SIP", value: authPassword, set: setAuthPassword, placeholder: "••••••", type: "password" as const },
    { label: "WebSocket Server", value: wsServer, set: setWsServer, placeholder: "wss://pbx.empresa.com:6443" },
  ];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="flex flex-col gap-3"
    >
      {fields.map((f) => (
        <div key={f.label} className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--text-muted)]">{f.label}</label>
          <Input
            type={f.type ?? "text"}
            value={f.value}
            onChange={(e) => f.set(e.target.value)}
            placeholder={f.placeholder}
          />
        </div>
      ))}

      {mutation.isError && (
        <p className="text-xs text-[var(--color-danger)]">
          {(mutation.error as Error)?.message ?? "Erro ao salvar"}
        </p>
      )}

      {mutation.isSuccess && (
        <p className="text-xs text-emerald-400">Ramal salvo com sucesso!</p>
      )}

      <button
        type="submit"
        disabled={!label || !sipUri || !authUser || !authPassword || !wsServer || mutation.isPending}
        className="flex h-9 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--accent)] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {mutation.isPending ? (
          <IconLoader2 size={14} className="animate-spin" />
        ) : (
          <IconDeviceFloppy size={14} />
        )}
        Salvar Ramal
      </button>
    </form>
  );
}
