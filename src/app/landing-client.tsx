"use client";

import { apiUrl } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import * as React from "react";
import {
  ArrowRight,
  CheckCircle2,
  KanbanSquare,
  Loader2,
  MessageCircle,
  Sparkles,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Landing publica. Hero + features + form de signup na mesma tela.
 * Ao submeter, chama POST /api/signup (cria Org + User ADMIN em
 * transacao), depois signIn(credentials) pra estabelecer a session, e
 * redireciona pro wizard /onboarding pros passos restantes.
 */
export function LandingClient() {
  return (
    <main className="min-h-dvh bg-linear-to-b from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <Header />
      <section className="relative mx-auto max-w-6xl px-6 py-12 md:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div className="flex flex-col justify-center">
            <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="size-3.5" />
              CRM multi-tenant EduIT
            </span>
            <h1 className="font-heading text-4xl font-bold leading-[1.05] tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Seu CRM, seu funil,<br />seu time — em um lugar só.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
              Cadastre sua empresa em 30 segundos e comece a centralizar
              conversas de WhatsApp, pipeline de vendas e equipe no mesmo
              dashboard.
            </p>
            <ul className="mt-8 grid gap-3 text-sm text-foreground md:grid-cols-2">
              <Feature
                icon={MessageCircle}
                label="Inbox unificado"
                desc="WhatsApp, Instagram, e-mail e webchat no mesmo lugar."
              />
              <Feature
                icon={KanbanSquare}
                label="Kanban de vendas"
                desc="Funil customizável com automações e metas."
              />
              <Feature
                icon={Users}
                label="Time colaborativo"
                desc="Convide gestores e atendentes, defina permissões."
              />
              <Feature
                icon={CheckCircle2}
                label="Zero setup"
                desc="Crie sua conta e já entra no wizard guiado."
              />
            </ul>
          </div>

          <SignupCard />
        </div>
      </section>

      <footer className="border-t border-border bg-background py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 text-center text-xs text-muted-foreground md:flex-row md:justify-between md:text-left">
          <span>© {new Date().getFullYear()} EduIT CRM. Todos os direitos reservados.</span>
          <span>
            Já tem conta?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Entrar
            </Link>
          </span>
        </div>
      </footer>
    </main>
  );
}

function Header() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
      <div className="flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-sm)]">
          <span className="text-base font-bold">E</span>
        </div>
        <span className="font-heading text-lg font-extrabold tracking-tight">
          EduIT CRM
        </span>
      </div>
      <Link
        href="/login"
        className="text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        Entrar →
      </Link>
    </header>
  );
}

function Feature({
  icon: Icon,
  label,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
}) {
  return (
    <li className="flex gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div>
        <div className="font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </li>
  );
}

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function SignupCard() {
  const router = useRouter();
  const [organizationName, setOrganizationName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [adminName, setAdminName] = React.useState("");
  const [adminEmail, setAdminEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Auto-gera slug do nome da empresa enquanto user nao editar slug.
  React.useEffect(() => {
    if (!slugTouched) setSlug(slugify(organizationName));
  }, [organizationName, slugTouched]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (organizationName.trim().length < 2) {
      setError("Informe o nome da empresa.");
      return;
    }
    if (slug.length < 2) {
      setError("Slug inválido.");
      return;
    }
    if (adminName.trim().length < 2) {
      setError("Informe seu nome.");
      return;
    }
    if (password.length < 8) {
      setError("Senha precisa ter no mínimo 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: organizationName.trim(),
          slug,
          adminName: adminName.trim(),
          adminEmail: adminEmail.trim().toLowerCase(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message ?? "Erro ao criar conta.");
      }

      const signInRes = await signIn("credentials", {
        email: adminEmail.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (!signInRes || signInRes.error) {
        // Conta criada mas signin falhou — manda pro /login pra ele entrar manual.
        router.push("/login?registered=1");
        return;
      }

      router.push("/onboarding");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
        <div className="absolute -inset-2 rounded-3xl bg-linear-to-br from-primary/20 via-primary/5 to-transparent blur-2xl" />
      <form
        onSubmit={submit}
        className="relative flex flex-col gap-4 rounded-2xl border border-border bg-background p-6 shadow-xl md:p-8"
      >
        <div>
          <h2 className="text-xl font-bold">Crie sua conta grátis</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Você vira o admin da organização. Sem cartão de crédito.
          </p>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div>
          <Label htmlFor="org-name">Nome da empresa *</Label>
          <Input
            id="org-name"
            required
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            placeholder="Acme Ltda"
            autoComplete="organization"
          />
        </div>

        <div>
          <Label htmlFor="slug">
            URL da sua conta
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              (usado em futuras URLs)
            </span>
          </Label>
          <div className="flex items-center gap-2 rounded-lg border border-input bg-transparent px-3 focus-within:ring-2 focus-within:ring-ring">
            <span className="text-xs text-muted-foreground">crm.eduit.com.br/</span>
            <input
              id="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "")
                    .slice(0, 40),
                );
              }}
              className={cn(
                "flex-1 bg-transparent py-2 text-sm outline-none",
              )}
              placeholder="acme"
              autoComplete="off"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="admin-name">Seu nome *</Label>
          <Input
            id="admin-name"
            required
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            placeholder="Marcelo Silva"
            autoComplete="name"
          />
        </div>

        <div>
          <Label htmlFor="admin-email">Email *</Label>
          <Input
            id="admin-email"
            required
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            placeholder="voce@empresa.com"
            autoComplete="email"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="password">Senha *</Label>
            <Input
              id="password"
              required
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label htmlFor="confirm">Confirmar *</Label>
            <Input
              id="confirm"
              required
              type="password"
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>

        <Button type="submit" disabled={loading} className="mt-2">
          {loading ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <ArrowRight className="ml-0 mr-2 size-4" />
          )}
          Criar empresa e continuar
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Ao criar, você concorda com os termos de uso da EduIT.
        </p>
      </form>
    </div>
  );
}
