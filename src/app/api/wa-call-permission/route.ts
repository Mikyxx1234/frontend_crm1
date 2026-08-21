import { NextResponse } from "next/server";

import { backendBase } from "@/lib/api-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Path ESTÁTICO de propósito. O rewrite `afterFiles` `/api/:path*` do
 * next.config roda ANTES de rotas dinâmicas (`[id]`), então o proxy em
 * `/api/conversations/[id]/call-permission` nunca era atingido — o POST
 * ia pro backend via rewrite, o Traefik cortava e o browser via 502 HTML.
 * Mesmo padrão do SSE (`/api/sse/messages`).
 */
const UPSTREAM_TIMEOUT_MS = 5_000;

export async function POST(request: Request) {
  let base: string;
  try {
    base = backendBase();
  } catch {
    return NextResponse.json(
      { message: "Backend não configurado (NEXT_PUBLIC_API_BASE_URL)." },
      { status: 503 },
    );
  }

  const cookie = request.headers.get("cookie") ?? "";
  const authorization = request.headers.get("authorization") ?? "";
  const contentType = request.headers.get("content-type") ?? "application/json";
  const body = await request.text().catch(() => "");

  let conversationId = "";
  try {
    const parsed = JSON.parse(body) as { conversationId?: unknown };
    conversationId =
      typeof parsed.conversationId === "string" ? parsed.conversationId.trim() : "";
  } catch {
    /* body inválido — o backend responde 400 */
  }
  if (!conversationId) {
    return NextResponse.json(
      { message: "Informe conversationId no corpo." },
      { status: 400 },
    );
  }

  try {
    const upstream = await Promise.race([
      fetch(
        `${base}/api/conversations/${encodeURIComponent(conversationId)}/call-permission`,
        {
          method: "POST",
          headers: {
            "Content-Type": contentType,
            Accept: "application/json",
            ...(cookie ? { Cookie: cookie } : {}),
            ...(authorization ? { Authorization: authorization } : {}),
          },
          body,
          cache: "no-store",
          signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        },
      ),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          const err = new Error("timeout");
          err.name = "TimeoutError";
          reject(err);
        }, UPSTREAM_TIMEOUT_MS);
      }),
    ]);

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
          "O envio do template não retornou JSON (gateway). Tente novamente.",
      },
      { status: 502 },
    );
  } catch (e) {
    const timedOut =
      e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    console.error("[wa-call-permission-proxy]", e);
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
