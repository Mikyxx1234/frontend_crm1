"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { IconLoader2, IconDeviceFloppy } from "@tabler/icons-react";
import { createExtension } from "../api/extensions";
import { InputGlass } from "@/components/crm/input-glass";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { ButtonGlass } from "@/components/crm/button-glass";

/** Inputs "soft" do alvo: fundo cinza suave, sem borda, radius grande. */
const SOFT_INPUT = "rounded-[var(--radius-lg)] border-transparent bg-[var(--glass-bg-subtle)]";

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

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="flex min-w-0 w-full flex-col gap-4"
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <Label>Label (nome do ramal)</Label>
        <InputGlass
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Meu Ramal"
          className={SOFT_INPUT}
        />
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <Label>SIP URI</Label>
        <InputGlass
          value={sipUri}
          onChange={(e) => setSipUri(e.target.value)}
          placeholder="sip:1001@pbx.empresa.com"
          className={SOFT_INPUT}
        />
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label>Auth User (ramal)</Label>
          <InputGlass
            value={authUser}
            onChange={(e) => setAuthUser(e.target.value)}
            placeholder="1001"
            className={SOFT_INPUT}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label>Senha SIP</Label>
          <PasswordInput
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            placeholder="••••••"
            className={SOFT_INPUT}
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <Label>WebSocket Server</Label>
        <InputGlass
          value={wsServer}
          onChange={(e) => setWsServer(e.target.value)}
          placeholder="wss://pbx.empresa.com:6443"
          className={SOFT_INPUT}
        />
      </div>

      {mutation.isError && (
        <p className="text-xs text-[var(--color-danger)]">
          {(mutation.error as Error)?.message ?? "Erro ao salvar"}
        </p>
      )}

      {mutation.isSuccess && (
        <p className="text-xs text-[var(--color-success)]/80">Ramal salvo com sucesso!</p>
      )}

      <div className="flex justify-end">
        <ButtonGlass
          type="submit"
          variant="primary"
          disabled={
            !label || !sipUri || !authUser || !authPassword || !wsServer || mutation.isPending
          }
        >
          {mutation.isPending ? (
            <IconLoader2 size={14} className="animate-spin" />
          ) : (
            <IconDeviceFloppy size={14} />
          )}
          Salvar Ramal
        </ButtonGlass>
      </div>
    </form>
  );
}
