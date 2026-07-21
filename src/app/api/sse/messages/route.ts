import { backendBase } from "@/lib/api-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Proxy SSE → backend remoto.
 *
 * Por que existe: o rewrite do Next (`/api/:path* → NEXT_PUBLIC_API_BASE_URL`)
 * bufferiza `text/event-stream` em vários setups (dev + Traefik/EasyPanel).
 * O EventSource conecta aqui (mesma origem, cookie de sessão) e nós
 * reencaminhamos o body do upstream sem buffer, com headers anti-proxy.
 */
export async function GET(request: Request) {
  let base: string;
  try {
    base = backendBase();
  } catch {
    return new Response("NEXT_PUBLIC_API_BASE_URL não configurado", {
      status: 500,
    });
  }

  const cookie = request.headers.get("cookie") ?? "";
  const authorization = request.headers.get("authorization") ?? "";

  const upstream = await fetch(`${base}/api/sse/messages`, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      ...(cookie ? { Cookie: cookie } : {}),
      ...(authorization ? { Authorization: authorization } : {}),
    },
    cache: "no-store",
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return new Response(text || "Falha ao abrir SSE no backend", {
      status: upstream.status || 502,
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
