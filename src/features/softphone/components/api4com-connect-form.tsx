"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { IconBrandTelegram, IconLoader2 } from "@tabler/icons-react";
import { connectApi4Com } from "../api/extensions";

export function Api4ComConnectForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: () => connectApi4Com(email, password),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (email && password) mutation.mutate();
      }}
      className="flex flex-col gap-3"
    >
      <p className="font-body text-[13px] text-[var(--text-muted)]">
        Informe suas credenciais Api4Com. O CRM detectará automaticamente o ramal vinculado ao seu e-mail.
      </p>

      <input
        type="email"
        placeholder="E-mail Api4Com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-9 rounded-[var(--radius-sm)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
      />

      <input
        type="password"
        placeholder="Senha Api4Com"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="h-9 rounded-[var(--radius-sm)] border border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
      />

      {mutation.isError && (
        <p className="text-xs text-red-400">
          {(mutation.error as Error)?.message ?? "Falha ao conectar"}
        </p>
      )}

      {mutation.isSuccess && (
        <p className="text-xs text-emerald-400">
          Conectado! Ramal: {mutation.data.api4com.ramal} ({mutation.data.api4com.domain})
        </p>
      )}

      <button
        type="submit"
        disabled={!email || !password || mutation.isPending}
        className="flex h-9 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--accent)] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {mutation.isPending ? (
          <IconLoader2 size={14} className="animate-spin" />
        ) : (
          <IconBrandTelegram size={14} />
        )}
        Conectar Api4Com
      </button>
    </form>
  );
}
