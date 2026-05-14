import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV !== "production",
  exclude: [/\.map$/, /^manifest.*\.js$/, /\/api\//, /\/_next\/data\//],
});

function securityHeaders(): { key: string; value: string }[] {
  const headers: { key: string; value: string }[] = [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "payment=(), usb=(), geolocation=()",
    },
  ];
  const url = process.env.NEXTAUTH_URL ?? "";
  if (process.env.NODE_ENV === "production" && url.startsWith("https://")) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    });
  }
  return headers;
}

function backendBase(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim().replace(/\/$/, "");
}

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: __dirname,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  /**
   * REWRITES — Frontend separado.
   *
   * O frontend NÃO tem rotas /api/* próprias (exceto /api/health), todas
   * as chamadas /api/* são repassadas pro backend via rewrite. Isso evita
   * que código copiado do monolito quebre só por causa de URLs absolutas
   * e mantém os cookies de auth no mesmo origin do frontend.
   *
   * Lista de rewrites:
   *   - /api/auth/*          → backend (NextAuth handler, cookies same-origin)
   *   - /api/signup          → backend (signup público, sem auth)
   *   - /api/push/*          → backend (web-push: VAPID, subscribe/unsubscribe)
   *   - /api/webhooks/*      → backend (Meta, Stripe — endpoints públicos)
   *   - /api/*               → backend (CATCH-ALL: pega todo o resto)
   *   - /uploads/*           → backend (servir mídias armazenadas no backend)
   *
   * IMPORTANTE: o catch-all `/api/:path*` precisa vir POR ÚLTIMO. As regras
   * acima dele são redundantes em termos funcionais mas servem de documentação
   * explícita pros endpoints públicos / críticos. Next aplica as regras em
   * ordem, então as específicas matcham antes.
   */
  async rewrites() {
    const base = backendBase();
    if (!base) return [];
    return [
      { source: "/api/auth/:path*", destination: `${base}/api/auth/:path*` },
      { source: "/api/signup", destination: `${base}/api/signup` },
      { source: "/api/push/:path*", destination: `${base}/api/push/:path*` },
      { source: "/api/webhooks/:path*", destination: `${base}/api/webhooks/:path*` },
      { source: "/api/:path*", destination: `${base}/api/:path*` },
      { source: "/uploads/:path*", destination: `${base}/api/uploads/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders(),
      },
    ];
  },
};

export default withSerwist(nextConfig);
