/**
 * POST /api/uploads/automation-media  (proxy LOCAL do frontend)
 *
 * Por que este handler existe em vez de deixar o `rewrites()` do
 * next.config.ts repassar direto pro backend:
 *
 *   O proxy de `rewrites()` do Next (standalone) trava com corpos de
 *   upload grandes (vídeos de ~10 MB) — bufferiza, demora ~30s e
 *   devolve `500 Internal Server Error` em texto puro. Como o client
 *   faz `res.json()`, o parse falha e cai no toast genérico
 *   "Erro ao enviar arquivo.". Arquivos pequenos (imagens < ~1 MB)
 *   passam instantâneo, por isso o bug só aparecia com vídeo.
 *
 * A solução é receber o multipart aqui (route handler comum, sem o bug
 * do proxy) e reencaminhar server-to-server pro backend via
 * `apiServerFetch`, que repassa o cookie de sessão. O fetch
 * frontend→backend com o corpo completo é rápido (~1s) e estável.
 *
 * Precedência: os rewrites são `afterFiles`, então o Next checa o
 * filesystem primeiro e este handler ganha do rewrite para este path.
 */
import { NextResponse } from "next/server";

import { apiServerFetch } from "@/lib/api-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Uploads de vídeo (até 16 MB) podem levar alguns segundos.
export const maxDuration = 60;

export async function POST(req: Request) {
  const contentType =
    req.headers.get("content-type") ?? "application/octet-stream";

  let body: ArrayBuffer;
  try {
    body = await req.arrayBuffer();
  } catch {
    return NextResponse.json(
      { message: "Erro ao ler o arquivo enviado." },
      { status: 400 },
    );
  }

  try {
    const res = await apiServerFetch("/api/uploads/automation-media", {
      method: "POST",
      body,
      headers: { "content-type": contentType },
    });

    const payload = await res.text();
    return new NextResponse(payload, {
      status: res.status,
      headers: {
        "content-type":
          res.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (e) {
    console.error("[automation-media proxy] falha ao repassar upload:", e);
    return NextResponse.json(
      { message: "Erro ao enviar arquivo ao servidor." },
      { status: 502 },
    );
  }
}
