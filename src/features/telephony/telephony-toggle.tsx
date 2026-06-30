"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconLoader2 } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface TelephonyToggleProps {
  userId: string;
}

interface TelephonyStatus {
  telephonyEnabled: boolean;
  provisioningStep: string;
  provisioningError: string | null;
  provisionedAt: string | null;
}

async function fetchStatus(userId: string): Promise<TelephonyStatus> {
  const res = await fetch(`/api/users/${userId}/telephony`);
  if (!res.ok) throw new Error("Falha ao buscar status");
  return res.json();
}

async function patchTelephony(userId: string, enabled: boolean) {
  const res = await fetch(`/api/users/${userId}/telephony`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { message?: string }).message ?? "Erro");
  }
  return res.json();
}

export function TelephonyToggle({ userId }: TelephonyToggleProps) {
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ["telephony-status", userId],
    queryFn: () => fetchStatus(userId),
  });

  const mutation = useMutation({
    mutationFn: (enabled: boolean) => patchTelephony(userId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telephony-status", userId] });
    },
  });

  if (isLoading) {
    return <IconLoader2 size={14} className="animate-spin text-[var(--text-muted)]" />;
  }

  const enabled = status?.telephonyEnabled ?? false;
  const step = status?.provisioningStep ?? "IDLE";
  const error = status?.provisioningError;
  const isProvisioning = mutation.isPending || (enabled && step !== "ACTIVE" && step !== "FAILED");

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={mutation.isPending}
        onClick={() => mutation.mutate(!enabled)}
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors",
          enabled ? "bg-emerald-500" : "bg-[var(--glass-border)]",
          mutation.isPending && "opacity-50",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform",
            enabled && "translate-x-4",
          )}
        />
      </button>

      {isProvisioning && (
        <span className="flex items-center gap-1 text-xs text-amber-400">
          <IconLoader2 size={11} className="animate-spin" />
          Provisionando…
        </span>
      )}

      {step === "FAILED" && (
        <span className="text-xs text-red-400" title={error ?? undefined}>
          Falhou
        </span>
      )}

      {step === "ACTIVE" && enabled && (
        <span className="text-xs text-emerald-400">Ativo</span>
      )}
    </div>
  );
}
