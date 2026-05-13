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
  async rewrites() {
    const base = backendBase();
    if (!base) return [];
    return [
      { source: "/api/auth/:path*", destination: `${base}/api/auth/:path*` },
      { source: "/api/push/vapid-public", destination: `${base}/api/push/vapid-public` },
      { source: "/api/push/subscribe", destination: `${base}/api/push/subscribe` },
      { source: "/api/push/unsubscribe", destination: `${base}/api/push/unsubscribe` },
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
