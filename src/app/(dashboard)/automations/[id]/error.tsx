"use client";

import { useEffect } from "react";

export default function AutomationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[automation-detail] render error:", error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-lg">
        <h2 className="text-lg font-semibold text-slate-900">
          Erro ao carregar automação
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {error.message || "Algo deu errado ao carregar esta automação."}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    </div>
  );
}
