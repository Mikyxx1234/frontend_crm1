import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Middleware do FRONTEND separado.
 *
 * Diferente do monólito, aqui NÃO temos rotas /api locais (exceto /api/health
 * super-leve). Tudo de /api/* é repassado via `rewrites()` no next.config.ts
 * pro backend. Por isso este middleware é enxuto:
 *
 *  - Lê o JWT do cookie direto (Edge-friendly, sem `NextAuth(authConfig)`).
 *  - Aplica headers de segurança em todas as respostas.
 *  - Redireciona pra /login se a sessão estiver vazia em rotas privadas.
 *  - Bloqueia /admin pra quem não é super-admin (esse flag fica no JWT).
 *
 * Por que `getToken` em vez de `auth(...)` do NextAuth?
 *  - O wrapper `NextAuth(config)` no Edge usa `NEXTAUTH_URL` fixo pra
 *    construir a action URL e validar o cookie. Em ambientes onde a barra
 *    de endereço difere de NEXTAUTH_URL (ex.: porta/host alternativos no
 *    Easypanel, healthchecks de proxy), o cookie é tratado como ausente
 *    e o user é mandado pra /login mesmo logado.
 *  - `getToken({ req, secret, secureCookie })` lê o cookie usando o
 *    secret e a flag, sem chamar a URL — funciona consistentemente.
 */

function secureCookieFromEnv(): boolean {
  return (process.env.NEXTAUTH_URL ?? "").startsWith("https://");
}

const AUTH_SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

async function readAuthFromRequestCookie(
  req: NextRequest,
): Promise<{ user?: { id: string; isSuperAdmin?: boolean } } | null> {
  if (!AUTH_SECRET) return null;
  try {
    const token = await getToken({
      req,
      secret: AUTH_SECRET,
      secureCookie: secureCookieFromEnv(),
    });
    if (!token || typeof token !== "object") return null;
    const rec = token as Record<string, unknown>;
    const id =
      typeof rec.id === "string" ? rec.id : typeof rec.sub === "string" ? rec.sub : null;
    if (!id) return null;
    return {
      user: {
        id,
        isSuperAdmin: Boolean(rec.isSuperAdmin),
      },
    };
  } catch {
    return null;
  }
}

function withSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload",
  );
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-DNS-Prefetch-Control", "on");
  return res;
}

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/health",
  "/accept-invite",
]);

const PUBLIC_API_PATHS = new Set(["/api/signup"]);

const PWA_PUBLIC_PATHS = new Set([
  "/manifest.webmanifest",
  "/sw.js",
  "/sw.js.map",
  "/icon",
  "/icon0",
  "/icon1",
  "/icon2",
  "/icon.svg",
  "/icon-maskable.svg",
  "/apple-icon",
  "/api/push/vapid-public",
]);

export async function middleware(req: NextRequest) {
  try {
    const { pathname } = req.nextUrl;

    // Rotas de auth + assets do Next + webhooks + uploads não passam por auth.
    // O rewrite pro backend acontece em next.config.ts.
    if (
      pathname.startsWith("/api/auth") ||
      pathname.startsWith("/api/webhooks") ||
      pathname.startsWith("/api/health") ||
      pathname.startsWith("/api/cron") ||
      pathname.startsWith("/uploads/") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon.ico")
    ) {
      return withSecurityHeaders(NextResponse.next());
    }

    if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/i.test(pathname)) {
      return withSecurityHeaders(NextResponse.next());
    }

    if (
      PWA_PUBLIC_PATHS.has(pathname) ||
      pathname.startsWith("/swe-worker-") ||
      pathname.startsWith("/workbox-")
    ) {
      return withSecurityHeaders(NextResponse.next());
    }

    if (PUBLIC_PATHS.has(pathname) || PUBLIC_API_PATHS.has(pathname)) {
      return withSecurityHeaders(NextResponse.next());
    }

    const reqAuth = await readAuthFromRequestCookie(req);

    // Para /api/* (rotas que vão pro backend), permite Bearer token mesmo sem sessão.
    if (
      !reqAuth &&
      pathname.startsWith("/api/") &&
      !pathname.startsWith("/api/sse")
    ) {
      const authHeader = req.headers.get("authorization") ?? "";
      if (/^Bearer\s+.+/i.test(authHeader)) {
        return withSecurityHeaders(NextResponse.next());
      }
    }

    if (!reqAuth) {
      const loginUrl = new URL("/login", req.nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return withSecurityHeaders(NextResponse.redirect(loginUrl));
    }

    const isSuperAdmin = Boolean(reqAuth.user?.isSuperAdmin);

    if (
      (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) &&
      !isSuperAdmin
    ) {
      if (pathname.startsWith("/api/admin")) {
        return withSecurityHeaders(
          NextResponse.json(
            { message: "Acesso restrito a administradores da plataforma." },
            { status: 403 },
          ),
        );
      }
      return withSecurityHeaders(
        NextResponse.redirect(new URL("/", req.nextUrl.origin)),
      );
    }

    return withSecurityHeaders(NextResponse.next());
  } catch {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return withSecurityHeaders(NextResponse.redirect(loginUrl));
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
