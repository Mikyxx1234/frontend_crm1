import { NextResponse } from "next/server";

import { auth } from "@/lib/auth-public";

const PUBLIC_PATHS = new Set(["/login", "/register", "/health"]);

/**
 * Rotas publicas obrigatorias do PWA. Sem elas o navegador nao
 * consegue:
 *  - Instalar o app (manifest.webmanifest precisa ser anonimo).
 *  - Registrar service worker (sw.js + workers do serwist precisam
 *    ser anonimos, senao o registro falha com 401/redirect).
 *  - Buscar a chave VAPID antes do login (UI mostra prompt de push
 *    so DEPOIS de instalar/logar, mas a chave em si pode ser
 *    publica — a Meta tambem distribui assim).
 *  - Renderizar icones gerados via Next.js (icon.tsx, apple-icon.tsx
 *    nao terminam em .png/.svg, escapam do regex de extensao).
 */
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

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico)$/i.test(pathname)) {
    return NextResponse.next();
  }

  // Rotas publicas do PWA — match exato + prefixos do serwist
  // (swe-worker-*.js, workbox-*.js, etc).
  if (
    PWA_PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/swe-worker-") ||
    pathname.startsWith("/workbox-")
  ) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
