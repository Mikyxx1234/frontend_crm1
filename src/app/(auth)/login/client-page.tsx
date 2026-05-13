"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Suspense, useState } from "react";
import { Loader as Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      if (result && !result.ok) {
        if (result.code === "database_unavailable") {
          setError(
            "Não foi possível conectar ao banco de dados. Inicie o PostgreSQL (ex.: docker compose up -d) e confira o DATABASE_URL no .env.",
          );
        } else if (result.error) {
          setError("E-mail ou senha incorretos.");
        } else {
          setError("Não foi possível entrar. Tente de novo ou verifique o servidor.");
        }
        return;
      }
      if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError(
        "Erro ao contactar o servidor. Verifique se o PostgreSQL está em execução e se NEXTAUTH_URL coincide com a porta do app (ex.: http://localhost:3001).",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border border-border/70 bg-card shadow-sm">
      <CardHeader className="space-y-4 pb-2 pt-8 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-lg bg-primary text-lg font-semibold text-primary-foreground">
          E
        </div>
        <div className="space-y-1">
          <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
            EduIT CRM
          </CardTitle>
          <CardDescription className="text-sm font-normal text-muted-foreground">
            Entre com sua conta para acessar o painel
          </CardDescription>
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 px-6 pb-2">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
              E-mail
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="voce@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="h-10 border-border/80 bg-background text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
              Senha
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="h-10 border-border/80 bg-background text-sm"
            />
          </div>
          {error ? (
            <p
              role="alert"
              className={cn(
                "rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-center text-sm text-destructive",
              )}
            >
              {error}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-4 px-6 pb-8 pt-2">
          <Button
            type="submit"
            className="h-10 w-full text-sm font-medium"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Entrando…
              </>
            ) : (
              "Entrar"
            )}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Não tem uma conta?{" "}
            <Link
              href="/register"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Criar conta
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Card className="border border-border/70 bg-card shadow-sm">
          <CardHeader className="space-y-4 pb-2 pt-8 text-center">
            <div className="mx-auto size-11 animate-pulse rounded-lg bg-muted" />
            <div className="space-y-2">
              <div className="mx-auto h-6 w-32 animate-pulse rounded bg-muted" />
              <div className="mx-auto h-4 w-48 animate-pulse rounded bg-muted" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-6">
            <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
            <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
          </CardContent>
        </Card>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
