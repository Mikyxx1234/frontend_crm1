"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * `/pipeline` é apenas um redirect: cada visualização tem URL própria
 * (`/pipeline/kanban`, `/pipeline/list`, `/pipeline/agile`). Aqui só
 * decidimos para qual mandar o usuário e preservamos o querystring
 * (ex.: `?deal=...`).
 */
const VIEW_MODE_KEY = "pipeline-view-mode";

function loadPreferredSegment(): "kanban" | "list" | "agile" {
  if (typeof window === "undefined") return "kanban";
  try {
    const stored = window.localStorage.getItem(VIEW_MODE_KEY);
    if (stored === "list") return "list";
    if (stored === "saleshub") return "agile";
  } catch {
    /* localStorage indisponível — cai no default */
  }
  return "kanban";
}

export default function PipelineRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const seg = loadPreferredSegment();
    const qs = searchParams.toString();
    router.replace(`/pipeline/${seg}${qs ? `?${qs}` : ""}`);
  }, [router, searchParams]);

  return null;
}
