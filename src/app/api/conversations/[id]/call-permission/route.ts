import { NextResponse } from "next/server";

import { backendBase } from "@/lib/api-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Proxy local do POST/PATCH de call-permission.
 *
 * O rewrite `/api/:path*` do next.config bufferiza/estoura no Traefik do
 * EasyPanel quando a Meta demora — o browser recebe 502 HTML (2871 bytes)
 * e o toast não mostra a mensagem da API. Esta rota (afterFiles: arquivo
 * local ganha do rewrite) encaminha com timeout curto e sempre devolve JSON.
 */
const UPSTREAM_TIMEOUT_MS = 8_000;

async function proxy(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  let base: string;
  try {
    base = backendBase();
  } catch {
    return NextResponse.json(
      { message: "Backend não configurado (NEXT_PUBLIC_API_BASE_URL)." },
      { status: 503 },
    );
  }

  const { id } = await context.params;
  const cookie = request.headers.get("cookie") ?? "";
  const authorization = request.headers.get("authorization") ?? "";
  const contentType = request.headers.get("content-type") ?? "application/json";
  const body = await request.text().catch(() => "");

  try {
    const upstream = await fetch(
      `${base}/api/conversations/${encodeURIComponent(id)}/call-permission`,
      {
        method: request.method,
        headers: {
          "Content-Type": contentType,
          Accept: "application/json",
          ...(cookie ? { Cookie: cookie } : {}),
          ...(authorization ? { Authorization: authorization } : {}),
        },
        body: request.method === "GET" ? undefined : body,
        cache: "no-store",
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      },
    );

    const text = await upstream.text();
    const ct = upstream.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      return new NextResponse(text, {
        status: upstream.status,
        headers: { "Content-Type": "application/json" },
      });
    }
    return NextResponse.json(
      {
        message:
          text.trim().slice(0, 180) ||
          `O servidor de envio respondeu ${upstream.status} sem JSON. Tente novamente.`,
      },
      { status: upstream.status === 200 ? 502 : upstream.status },
    );
  } catch (e) {
    const timedOut =
      e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    console.error("[call-permission-proxy]", e);
    return NextResponse.json(
      {
        message: timedOut
          ? "A Meta não respondeu a tempo ao enviar o template. Tente novamente."
          : "Falha ao falar com o servidor ao enviar o template.",
      },
      { status: 504 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return proxy(request, context);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return proxy(request, context);
}
