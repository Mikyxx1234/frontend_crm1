"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import { Check, Eye, EyeOff, Loader2, Lock, LogIn, Mail, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

function LoginShellFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#EEF2FF] via-[#F8FAFF] to-white p-6">
      <div className="w-full max-w-sm space-y-4">
        <div className="mx-auto h-20 w-48 animate-pulse rounded-2xl bg-slate-200/50" />
        <div className="h-64 w-full animate-pulse rounded-2xl border border-slate-100 bg-white/80" />
      </div>
    </div>
  );
}

function safeInternalPath(raw: string | null, fallback: string): string {
  if (!raw || typeof raw !== "string") return fallback;
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//") || t.includes("://")) return fallback;
  return t;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = safeInternalPath(searchParams.get("callbackUrl"), "/dashboard");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!loginSuccess) return;
    const id = window.setTimeout(() => {
      // Navegação completa: o cookie definido na resposta do `signIn` segue no próximo pedido HTTP.
      window.location.assign(`${window.location.origin}${callbackUrl}`);
    }, 1500);
    return () => window.clearTimeout(id);
  }, [loginSuccess, callbackUrl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (result === undefined) {
        setError(
          "Não foi possível iniciar o login. Recarregue a página ou verifique se /api/auth está acessível.",
        );
        return;
      }

      if (!result.ok) {
        if (result.code === "database_unavailable") {
          setError(
            "Não foi possível conectar ao banco de dados. Inicie o PostgreSQL (ex.: docker compose up -d) e confira o DATABASE_URL no .env.",
          );
        } else if (result.code === "account_locked") {
          setError(
            "Conta temporariamente bloqueada por várias tentativas. Aguarde alguns minutos ou peça a um admin para revisar o bloqueio.",
          );
        } else if (result.code === "mfa_required") {
          setError(
            "Esta conta exige MFA. Use o fluxo de código de autenticação (em desenvolvimento no login web).",
          );
        } else if (result.error) {
          setError("E-mail ou senha incorretos.");
        } else {
          setError(
            `Não foi possível entrar${result.code ? ` (${result.code})` : ""}. Tente de novo.`,
          );
        }
        return;
      }

      setLoginSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("URL")
          ? "Resposta inválida do servidor de autenticação. Atualize as dependências do Auth.js ou abra um issue com o log do Network em /api/auth/callback/credentials."
          : "Erro ao contactar o servidor. Verifique PostgreSQL, NEXTAUTH_URL (ex.: http://localhost:3000) e o console (F12).",
      );
    } finally {
      setLoading(false);
    }
  }

  if (loginSuccess) {
    return (
      <div
        className="fixed inset-0 z-[200] flex min-h-dvh w-screen flex-col items-center justify-center gap-4 bg-primary p-6 text-primary-foreground"
        role="status"
        aria-live="polite"
        aria-label="Login concluído, carregando o CRM"
      >
        <div className="relative">
          <div className="flex size-20 items-center justify-center rounded-full bg-primary-foreground/20">
            <div className="flex size-16 items-center justify-center rounded-full bg-primary-foreground">
              <Check className="size-8 text-primary" strokeWidth={2.5} />
            </div>
          </div>
        </div>
        <h2 className="font-display text-[22px] font-bold tracking-tight">Acesso liberado</h2>
        <p className="text-[14px] text-primary-foreground/80">Carregando o CRM…</p>
        <div className="mt-2 h-0.5 w-32 overflow-hidden rounded-full bg-primary-foreground/20">
          <div className="h-full rounded-full bg-primary-foreground/60 animate-[loading_1.5s_ease-in-out_forwards]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#EEF2FF] via-[#F8FAFF] to-white p-6">
      <div className="flex w-full max-w-sm flex-col items-center">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-200/80">
            <ShieldCheck className="size-8 text-white" strokeWidth={2} />
          </div>
          <h1 className="font-display text-[22px] font-bold tracking-tight text-slate-900">CRM EduIT</h1>
          <p className="mt-1 text-[14px] text-slate-500">Faça login para gerenciar conversas e negócios.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full rounded-2xl border border-slate-100 bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
        >
          <div className="mb-4">
            <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-slate-700">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-11 w-full rounded-full border border-slate-200 bg-white pl-9 pr-4 text-[14px] text-slate-800 placeholder:text-slate-400 transition-all focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
              />
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium text-slate-700">
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="h-11 w-full rounded-full border border-slate-200 bg-white pl-9 pr-11 text-[14px] text-slate-800 placeholder:text-slate-400 transition-all focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {error ? (
            <p
              role="alert"
              className={cn(
                "mb-4 rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2 text-center text-sm text-destructive",
              )}
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-blue-600 text-[14px] font-semibold text-white shadow-md shadow-blue-200/80 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Entrando…
              </>
            ) : (
              <>
                <LogIn className="size-4" />
                Entrar
              </>
            )}
          </button>

          <p className="mt-4 text-center text-[13px] text-slate-500">
            Não tem uma conta?{" "}
            <Link href="/register" className="font-medium text-blue-600 underline-offset-4 hover:underline">
              Criar conta
            </Link>
          </p>
        </form>

        <p className="mt-6 text-center text-[12px] text-slate-400">Acesso restrito · CRM EduIT</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShellFallback />}>
      <LoginForm />
    </Suspense>
  );
}
