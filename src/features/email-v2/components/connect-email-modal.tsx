"use client";

import * as React from "react";
import { IconLoader2, IconMail, IconCheck } from "@tabler/icons-react";

import { ButtonGlass } from "@/components/crm/button-glass";
import { InputGlass } from "@/components/crm/input-glass";
import { Label } from "@/components/ui/label";
import { DropdownGlass } from "@/components/crm/dropdown-glass";
import { SwitchGlass } from "@/components/crm/switch-glass";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { connectEmailAccount, testEmailConnection } from "../api/accounts";
import type { ConnectEmailInput, EmailEncryption, EmailVisibility } from "../api/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (accountId: string) => void;
}

type Step = "email" | "settings";

const DEFAULT_FORM: ConnectEmailInput = {
  email: "",
  password: "",
  imapHost: "",
  imapPort: 993,
  imapEncryption: "SSL_TLS",
  smtpHost: "",
  smtpPort: 587,
  smtpEncryption: "STARTTLS",
  visibility: "SHARED",
  groupInThreads: true,
  createContactsForReplies: false,
};

export function ConnectEmailModal({ open, onOpenChange, onSuccess }: Props) {
  const [step, setStep] = React.useState<Step>("email");
  const [form, setForm] = React.useState<ConnectEmailInput>(DEFAULT_FORM);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(false);

  function resetAndClose() {
    setStep("email");
    setForm(DEFAULT_FORM);
    setErrors({});
    onOpenChange(false);
  }

  function setField<K extends keyof ConnectEmailInput>(key: K, value: ConnectEmailInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }

  function handleStep1Continue() {
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setErrors({ email: "Insira um endereço de e-mail válido." });
      return;
    }
    setErrors({});
    setStep("settings");
  }

  async function handleConnect() {
    setLoading(true);
    setErrors({});
    try {
      const result = await connectEmailAccount(form);
      if (!result.ok) {
        setErrors({ [result.field]: result.message });
        return;
      }
      onSuccess(result.account.id);
      resetAndClose();
    } catch {
      setErrors({ email: "Erro inesperado. Tente novamente." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!loading) { if (!o) resetAndClose(); else onOpenChange(true); } }}>
      <SheetContent
        side="right"
        className="flex h-full w-[min(100vw,560px)] max-w-none flex-col gap-0 rounded-none border-l p-0"
      >
        {step === "email" ? (
          <>
            <SheetHeader className="border-b border-[var(--glass-border-subtle)] px-6 py-5">
              <div className="flex items-center gap-2">
                <IconMail size={20} className="text-[var(--text-secondary)]" />
                <SheetTitle>Conecte seu endereço de e-mail</SheetTitle>
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                Conecte uma conta de e-mail para enviar, receber e vincular mensagens
                automaticamente aos seus contatos no CRM.
              </p>
            </SheetHeader>

            <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
              <div>
                <Label htmlFor="email-input">Endereço de e-mail</Label>
                <InputGlass
                  id="email-input"
                  type="email"
                  placeholder="voce@empresa.com"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  className="mt-1"
                  autoFocus
                />
                {errors.email && (
                  <p className="text-xs text-destructive mt-1">{errors.email}</p>
                )}
              </div>
            </div>

            <SheetFooter className="border-t border-[var(--glass-border-subtle)] px-6 py-4">
              <ButtonGlass variant="glass" onClick={resetAndClose}>Cancelar</ButtonGlass>
              <ButtonGlass variant="primary" onClick={handleStep1Continue}>Continuar</ButtonGlass>
            </SheetFooter>
          </>
        ) : (
          <>
            <SheetHeader className="border-b border-[var(--glass-border-subtle)] px-6 py-5">
              <SheetTitle className="text-base">{form.email}</SheetTitle>
              <p className="text-sm text-[var(--text-muted)]">
                Mensagens enviadas desse endereço serão vinculadas automaticamente
                ao contato correspondente no CRM.
              </p>
            </SheetHeader>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {/* Senha */}
              <FieldRow label="Senha do e-mail" error={errors.password}>
                <InputGlass
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  autoComplete="current-password"
                />
              </FieldRow>

              {/* IMAP */}
              <div className="grid grid-cols-[1fr_100px_140px] gap-2">
                <FieldRow label="Servidor IMAP" error={errors.imap_host}>
                  <InputGlass
                    placeholder="imap.gmail.com"
                    value={form.imapHost}
                    onChange={(e) => setField("imapHost", e.target.value)}
                  />
                </FieldRow>
                <FieldRow label="Porta" error={errors.imap_port}>
                  <InputGlass
                    type="number"
                    placeholder="993"
                    value={form.imapPort}
                    onChange={(e) => setField("imapPort", Number(e.target.value))}
                  />
                </FieldRow>
                <FieldRow label="Criptografia">
                  <DropdownGlass
                    value={form.imapEncryption}
                    onValueChange={(v) => setField("imapEncryption", v as EmailEncryption)}
                    options={[
                      { value: "SSL_TLS", label: "SSL/TLS" },
                      { value: "STARTTLS", label: "STARTTLS" },
                      { value: "NONE", label: "Nenhuma" },
                    ]}
                  />
                </FieldRow>
              </div>

              {/* SMTP */}
              <div className="grid grid-cols-[1fr_100px_140px] gap-2">
                <FieldRow label="Servidor SMTP" error={errors.smtp_host}>
                  <InputGlass
                    placeholder="smtp.gmail.com"
                    value={form.smtpHost}
                    onChange={(e) => setField("smtpHost", e.target.value)}
                  />
                </FieldRow>
                <FieldRow label="Porta" error={errors.smtp_port}>
                  <InputGlass
                    type="number"
                    placeholder="587"
                    value={form.smtpPort}
                    onChange={(e) => setField("smtpPort", Number(e.target.value))}
                  />
                </FieldRow>
                <FieldRow label="Criptografia">
                  <DropdownGlass
                    value={form.smtpEncryption}
                    onValueChange={(v) => setField("smtpEncryption", v as EmailEncryption)}
                    options={[
                      { value: "STARTTLS", label: "STARTTLS" },
                      { value: "SSL_TLS", label: "SSL/TLS" },
                      { value: "NONE", label: "Nenhuma" },
                    ]}
                  />
                </FieldRow>
              </div>

              {/* Visibilidade */}
              <FieldRow label="Visibilidade">
                <div className="flex rounded-[var(--radius-sm)] border border-[var(--glass-border)] overflow-hidden">
                  {(["SHARED", "PERSONAL"] as EmailVisibility[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setField("visibility", v)}
                      className={[
                        "flex-1 px-3 py-1.5 text-sm font-medium transition-colors",
                        form.visibility === v
                          ? "bg-[var(--brand-primary)] text-white"
                          : "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--glass-bg-subtle)]",
                      ].join(" ")}
                    >
                      {v === "SHARED" ? "Compartilhado" : "Pessoal"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {form.visibility === "SHARED"
                    ? "Visível para todos os usuários com permissão de acesso a caixas compartilhadas."
                    : "Visível apenas para você."}
                </p>
              </FieldRow>

              {/* Opções */}
              <div className="space-y-3 pt-1">
                <label className="flex items-start gap-3 cursor-pointer">
                  <SwitchGlass
                    checked={form.groupInThreads}
                    onChange={(v) => setField("groupInThreads", v)}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-[var(--text-primary)]">
                    Agrupar mensagens em threads
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <SwitchGlass
                    checked={form.createContactsForReplies}
                    onChange={(v) => setField("createContactsForReplies", v)}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-[var(--text-primary)]">
                    Criar contatos para todos os endereços de e-mail aos quais você respondeu
                  </span>
                </label>
              </div>
            </div>

            <SheetFooter className="border-t border-[var(--glass-border-subtle)] px-6 py-4">
              <ButtonGlass variant="glass" onClick={() => setStep("email")}>Voltar</ButtonGlass>
              <ButtonGlass variant="primary" onClick={handleConnect} disabled={loading}>
                {loading ? (
                  <><IconLoader2 size={14} className="animate-spin mr-1" /> Conectando…</>
                ) : (
                  <><IconCheck size={14} className="mr-1" /> Conectar</>
                )}
              </ButtonGlass>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function FieldRow({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1 block">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
