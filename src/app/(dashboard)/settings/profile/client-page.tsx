"use client";

import { apiUrl } from "@/lib/api";
/**
 * Perfil do usuário logado.
 *
 * Layout inspirado na referência "Umbler Conta" (duas colunas num
 * fundo claro, cards brancos em `rounded-[28px]` com `shadow-premium`)
 * adaptado ao **EduIT Premium Core**:
 *
 *  - ESQUERDA "Dados do seu perfil": avatar editável (upload), nome,
 *    assinatura, telefone, toggle de mensagem de finalização + textarea.
 *  - DIREITA "Tokens de Acesso": lista/empty state + dialog de criação
 *    com exposição one-time da chave gerada.
 *
 * O upload de avatar faz POST em `/api/profile/avatar` e apenas atualiza
 * o estado local com a URL retornada — a persistência efetiva em
 * `User.avatarUrl` só acontece ao clicar em "Salvar" (evita deixar o
 * registro em estado inconsistente caso o operador cancele o fluxo).
 */

import * as React from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  AlertTriangle,
  Camera,
  Check,
  Copy,
  Info,
  Key,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  UserCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Switch } from "@/components/ui/switch";
import { TooltipHost } from "@/components/ui/tooltip";
import { useConfirm } from "@/hooks/use-confirm";
import { cn } from "@/lib/utils";
import { AvatarCropDialog } from "@/components/profile/avatar-crop-dialog";

type Profile = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  phone: string | null;
  signature: string | null;
  closingMessage: string | null;
};

type ApiToken = {
  id: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export default function ProfilePage() {
  const { update } = useSession();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/profile"));
      const text = await r.text();
      let json: unknown;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(`Resposta inválida (${r.status}): ${text.slice(0, 120)}`);
      }
      if (!r.ok) {
        const msg =
          json && typeof json === "object" && "message" in json && typeof (json as { message?: unknown }).message === "string"
            ? (json as { message: string }).message
            : `Erro ao carregar perfil (HTTP ${r.status}).`;
        throw new Error(msg);
      }
      return json as Profile;
    },
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-16">
        <Loader2 className="size-8 animate-spin text-slate-400" aria-hidden />
      </div>
    );
  }

  if (isError || !profile) {
    const msg =
      error instanceof Error ? error.message : "Não foi possível carregar o perfil.";
    return (
      <div className="mx-auto mt-10 w-full max-w-xl rounded-[28px] border border-red-100 bg-red-50/50 p-8 text-center shadow-premium">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle className="size-6" />
        </div>
        <h2 className="mt-4 font-outfit text-lg font-black text-slate-900">
          Não foi possível carregar seu perfil
        </h2>
        <p className="mt-2 text-sm text-slate-600">{msg}</p>
        <p className="mt-1 text-[11px] text-slate-400">
          Se o erro mencionar coluna inexistente, a migration{" "}
          <code className="rounded bg-white px-1.5 py-0.5">add_user_profile_fields</code>{" "}
          ainda não foi aplicada no servidor.
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-full bg-[#507df1] px-5 text-sm font-semibold text-white shadow-blue-glow transition-colors hover:bg-[#4466d6] disabled:opacity-60"
        >
          {isFetching ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Perfil"
        description="Aqui você consegue gerenciar seus dados pessoais e executar configurações básicas do app."
        icon={<UserCircle2 />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileCard profile={profile} queryClient={queryClient} update={update} />
        <TokensCard />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   CARD ESQUERDO — Dados do seu perfil
   ──────────────────────────────────────────────────────────── */

function ProfileCard({
  profile,
  queryClient,
  update,
}: {
  profile: Profile;
  queryClient: ReturnType<typeof useQueryClient>;
  update: ReturnType<typeof useSession>["update"];
}) {
  const [name, setName] = React.useState(profile.name);
  const [signature, setSignature] = React.useState(profile.signature ?? "");
  const [phone, setPhone] = React.useState(profile.phone ?? "");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(profile.avatarUrl);
  const [closingEnabled, setClosingEnabled] = React.useState(
    Boolean(profile.closingMessage),
  );
  const [closingMessage, setClosingMessage] = React.useState(profile.closingMessage ?? "");

  // Sincroniza quando a query de perfil se atualiza (ex.: depois de salvar)
  React.useEffect(() => {
    setName(profile.name);
    setSignature(profile.signature ?? "");
    setPhone(profile.phone ?? "");
    setAvatarUrl(profile.avatarUrl);
    setClosingEnabled(Boolean(profile.closingMessage));
    setClosingMessage(profile.closingMessage ?? "");
  }, [profile]);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = React.useState(false);

  // Arquivo aguardando crop. Quando o operador seleciona uma imagem,
  // ela vai pra esse estado em vez de subir direto — o
  // <AvatarCropDialog> abre automaticamente quando esse estado é
  // não-nulo, e só faz o upload depois que o operador enquadrou.
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const r = await fetch(apiUrl("/api/profile/avatar"), {
        method: "POST",
        body: formData,
      });
      const j = (await r.json().catch(() => ({}))) as {
        url?: string;
        message?: string;
      };
      if (!r.ok || !j.url) {
        throw new Error(j.message ?? "Erro ao enviar imagem.");
      }
      setAvatarUrl(j.url);
      setPendingFile(null);
      toast.success("Foto atualizada — clique em Salvar para aplicar.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        name: name.trim(),
        avatarUrl: avatarUrl ?? "",
        phone: phone.trim(),
        signature: signature.trim(),
        closingMessage: closingEnabled ? closingMessage.trim() : "",
      };
      const r = await fetch(apiUrl("/api/profile"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(
          typeof (j as { message?: string }).message === "string"
            ? (j as { message: string }).message
            : "Erro ao salvar",
        );
      }
      return j as Profile;
    },
    onSuccess: async (data) => {
      toast.success("Perfil atualizado");
      queryClient.setQueryData(["profile"], data);
      await update({ name: data.name });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-8 shadow-premium">
      <h2 className="font-outfit text-lg font-black text-slate-900">
        Dados do seu perfil
      </h2>

      {/* ── Avatar + banner ── */}
      <div className="mt-6 flex items-start gap-5">
        {/*
          Avatar editável: clique no botão de camera dispara o <input type="file">
          escondido. Preview imediato via `avatarUrl` local — persistência
          real só ao clicar em "Salvar" abaixo (evita registro inconsistente).
        */}
        <div className="relative shrink-0">
          <div className="flex size-[96px] items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-[#fbcfe8] to-[#f9a8d4] ring-4 ring-white shadow-float">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={name}
                className="size-full object-cover"
              />
            ) : (
              <span className="font-outfit text-2xl font-black text-white drop-shadow">
                {getInitials(name)}
              </span>
            )}
          </div>
          <TooltipHost
            label="Alterar foto"
            side="right"
            className="absolute -bottom-1 -right-1"
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={cn(
                "inline-flex size-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition-colors hover:bg-slate-50 hover:text-slate-900",
                uploading && "cursor-wait opacity-80",
              )}
              aria-label="Alterar foto de perfil"
            >
              {uploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Camera className="size-3.5" />
              )}
            </button>
          </TooltipHost>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              // Em vez de subir direto, joga pro <AvatarCropDialog>
              // pro operador escolher o enquadramento. O upload
              // efetivo acontece em `onApply` lá embaixo.
              if (f) setPendingFile(f);
              e.target.value = "";
            }}
          />
        </div>

        <div className="min-w-0 flex-1 text-right">
          <p className="truncate font-outfit text-sm font-black text-slate-900">
            {name || profile.name}
          </p>
          <p className="text-xs text-slate-500">Português (Brasil)</p>
          <p className="mt-1.5 text-[11px] leading-snug text-slate-400">
            Gerencie seus dados de acesso, idioma e assinatura pessoal do agente.
          </p>
        </div>
      </div>

      {/* ── Formulário ── */}
      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
      >
        <Field id="name" label="Nome" required>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            className="h-11 rounded-xl border-slate-200 bg-white text-sm focus-visible:ring-[#507df1]/30"
          />
        </Field>

        <Field
          id="signature"
          label="Assinatura"
          hint="Aparece no final das suas mensagens. Vazio = usa seu nome."
        >
          <Input
            id="signature"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Ex.: Marcelo · EduIT"
            className="h-11 rounded-xl border-slate-200 bg-white text-sm focus-visible:ring-[#507df1]/30"
          />
        </Field>

        <Field id="phone" label="Telefone">
          <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:ring-2 focus-within:ring-[#507df1]/30">
            <span
              className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600"
              aria-hidden
            >
              <span className="text-sm leading-none">🇧🇷</span>
            </span>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 96123-4567"
              autoComplete="tel"
              className="h-full flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            />
          </div>
        </Field>

        {/* ── Toggle de mensagem de finalização ── */}
        <div className="space-y-3 rounded-2xl">
          <div className="flex items-center gap-3">
            <Switch
              id="closing-toggle"
              checked={closingEnabled}
              onCheckedChange={setClosingEnabled}
              aria-label="Mensagem de finalização de conversa"
            />
            <Label
              htmlFor="closing-toggle"
              className="cursor-pointer text-sm font-medium text-slate-700"
            >
              Mensagem de finalização de conversa
            </Label>
          </div>

          {closingEnabled && (
            <>
              <div className="flex items-start gap-2 rounded-xl bg-[#eef2ff] px-3 py-2.5 text-[12px] leading-snug text-[#3730a3]">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  Se definida, tem precedência sobre a mensagem de finalização
                  configurada na organização.
                </span>
              </div>

              <Field
                id="closing-message"
                label="Sua mensagem de encerramento"
              >
                <textarea
                  id="closing-message"
                  value={closingMessage}
                  onChange={(e) => setClosingMessage(e.target.value)}
                  placeholder="Sua mensagem de encerramento"
                  rows={4}
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#507df1]/30"
                />
              </Field>
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={saveMutation.isPending}
          className={cn(
            "mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#507df1] text-sm font-semibold text-white shadow-blue-glow transition-colors duration-150 hover:bg-[#4466d6] disabled:opacity-60",
          )}
        >
          {saveMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          Salvar
        </button>
      </form>

      {/*
        Modal de enquadramento — abre automaticamente quando uma
        imagem é selecionada (`pendingFile != null`). O upload real
        só acontece em `onApply`, recebendo o JPEG já recortado.
      */}
      <AvatarCropDialog
        file={pendingFile}
        isApplying={uploading}
        onCancel={() => setPendingFile(null)}
        onApply={(cropped) => uploadAvatar(cropped)}
      />
    </section>
  );
}

function Field({
  id,
  label,
  hint,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wider text-slate-500"
      >
        {label}
        {required ? <span className="ml-0.5 text-[#507df1]">*</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   CARD DIREITO — Tokens de Acesso
   ──────────────────────────────────────────────────────────── */

function TokensCard() {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [newTokenName, setNewTokenName] = React.useState("");
  const [newTokenExpires, setNewTokenExpires] = React.useState("");
  const [justCreated, setJustCreated] = React.useState<{
    token: string;
    prefix: string;
  } | null>(null);

  const { data: tokens = [], isLoading } = useQuery({
    queryKey: ["api-tokens"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/settings/api-tokens"));
      if (!r.ok) throw new Error("Erro ao carregar tokens");
      return r.json() as Promise<ApiToken[]>;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(apiUrl("/api/settings/api-tokens"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTokenName.trim(),
          expiresAt: newTokenExpires || undefined,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        id?: string;
        token?: string;
        prefix?: string;
        message?: string;
      };
      if (!r.ok || !j.token || !j.prefix) {
        throw new Error(j.message ?? "Erro ao criar token");
      }
      return { token: j.token, prefix: j.prefix };
    },
    onSuccess: (data) => {
      setJustCreated(data);
      setNewTokenName("");
      setNewTokenExpires("");
      queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(apiUrl(`/api/settings/api-tokens/${id}`), {
        method: "DELETE",
      });
      if (!r.ok) throw new Error("Erro ao revogar token");
      return r.json();
    },
    onSuccess: () => {
      toast.success("Token revogado");
      queryClient.invalidateQueries({ queryKey: ["api-tokens"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleRevoke = async (token: ApiToken) => {
    const ok = await confirm({
      title: "Revogar token",
      description: `Remover "${token.name}"? Aplicações usando este token perderão acesso imediatamente.`,
      confirmLabel: "Revogar",
      variant: "destructive",
    });
    if (ok) revokeMutation.mutate(token.id);
  };

  const copyToken = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Token copiado");
    } catch {
      toast.error("Copie manualmente — navegador bloqueou o clipboard.");
    }
  };

  const hasTokens = tokens.length > 0;

  return (
    <section className="rounded-[28px] border border-slate-100 bg-white p-8 shadow-premium">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-outfit text-lg font-black text-slate-900">
            Tokens de Acesso
          </h2>
          <p className="mt-1 max-w-md text-sm leading-snug text-slate-500">
            Token é uma chave temporária usada para conectar apps ou APIs com
            segurança, sem precisar de senha.
          </p>
        </div>
        {hasTokens && (
          <button
            type="button"
            onClick={() => {
              setJustCreated(null);
              setCreateOpen(true);
            }}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#507df1] px-4 text-xs font-semibold text-white shadow-blue-glow transition-colors hover:bg-[#4466d6]"
          >
            <Plus className="size-3.5" />
            Novo token
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-14">
          <Loader2 className="size-6 animate-spin text-slate-400" />
        </div>
      ) : hasTokens ? (
        <ul className="mt-6 space-y-2">
          {tokens.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/40 px-4 py-3"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eef2ff] text-[#507df1]">
                <Key className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {t.name}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                  {t.tokenPrefix}… ·{" "}
                  {t.expiresAt
                    ? `expira em ${new Date(t.expiresAt).toLocaleDateString()}`
                    : "sem expiração"}
                </p>
              </div>
              <TooltipHost label="Revogar" side="left">
                <button
                  type="button"
                  onClick={() => handleRevoke(t)}
                  disabled={revokeMutation.isPending}
                  className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  aria-label={`Revogar token ${t.name}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </TooltipHost>
            </li>
          ))}
        </ul>
      ) : (
        <TokensEmptyState onCreate={() => setCreateOpen(true)} />
      )}

      {/* ── Dialog de criação ── */}
      <Dialog
        open={createOpen}
        onOpenChange={(v) => {
          setCreateOpen(v);
          if (!v) {
            setJustCreated(null);
            setNewTokenName("");
            setNewTokenExpires("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          {justCreated ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-outfit">Token criado</DialogTitle>
                <DialogDescription>
                  Copie agora — por segurança esta chave não será exibida novamente.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <code className="flex-1 truncate font-mono text-xs text-slate-800">
                    {justCreated.token}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyToken(justCreated.token)}
                    className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-900"
                    aria-label="Copiar token"
                  >
                    <Copy className="size-4" />
                  </button>
                </div>
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[12px] leading-snug text-amber-800">
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    Guarde em um gerenciador de segredos. Ao fechar esta janela
                    o token não ficará mais acessível na íntegra — apenas o
                    prefixo (<code>{justCreated.prefix}…</code>) aparecerá na lista.
                  </span>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setCreateOpen(false)}>Concluído</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="font-outfit">Novo token</DialogTitle>
                <DialogDescription>
                  Dê um nome descritivo para identificar a integração que usará este token.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newTokenName.trim()) return;
                  createMutation.mutate();
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="token-name" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Nome
                  </Label>
                  <Input
                    id="token-name"
                    value={newTokenName}
                    onChange={(e) => setNewTokenName(e.target.value)}
                    placeholder="Ex.: Integração N8N"
                    required
                    autoFocus
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="token-expires" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Expira em (opcional)
                  </Label>
                  <Input
                    id="token-expires"
                    type="date"
                    value={newTokenExpires}
                    onChange={(e) => setNewTokenExpires(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || !newTokenName.trim()}>
                    {createMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    Gerar token
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function TokensEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="mt-4 flex flex-col items-center justify-center gap-4 py-10 text-center">
      <div className="relative">
        {/*
          Ilustração minimalista: dois cards sobrepostos + sparkles. Evita
          importar SVG externo, usando apenas Tailwind + ícones lucide.
        */}
        <div className="absolute -left-3 -top-2 size-14 -rotate-12 rounded-xl border border-slate-200 bg-white shadow-sm" />
        <div className="absolute -right-3 -top-1 size-14 rotate-12 rounded-xl border border-slate-200 bg-white shadow-sm" />
        <div className="relative flex size-16 items-center justify-center rounded-2xl bg-[#eef2ff]">
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex size-11 items-center justify-center rounded-full bg-[#507df1] text-white shadow-blue-glow transition-transform hover:scale-105"
            aria-label="Criar primeiro token"
          >
            <Plus className="size-5" />
          </button>
        </div>
        <Sparkles
          className="absolute -right-6 top-0 size-3 text-slate-300"
          aria-hidden
        />
        <Sparkles
          className="absolute -left-5 bottom-0 size-4 text-slate-300"
          aria-hidden
        />
      </div>
      <p className="font-outfit text-sm font-black text-slate-700">
        Crie seu primeiro token!
      </p>
    </div>
  );
}

