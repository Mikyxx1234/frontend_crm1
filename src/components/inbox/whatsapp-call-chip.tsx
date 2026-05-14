"use client";

import { apiUrl } from "@/lib/api";
/**
 * WhatsappCallChip
 * ─────────────────
 * Chip compacto do estado de **sessão de voz** (Call Permission da Meta
 * WhatsApp Business Calling API) para ficar no header do chat, ao lado do
 * nome do contato.
 *
 * IMPORTANTE — **sessão de voz ≠ sessão de conversa**:
 *
 * - **Sessão de conversa (Customer Service Window)**: janela de 24h aberta
 *   quando o cliente envia uma mensagem inbound. Liberada para service
 *   messages sem custo. Renderizada no `<SessionBar>`.
 *
 * - **Sessão de voz (Call Permission)**: autorização específica para o
 *   business ligar para o cliente via WhatsApp. Requer opt-in explícito via
 *   template (`call_permission_request`). Meta concede em duas variantes:
 *     · **Temporária** → 7 dias corridos (ligações atendidas **não estendem**).
 *     · **Permanente** → até o cliente revogar manualmente no WhatsApp.
 *   Status na nossa base: `NONE`, `REQUESTED`, `GRANTED`, `EXPIRED`, `DENIED`.
 *   `DENIED` = cliente recusou (Meta bloqueia novo pedido por 24h).
 *   Totalmente independente da Customer Service Window.
 *
 * Este chip é a fonte única da verdade do estado de voz no Inbox: faz a
 * query, monta o elemento `<audio>` remoto, expõe o picker de template e as
 * ações contextuais num dropdown. O painel grande na sidebar foi aposentado.
 */

import * as React from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  History,
  Info,
  Loader2,
  Mic,
  Phone,
  PhoneIncoming,
  PhoneOff,
  PhoneOutgoing,
  Play,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSSE } from "@/hooks/use-sse";
import { useWhatsappOutboundWebRtc } from "@/hooks/use-whatsapp-outbound-webrtc";
import { TooltipHost } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ConsentType = "TEMPORARY" | "PERMANENT" | null;

type ConsentStatus =
  | "NONE"
  | "REQUESTED"
  | "GRANTED"
  | "EXPIRED"
  | "DENIED";

type CallingContext = {
  channel: string | null;
  consentStatus: ConsentStatus | null;
  consentUpdatedAt: string | null;
  consentType: ConsentType;
  consentExpiresAt: string | null;
  permissionTemplateConfigured: boolean;
  envCallPermissionTemplate: string | null;
  activeCallMetaId: string | null;
  suggestCallPermission: boolean;
};

/** Meta bloqueia novo request por 24h depois de um REJECT. */
const DENY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

type CallPermissionTemplate = {
  id: string | null;
  name: string;
  language: string;
  sub_category: string | null;
  bodyText: string;
  headerText: string;
  footerText: string;
  buttons: string[];
};

const TPL_STORAGE = "wa_call_permission_tpl";

/** Fallback para opt-ins antigos sem `consentExpiresAt`: Meta usa 7 dias. */
const TEMPORARY_FALLBACK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type RecentCallItem = {
  callId: string;
  direction: "BUSINESS_INITIATED" | "USER_INITIATED" | string;
  startedAt: string | null;
  endedAt: string | null;
  durationSec: number | null;
  status: "ringing" | "completed" | "failed" | "rejected";
  recordingUrl: string | null;
};

/** Duração curta: 0s | 45s | 2m03s | 1h12m */
function formatCallDuration(sec: number | null): string {
  if (!sec || sec <= 0) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}m${String(s).padStart(2, "0")}s`;
  const h = Math.floor(m / 60);
  return `${h}h${String(m % 60).padStart(2, "0")}m`;
}

/** Tempo desde uma data: agora | 5min | 2h | 3d | 12/04 */
function formatTimeAgo(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  const ms = Date.now() - d.getTime();
  if (ms < 60_000) return "agora";
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day}d`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "expirada";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (days >= 1) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (hours >= 1) {
    return minutes > 0 && hours < 6 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${Math.max(1, minutes)}m`;
}

function useConsentExpiry(
  consentStatus: CallingContext["consentStatus"],
  consentType: ConsentType,
  consentUpdatedAt: string | null,
  consentExpiresAt: string | null,
) {
  const [now, setNow] = React.useState<number>(Date.now);
  React.useEffect(() => {
    if (consentStatus !== "GRANTED") return;
    if (consentType === "PERMANENT") return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [consentStatus, consentType]);

  if (consentStatus !== "GRANTED") {
    return { expired: consentStatus === "EXPIRED", remaining: 0, isPermanent: false };
  }
  if (consentType === "PERMANENT") {
    return { expired: false, remaining: Number.POSITIVE_INFINITY, isPermanent: true };
  }
  // Temporária: prefere expiresAt do backend; senão fallback 7d.
  const expiresAt = consentExpiresAt
    ? new Date(consentExpiresAt).getTime()
    : consentUpdatedAt
      ? new Date(consentUpdatedAt).getTime() + TEMPORARY_FALLBACK_TTL_MS
      : 0;
  const remaining = Math.max(0, expiresAt - now);
  return { expired: remaining <= 0, remaining, isPermanent: false };
}

async function fetchCallPermissionTemplates(): Promise<CallPermissionTemplate[]> {
  const r = await fetch(apiUrl(`/api/meta/whatsapp/call-permission-templates`));
  if (!r.ok) return [];
  const j = (await r.json().catch(() => ({}))) as { items?: CallPermissionTemplate[] };
  return Array.isArray(j.items) ? j.items : [];
}

export function WhatsappCallChip({
  conversationId,
  channel,
}: {
  conversationId: string;
  channel: string | null | undefined;
}) {
  const isWaVoiceChannel = channel === "whatsapp" || channel === "meta";
  const queryClient = useQueryClient();
  const key = React.useMemo(
    () => ["calling-context", conversationId] as const,
    [conversationId],
  );

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const r = await fetch(apiUrl(`/api/conversations/${conversationId}/calling-context`));
      if (!r.ok) throw new Error("Erro ao carregar estado de voz");
      return r.json() as Promise<CallingContext>;
    },
    enabled: !!conversationId && isWaVoiceChannel,
    staleTime: 15_000,
    // Sanity polling quando há chamada ativa: se um webhook `terminate` se
    // perder, o chip se auto-corrige em até 10s ao invés de ficar preso em
    // "Em chamada" indefinidamente.
    refetchInterval: (q) =>
      (q.state.data as CallingContext | undefined)?.activeCallMetaId ? 10_000 : false,
    refetchIntervalInBackground: false,
  });

  // Só busca templates quando o dropdown abre (evita N+1 em inbox cheia).
  const [menuOpen, setMenuOpen] = React.useState(false);
  const templatesQuery = useQuery({
    queryKey: ["call-permission-templates"],
    queryFn: fetchCallPermissionTemplates,
    enabled: menuOpen && isWaVoiceChannel,
    staleTime: 5 * 60_000,
  });

  // Histórico de chamadas (últimas 5) — fetched lazy quando o dropdown
  // abre e quando a sessão de voz precisa ser exibida. Auto-invalida via
  // SSE (mesmo handler do calling-context invalida calls-recent).
  const recentCallsKey = React.useMemo(
    () => ["whatsapp-calls-recent", conversationId] as const,
    [conversationId],
  );
  const recentCallsQuery = useQuery({
    queryKey: recentCallsKey,
    queryFn: async () => {
      const r = await fetch(apiUrl(`/api/conversations/${conversationId}/whatsapp-calls/recent?limit=5`),
      );
      if (!r.ok) return { items: [] as RecentCallItem[] };
      const j = (await r.json().catch(() => ({}))) as { items?: RecentCallItem[] };
      return { items: Array.isArray(j.items) ? j.items : [] };
    },
    enabled: menuOpen && isWaVoiceChannel,
    staleTime: 30_000,
  });

  const outbound = useWhatsappOutboundWebRtc(conversationId);
  const applyAnswerRef = React.useRef(outbound.applyAnswer);
  applyAnswerRef.current = outbound.applyAnswer;

  const remoteAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const [audioBlocked, setAudioBlocked] = React.useState(false);
  React.useEffect(() => {
    const el = remoteAudioRef.current;
    const stream = outbound.remoteStream;
    if (!el) return;
    el.srcObject = stream;
    if (!stream) {
      setAudioBlocked(false);
      return;
    }
    setAudioBlocked(false);
    void el.play().catch(() => setAudioBlocked(true));
  }, [outbound.remoteStream]);

  React.useEffect(() => {
    outbound.reset();
  }, [conversationId, outbound.reset]);

  // Quando a fase WebRTC local sai de "live"/"need_answer" (chamada encerrada
  // por qualquer lado), revalida o calling-context imediatamente para tirar o
  // chip do estado "Em chamada" sem esperar polling/SSE.
  const prevPhaseRef = React.useRef<string>(outbound.phase);
  React.useEffect(() => {
    const prev = prevPhaseRef.current;
    const cur = outbound.phase;
    const wasActive = prev === "live" || prev === "need_answer";
    const isActive = cur === "live" || cur === "need_answer";
    if (wasActive && !isActive) {
      queryClient.invalidateQueries({ queryKey: key });
    }
    prevPhaseRef.current = cur;
  }, [outbound.phase, queryClient, key]);

  useSSE(
    "/api/sse/messages",
    React.useCallback(
      (event: string, evtData: unknown) => {
        if (event === "whatsapp_call") {
          const p = evtData as {
            conversationId?: string;
            callId?: string;
            session?: { sdp_type?: string; sdp?: string };
          };
          if (
            p.conversationId === conversationId &&
            p.callId &&
            p.session?.sdp_type?.toLowerCase() === "answer" &&
            p.session.sdp
          ) {
            void applyAnswerRef.current(p.callId, p.session.sdp);
          }
        }
        if (
          event === "new_message" ||
          event === "whatsapp_call" ||
          event === "conversation_updated"
        ) {
          const p = evtData as { conversationId?: string };
          if (p.conversationId === conversationId) {
            queryClient.invalidateQueries({ queryKey: key });
            // Histórico de chamadas também precisa atualizar quando
            // chega evento de chamada (terminate, recording etc).
            queryClient.invalidateQueries({ queryKey: recentCallsKey });
          }
        }
      },
      [conversationId, queryClient, key, recentCallsKey],
    ),
    !!conversationId && isWaVoiceChannel,
  );

  const requestPermission = useMutation({
    mutationFn: async (chosenTemplate?: string) => {
      let stored = "";
      try {
        stored = sessionStorage.getItem(TPL_STORAGE)?.trim() ?? "";
      } catch {
        /* ignore */
      }
      const envTpl = (data?.envCallPermissionTemplate ?? "").trim();
      const templateName = (chosenTemplate ?? "").trim() || envTpl || stored;
      if (!templateName) {
        throw new Error(
          "Configure um template aprovado da Meta em Configurações → WhatsApp Templates.",
        );
      }
      const r = await fetch(apiUrl(`/api/conversations/${conversationId}/call-permission`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateName }),
        },
      );
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(
          typeof j?.message === "string" ? j.message : "Erro ao enviar solicitação",
        );
      }
      // Guarda último template usado para virar default rápido na próxima vez.
      try {
        sessionStorage.setItem(TPL_STORAGE, templateName);
      } catch {
        /* ignore */
      }
      return j;
    },
    onSuccess: () => {
      toast.success("Solicitação de voz enviada ao cliente");
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({
        queryKey: ["conversation-messages", conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const terminateCall = useMutation({
    mutationFn: async (callId: string) => {
      const r = await fetch(apiUrl(`/api/conversations/${conversationId}/whatsapp-calls`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "terminate", call_id: callId }),
        },
      );
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(
          typeof j?.message === "string" ? j.message : "Erro ao encerrar",
        );
      }
      return j;
    },
    onSuccess: () => {
      toast.success("Chamada encerrada");
      queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cs = data?.consentStatus ?? "NONE";
  const expiry = useConsentExpiry(
    cs,
    data?.consentType ?? null,
    data?.consentUpdatedAt ?? null,
    data?.consentExpiresAt ?? null,
  );

  // ── State local de UI ──────────────────────────────────────
  // IMPORTANTE: estes hooks precisam ficar ANTES de qualquer early
  // return condicional (`if (channel !== "whatsapp") return null` logo
  // abaixo) para nao violar Rules of Hooks. Qualquer logica que dependa
  // de `channel === "whatsapp"` deve filtrar via `enabled`/no efeito,
  // nunca via short-circuit antes do hook.
  const [howItWorksOpen, setHowItWorksOpen] = React.useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  /** URL atualmente em playback no mini-player — null = nada tocando. */
  const [playingRecordingUrl, setPlayingRecordingUrl] = React.useState<string | null>(null);
  const recordingPlayerRef = React.useRef<HTMLAudioElement | null>(null);
  React.useEffect(() => {
    const el = recordingPlayerRef.current;
    if (!el) return;
    if (playingRecordingUrl) {
      el.src = playingRecordingUrl;
      void el.play().catch(() => setPlayingRecordingUrl(null));
    } else {
      el.pause();
      el.removeAttribute("src");
      el.load();
    }
  }, [playingRecordingUrl]);
  // Para playback ao fechar o menu — evita áudio órfão.
  React.useEffect(() => {
    if (!menuOpen) setPlayingRecordingUrl(null);
  }, [menuOpen]);

  if (!isWaVoiceChannel) return null;
  const effectivelyExpired =
    cs === "EXPIRED" || (cs === "GRANTED" && !expiry.isPermanent && expiry.expired);
  const activeCallId = data?.activeCallMetaId ?? null;
  const hasActiveCall =
    !!activeCallId || outbound.phase === "live" || outbound.phase === "need_answer";

  // Janela de cooldown de 24h imposta pela Meta após um DENIED — enquanto
  // estiver dentro dela, re-solicitar voz é garantido falhar, então a UI
  // travamos o botão e mostramos o tempo restante.
  const denyCooldown = (() => {
    if (cs !== "DENIED" || !data?.consentUpdatedAt) {
      return { active: false, remainingMs: 0 };
    }
    const since = new Date(data.consentUpdatedAt).getTime();
    const remainingMs = DENY_COOLDOWN_MS - (Date.now() - since);
    return { active: remainingMs > 0, remainingMs: Math.max(0, remainingMs) };
  })();

  // ── Label do trigger (ícone Phone é fixo no JSX) ───────────────
  type Tone = { label: string };

  const tone: Tone = (() => {
    if (outbound.isInitiating) {
      return { label: "Conectando…" };
    }
    if (outbound.phase === "live") {
      return { label: "Em chamada" };
    }
    if (outbound.phase === "need_answer") {
      return { label: "Chamando…" };
    }
    if (hasActiveCall) {
      return { label: "Em chamada" };
    }
    if (cs === "DENIED") {
      return {
        label: denyCooldown.active
          ? `Bloqueado · ${formatRemaining(denyCooldown.remainingMs)}`
          : "Recusado",
      };
    }
    if (effectivelyExpired) {
      return { label: "Expirado" };
    }
    if (cs === "GRANTED") {
      return {
        label: expiry.isPermanent
          ? "Voz ativa"
          : `Voz · ${formatRemaining(expiry.remaining)}`,
      };
    }
    if (cs === "REQUESTED") {
      return { label: "Aguardando" };
    }
    return { label: "Ligar" };
  })();

  const canInitiate =
    cs === "GRANTED" &&
    !effectivelyExpired &&
    !hasActiveCall &&
    (outbound.phase === "idle" || outbound.phase === "error");

  const canRequest =
    !hasActiveCall &&
    !outbound.isInitiating &&
    (cs === "NONE" ||
      effectivelyExpired ||
      (cs === "DENIED" && !denyCooldown.active));

  const canTerminate =
    hasActiveCall &&
    (outbound.activeCallId || activeCallId) &&
    !terminateCall.isPending;

  const initiate = async () => {
    const r = await outbound.initiate();
    if (r.ok) toast.success("Pedido aceito pela Meta. Aguarde…");
    else if (r.error) toast.error(r.error);
  };

  const handleTerminate = () => {
    const id = outbound.activeCallId || activeCallId;
    if (!id) return;
    if (outbound.activeCallId) void outbound.terminate();
    else terminateCall.mutate(id);
  };

  const activateAudio = () => {
    const el = remoteAudioRef.current;
    if (!el) return;
    void el.play().then(() => setAudioBlocked(false)).catch(() => {});
  };

  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-semibold text-slate-400">
        <Loader2 className="size-3.5 animate-spin" />
        Voz…
      </span>
    );
  }

  return (
    <>
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        className="hidden"
        aria-hidden
      />
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
            (cs === "GRANTED" && !effectivelyExpired) ||
              hasActiveCall ||
              outbound.phase === "live" ||
              outbound.phase === "need_answer"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : cs === "DENIED" || effectivelyExpired
                ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                : cs === "REQUESTED"
                  ? "border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100"
                  : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50",
          )}
          aria-label="Estado da sessão de voz"
        >
          <Phone
            className={cn(
              "size-3.5",
              (cs === "GRANTED" && !effectivelyExpired) ||
                hasActiveCall ||
                outbound.phase === "live"
                ? "text-emerald-500"
                : cs === "DENIED" || effectivelyExpired
                  ? "text-red-400"
                  : cs === "REQUESTED"
                    ? "text-sky-400"
                    : "text-slate-400",
            )}
            strokeWidth={2.2}
          />
          <span className="whitespace-nowrap tabular-nums">{tone.label}</span>
          <ChevronDown className="size-3 opacity-50" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="z-50 min-w-[280px] rounded-xl border border-slate-100 bg-white p-1 shadow-[0_8px_32px_rgba(0,0,0,0.10)]"
        >
          <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Sessão de voz
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1" />

          {canInitiate && (
            <DropdownMenuItem
              onClick={initiate}
              className="gap-2 px-2 py-1.5 text-[13px] text-emerald-700 hover:bg-slate-50 focus:bg-slate-50"
            >
              <Phone className="size-3.5" />
              Ligar agora
            </DropdownMenuItem>
          )}

          {canTerminate && (
            <DropdownMenuItem
              onClick={handleTerminate}
              className="gap-2 px-2 py-1.5 text-[13px] text-red-700 hover:bg-slate-50 focus:bg-slate-50"
            >
              <PhoneOff className="size-3.5" />
              Encerrar chamada
            </DropdownMenuItem>
          )}

          {/* Info contextual quando GRANTED mas permanente/temporária */}
          {cs === "GRANTED" && !effectivelyExpired && (
            <div className="px-2 pb-1 pt-0.5 text-[11px] leading-snug text-[var(--color-ink-soft)]">
              {expiry.isPermanent ? (
                <>
                  <span className="font-semibold text-emerald-700">Permissão permanente.</span>{" "}
                  Cliente pode revogar a qualquer momento nas configurações do WhatsApp.
                </>
              ) : (
                <>
                  <span className="font-semibold text-emerald-700">
                    Permissão temporária (7 dias).
                  </span>{" "}
                  Atender ligação <em>não</em> estende o prazo.
                </>
              )}
            </div>
          )}

          {canRequest && (
            <>
              {/* Ação rápida: usa template default */}
              <DropdownMenuItem
                onClick={() => requestPermission.mutate(undefined)}
                disabled={requestPermission.isPending}
                className="gap-2 px-2 py-1.5 text-[13px] hover:bg-slate-50 focus:bg-slate-50"
              >
                {requestPermission.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Phone className="size-3.5" />
                )}
                {effectivelyExpired ? "Solicitar voz novamente" : "Solicitar voz"}
              </DropdownMenuItem>

              {/* Submenu: escolher template */}
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-[13px] outline-none hover:bg-slate-50 focus:bg-slate-50"
                onClick={(e) => {
                  e.preventDefault();
                  setTemplatePickerOpen((v) => !v);
                }}
              >
                <span className="flex items-center gap-2">
                  <ChevronRight
                    className={cn(
                      "size-3.5 transition-transform",
                      templatePickerOpen && "rotate-90",
                    )}
                  />
                  Escolher template
                </span>
                {templatesQuery.isFetching ? (
                  <Loader2 className="size-3 animate-spin text-[var(--color-ink-muted)]" />
                ) : templatesQuery.data ? (
                  <span className="text-[10px] text-[var(--color-ink-muted)]">
                    {templatesQuery.data.length}
                  </span>
                ) : null}
              </button>

              {templatePickerOpen && (
                <div className="max-h-[260px] overflow-y-auto px-1 pb-1">
                  {templatesQuery.isLoading ? (
                    <div className="px-2 py-3 text-center text-[11px] text-[var(--color-ink-muted)]">
                      <Loader2 className="mx-auto size-3.5 animate-spin" />
                      <p className="mt-1">Carregando…</p>
                    </div>
                  ) : (templatesQuery.data ?? []).length === 0 ? (
                    <div className="px-2 py-2 text-[11px] text-slate-500">
                      Nenhum template aprovado do tipo{" "}
                      <code className="rounded bg-slate-100 px-1">call_permission</code>{" "}
                      encontrado. Cadastre em{" "}
                      <a
                        href="/settings/message-models?tab=whatsapp"
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        Configurações → Templates
                      </a>
                      .
                    </div>
                  ) : (
                    (templatesQuery.data ?? []).map((tpl) => (
                      <button
                        type="button"
                        key={tpl.name}
                        disabled={requestPermission.isPending}
                        onClick={() => {
                          setTemplatePickerOpen(false);
                          setMenuOpen(false);
                          requestPermission.mutate(tpl.name);
                        }}
                        className="block w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-slate-50 focus:bg-slate-50 disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-mono font-medium text-slate-800">
                            {tpl.name}
                          </span>
                          <span className="shrink-0 text-[10px] uppercase text-[var(--color-ink-muted)]">
                            {tpl.language}
                          </span>
                        </div>
                        {tpl.bodyText ? (
                          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500">
                            {tpl.bodyText}
                          </p>
                        ) : null}
                        {tpl.buttons.length > 0 ? (
                          <p className="mt-0.5 text-[10px] text-[var(--color-ink-muted)]">
                            {tpl.buttons.length} botão{tpl.buttons.length > 1 ? "es" : ""}
                          </p>
                        ) : null}
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}

          {cs === "DENIED" && denyCooldown.active && (
            <DropdownMenuItem
              disabled
              className="gap-2 px-2 py-1.5 text-[13px] text-red-700 opacity-100 hover:bg-slate-50 focus:bg-slate-50"
            >
              <PhoneOff className="size-3.5" />
              <span className="flex flex-col gap-0.5">
                <span>Cliente recusou · bloqueio de 24h</span>
                <span className="text-[10px] font-normal text-slate-500">
                  Novo pedido liberado em {formatRemaining(denyCooldown.remainingMs)}
                </span>
              </span>
            </DropdownMenuItem>
          )}

          {cs === "REQUESTED" && (
            <>
              <DropdownMenuItem
                disabled
                className="gap-2 px-2 py-1.5 text-[13px] text-slate-500 opacity-100 hover:bg-slate-50 focus:bg-slate-50"
              >
                <Loader2 className="size-3.5 animate-spin text-sky-500" />
                Aguardando cliente autorizar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => requestPermission.mutate(undefined)}
                disabled={requestPermission.isPending}
                className="gap-2 px-2 py-1.5 text-[13px] hover:bg-slate-50 focus:bg-slate-50"
              >
                <RefreshCw
                  className={cn(
                    "size-3.5",
                    requestPermission.isPending && "animate-spin",
                  )}
                />
                Reenviar solicitação
              </DropdownMenuItem>
            </>
          )}

          {outbound.phase === "live" && audioBlocked && (
            <>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={activateAudio}
                className="gap-2 px-2 py-1.5 text-[13px] text-amber-800 hover:bg-slate-50 focus:bg-slate-50"
              >
                <Mic className="size-3.5" />
                Ativar som da chamada
              </DropdownMenuItem>
            </>
          )}

          {outbound.errorMsg && (
            <>
              <DropdownMenuSeparator className="my-1" />
              <div className="px-2 py-1.5 text-[11px] leading-snug text-red-600">
                {outbound.errorMsg}
              </div>
            </>
          )}

          {/* ── Histórico das últimas 5 chamadas ──────────────── */}
          <DropdownMenuSeparator className="my-1" />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setHistoryOpen((v) => !v);
            }}
            className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-[13px] outline-none hover:bg-slate-50 focus:bg-slate-50"
          >
            <History className="size-3.5" />
            <span>Últimas chamadas</span>
            {recentCallsQuery.isFetching ? (
              <Loader2 className="ml-auto size-3 animate-spin text-[var(--color-ink-muted)]" />
            ) : (
              <span className="ml-auto flex items-center gap-1.5">
                {recentCallsQuery.data?.items?.length ? (
                  <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500">
                    {recentCallsQuery.data.items.length}
                  </span>
                ) : null}
                <ChevronRight
                  className={cn(
                    "size-3.5 transition-transform",
                    historyOpen && "rotate-90",
                  )}
                />
              </span>
            )}
          </button>
          {historyOpen && (
            <div className="max-h-[280px] overflow-y-auto px-1 pb-1">
              {recentCallsQuery.isLoading ? (
                <div className="px-2 py-3 text-center text-[11px] text-[var(--color-ink-muted)]">
                  <Loader2 className="mx-auto size-3.5 animate-spin" />
                  <p className="mt-1">Carregando…</p>
                </div>
              ) : (recentCallsQuery.data?.items ?? []).length === 0 ? (
                <div className="px-2 py-2 text-[11px] text-slate-500">
                  Nenhuma chamada registrada nesta conversa.
                </div>
              ) : (
                (recentCallsQuery.data?.items ?? []).map((call) => {
                  const isOut = call.direction === "BUSINESS_INITIATED";
                  const Icon = isOut ? PhoneOutgoing : PhoneIncoming;
                  const sideLabel = isOut ? "Saída" : "Entrada";
                  const sideClass = isOut ? "text-primary" : "text-emerald-600";
                  const statusLabel = (() => {
                    if (call.status === "completed") return "completada";
                    if (call.status === "failed") return "falhou";
                    if (call.status === "rejected") return "não atendida";
                    return "tocando";
                  })();
                  const statusTint = (() => {
                    if (call.status === "completed") return "text-emerald-600";
                    if (call.status === "failed") return "text-rose-500";
                    if (call.status === "rejected") return "text-amber-600";
                    return "text-sky-500";
                  })();
                  const isPlaying = playingRecordingUrl === call.recordingUrl;
                  return (
                    <div
                      key={call.callId}
                      className="rounded-md px-2 py-1.5 hover:bg-slate-50 focus:bg-slate-50"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={cn("size-3.5 shrink-0", sideClass)} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-[11px] font-bold text-slate-800">
                              {sideLabel}
                            </span>
                            <span className="text-[10px] text-[var(--color-ink-muted)]">·</span>
                            <span className={cn("text-[10px] font-semibold uppercase tracking-wide", statusTint)}>
                              {statusLabel}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                            <span className="tabular-nums">
                              {formatTimeAgo(call.endedAt ?? call.startedAt)}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="tabular-nums">
                              {formatCallDuration(call.durationSec)}
                            </span>
                          </div>
                        </div>
                        {call.recordingUrl ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setPlayingRecordingUrl((cur) =>
                                cur === call.recordingUrl ? null : call.recordingUrl,
                              );
                            }}
                            className={cn(
                              "shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-all",
                              isPlaying
                                ? "bg-emerald-500 text-white shadow-sm"
                                : "bg-slate-900 text-white hover:bg-slate-800",
                            )}
                            aria-label={isPlaying ? "Parar gravação" : "Ouvir gravação"}
                          >
                            <span className="inline-flex items-center gap-1">
                              <Play className="size-2.5" />
                              {isPlaying ? "Tocando" : "Ouvir"}
                            </span>
                          </button>
                        ) : (
                          <TooltipHost label="Sem gravação disponível" side="left">
                            <span className="shrink-0 text-[10px] font-medium text-slate-300">
                              sem áudio
                            </span>
                          </TooltipHost>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <audio
                ref={recordingPlayerRef}
                onEnded={() => setPlayingRecordingUrl(null)}
                className="hidden"
                aria-hidden
              />
            </div>
          )}

          {/* ── Como funciona ──────────────────────────────── */}
          <DropdownMenuSeparator className="my-1" />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setHowItWorksOpen((v) => !v);
            }}
            className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-[13px] outline-none hover:bg-slate-50 focus:bg-slate-50"
          >
            <Info className="size-3.5" />
            <span>Como funciona a permissão</span>
            <ChevronRight
              className={cn(
                "ml-auto size-3.5 transition-transform",
                howItWorksOpen && "rotate-90",
              )}
            />
          </button>
          {howItWorksOpen && (
            <div className="space-y-1.5 px-3 pb-2 text-[11px] leading-snug text-[var(--color-ink-soft)]">
              <p>
                <span className="font-semibold text-emerald-700">Sempre permitir:</span>{" "}
                permanente, vale até o cliente revogar manualmente no WhatsApp.
              </p>
              <p>
                <span className="font-semibold text-emerald-700">Temporária:</span>{" "}
                <strong>7 dias</strong> corridos. Ligações atendidas <em>não estendem</em>{" "}
                o prazo.
              </p>
              <p>
                <span className="font-semibold text-red-700">Recusa:</span> Meta bloqueia
                novo pedido por <strong>24h</strong>.
              </p>
              <a
                href="https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/marketing-templates/call-permission-request-message-template"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-[10px] text-primary underline-offset-2 hover:underline"
              >
                Documentação oficial da Meta →
              </a>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
