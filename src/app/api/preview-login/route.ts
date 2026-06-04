/**
 * GET /api/preview-login?redirect=/inbox
 *
 * Emite um JWT de sessão fake para o usuário de preview.
 * Disponível APENAS em hosts *.vusercontent.net / *.v0.dev / *.v0.app
 * OU quando NEXT_PUBLIC_PREVIEW_MODE=true.
 *
 * NUNCA ative em produção — libera acesso sem credenciais reais.
 */
import { encode } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

const ALLOWED_HOSTS = [
  ".vusercontent.net",
  ".v0.dev",
  ".v0.app",
  ".v0.build",
  "localhost",
  "127.0.0.1",
];

function isPreviewHost(req: NextRequest): boolean {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  return ALLOWED_HOSTS.some((h) => host === h.replace(/^\./, "") || host.endsWith(h));
}

function isPreviewEnv(): boolean {
  return (process.env.NEXT_PUBLIC_PREVIEW_MODE ?? "").trim().toLowerCase() === "true";
}

export async function GET(req: NextRequest) {
  if (!isPreviewEnv() && !isPreviewHost(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const redirect = req.nextUrl.searchParams.get("redirect") ?? "/inbox";
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";

  // O nome do cookie e a flag `secure` precisam bater EXATAMENTE com a lógica
  // do auth.config.ts (useSecureCookies = NEXTAUTH_URL começa com https://),
  // senão o auth()/middleware leem um cookie com nome diferente do que gravamos.
  const useSecureCookies = (process.env.NEXTAUTH_URL ?? "").startsWith("https://");
  const cookieName = useSecureCookies
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
  const maxAge = 60 * 60 * 8; // 8h

  // No Auth.js v5, `salt` é obrigatório e DEVE ser o nome do cookie de sessão.
  const token = await encode({
    salt: cookieName,
    secret,
    maxAge,
    token: {
      sub: "preview-user",
      id: "preview-user",
      name: "Preview User",
      email: "preview@eduit.com.br",
      role: "ADMIN",
      organizationId: "preview-org",
      isSuperAdmin: false,
    },
  });

  const response = NextResponse.redirect(new URL(redirect, req.url));
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: useSecureCookies,
    path: "/",
    maxAge,
  });

  return response;
}
