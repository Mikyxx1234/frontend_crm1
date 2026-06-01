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
   * O frontend NÃO tem rotas /api/* próprias (exceto /api/preview-login),
   * todas as chamadas /api/* são repassadas pro backend via rewrite. Isso
   * evita que código copiado do monolito quebre só por causa de URLs
   * absolutas e mantém os cookies de auth no mesmo origin do frontend.
   *
   * Usamos `afterFiles` para que o Next.js verifique o filesystem local
   * ANTES de aplicar o rewrite. Assim /api/preview-login (rota Next.js
   * local do frontend) é servida localmente, e tudo mais é proxiado para
   * o backend sem precisar de regex de exclusão.
   *
   * Lista de rewrites (afterFiles):
   *   - /api/:path*          → backend (CATCH-ALL via parâmetro nomeado)
   *   - /uploads/:path*      → backend (servir mídias armazenadas no backend)
   */
  async rewrites() {
    const base = backendBase();
    if (!base) return [];
    return {
      beforeFiles: [],
      afterFiles: [
        { source: "/api/:path*", destination: `${base}/api/:path*` },
        { source: "/uploads/:path*", destination: `${base}/api/uploads/:path*` },
      ],
      fallback: [],
    };
  },
  /**
   * REDIRECTS — Migração v2 → raiz.
   *
   * Após a migração de rotas, as URLs do segmento `/v2/*` deixaram de
   * existir (a v2 virou a raiz). Mantemos redirects permanentes pra
   * preservar links externos, atalhos do PWA, bookmarks e qualquer
   * referência hardcoded que ainda exista em automações Kommo ou IA.
   */
  async redirects() {
    return [
      { source: "/v2", destination: "/dashboard", permanent: true },
      { source: "/v2/:path*", destination: "/:path*", permanent: true },
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
