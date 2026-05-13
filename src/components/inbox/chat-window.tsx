"use client";

import { apiUrl } from "@/lib/api";
import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSSE } from "@/hooks/use-sse";
import {
  AlertCircle, AlertTriangle, ArrowRight, Bot, CheckCheck, CheckCircle2, CheckSquare, Clock, Download, FileText, Image as ImageIcon, LayoutTemplate, Loader2, Lock, Megaphone, Mic,
  MoreHorizontal, Paperclip, Pause, Pencil, Phone, PhoneIncoming, PhoneOff, PhoneOutgoing, Pin, Play, Reply, RotateCcw, Save, Send, Share2, ShieldCheck, Smile, Smartphone, Timer, Volume2, Wrench, X, Zap,
} from "lucide-react";
import { AIDraftCard } from "@/components/inbox/ai-draft-card";
import { ChatAvatar } from "@/components/inbox/chat-avatar";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { AudioRecorder } from "@/components/inbox/audio-recorder";
import { EmojiPicker } from "@/components/inbox/emoji-picker";
import { QuickReplies } from "@/components/inbox/quick-replies";
import { TemplatePicker } from "@/components/inbox/template-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipHost } from "@/components/ui/tooltip";
import { MotionDiv } from "@/components/ui/motion";
import { parseTemplateMeta, prettifyChatMessageBody } from "@/lib/whatsapp-outbound-template-label";
import { cn } from "@/lib/utils";

type ConversationStatus = "OPEN" | "RESOLVED" | "PENDING" | "SNOOZED";
type ReactionDto = { emoji: string; senderName: string };
type InboxMessageDto = {
  id: number | string; content: string; createdAt: string | null;
  direction: "in" | "out" | "system"; messageType: string | number | undefined;
  isPrivate?: boolean; senderName?: string | null;
  senderImageUrl?: string | null;
  mediaUrl?: string | null;
  replyToId?: string | null; replyToPreview?: string | null;
  reactions?: ReactionDto[]; sendStatus?: string; sendError?: string;
};
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

type SessionInfo = { lastInboundAt: string | null; active: boolean; expiresAt: string | null };
type MessagesResponse = { messages: InboxMessageDto[]; pinnedNoteId?: string | null; channelProvider?: string | null; session?: SessionInfo };

async function fetchMessages(conversationId: string): Promise<MessagesResponse> {
  const res = await fetch(apiUrl(`/api/conversations/${conversationId}/messages`));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data?.message === "string" ? data.message : "Erro ao carregar mensagens");
  return { messages: Array.isArray(data.messages) ? data.messages : [], pinnedNoteId: data.pinnedNoteId ?? null, channelProvider: data.channelProvider ?? null, session: data.session ?? undefined };
}
async function postMessage(conversationId: string, content: string, asNote: boolean, replyToId?: string | null) {
  const payload: Record<string, unknown> = asNote ? { content, messageType: "note", private: true } : { content };
  if (replyToId) payload.replyToId = replyToId;
  const res = await fetch(apiUrl(`/api/conversations/${conversationId}/messages`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data?.message === "string" ? data.message : "Erro ao enviar");
  return data as { message: InboxMessageDto; metaError?: string };
}
async function postAttachment(conversationId: string, file: File | Blob, caption: string, fileName?: string) {
  const form = new FormData(); form.append("file", file, fileName ?? (file instanceof File ? file.name : "audio.ogg"));
  if (caption) form.append("caption", caption);
  const res = await fetch(apiUrl(`/api/conversations/${conversationId}/attachments`), { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data?.message === "string" ? data.message : "Erro ao enviar anexo");
  if (data.metaError) throw new Error(`Salvo localmente, mas falhou via WhatsApp: ${data.metaError}`);
  return data as { message: InboxMessageDto };
}
async function postReaction(messageId: string, emoji: string) {
  const res = await fetch(apiUrl(`/api/messages/${encodeURIComponent(messageId)}/reactions`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emoji }) });
  if (!res.ok) throw new Error("Erro ao reagir"); return res.json();
}
async function postConversationAction(conversationId: string, action: "resolve" | "reopen") {
  const res = await fetch(apiUrl(`/api/conversations/${conversationId}/actions`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data?.message === "string" ? data.message : "Erro ao atualizar status");
  return data as { conversation: { status: ConversationStatus } };
}

type ForwardPickRow = {
  id: string;
  channel: string;
  inboxName: string | null;
  contact: { id: string; name: string; phone: string | null };
};

async function postForward(targetConversationId: string, sourceConversationId: string, messageRef: string) {
  const res = await fetch(apiUrl(`/api/conversations/${targetConversationId}/forward`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceConversationId, messageRef }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data?.message === "string" ? data.message : "Erro ao encaminhar");
  return data as { metaError?: string };
}

type ActivePanel = "none" | "quick-replies" | "emoji" | "templates" | "task" | "schedule";
const ACTIVITY_TYPES = [{ value: "CALL", label: "Ligação" }, { value: "MEETING", label: "Reunião" }, { value: "TASK", label: "Tarefa" }, { value: "OTHER", label: "Outro" }];

export function ChatWindow({ conversationId, conversationStatus, contactId, onResolve, onReopen }: {
  conversationId: string | null; conversationStatus?: ConversationStatus | string; contactId?: string;
  onResolve?: (s: ConversationStatus) => void; onReopen?: (s: ConversationStatus) => void;
}) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const agentName = session?.user?.name ?? session?.user?.email ?? "Agente";
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = React.useState("");
  // Modo de envio do composer — `false` = mensagem normal pro cliente,
  // `true` = nota interna (privada, só agentes veem). Antes existia um
  // segmented picker no header da composer com 3 abas (Mensagem / Nota /
  // Timeline) que poluía o espaço; foi removido por feedback do operador
  // (otimiza espaço e confunde menos). A "Nota" virou um TOGGLE inline
  // na barra de ações da caixa de chat (junto com Paperclip/Emoji/etc),
  // mantendo a função sem ocupar uma faixa horizontal inteira. Timeline
  // saiu — continua acessível pelo painel de detalhes do deal/sidebar.
  const [noteMode, setNoteMode] = React.useState(false);
  const [activePanel, setActivePanel] = React.useState<ActivePanel>("none");
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [replyTo, setReplyTo] = React.useState<InboxMessageDto | null>(null);
  const [hoveredMsgId, setHoveredMsgId] = React.useState<string | number | null>(null);
  const [reactionPickerMsgId, setReactionPickerMsgId] = React.useState<string | number | null>(null);
  const [forwardingMessage, setForwardingMessage] = React.useState<InboxMessageDto | null>(null);
  const [forwardSearch, setForwardSearch] = React.useState("");
  const [pendingTemplate, setPendingTemplate] = React.useState<{ name: string; label?: string; content: string } | null>(null);

  // Assinatura do agente (toggle + texto personalizado) — persistido em localStorage.
  const [signatureEnabled, setSignatureEnabled] = React.useState<boolean>(true);
  const [signature, setSignature] = React.useState<string>("");
  const [signatureModalOpen, setSignatureModalOpen] = React.useState(false);
  const [signatureDraft, setSignatureDraft] = React.useState("");
  React.useEffect(() => {
    try {
      const savedEnabled = window.localStorage.getItem("eduit:signature:enabled");
      const savedValue = window.localStorage.getItem("eduit:signature:value");
      if (savedEnabled !== null) setSignatureEnabled(savedEnabled === "1");
      if (savedValue !== null) setSignature(savedValue);
    } catch { /* ignore */ }
  }, []);
  const persistSignatureEnabled = React.useCallback((v: boolean) => {
    setSignatureEnabled(v);
    try { window.localStorage.setItem("eduit:signature:enabled", v ? "1" : "0"); } catch { /* ignore */ }
  }, []);
  const persistSignatureValue = React.useCallback((v: string) => {
    setSignature(v);
    try { window.localStorage.setItem("eduit:signature:value", v); } catch { /* ignore */ }
  }, []);
  const effectiveSignature = (signature.trim() || agentName).trim();

  const typingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesKey = ["conversation-messages", conversationId] as const;

  const { data: messagesData, isLoading, isFetching, isError, error } = useQuery({
    queryKey: messagesKey, queryFn: () => fetchMessages(conversationId!),
    enabled: !!conversationId, staleTime: 4_000, gcTime: 5 * 60_000, refetchInterval: conversationId ? 30_000 : false,
  });
  const messages = messagesData?.messages ?? [];
  const pinnedNoteId = messagesData?.pinnedNoteId ?? null;

  // (Antes existia uma query `contact-primary-deal` aqui que servia
  // exclusivamente pra renderizar a aba "Timeline" no composer. A aba
  // foi removida — a timeline do deal continua acessível via
  // `/pipeline/[id]` e na sidebar de detalhes — então a query saiu
  // junto pra evitar requests órfãos por conversa aberta.)
  const pinnedNote = pinnedNoteId ? messages.find((m) => String(m.id) === pinnedNoteId && m.isPrivate) : null;
  const sessionInfo = messagesData?.session;
  const sessionActive = sessionInfo?.active ?? true;
  const sessionExpiresAt = sessionInfo?.expiresAt ? new Date(sessionInfo.expiresAt) : null;
  const isBaileysChannel = messagesData?.channelProvider === "BAILEYS_MD";

  const [taskTitle, setTaskTitle] = React.useState("");
  const [taskType, setTaskType] = React.useState("TASK");
  const [taskScheduled, setTaskScheduled] = React.useState("");
  const taskMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { type: taskType, title: taskTitle.trim() };
      if (contactId) body.contactId = contactId;
      if (taskScheduled.trim()) body.scheduledAt = new Date(taskScheduled).toISOString();
      const res = await fetch(apiUrl("/api/activities"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Erro ao criar tarefa");
    },
    onSuccess: () => { setTaskTitle(""); setTaskScheduled(""); setActivePanel("none"); queryClient.invalidateQueries({ queryKey: ["contact"] }); },
  });
  const templateSendMutation = useMutation({
    mutationFn: async (vars: { templateName: string; bodyPreview?: string }) => {
      const res = await fetch(apiUrl(`/api/conversations/${conversationId}/template`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateName: vars.templateName, bodyPreview: vars.bodyPreview }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data?.message === "string" ? data.message : "Erro ao enviar template"); return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: messagesKey }); },
  });

  // ── Agendar mensagem ───────────────────────────────
  // Estados locais do painel. Template fallback é OPCIONAL em todos os
  // canais (inclusive Meta): o operador decide conscientemente se quer
  // se proteger contra a expiração da sessão de 24h. Se desligar o
  // toggle e a sessão expirar no horário do envio, o worker marca o
  // agendamento como FAILED com mensagem clara.
  const [scheduleContent, setScheduleContent] = React.useState("");
  const [scheduleAt, setScheduleAt] = React.useState("");
  const [scheduleFile, setScheduleFile] = React.useState<File | null>(null);
  const [scheduleUseFallback, setScheduleUseFallback] = React.useState(false);
  const [scheduleTemplate, setScheduleTemplate] = React.useState<{ name: string; label?: string; content?: string } | null>(null);
  const [showScheduleTemplatePicker, setShowScheduleTemplatePicker] = React.useState(false);
  const scheduleFileInputRef = React.useRef<HTMLInputElement>(null);

  const scheduledMessagesKey = ["scheduled-messages", conversationId] as const;
  const { data: pendingScheduledData } = useQuery({
    queryKey: scheduledMessagesKey,
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/scheduled-messages?conversationId=${conversationId}`));
      if (!res.ok) return { items: [] as Array<{ id: string; content: string; scheduledAt: string; createdBy?: { name?: string | null } | null; fallbackTemplateName?: string | null }> };
      return res.json() as Promise<{ items: Array<{ id: string; content: string; scheduledAt: string; createdBy?: { name?: string | null } | null; fallbackTemplateName?: string | null }> }>;
    },
    enabled: !!conversationId,
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
  const pendingScheduled = pendingScheduledData?.items ?? [];

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!conversationId) throw new Error("Conversa inválida");
      const content = scheduleContent.trim();
      if (!content && !scheduleFile) {
        throw new Error("Informe um conteúdo ou anexo");
      }
      const when = scheduleAt.trim() ? new Date(scheduleAt) : null;
      if (!when || Number.isNaN(when.getTime())) {
        throw new Error("Data/hora de envio inválida");
      }

      let media: { url: string; type?: string; name?: string } | null = null;
      if (scheduleFile) {
        const form = new FormData();
        form.append("file", scheduleFile);
        const up = await fetch(apiUrl("/api/uploads/automation-media"), { method: "POST", body: form });
        const upData = (await up.json().catch(() => ({}))) as { url?: string; fileName?: string; mimeType?: string; message?: string };
        if (!up.ok || !upData.url) {
          throw new Error(upData.message || "Falha ao enviar anexo");
        }
        media = { url: upData.url, type: upData.mimeType, name: upData.fileName };
      }

      const body: Record<string, unknown> = {
        conversationId,
        content,
        scheduledAt: when.toISOString(),
      };
      if (media) body.media = media;
      // Só anexa o template se o operador optou por usar fallback E
      // escolheu um template. Caso contrário o backend cria o agendamento
      // sem fallback — worker marcará FAILED se sessão 24h expirar.
      if (scheduleUseFallback && scheduleTemplate) {
        body.fallbackTemplate = { name: scheduleTemplate.name, language: "pt_BR" };
      }

      const res = await fetch(apiUrl("/api/scheduled-messages"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.message === "string" ? data.message : "Erro ao agendar");
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Mensagem agendada");
      setScheduleContent("");
      setScheduleAt("");
      setScheduleFile(null);
      setScheduleTemplate(null);
      setScheduleUseFallback(false);
      setActivePanel("none");
      queryClient.invalidateQueries({ queryKey: scheduledMessagesKey });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao agendar");
    },
  });

  const cancelScheduledMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(apiUrl(`/api/scheduled-messages/${id}`), { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao cancelar");
    },
    onSuccess: () => {
      toast.success("Agendamento cancelado");
      queryClient.invalidateQueries({ queryKey: scheduledMessagesKey });
    },
    onError: () => toast.error("Falha ao cancelar agendamento"),
  });

  useSSE(apiUrl("/api/sse/messages"), React.useCallback((event: string, data: unknown) => {
    // contact_updated tem semantica diferente: nao mexe em mensagens,
    // so refresha a lista pra pegar avatar/nome novos.
    if (event === "contact_updated") {
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      return;
    }
    if (event !== "new_message" && event !== "whatsapp_call" && event !== "message_status") return;
    const p = data as { conversationId?: string };
    if (p.conversationId === conversationId) queryClient.invalidateQueries({ queryKey: messagesKey });
    if (event !== "message_status") queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
  }, [conversationId, messagesKey, queryClient]), !!conversationId);

  React.useEffect(() => { if (conversationId) fetch(apiUrl(`/api/conversations/${conversationId}/read`), { method: "POST" }).then(() => queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] })).catch(() => {}); }, [conversationId, queryClient]);

  // Ao trocar de conversa: pular instantaneamente para a última mensagem (sem
  // animação e sem "rolagem visível pelo topo"). Enquanto as mensagens ainda
  // não chegaram, continuamos forçando o scroll final até elas aparecerem.
  const lastConvRef = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    if (!conversationId) return;
    const changed = lastConvRef.current !== conversationId;
    lastConvRef.current = conversationId;
    const behavior: ScrollBehavior = changed ? "auto" : "smooth";
    // rAF garante que o DOM já refletiu as novas mensagens.
    const raf = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior, block: "end" });
    });
    return () => cancelAnimationFrame(raf);
  }, [messages, conversationId]);
  React.useEffect(() => { setNoteMode(false); setActivePanel("none"); setPendingFile(null); setReplyTo(null); setReactionPickerMsgId(null); setForwardingMessage(null); setForwardSearch(""); setPendingTemplate(null); setScheduleContent(""); setScheduleAt(""); setScheduleFile(null); setScheduleTemplate(null); setShowScheduleTemplatePicker(false); }, [conversationId]);

  React.useEffect(() => {
    if (reactionPickerMsgId == null) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-reaction-picker]")) {
        setReactionPickerMsgId(null);
        setHoveredMsgId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [reactionPickerMsgId]);

  const sendMutation = useMutation({
    mutationFn: ({ content, asNote, replyId }: { content: string; asNote: boolean; replyId?: string | null }) => postMessage(conversationId!, content, asNote, replyId),
    onMutate: async ({ content, asNote, replyId }) => {
      await queryClient.cancelQueries({ queryKey: messagesKey });
      const previous = queryClient.getQueryData<MessagesResponse>(messagesKey);
      const replyPreview = replyId ? messages.find((m) => String(m.id) === replyId)?.content?.slice(0, 80) : null;
      const optimistic: InboxMessageDto = { id: `temp-${Date.now()}`, content, createdAt: new Date().toISOString(), direction: "out", messageType: asNote ? "note" : "text", isPrivate: asNote || undefined, senderName: agentName, replyToId: replyId, replyToPreview: replyPreview };
      queryClient.setQueryData<MessagesResponse>(messagesKey, (old) => ({ messages: [...(old?.messages ?? []), optimistic], session: old?.session }));
      return { previous };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(messagesKey, ctx.previous);
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar a mensagem");
    },
    onSuccess: (data) => {
      if (data?.metaError) {
        toast.warning(`Salvo localmente, mas não enviado via WhatsApp: ${data.metaError}`);
      }
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: messagesKey }); queryClient.invalidateQueries({ queryKey: ["conversations"] }); },
  });
  const attachMutation = useMutation({
    mutationFn: ({ file, caption, fileName }: { file: File | Blob; caption: string; fileName?: string }) => postAttachment(conversationId!, file, caption, fileName),
    onMutate: async ({ file, fileName }) => {
      await queryClient.cancelQueries({ queryKey: messagesKey });
      const previous = queryClient.getQueryData<MessagesResponse>(messagesKey);
      const name = fileName ?? (file instanceof File ? file.name : "audio.ogg");
      const mime = (file as File).type ?? "";
      const isAudio = mime.startsWith("audio/") || /\.(webm|ogg|mp3|wav|m4a|opus|aac|amr)$/i.test(name);
      const isImage = !isAudio && (mime.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name));
      const isVideo = !isAudio && !isImage && (mime.startsWith("video/") || /\.(mp4|mov|avi|3gp|mkv)$/i.test(name));
      const optimisticType = isAudio ? "audio" : isImage ? "image" : isVideo ? "video" : "document";
      const previewUrl = (isAudio || isImage || isVideo) ? URL.createObjectURL(file) : undefined;
      const optimistic: InboxMessageDto = {
        id: `temp-att-${Date.now()}`,
        content: isAudio ? "" : `📎 ${name}`,
        createdAt: new Date().toISOString(),
        direction: "out",
        messageType: optimisticType,
        senderName: agentName,
        mediaUrl: previewUrl,
      };
      queryClient.setQueryData<MessagesResponse>(messagesKey, (old) => ({ messages: [...(old?.messages ?? []), optimistic], session: old?.session }));
      return { previous };
    },
    onError: (_e, _v, ctx) => { if (ctx?.previous) queryClient.setQueryData(messagesKey, ctx.previous); },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: messagesKey }); queryClient.invalidateQueries({ queryKey: ["conversations"] }); setPendingFile(null); },
  });
  const reactionMutation = useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) => postReaction(messageId, emoji),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: messagesKey }); setReactionPickerMsgId(null); setHoveredMsgId(null); },
  });
  const forwardMutation = useMutation({
    mutationFn: async ({ targetId, messageRef }: { targetId: string; messageRef: string }) => {
      if (!conversationId) throw new Error("Sem conversa");
      return postForward(targetId, conversationId, messageRef);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversation-messages"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-conversations"] });
      setForwardingMessage(null);
      setForwardSearch("");
      if (data.metaError) toast.warning(`Encaminhado salvo; WhatsApp: ${data.metaError}`);
      else toast.success("Mensagem encaminhada.");
    },
    onError: (e) => { toast.error(e instanceof Error ? e.message : "Erro ao encaminhar"); },
  });

  const { data: forwardPickData, isLoading: forwardPickLoading } = useQuery({
    queryKey: ["forward-conversation-pick"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/conversations?perPage=80&sortBy=updatedAt&sortOrder=desc"));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data?.message === "string" ? data.message : "Erro ao listar conversas");
      return (data.items ?? []) as ForwardPickRow[];
    },
    enabled: !!forwardingMessage && !!conversationId,
    staleTime: 30_000,
  });

  const forwardPickFiltered = React.useMemo(() => {
    const items = forwardPickData ?? [];
    const q = forwardSearch.trim().toLowerCase();
    return items.filter((row) => {
      if (row.id === conversationId) return false;
      if (!q) return true;
      const name = row.contact?.name?.toLowerCase() ?? "";
      const phone = row.contact?.phone?.replace(/\D/g, "") ?? "";
      return name.includes(q) || phone.includes(q.replace(/\D/g, ""));
    });
  }, [forwardPickData, forwardSearch, conversationId]);
  const statusMutation = useMutation({
    mutationFn: (action: "resolve" | "reopen") => postConversationAction(conversationId!, action),
    onSuccess: (data, action) => { queryClient.invalidateQueries({ queryKey: ["conversations"] }); if (action === "resolve") onResolve?.(data.conversation.status); else onReopen?.(data.conversation.status); },
  });
  const pinNoteMutation = useMutation({
    mutationFn: async (noteId: string | null) => {
      const res = await fetch(apiUrl(`/api/conversations/${conversationId}/pin-note`), {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ noteId }),
      });
      if (!res.ok) throw new Error("Erro ao fixar nota");
      return res.json();
    },
    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: messagesKey });
      const prev = queryClient.getQueryData<MessagesResponse>(messagesKey);
      queryClient.setQueryData<MessagesResponse>(messagesKey, (old) => old ? { ...old, pinnedNoteId: noteId } : old);
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) queryClient.setQueryData(messagesKey, ctx.prev); },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: messagesKey }); },
  });

  const togglePanel = (panel: ActivePanel) => setActivePanel((p) => (p === panel ? "none" : panel));
  const sendTypingIndicator = React.useCallback(() => {
    if (!conversationId || typingTimerRef.current) return;
    fetch(apiUrl(`/api/conversations/${conversationId}/typing`), { method: "POST" }).catch(() => {});
    typingTimerRef.current = setTimeout(() => { typingTimerRef.current = null; }, 20_000);
  }, [conversationId]);
  const insertEmoji = React.useCallback((emoji: string) => { setDraft((d) => d + emoji); textareaRef.current?.focus(); }, []);
  const onSend = React.useCallback(() => {
    const text = draft.trim();
    // NÃO bloqueamos por `sendMutation.isPending` — o agente precisa
    // poder disparar várias mensagens em sequência sem esperar cada
    // request terminar. Cada `mutate()` cria sua própria execução
    // otimista (nova bolha aparece na hora) e o servidor processa em
    // paralelo. O `setDraft("")` síncrono garante que Enters duplos
    // acidentais caiam no `if (!text)` e não duplicam mensagens.
    if (!text || !conversationId) return;
    // Assinatura do agente: quando o toggle está ligado e NÃO é nota interna,
    // prefixamos a assinatura em negrito (sintaxe WhatsApp `*nome*`) seguida
    // de dois pontos e UM espaço antes da mensagem. Formato INLINE — padrão
    // de CRMs WhatsApp BR (Octadesk/RD/Take Blip): compacto, natural pra
    // mensagens curtas (a assinatura "vira parte da fala") e ainda funciona
    // pra longas (o cliente vê o nome em bold no início e o resto fluído).
    //
    // Idempotente — detecta e respeita os 4 formatos já usados em threads
    // anteriores (não duplica a assinatura quando o agente cola texto que
    // já vem assinado, ou quando edita uma mensagem):
    //
    //   1. `*Nome:* Mensagem`    (NOVO PADRÃO — inline com dois pontos)
    //   2. `*Nome*\n\nMensagem`  (legado, formato email — duas quebras)
    //   3. `*Nome*: Mensagem`    (variante compacta em negrito sem espaço)
    //   4. `Nome: Mensagem`      (legado plain, ainda gravado em threads antigas)
    const shouldSign = signatureEnabled && !noteMode && !!effectiveSignature;
    const sigLower = effectiveSignature.toLowerCase();
    const lower = text.toLowerCase();
    const alreadyPrefixed =
      shouldSign &&
      (lower.startsWith(`*${sigLower}:*`) ||
        lower.startsWith(`*${sigLower}*`) ||
        lower.startsWith(`${sigLower}:`));
    const payloadText =
      shouldSign && !alreadyPrefixed
        ? `*${effectiveSignature}:* ${text}`
        : text;
    sendMutation.mutate({
      content: payloadText,
      asNote: noteMode,
      replyId: replyTo ? String(replyTo.id) : null,
    });
    setDraft("");
    setActivePanel("none");
    setReplyTo(null);
    // Após enviar, o botão "Enviar" desaparece do DOM (condicional ao
    // draft não vazio) — o React remove o nó e o browser realoca o
    // foco no body. Devolvemos o foco ao textarea para que o agente
    // possa digitar e disparar Enter de novo IMEDIATAMENTE, sem
    // precisar clicar. Usamos dois `requestAnimationFrame` aninhados
    // pra garantir que o foco aconteça DEPOIS do React commit + paint,
    // sobrevivendo a outras re-renderizações que podem rolar no mesmo
    // tick (ex.: `cancelQueries` da mutation otimista).
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (ta && document.activeElement !== ta) ta.focus();
      });
    });
  }, [
    conversationId,
    draft,
    noteMode,
    sendMutation,
    replyTo,
    signatureEnabled,
    effectiveSignature,
  ]);
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (pendingFile) sendFile(); else onSend(); }
    if (e.key === "Escape") { setReplyTo(null); setActivePanel("none"); }
  };
  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; e.target.value = ""; if (f.size > 16 * 1024 * 1024) { toast.warning("O arquivo excede o limite de 16 MB."); return; } setPendingFile(f); setActivePanel("none"); };
  /**
   * Handler de Ctrl+V / Cmd+V no composer.
   *
   * Screenshots e imagens copiadas (Print Screen → Ctrl+V, ou "copiar imagem"
   * do navegador) chegam em `clipboardData.items` como blobs `image/*`. Sem
   * este handler, o navegador insere apenas o data-URL como texto (ou nada,
   * se a imagem não tiver representação textual).
   *
   * Aqui convertemos o primeiro item image/* em `File` (gerando nome baseado
   * em timestamp + extensão derivada do MIME), respeitando o mesmo limite de
   * 16 MB do `onFileSelected`. O arquivo é anexado em `pendingFile`, trocando
   * o placeholder do textarea para "Legenda (opcional)…" — o agente pode
   * digitar uma legenda e enviar com Enter (mesmo fluxo do botão clipe).
   *
   * `preventDefault` só é chamado quando encontramos imagem, para não
   * quebrar o paste de texto em cenários normais.
   */
  const onPaste = React.useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items || items.length === 0) return;
    for (let i = 0; i < items.length; i += 1) {
      const it = items[i];
      if (it.kind !== "file" || !it.type.startsWith("image/")) continue;
      const blob = it.getAsFile();
      if (!blob) continue;
      if (blob.size > 16 * 1024 * 1024) {
        toast.warning("A imagem colada excede o limite de 16 MB.");
        e.preventDefault();
        return;
      }
      const ext = (blob.type.split("/")[1] || "png").split("+")[0].toLowerCase();
      const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
      const fileName = (blob as File).name && (blob as File).name !== "image.png"
        ? (blob as File).name
        : `screenshot-${stamp}.${ext}`;
      const file = new File([blob], fileName, { type: blob.type });
      e.preventDefault();
      setPendingFile(file);
      setActivePanel("none");
      toast.success("Imagem colada — digite a legenda e envie");
      return;
    }
  }, []);
  const sendFile = () => {
    if (!pendingFile || !conversationId) return;
    attachMutation.mutate({ file: pendingFile, caption: draft.trim() });
    setDraft("");
    requestAnimationFrame(() => textareaRef.current?.focus());
  };
  const sendAudio = React.useCallback((blob: Blob) => { if (!conversationId) return; const ext = blob.type.includes("ogg") ? "ogg" : blob.type.includes("mp4") ? "m4a" : "webm"; attachMutation.mutate({ file: blob, caption: "", fileName: `audio.${ext}` }); }, [conversationId, attachMutation]);
  const isBusy = sendMutation.isPending || attachMutation.isPending;
  const isResolved = conversationStatus === "RESOLVED";

  if (!conversationId) return null;
  if (isLoading) return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden eduit-msg-bg p-6">
      {[1,2,3,4,5].map((i) => <Skeleton key={i} className={cn("h-14 rounded-[20px]", i % 2 ? "ml-16" : "mr-16")} />)}
    </div>
  );
  if (isError) return (
    <div className="flex min-h-0 flex-1 items-center justify-center eduit-msg-bg p-6">
      <div className="rounded-[16px] border border-destructive/30 bg-destructive/5 px-5 py-3 text-[14px] text-destructive">
        {error instanceof Error ? error.message : "Erro ao carregar mensagens."}
      </div>
    </div>
  );

  const META_DOMAINS = ["lookaside.fbsbx.com", "scontent.whatsapp.net", "graph.facebook.com"];
  const resolveMediaUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith("blob:") || url.startsWith("data:")) return url;
    if (url.startsWith("/uploads/") || url.startsWith("/api/")) return apiUrl(url);
    try {
      const p = new URL(url, window.location.origin);
      if (p.pathname.startsWith("/uploads/")) return apiUrl(p.pathname + p.search);
      if (META_DOMAINS.some((d) => p.hostname.endsWith(d)))
        return apiUrl(`/api/media/proxy?url=${encodeURIComponent(url)}`);
    } catch {
      /* ignore */
    }
    if (url.includes("/uploads/")) {
      const idx = url.indexOf("/uploads/");
      return apiUrl(url.slice(idx));
    }
    return url;
  };
  const detectMediaKind = (m: InboxMessageDto): "image" | "audio" | "video" | "document" | null => {
    const mt = String(m.messageType ?? "").toLowerCase();
    if (mt === "whatsapp_call_recording" && m.mediaUrl) return "audio";
    if (mt === "image" || mt === "sticker") return "image"; if (mt === "audio" || mt === "ptt") return "audio"; if (mt === "video") return "video"; if (mt === "document") return "document";
    const u = m.mediaUrl ?? "";
    if (/\.(jpg|jpeg|png|gif|webp)($|\?)/i.test(u)) return "image"; if (/\.(webm|ogg|mp3|wav|m4a|aac|amr|opus)($|\?)/i.test(u)) return "audio"; if (/\.(mp4|mov|avi|3gp)($|\?)/i.test(u)) return "video";
    const c = m.content ?? "";
    if (/\[imagem\]|\[image\]|\[sticker\]/i.test(c)) return "image"; if (/\[áudio\]|\[audio\]/i.test(c)) return "audio"; if (/\[vídeo\]|\[video\]/i.test(c)) return "video"; if (/\[documento\]|\[document\]/i.test(c)) return "document";
    if ((mt === "attachment" || mt === "file") && u) { if (/image/i.test(u)) return "image"; if (/audio/i.test(u)) return "audio"; if (/video/i.test(u)) return "video"; return "document"; }
    return null;
  };

  const renderMedia = (m: InboxMessageDto, out: boolean, isNote: boolean) => {
    if (!m.mediaUrl) return null;
    const url = resolveMediaUrl(m.mediaUrl); if (!url) return null;
    const kind = detectMediaKind(m);
    // Mensagem otimista (ainda subindo p/ servidor) — `id` começa com "temp-".
    // Usado p/ exibir estado "Enviando…" em todos os tipos de mídia: o
    // operador vê feedback claro de que o anexo está em curso, mesmo
    // quando a URL local (blob:) já permite preview imediato.
    const isUploading = typeof m.id === "string" && m.id.startsWith("temp-");
    if (kind === "audio") {
      const time = m.createdAt ? chatTime(m.createdAt) : undefined;
      const showDelivery = out && !isNote && m.sendStatus !== "failed" && !isUploading;
      const status = (m.sendStatus === "read" ? "read" : m.sendStatus === "delivered" ? "delivered" : "sent") as "sent" | "delivered" | "read";
      // Gravação de chamada outbound: extrai nome limpo de `senderName`
      // ("WhatsApp · chamada · Marcelo Pinheiro" → "Marcelo Pinheiro") em
      // vez do `effectiveSignature` global, garantindo que o áudio mostre
      // QUEM realmente conduziu a ligação.
      const isCallRec = String(m.messageType ?? "").toLowerCase() === "whatsapp_call_recording";
      const callAgentName = isCallRec && m.senderName
        ? m.senderName.replace(/^WhatsApp\s+·\s+(?:chamada\s+·\s+)?/i, "").trim()
        : "";
      const audioSenderLabel = isCallRec && out
        ? (callAgentName || "Gravação de chamada")
        : out && !isNote && signatureEnabled
          ? effectiveSignature
          : !out
            ? m.senderName ?? undefined
            : undefined;
      return (
        <AudioMessage
          url={url}
          time={time}
          showDeliveryCheck={showDelivery}
          deliveryStatus={status}
          out={out && !isNote}
          senderLabel={audioSenderLabel}
          isUploading={isUploading}
        />
      );
    }

    const fileName = (m.content ?? "")
      .replace(/^📎\s*/, "")
      .replace(/^\[.*\]$/, "")
      .trim() || (kind === "image" ? "image.jpeg" : kind === "video" ? "video.mp4" : "Documento");

    if (kind === "video") {
      return (
        <div className="relative">
          <video controls preload="metadata" src={url} className="mb-2 max-h-56 w-full rounded-xl" />
          {isUploading && <UploadingOverlay label="Enviando vídeo…" rounded="rounded-xl" />}
        </div>
      );
    }

    if (kind === "image") {
      return (
        <div className="w-full">
          <div className="relative overflow-hidden rounded-lg border border-slate-100">
            {isUploading ? (
              <img src={url} alt="" className="max-h-[420px] w-full object-cover opacity-70" loading="lazy" />
            ) : (
              <a href={url} target="_blank" rel="noopener noreferrer" className="group block">
                <img src={url} alt="" className="max-h-[420px] w-full object-cover transition-opacity group-hover:opacity-[0.97]" loading="lazy" />
              </a>
            )}
            {isUploading && <UploadingOverlay label="Enviando imagem…" rounded="rounded-lg" />}
          </div>
        </div>
      );
    }

    // Preferir extensão extraída do fileName (mais confiável que URL blob/sem extensão)
    const extractExt = (s: string): string => {
      const match = s.match(/\.([a-z0-9]{1,6})(?:$|\?)/i);
      return match ? match[1].toLowerCase() : "";
    };
    const ext = extractExt(fileName) || extractExt(url.split("?")[0]);
    const isPdf = ext === "pdf";
    const isAudioFile = /^(mp3|wav|ogg|m4a|aac|amr|opus|webm)$/i.test(ext);
    const typeLabel = isUploading
      ? "Enviando…"
      : isPdf ? "Arquivo PDF" : isAudioFile ? `Áudio ${ext.toUpperCase()}` : ext ? `Arquivo ${ext.toUpperCase()}` : "Arquivo";
    const iconColor = isPdf ? "bg-indigo-600" : isAudioFile ? "bg-orange-500" : "bg-slate-500";

    return (
      <div className="flex items-center gap-3">
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg text-white", iconColor)}>
          {isUploading ? <Loader2 className="size-5 animate-spin" /> : <FileText className="size-5" />}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className={cn("truncate text-sm font-bold", isUploading ? "text-slate-500" : "text-slate-800")}>{fileName}</p>
          <p className="text-[11px] font-bold capitalize text-slate-400">{typeLabel}</p>
        </div>
        {isUploading ? (
          <span className="shrink-0 p-1.5 text-slate-400" aria-label="Enviando">
            <Loader2 className="size-[18px] animate-spin" />
          </span>
        ) : (
          <TooltipHost label="Baixar arquivo" side="left">
            <a href={url} target="_blank" rel="noopener noreferrer" download className="shrink-0 p-1.5 text-slate-400 hover:text-slate-600" aria-label="Baixar arquivo">
              <Download className="size-[18px]" />
            </a>
          </TooltipHost>
        )}
      </div>
    );
  };

  const msgText = (m: InboxMessageDto) => {
    const raw = m.content ?? "";
    const c = prettifyChatMessageBody(raw).trim();
    if (!c) return null;
    if (/^📎\s*audio\.(webm|ogg|mp3|wav|m4a|aac|amr)$/i.test(c)) return null;
    if (m.mediaUrl && /^\[(?:imagem|image|áudio|audio|ptt|vídeo|video|sticker|documento|document)\]$/i.test(c)) return null;
    if (m.mediaUrl && /^📎\s/.test(c) && detectMediaKind(m) !== "document") return null;
    return c;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {sessionInfo && <SessionBar active={sessionActive} expiresAt={sessionExpiresAt} />}

      {/* Pinned note banner — fundo BRANCO sólido (sem gradient,
          sem amarelo) ocupando a faixa inteira do chat, com borda
          inferior pra separar do scroller. Identidade visual da
          nota fixada vem de:
            ▸ Borda lateral GROSSA (`border-l-4 slate-600`) — sinaliza
              "anotação operacional importante" sem usar cor primária.
            ▸ Chip do ícone Pin em `slate-100` ringado — peso semântico.
            ▸ Nome do agente em `slate-800` — único elemento "humano"
              ganha o destaque do header.
          Banner full-width (sem `max-w-[900px]`) garante que o topo
          fica "todo preenchido" — o operador entende que aquela faixa
          inteira é a nota fixada, não um cartão flutuante. */}
      {pinnedNote && (
        <div className="sticky top-0 z-20 shrink-0 border-b border-slate-200/80 bg-white px-6 py-3 shadow-[0_1px_0_rgba(15,23,42,0.02)] border-l-4 border-l-slate-600">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 ring-1 ring-slate-200">
              <Pin
                className="size-3.5 rotate-45"
                fill="currentColor"
                strokeWidth={2}
              />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">
                <span className="text-slate-500">Nota Fixada</span>
                {pinnedNote.senderName && (
                  <>
                    <span className="text-slate-300" aria-hidden>•</span>
                    <span className="text-slate-800">
                      {pinnedNote.senderName}
                    </span>
                  </>
                )}
              </div>
              <p className="mt-1.5 line-clamp-2 text-[13px] font-medium leading-snug text-slate-600">
                {pinnedNote.content}
              </p>
            </div>
            <TooltipHost label="Desfixar nota" side="left">
              <button type="button" onClick={() => pinNoteMutation.mutate(null)}
                aria-label="Desfixar nota"
                className="mt-0.5 shrink-0 rounded-lg p-1 text-slate-500 eduit-transition hover:bg-slate-100 hover:text-slate-700">
                <X className="size-3.5" />
              </button>
            </TooltipHost>
          </div>
        </div>
      )}

      {/* Messages — única zona de scroll vertical do chat
          Protocolo "High-End Luxury UI": px-12 + py-12 para respiro editorial,
          fundo #f8fafc/40 + shadow-inner para profundidade no topo.
          Mobile: px-4 + py-4 + gap-4 — em telas < 640px o respiro editorial
          (px-12 = 48px de cada lado) deixaria as bolhas com menos de 280px,
          então adaptamos pra px-4 + py-4. Identidade desktop é preservada
          com sm:px-12 sm:py-12 + sm:gap-8. */}
      <div className="scrollbar-thin relative min-h-0 flex-1 overflow-y-auto bg-[#f4f7fa] px-2.5 py-3 shadow-inner sm:px-12 sm:py-12">
        {/* Mobile: px-2.5 py-3 (Kommo-like — chat ocupa quase 100% da tela
            estreita); Desktop: px-12 py-12 (respiro editorial premium). */}
        {isFetching && !isLoading && (
          <div className="pointer-events-none absolute right-4 top-3 z-10 rounded-full bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-float">Atualizando…</div>
        )}
        <div className="mx-auto flex w-full flex-col gap-2 sm:gap-8">
          {/* Mobile: gap-2 entre mensagens (denso, log-feed estilo Kommo).
              Desktop: gap-8 (respiro editorial). */}
          {messages.map((m, idx) => {
            const prev = idx > 0 ? messages[idx - 1] : null;
            const showDate = shouldShowDateSeparator(prev, m);

            {
              const mt = String(m.messageType ?? "").toLowerCase();
              const raw = String(m.content ?? "").trim();

              // Rascunho gerado pelo agente de IA em modo DRAFT: não
              // é uma bolha normal, mas um card inline com ações
              // (aprovar/editar/descartar) pro operador humano.
              if (mt === "ai_draft" && m.isPrivate && conversationId) {
                return (
                  <React.Fragment key={m.id}>
                    {showDate && <DateSep date={m.createdAt} />}
                    <AIDraftCard
                      messageId={String(m.id)}
                      content={raw}
                      createdAt={m.createdAt}
                      senderName={m.senderName ?? null}
                      conversationId={conversationId}
                    />
                  </React.Fragment>
                );
              }

              /* Chamadas:
                 - Eventos sem mídia (`whatsapp_call`, ou `whatsapp_call_recording`
                   sem URL) → Activity Item compacto.
                 - Gravação com mídia (`whatsapp_call_recording` com `mediaUrl`)
                   → cai no fluxo normal de mensagem e renderiza como áudio
                   regular (bolha outbound cyan + AudioMessage com player). O
                   `detectMediaKind` (acima) já mapeia `whatsapp_call_recording`
                   para `"audio"`. */
              if (
                mt === "whatsapp_call" ||
                (mt === "whatsapp_call_recording" && !m.mediaUrl)
              ) {
                return (
                  <React.Fragment key={m.id}>
                    {showDate && <DateSep date={m.createdAt} />}
                    <CallActivityItem message={m} />
                  </React.Fragment>
                );
              }
              /* Respostas de opt-in da Meta Calling (permissão concedida/recusada): Activity Item. */
              const consentVerdict = detectConsentVerdict(raw);
              if (consentVerdict) {
                return (
                  <React.Fragment key={m.id}>
                    {showDate && <DateSep date={m.createdAt} />}
                    <ConsentActivityItem message={m} verdict={consentVerdict} />
                  </React.Fragment>
                );
              }
              /* API Meta: type "system" (ex. user_changed_number). Versões antigas gravavam só "[system]". */
              const isSystemRow =
                m.direction === "system" ||
                raw === "[system]" ||
                (mt === "system" && raw.startsWith("[Sistema"));
              if (isSystemRow) {
                const systemBody =
                  raw === "[system]" || raw === "[Sistema]"
                    ? "Evento do sistema WhatsApp. Mensagens antigas não tinham o texto; as novas mostram o aviso da Meta (ex.: cliente alterou o número)."
                    : (m.content || "Evento do sistema WhatsApp.");
                return (
                  <React.Fragment key={m.id}>
                    {showDate && <DateSep date={m.createdAt} />}
                    <SystemEventRow body={systemBody} createdAt={m.createdAt} />
                  </React.Fragment>
                );
              }
            }

            const out = m.direction === "out";
            const isNote = out && m.isPrivate === true;
            const isBot = out && (m.senderName === "Automação" || m.senderName === "Sistema");
            const msgId = String(m.id);
            const isHov = hoveredMsgId === m.id;
            const grouped = groupReactions(m.reactions ?? []);
            const showSenderName = m.senderName && (!prev || prev.direction !== m.direction);
            const next = idx < messages.length - 1 ? messages[idx + 1] : null;
            const isLastInGroup = !next || next.direction !== m.direction;

            const isPinned = pinnedNoteId === String(m.id);
            const isAudioOnly = !isNote && detectMediaKind(m) === "audio" && !msgText(m);

            return (
              <React.Fragment key={m.id}>
              {showDate && <DateSep date={m.createdAt} />}
              <MotionDiv
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={cn(
                  "group flex w-full",
                  // Nota interna = faixa "borda-a-borda" (Slack/Zendesk log).
                  // Fora do grid de balões: sem items-end, sem gap, ocupa
                  // a largura total disponível para enfatizar que é um
                  // registro de sistema, não um balão de conversa.
                  // Mobile: gap menor (gap-1.5) entre avatar e bolha pra
                  // densidade tipo Kommo. Desktop intocado (gap-2).
                  isNote ? "" : cn("items-end gap-1.5 md:gap-2", out ? "justify-end" : "justify-start"),
                )}
                onMouseEnter={() => setHoveredMsgId(m.id)} onMouseLeave={() => { if (reactionPickerMsgId !== m.id) setHoveredMsgId(null); }}>

              <div
                className={cn(
                  "relative",
                  // Mobile: bolha ocupa 92% pra aproveitar a tela estreita.
                  // Desktop: 85% original (mantém respiro lateral premium).
                  isNote ? "w-full" : "min-w-0 max-w-[92%] md:max-w-[85%]",
                )}
              >

                {/*
                  NB: botão de pin pra notas mora INLINE no header da nota
                  (ver bloco `isNote ? (...)` abaixo). Em layout borda-a-
                  borda, um botão flutuante absoluto briga com a leitura
                  da faixa — então ele fica sempre visível na linha do
                  cabecalho, no canto direito.
                */}
                {reactionPickerMsgId === m.id && (
                  <div data-reaction-picker className={cn("absolute bottom-full z-20 mb-1 flex items-center gap-0.5 rounded-[20px] border border-border bg-card px-1.5 py-1 shadow-lg", out ? "right-0" : "left-0")}>
                    {QUICK_REACTIONS.map((emoji) => (
                      <button key={emoji} type="button" onClick={() => reactionMutation.mutate({ messageId: msgId, emoji })}
                        className="flex size-8 items-center justify-center rounded-xl text-base eduit-transition hover:scale-125 hover:bg-chat-bg">{emoji}</button>
                    ))}
                  </div>
                )}

                <div className={cn(
                  "relative",
                  // Mobile: bolha mais "tight" (rounded-[14px]) pra densidade
                  // estilo Kommo. Desktop preserva o rounded-[20px] da
                  // identidade premium. Notas mantêm border-a-border
                  // (sem rounded) em todos os breakpoints.
                  isAudioOnly && "rounded-[14px] rounded-br-none md:rounded-[20px] md:rounded-br-none",
                  !isAudioOnly && out && !isNote && !isBot && "eduit-chat-sent-bubble rounded-[14px] rounded-br-none shadow-float md:rounded-[20px] md:rounded-br-none",
                  !isAudioOnly && out && !isNote && isBot && "eduit-chat-bot-bubble rounded-[14px] rounded-br-none shadow-float md:rounded-[20px] md:rounded-br-none",
                  // Nota interna: FAIXA BORDA-A-BORDA (Slack/Zendesk log).
                  // Paleta NEUTRA (slate) — feedback: o roxo/indigo
                  // "puxava" a atenção como se fosse alerta, mas nota é
                  // só lembrete interno. Mantém a borda lateral fininha
                  // como único acento (`border-l-2 slate-300`) e fundo
                  // `slate-50` (cinza claro). Pinned engrossa pra 4px e
                  // escurece pra `slate-400` + fundo `slate-100`.
                  !isAudioOnly && isNote && "w-full rounded-none border-y border-slate-200/80 bg-white border-l-[3px] border-l-slate-400",
                  isPinned && isNote && "border-l-4 border-l-slate-600 bg-slate-50",
                  !isAudioOnly && !out && !isNote && "rounded-[14px] rounded-tl-none border border-slate-100 bg-white shadow-float md:rounded-[20px] md:rounded-tl-none",
                )}>
                  {!isNote && (
                    /* Chip flutuante: posicionado FORA da bolha (acima do canto
                       superior direito). Antes acompanhava o lado da mensagem
                       (out→direita, in→esquerda) criando um efeito espelhado.
                       Por preferência do operador o chip agora fica SEMPRE no
                       final do balão — canto direito — independente da direção
                       da mensagem. O `align="end"` do popover é mantido pra
                       evitar que o menu seja cortado pelo overflow do scroller. */
                    <div
                      // Em mobile o chip de ações (responder/encaminhar/
                      // reagir) fica oculto: não existe hover, e long-press
                      // é um padrão de outro ciclo. Em md+ continua o
                      // comportamento original (aparece no hover/focus).
                      className="absolute -top-3 right-2 z-20 hidden opacity-0 transition-opacity duration-150 md:block focus-within:opacity-100 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className={cn(
                            "flex size-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-float outline-none transition-colors hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-offset-1",
                            out ? "focus-visible:ring-info/50" : "focus-visible:ring-border",
                          )}
                          aria-label="Ações da mensagem"
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-100 min-w-44">
                          <DropdownMenuItem
                            onClick={() => {
                              setReplyTo(m);
                              textareaRef.current?.focus();
                            }}
                          >
                            <Reply className="size-3.5 shrink-0 opacity-70" />
                            Responder
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setForwardingMessage(m)}>
                            <Share2 className="size-3.5 shrink-0 opacity-70" />
                            Encaminhar…
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setReactionPickerMsgId(m.id)}>
                            <Smile className="size-3.5 shrink-0 opacity-70" />
                            Reagir…
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}

                  {m.replyToPreview && (
                    <div className={cn(
                      // Quote/reply: padding mais tight em mobile pra
                      // não ocupar 1/3 da bolha. Desktop intocado.
                      "mx-2 mt-1.5 flex flex-col gap-0.5 overflow-hidden rounded-lg border-l-4 p-1.5 md:mx-3 md:mt-2 md:p-2",
                      out && !isNote
                        ? "border-accent bg-slate-100/60"
                        : "border-accent bg-slate-50",
                    )}>
                      <span className="text-[9px] font-black uppercase text-accent tracking-tight">Respondendo</span>
                      <span className="line-clamp-2 text-[11px] text-slate-500 md:text-[12px]">{m.replyToPreview}</span>
                    </div>
                  )}

                  <div className={cn(
                    isAudioOnly
                      ? ""
                      : isNote
                        // Respiro generoso horizontal (px-8) pra combinar com
                        // a "respiração" de uma faixa borda-a-borda; py-5 para
                        // altura tipográfica confortável na leitura do log.
                        // Em mobile (px-4 py-3) reduz pra evitar que a faixa
                        // ocupe altura desproporcional na tela vertical.
                        ? "px-4 py-3 md:px-8 md:py-5"
                        // Mobile: padding mais tight (px-3 pb-1 pt-1) — Kommo
                        // style. Desktop preserva os offsets exatos da
                        // identidade (px-[14px] pb-2 pt-[6px]).
                        : "px-3 pb-1 pt-1 md:px-[14px] md:pb-2 md:pt-[6px]",
                  )}>
                    {isNote ? (
                      <div className="mb-2 flex items-center gap-2">
                        {/* Ícone Lock dentro de "chip" — dá peso semântico
                            sem precisar de cor primária. Mesmo padrão
                            usado na nota fixada do topo. */}
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                          <Lock className="size-3" strokeWidth={2.5} />
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                          Nota interna
                        </span>
                        {m.senderName && (
                          <>
                            <span className="text-[10px] font-bold text-slate-300" aria-hidden>
                              ·
                            </span>
                            {/* Nome do agente: cinza ESCURO (`slate-800`)
                                em caps naturais (sem `uppercase`). É o
                                único elemento "humano" do header da nota
                                — recebe o peso visual; os labels técnicos
                                em volta ficam em cinza médio. */}
                            <span className="text-[11px] font-black tracking-tight text-slate-800">
                              {m.senderName}
                            </span>
                          </>
                        )}
                        {/* Pin inline — sempre visível no header da nota.
                            Clicável: alterna o estado fixar/desfixar.
                            Em layout borda-a-borda, o botão flutuante no
                            hover brigava com a leitura; inline é o padrão
                            que Slack e Zendesk usam pra ações de log. */}
                        <TooltipHost
                          label={isPinned ? "Desfixar nota" : "Fixar no topo"}
                          side="top"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              pinNoteMutation.mutate(
                                isPinned ? null : String(m.id),
                              )
                            }
                            aria-label={
                              isPinned ? "Desfixar nota" : "Fixar no topo"
                            }
                            aria-pressed={isPinned}
                            className={cn(
                              "ml-auto flex size-6 items-center justify-center rounded-md eduit-transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50",
                              isPinned
                                ? "text-slate-600 hover:text-slate-800"
                                : "text-slate-400 hover:text-slate-600",
                            )}
                          >
                            {isPinned ? (
                              <Pin
                                className="size-3.5 rotate-45"
                                fill="currentColor"
                                strokeWidth={2}
                              />
                            ) : (
                              <Pin className="size-3.5 rotate-45" strokeWidth={2} />
                            )}
                          </button>
                        </TooltipHost>
                      </div>
                    ) : (out ? (
                      // Mensagens enviadas: quando geradas por automação,
                      // carimbamos um chip compacto "Automação" com ícone
                      // de robô. Paleta neutra (slate) — o âmbar anterior
                      // competia com alertas reais do chat.
                      isBot && !isAudioOnly ? (
                        <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-slate-200/70 px-2 py-0.5 ring-1 ring-slate-300/70">
                          <Bot className="size-3 text-slate-600" strokeWidth={2.4} />
                          <span className="font-outfit text-[10px] font-black uppercase tracking-[0.08em] text-slate-700">
                            {m.senderName ?? "Automação"}
                          </span>
                        </div>
                      ) : null
                    ) : (showSenderName && !isAudioOnly ? (
                      // Label do remetente (contato): preserva o case cadastrado
                      // no CRM (sem `uppercase` forçado) e usa tipografia mais
                      // leve — `font-semibold` + `tracking-tight` — evitando o
                      // ar "MARCILIO"-like que `font-black tracking-widest`
                      // produzia, e que o operador pediu pra suavizar. Bot
                      // mantém destaque de cor (âmbar) só no ícone.
                      <p className={cn(
                        "font-outfit mb-1 text-[12px] font-semibold tracking-tight",
                        isBot ? "text-chat-bot-foreground" : "text-brand-navy/90",
                      )}>
                        {isBot && <Bot className="inline size-3.5 shrink-0 mr-1" />}
                        {m.senderName}:
                      </p>
                    ) : null))}
                    {/*
                      Mensagens do agente (out=true) NÃO renderizam mais um
                      label visual de assinatura: o prefixo "Nome: " é agora
                      embutido no próprio `content` ao enviar (ver `onSend`),
                      garantindo paridade com o que o cliente recebe no
                      WhatsApp. Evita duplicação e respeita o pedido do
                      operador de que a assinatura faça parte da mensagem.
                    */}

                    {String(m.messageType ?? "").toLowerCase() === "template" && (
                      <TemplateBadge content={m.content ?? ""} />
                    )}

                    {renderMedia(m, out, isNote)}

                    {(() => {
                      const text = msgText(m);
                      const time = m.createdAt ? chatTime(m.createdAt) : "";
                      const showCheck = out && !isNote && m.sendStatus !== "failed";
                      const isFailed = m.sendStatus === "failed";
                      const status = m.sendStatus || "sent";
                      const isRead = status === "read";
                      const isDelivered = status === "delivered" || isRead;
                      // "Entrega não confirmada": mensagem ficou em `sent` sem
                      // virar `delivered` por tempo demais. Pode indicar número
                      // Meta pausado, quality rating rebaixado, ou mensagem
                      // engolida silenciosamente pela Cloud API. Não é uma
                      // falha definitiva (sweeper marca como `failed` após
                      // 15 min), só um aviso visual proativo no chat para o
                      // operador perceber antes que a automação continue.
                      const stalePending = (() => {
                        if (!out || isNote || isFailed || isDelivered) return false;
                        if (status !== "sent") return false;
                        if (!m.createdAt) return false;
                        const ts = new Date(m.createdAt).getTime();
                        if (!Number.isFinite(ts)) return false;
                        return Date.now() - ts > 5 * 60 * 1_000;
                      })();
                      const checkColor = isRead ? "text-[#53bdeb]" : stalePending ? "text-amber-500" : "text-[#667781]";

                      const fullTs = m.createdAt ? chatFullTimestamp(m.createdAt) : "";
                      const tzOffset = m.createdAt ? chatTimezoneOffset(m.createdAt) : "";
                      const tzName = chatTimezoneName();
                      const relTime = m.createdAt ? chatRelativeTime(m.createdAt) : "";

                      const timeEl = (
                        <span className="group/time relative inline-flex items-center gap-1 whitespace-nowrap text-[10px] text-[#667781]" style={{ fontVariantNumeric: "tabular-nums" }}>
                          <span className="cursor-default">{time}</span>
                          {m.createdAt && (
                            <span
                              role="tooltip"
                              className="pointer-events-none invisible absolute bottom-full right-0 z-50 mb-1.5 w-max max-w-[260px] rounded-lg bg-[#1e293b] px-3 py-2 text-left text-[11px] font-medium leading-tight text-white opacity-0 shadow-xl transition-[opacity,visibility] duration-150 group-hover/time:visible group-hover/time:opacity-100"
                            >
                              <span className="block font-bold">{fullTs}</span>
                              <span className="block text-white/70">
                                ({tzOffset}){tzName ? ` ${tzName}` : ""}
                              </span>
                              <span className="mt-1 block font-semibold text-white/90">{relTime}</span>
                            </span>
                          )}
                          {isFailed ? <AlertTriangle className="size-3 text-destructive" /> : showCheck ? (
                            isDelivered ? (
                              <svg viewBox="0 0 16 11" height="11" width="16" fill="currentColor" className={checkColor}>
                                <path d="M11.07.66 5.84 5.89 3.15 3.2a.54.54 0 0 0-.76 0l-.7.7c-.21.21-.21.54 0 .76l3.72 3.72c.21.21.54.21.76 0l6.25-6.25c.21-.21.21-.55 0-.76l-.7-.7a.54.54 0 0 0-.76 0l-.09.09Z" />
                                <path d="M15.07.66 9.84 5.89 8.88 4.93a.54.54 0 0 0-.76 0l-.7.7c-.21.21-.21.54 0 .76l2.15 2.15c.21.21.54.21.76 0l6.25-6.25c.21-.21.21-.55 0-.76l-.7-.7a.54.54 0 0 0-.76 0Z" opacity=".75" />
                              </svg>
                            ) : stalePending ? (
                              <span className="group/stale relative inline-flex items-center" title="Entrega não confirmada pela Meta após 5 min — número pode estar pausado ou flagged.">
                                <Clock className="size-3 text-amber-500" strokeWidth={2.5} />
                                <span
                                  role="tooltip"
                                  className="pointer-events-none invisible absolute bottom-full right-0 z-50 mb-1.5 w-max max-w-[240px] rounded-lg bg-amber-900 px-2.5 py-1.5 text-left text-[11px] font-medium leading-tight text-amber-50 opacity-0 shadow-xl transition-[opacity,visibility] duration-150 group-hover/stale:visible group-hover/stale:opacity-100"
                                >
                                  Entrega não confirmada após 5 min — número pode estar pausado, flagged ou com qualidade rebaixada.
                                </span>
                              </span>
                            ) : (
                              <svg viewBox="0 0 12 11" height="11" width="12" fill="currentColor" className="text-[#667781]">
                                <path d="M11.07.66 5.84 5.89 3.15 3.2a.54.54 0 0 0-.76 0l-.7.7c-.21.21-.21.54 0 .76l3.72 3.72c.21.21.54.21.76 0l6.25-6.25c.21-.21.21-.55 0-.76l-.7-.7a.54.54 0 0 0-.76 0l-.09.09Z" />
                              </svg>
                            )
                          ) : null}
                        </span>
                      );

                      if (text) {
                        // Nota interna: texto em aspas tipográficas curvas,
                        // `font-medium` (sem itálico — feedback do operador:
                        // itálico estava lendo como "citação literária",
                        // a nota é só lembrete operacional).
                        // `text-slate-600` (médio legível): meio termo
                        // entre slate-700 (escuro, competia com mensagens)
                        // e slate-500 (claro demais, parecia desabilitado).
                        // O peso visual da identidade "isso é uma nota"
                        // vem da BORDA LATERAL grossa + fundo amarelado
                        // sutil (#fdfaf0), não do peso do texto. Aspas
                        // curvas em `slate-400` enquadram o conteúdo.
                        // Timestamp inline abaixo (não absolute) pra
                        // respeitar o respiro vertical do `py-5`.
                        if (isNote) {
                          return (
                            <>
                              <p className="font-outfit text-[14px] font-medium leading-relaxed text-slate-600 whitespace-pre-wrap wrap-break-word">
                                <span className="mr-0.5 select-none text-slate-400" aria-hidden>
                                  “
                                </span>
                                {text}
                                <span className="ml-0.5 select-none text-slate-400" aria-hidden>
                                  ”
                                </span>
                              </p>
                              <div className="mt-3 flex justify-end">{timeEl}</div>
                            </>
                          );
                        }
                        // Corpo da mensagem: `font-medium` (500) para leitura
                        // confortável em parágrafos curtos e longos.
                        // `font-semibold` (600) estava visualmente "pesado
                        // demais" em mensagens curtas de chat — feedback real
                        // de uso. Tracking default (sem `tracking-tighter`)
                        // preserva ritmo natural de leitura.
                        return (
                          <p
                            className={cn(
                              // Mobile: 15px leading-snug (1.375) — aproveita
                              // melhor a área de chat em telas grandes sem
                              // sacrificar densidade no mobile.
                              // Desktop: 16px leading-normal — leitura mais
                              // confortável em conversas longas.
                              "font-outfit text-[15px] font-medium leading-snug md:text-[16px] md:leading-normal",
                              out ? "text-slate-800" : "text-slate-700",
                            )}
                          >
                            <span className="whitespace-pre-wrap wrap-break-word">{text}</span>
                            {/* Reserva pro timestamp inline. Mobile usa
                                 60px (time menor); desktop preserva 72px. */}
                            <span className="inline-block w-[60px] md:w-[72px]" />
                            <span className="absolute bottom-[5px] right-3 md:bottom-[7px] md:right-[14px]">{timeEl}</span>
                          </p>
                        );
                      }
                      // Áudio tem seu próprio rodapé de delivery; evita duplicação.
                      if (detectMediaKind(m) === "audio") return null;
                      return <div className="mt-1 flex justify-end">{timeEl}</div>;
                    })()}
                  </div>

                  {m.sendStatus === "failed" && (
                    <div className="flex items-center gap-2 rounded-b-[16px] border-t border-[rgba(239,68,68,0.2)] bg-destructive/5 px-3.5 py-2">
                      <AlertTriangle className="size-3.5 shrink-0 text-destructive" />
                      <span className="flex-1 truncate text-[11px] text-destructive">{m.sendError ?? "Falha ao enviar"}</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); if (conversationId && m.content) sendMutation.mutate({ content: m.content, asNote: false }); }}
                        className="shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-medium text-destructive eduit-transition hover:bg-destructive/10">Reenviar</button>
                    </div>
                  )}
                </div>

                {grouped.length > 0 && (
                  <div className={cn("mt-1 flex flex-wrap gap-1", out ? "justify-end" : "justify-start")}>
                    {grouped.map((g) => (
                      <button key={g.emoji} type="button" onClick={() => reactionMutation.mutate({ messageId: msgId, emoji: g.emoji })}
                        className="inline-flex items-center gap-0.5 rounded-full border border-border bg-card px-2 py-0.5 text-xs shadow-float eduit-transition hover:scale-105 hover:shadow-md" title={g.senders.join(", ")}>
                        <span>{g.emoji}</span>{g.count > 1 && <span className="text-[10px] text-muted-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>{g.count}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {out && !isNote && isLastInGroup && (
                <div className="group/avatar relative mb-0.5 hidden shrink-0 sm:block">
                  {/* Avatar do agente em mensagens out: oculto em mobile
                      (< sm) pra ganhar largura — em chat estreito o
                      avatar pequeno pixela e disputa espaço com o
                      texto. Ainda visível em sm+ (tablet vertical em
                      diante) e em todo desktop. */}
                  <ChatAvatar
                    name={m.senderName || "Admin EduIT"}
                    imageUrl={
                      isBot
                        ? null
                        : m.senderImageUrl ??
                          // Fallback p/ mensagens otimistas (ainda sem
                          // resposta do servidor) E p/ DTOs antigos sem
                          // `senderImageUrl`: usa a foto do agente logado
                          // se o nome bater. Garante 0 flicker entre o
                          // optimistic update e o refetch.
                          ((session?.user?.name ?? "").toLowerCase() ===
                          (m.senderName ?? "").toLowerCase()
                            ? session?.user?.image ?? null
                            : null)
                    }
                    size={32}
                    channel="whatsapp"
                    hideCartoon
                    isBot={isBot}
                  />
                  <span
                    role="tooltip"
                    className="pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#1e293b] px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-[opacity,visibility] duration-150 group-hover/avatar:visible group-hover/avatar:opacity-100"
                  >
                    {m.senderName || "Admin EduIT"}
                  </span>
                </div>
              )}
              {out && !isNote && !isLastInGroup && (
                <div className="hidden w-8 shrink-0 sm:block" />
              )}
              </MotionDiv>
              </React.Fragment>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {!sessionActive && sessionInfo && !isBaileysChannel && (
        // Alerta "ação base" acima do input — hierarquia alta.
        // px-8 py-4 dá respiro premium; ícone num círculo suave
        // (bg-red-100) destaca sem agredir, e o CTA em brand-blue
        // aproveita a sombra projetada azulada pra chamar ação.
        <div className="shrink-0 border-t border-red-100/50 bg-red-50/50 px-3 py-3 sm:px-8 sm:py-4">
          {/* Mobile: padding reduzido + CTA em width:full abaixo do texto.
              Desktop: layout horizontal original com CTA à direita. */}
          <div className="mx-auto flex max-w-[900px] flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-3 sm:contents">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-100 sm:size-10">
                <AlertCircle className="size-4 text-red-500 sm:size-5" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-black tracking-tight text-slate-800 sm:text-[14px]">
                  Janela de 24h expirada
                </p>
                <p className="mt-0.5 text-[11px] font-bold text-slate-400">
                  Use um template oficial da Meta para reabrir a conversa
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActivePanel("templates")}
              className="shrink-0 rounded-2xl bg-brand-blue px-4 py-2 text-[12px] font-black uppercase tracking-wide text-white shadow-lg shadow-blue-500/20 eduit-transition hover:bg-brand-blue/90 hover:shadow-xl hover:shadow-blue-500/25 active:scale-[0.98] sm:px-5 sm:py-2.5 sm:text-[13px]"
            >
              Enviar Template
            </button>
          </div>
        </div>
      )}

      {/* Banner de mensagens agendadas pendentes.
          Fica acima do composer como "barra de estado" discreta,
          tecla a mesma max-width que o composer pra alinhamento visual.
          Exibe no máximo 2 agendamentos em detalhe e condensa o resto
          num "+N mais" pra não ocupar muito espaço vertical. */}
      {pendingScheduled.length > 0 && (
        <div className="shrink-0 border-t border-sky-100 bg-sky-50/70 px-3 py-2 sm:px-6">
          <div className="mx-auto flex max-w-[900px] flex-col gap-1.5">
            {pendingScheduled.slice(0, 2).map((sm) => {
              const when = new Date(sm.scheduledAt);
              const whenLabel = when.toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <div
                  key={sm.id}
                  className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-1.5 text-[12px] text-sky-900"
                >
                  <Clock className="size-3.5 shrink-0 text-sky-600" strokeWidth={2.25} />
                  <span className="font-semibold">Agendada para {whenLabel}</span>
                  <span className="hidden truncate text-sky-800/80 sm:inline">
                    — {sm.content.slice(0, 80) || (sm.fallbackTemplateName ? `Template: ${sm.fallbackTemplateName}` : "[anexo]")}
                  </span>
                  <button
                    type="button"
                    onClick={() => cancelScheduledMutation.mutate(sm.id)}
                    disabled={cancelScheduledMutation.isPending}
                    className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-semibold text-sky-800 transition-colors hover:bg-sky-200 disabled:opacity-50"
                  >
                    <X className="size-3" /> Cancelar
                  </button>
                </div>
              );
            })}
            {pendingScheduled.length > 2 && (
              <p className="text-[11px] font-medium text-sky-700">
                +{pendingScheduled.length - 2} outro(s) agendamento(s) pendente(s)
              </p>
            )}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="shrink-0 border-t border-border bg-card">
        {/* Mobile: px-3 (composer encosta nas bordas pra ganhar largura
            de digitação). Desktop: px-6 preserva o respiro premium. */}
        <div className="mx-auto max-w-[900px] px-3 sm:px-6">
          <QuickReplies open={activePanel === "quick-replies"} onPick={(t) => { setDraft(t); setActivePanel("none"); textareaRef.current?.focus(); }} />
          <EmojiPicker open={activePanel === "emoji"} onPick={insertEmoji} />
          <TemplatePicker
            open={activePanel === "templates"}
            onPick={(t) => {
              if (!sessionActive && conversationId) {
                setPendingTemplate({ name: t.name, label: t.label, content: t.content });
              } else {
                setDraft(t.content);
              }
              setActivePanel("none");
              textareaRef.current?.focus();
            }}
          />

          {activePanel === "task" && (
            <div className="rounded-t-[16px] border border-b-0 border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <CheckSquare className="size-4 text-success" />
                <span className="text-[14px] font-semibold text-info">Nova tarefa</span>
                <button
                  type="button"
                  onClick={() => setActivePanel("none")}
                  className="ml-auto rounded-xl p-1 text-muted-foreground hover:text-info"
                  aria-label="Fechar"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(130px,180px)_minmax(0,1fr)]">
                <SelectNative
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  className="h-9 min-w-0 rounded-xl text-[13px]"
                >
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </SelectNative>
                <Input
                  type="datetime-local"
                  value={taskScheduled}
                  onChange={(e) => setTaskScheduled(e.target.value)}
                  className="h-9 min-w-0 rounded-xl text-[13px]"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Título da tarefa..."
                  className="h-9 min-w-0 flex-1 rounded-xl text-[14px]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && taskTitle.trim()) taskMutation.mutate();
                  }}
                />
                <Button
                  size="sm"
                  className="eduit-accent-gradient h-9 shrink-0 rounded-xl border-0 px-5 text-white sm:w-auto"
                  disabled={!taskTitle.trim() || taskMutation.isPending}
                  onClick={() => taskMutation.mutate()}
                >
                  {taskMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Criar"}
                </Button>
              </div>
            </div>
          )}

          {activePanel === "schedule" && (
            <div className="rounded-t-[16px] border border-b-0 border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <Clock className="size-4 text-info" />
                <span className="text-[14px] font-semibold text-info">
                  Agendar mensagem
                </span>
                <button
                  type="button"
                  onClick={() => setActivePanel("none")}
                  className="ml-auto rounded-xl p-1 text-muted-foreground hover:text-info"
                  aria-label="Fechar"
                >
                  <X className="size-4" />
                </button>
              </div>

              <textarea
                value={scheduleContent}
                onChange={(e) => setScheduleContent(e.target.value)}
                placeholder="Digite a mensagem que será enviada no horário escolhido..."
                rows={3}
                className="mb-2 w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-[14px] outline-none focus:border-accent"
              />

              <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <Input
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  min={new Date(Date.now() - 60_000).toISOString().slice(0, 16)}
                  className="h-9 min-w-0 rounded-xl text-[13px]"
                />
                <div className="flex items-center gap-2">
                  <input
                    ref={scheduleFileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      if (f.size > 16 * 1024 * 1024) {
                        toast.warning("O arquivo excede o limite de 16 MB.");
                        return;
                      }
                      setScheduleFile(f);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => scheduleFileInputRef.current?.click()}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-input bg-background px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Paperclip className="size-3.5" />
                    {scheduleFile ? "Trocar anexo" : "Anexo"}
                  </button>
                </div>
              </div>

              {scheduleFile && (
                <div className="mb-2 flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2 text-[12px]">
                  <Paperclip className="size-3.5 text-muted-foreground" />
                  <span className="truncate font-medium text-foreground">
                    {scheduleFile.name}
                  </span>
                  <span className="text-muted-foreground">
                    ({Math.round(scheduleFile.size / 1024)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={() => setScheduleFile(null)}
                    className="ml-auto rounded-xl p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Remover anexo"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              )}

              {!isBaileysChannel && (
                <div className="mb-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-[12px]">
                  <label className="flex cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={scheduleUseFallback}
                      onChange={(e) => {
                        const on = e.target.checked;
                        setScheduleUseFallback(on);
                        if (!on) setScheduleTemplate(null);
                      }}
                      className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-input accent-accent"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">
                        Usar template fallback se a sessão de 24h expirar
                      </p>
                      <p className="mt-0.5 text-muted-foreground">
                        {scheduleUseFallback
                          ? "Se a sessão de 24h estiver expirada no horário do envio, o template será usado em vez do texto livre."
                          : "Se a sessão expirar antes do envio, a mensagem será cancelada e você será notificado."}
                      </p>
                    </div>
                  </label>

                  {scheduleUseFallback && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-6">
                      {scheduleTemplate ? (
                        <>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground ring-1 ring-border">
                            <LayoutTemplate className="size-3" />
                            {scheduleTemplate.label || scheduleTemplate.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowScheduleTemplatePicker(true)}
                            className="text-[11px] font-medium text-accent underline underline-offset-2 hover:text-accent/80"
                          >
                            Trocar
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowScheduleTemplatePicker(true)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-[11px] font-semibold text-foreground ring-1 ring-border transition-colors hover:bg-muted"
                        >
                          <LayoutTemplate className="size-3" />
                          Escolher template fallback
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <p className="mb-3 text-[11px] text-muted-foreground">
                O agendamento será cancelado automaticamente se o cliente
                responder ou se algum agente enviar mensagem antes do horário.
              </p>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActivePanel("none")}
                  className="h-9 rounded-xl px-4 text-[13px] font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </button>
                <Button
                  size="sm"
                  className="eduit-accent-gradient h-9 shrink-0 rounded-xl border-0 px-5 text-white"
                  disabled={
                    scheduleMutation.isPending ||
                    (!scheduleContent.trim() && !scheduleFile) ||
                    !scheduleAt.trim() ||
                    // Se o operador marcou "usar fallback" em canal Meta,
                    // exige um template selecionado antes de permitir agendar.
                    (!isBaileysChannel && scheduleUseFallback && !scheduleTemplate)
                  }
                  onClick={() => scheduleMutation.mutate()}
                >
                  {scheduleMutation.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    "Agendar"
                  )}
                </Button>
              </div>
            </div>
          )}

          {showScheduleTemplatePicker && (
            <TemplatePicker
              open
              onPick={(t) => {
                setScheduleTemplate({ name: t.name, label: t.label, content: t.content });
                setShowScheduleTemplatePicker(false);
              }}
            />
          )}
        </div>

        {replyTo && (
          <div className="mx-auto max-w-[900px] px-6 pt-2">
            <div className="flex items-start gap-2 rounded-t-[16px] bg-chat-bg px-4 py-2.5">
              <div className="min-w-0 flex-1 border-l-[3px] border-accent pl-3">
                {replyTo.senderName && <p className="text-[11px] font-semibold text-accent">{replyTo.senderName}</p>}
                <p className="line-clamp-2 text-[13px] text-muted-foreground">{replyTo.content}</p>
              </div>
              <button type="button" onClick={() => setReplyTo(null)} className="shrink-0 rounded-xl p-1 text-muted-foreground eduit-transition hover:bg-muted hover:text-info"><X className="size-4" /></button>
            </div>
          </div>
        )}
        {pendingFile && (
          <div className="mx-auto max-w-[900px] px-6 pt-2">
            <div className="flex items-center gap-2 rounded-[16px] bg-chat-bg px-4 py-2.5">
              <Paperclip className="size-4 text-muted-foreground" /><span className="max-w-[200px] truncate text-[14px] font-medium text-foreground">{pendingFile.name}</span>
              <span className="text-[12px] text-muted-foreground">({(pendingFile.size / 1024).toFixed(0)} KB)</span>
              <button type="button" onClick={() => setPendingFile(null)} className="ml-auto rounded-xl p-1 text-muted-foreground eduit-transition hover:bg-muted hover:text-info"><X className="size-4" /></button>
            </div>
          </div>
        )}
        {pendingTemplate && (
          <div className="mx-auto max-w-[900px] px-6 pt-3">
            <div className="rounded-[16px] border border-success/30 bg-success/5 p-4">
              <div className="flex items-start gap-3">
                <LayoutTemplate className="mt-0.5 size-5 shrink-0 text-success" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-foreground">
                    {pendingTemplate.label || pendingTemplate.name}
                  </p>
                  {pendingTemplate.label && (
                    <p className="font-mono text-[11px] text-muted-foreground">{pendingTemplate.name}</p>
                  )}
                  <p className="mt-1.5 whitespace-pre-wrap text-[13px] text-surface-foreground leading-relaxed">
                    {pendingTemplate.content}
                  </p>
                </div>
                <button type="button" onClick={() => setPendingTemplate(null)}
                  className="shrink-0 rounded-xl p-1 text-muted-foreground eduit-transition hover:bg-muted hover:text-info">
                  <X className="size-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" className="rounded-xl px-4 text-[13px]"
                  onClick={() => setPendingTemplate(null)}>
                  Cancelar
                </Button>
                <button type="button"
                  disabled={templateSendMutation.isPending}
                  onClick={() => {
                    if (conversationId) {
                      templateSendMutation.mutate({ templateName: pendingTemplate.name, bodyPreview: pendingTemplate.content }, { onSuccess: () => setPendingTemplate(null) });
                    }
                  }}
                  className="flex items-center gap-2 rounded-[14px] eduit-accent-gradient px-5 py-2 text-[13px] font-medium text-white shadow-[0_4px_12px_rgba(0,212,170,0.3)] eduit-transition hover:scale-105 disabled:opacity-50">
                  {templateSendMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Enviar Template
                </button>
              </div>
            </div>
          </div>
        )}
        {noteMode && (
          <div className="mx-auto flex max-w-[900px] items-center gap-2 px-6 pt-2">
            <Lock className="size-3 text-muted-foreground" />
            <p className="text-[11px] font-semibold uppercase text-muted-foreground" style={{ letterSpacing: "0.5px" }}>Nota interna — visível apenas para a equipe</p>
          </div>
        )}

        {/* Composer — agent header + toggle + input em um único cartão.
            Mobile: padding lateral menor (px-3) e `pb` arbitrário com
            env(safe-area-inset-bottom) + 0.75rem pra respeitar o home
            indicator do iPhone. Desktop (sm+) mantém p-6 cheio (24px). */}
        <footer className="border-t border-slate-100 bg-white px-3 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] sm:p-6">
          <div className="rounded-[24px] border border-slate-100 bg-white shadow-sm">
            {/* Cabeçalho: apenas assinatura do agente (toggle + nome +
                lápis pra editar). O segmented Mensagem/Nota/Timeline
                que ficava à direita foi removido — Nota virou toggle
                inline na barra de ações; Timeline saiu da composer. */}
            <div className="flex items-center border-b border-slate-100 px-5 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <TooltipHost label={signatureEnabled ? "Desligar assinatura" : "Ligar assinatura"} side="top">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={signatureEnabled}
                    aria-label={signatureEnabled ? "Desligar assinatura" : "Ligar assinatura"}
                    onClick={() => persistSignatureEnabled(!signatureEnabled)}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                      signatureEnabled ? "bg-brand-blue" : "bg-slate-300",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block size-4 transform rounded-full bg-white shadow transition-transform",
                        signatureEnabled ? "translate-x-[18px]" : "translate-x-[2px]",
                      )}
                    />
                  </button>
                </TooltipHost>
                <span
                  className={cn(
                    // max-w garante que o truncate so corte quando
                    // realmente nao couber. Antes em mobile o "Caio"
                    // virava "Caio…" cortado a meio caractere ("€aio")
                    // porque o flex pai estreitava demais o slot do
                    // nome. min-w-0 + max-w-[160px] em mobile (que e
                    // ~3-4x o tamanho do nome tipico) e auto em sm+.
                    "min-w-0 max-w-[160px] truncate text-[14px] font-bold transition-colors sm:max-w-none",
                    signatureEnabled ? "text-slate-800" : "text-slate-400 line-through",
                  )}
                >
                  {effectiveSignature}
                </span>
                <TooltipHost label="Customizar assinatura" side="top">
                  <button
                    type="button"
                    onClick={() => { setSignatureDraft(signature); setSignatureModalOpen(true); }}
                    className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Customizar assinatura"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                </TooltipHost>
              </div>
              {/* (Segmented picker Mensagem/Nota/Timeline removido —
                  ver comentário em `noteMode`. A nota virou um toggle
                  inline na barra de ações abaixo; a timeline saiu da
                  composer por completo.) */}
            </div>

          {/* Composer body — em mobile vira 2 linhas (textarea+send em
              cima, toolbar embaixo) via flex-wrap+order. Sem isso o
              textarea sumia na pratica: 7 icones + 2 botoes nao deixavam
              espaco para o flex-1 do textarea (era o bug "nem area pra
              digitar"). Desktop preserva a linha unica original. */}
          <div className="flex flex-wrap items-end gap-2 p-3 sm:flex-nowrap sm:items-center sm:gap-3 sm:p-4">
            <div className="order-3 flex w-full items-center gap-0.5 text-slate-400 sm:order-0 sm:w-auto">
              <TooltipHost label="Anexar arquivo">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-full p-2 transition-colors hover:bg-slate-50 hover:text-slate-700" aria-label="Anexar arquivo">
                  <Paperclip size={18} />
                </button>
              </TooltipHost>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" onChange={onFileSelected} />
              <TooltipHost label="Emojis">
                <button type="button" onClick={() => togglePanel("emoji")}
                  className={cn("rounded-full p-2 transition-colors hover:bg-slate-50 hover:text-slate-700", activePanel === "emoji" && "bg-slate-100 text-slate-900")} aria-label="Emojis">
                  <Smile size={18} />
                </button>
              </TooltipHost>
              <TooltipHost label="Respostas rápidas">
                <button type="button" onClick={() => togglePanel("quick-replies")}
                  className={cn("rounded-full p-2 transition-colors hover:bg-slate-50 hover:text-slate-700", activePanel === "quick-replies" && "bg-slate-100 text-slate-900")} aria-label="Respostas rápidas">
                  <Zap size={18} />
                </button>
              </TooltipHost>
              {!isBaileysChannel && (
                <TooltipHost label="Templates de mensagem">
                  <button type="button" onClick={() => togglePanel("templates")}
                    className={cn("rounded-full p-2 transition-colors hover:bg-slate-50 hover:text-slate-700", activePanel === "templates" && "bg-slate-100 text-slate-900")} aria-label="Templates">
                    <FileText size={18} />
                  </button>
                </TooltipHost>
              )}
              <TooltipHost label="Criar tarefa">
                <button type="button" onClick={() => togglePanel("task")}
                  className={cn("rounded-full p-2 transition-colors hover:bg-slate-50 hover:text-slate-700", activePanel === "task" && "bg-slate-100 text-slate-900")} aria-label="Criar tarefa">
                  <CheckSquare size={18} />
                </button>
              </TooltipHost>
              <TooltipHost label="Agendar mensagem">
                <button
                  type="button"
                  onClick={() => togglePanel("schedule")}
                  className={cn(
                    "rounded-full p-2 transition-colors hover:bg-slate-50 hover:text-slate-700",
                    activePanel === "schedule" && "bg-slate-100 text-slate-900",
                  )}
                  aria-label="Agendar mensagem"
                >
                  <Clock size={18} />
                </button>
              </TooltipHost>
              {/* Toggle "Nota interna" — substituiu a aba do segmented
                  picker que existia no header da composer. Ativo, deixa
                  o input em modo nota (fundo amarelo, placeholder
                  "Nota interna…", e o `onSend` envia como `isPrivate`).
                  Quando ativo, ganha um pill amber pra ficar visível
                  mesmo com a barra cheia de ícones. Ícone Lock segue o
                  mesmo padrão usado nos labels de nota interna no chat. */}
              <TooltipHost label={noteMode ? "Sair do modo nota" : "Nota interna (só agentes)"}>
                <button
                  type="button"
                  onClick={() => setNoteMode((v) => !v)}
                  aria-label="Nota interna"
                  aria-pressed={noteMode}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full transition-colors",
                    // Paleta NEUTRA (slate) alinhada com a renderização
                    // da nota no histórico do chat — antes era âmbar,
                    // mas amarelo competia com badges de prioridade e
                    // alertas. Cinza claro mantém destaque (contraste
                    // sobre o composer branco) sem soar como warning.
                    noteMode
                      ? "bg-slate-200 px-2.5 py-1.5 text-slate-700 hover:bg-slate-300"
                      : "p-2 hover:bg-slate-50 hover:text-slate-700",
                  )}
                >
                  <Lock size={noteMode ? 14 : 18} strokeWidth={noteMode ? 2.5 : 2} />
                  {noteMode && (
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Nota
                    </span>
                  )}
                </button>
              </TooltipHost>
            </div>

            {/* Input: quando a sessão expira (fora de nota), o campo vira
                "não interativo" com opacity-50, cursor not-allowed e
                placeholder reforçando a ação esperada. Mantemos o estilo
                em nota (âmbar) e foco com ring brand-blue. */}
            {(() => {
              // O `isBusy` (mutation pendente) NÃO desabilita mais o
              // textarea — antes, ao enviar com Enter, o browser tirava
              // o foco do elemento `disabled` e o agente tinha que
              // clicar de volta no input. Agora o textarea só fica
              // disabled em estados que realmente bloqueiam envio
              // (sessão expirada sem nota, etc), preservando o fluxo
              // "Enter → próxima mensagem → Enter" sem cliques.
              const composeDisabled =
                !isBaileysChannel && !sessionActive && sessionInfo != null && !noteMode;
              const expiredNoNote =
                !sessionActive && sessionInfo != null && !isBaileysChannel && !noteMode;
              return (
                <div
                  className={cn(
                    // order-1 em mobile (linha 1, junto com Send).
                    // sm:order-none retorna a ordem natural em desktop.
                    "order-1 flex flex-1 items-center rounded-2xl bg-slate-50 px-4 py-2.5 transition-all sm:order-0",
                    "focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-blue/20",
                    // Modo nota: cinza claro (slate-100) ao invés de
                    // amarelo. Mantém o destaque (mais escuro que o
                    // estado idle slate-50 e contrastante com o branco
                    // de mensagem normal) sem alarme visual de warning.
                    noteMode && "bg-slate-100 focus-within:bg-slate-100 focus-within:ring-slate-300",
                    expiredNoNote && "cursor-not-allowed opacity-50",
                  )}
                >
                  <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(e) => {
                      setDraft(e.target.value);
                      if (e.target.value.trim()) sendTypingIndicator();
                    }}
                    onKeyDown={onKeyDown}
                    onPaste={onPaste}
                    placeholder={
                      pendingFile
                        ? "Legenda (opcional)…"
                        : noteMode
                          ? "Nota interna…"
                          : expiredNoNote
                            ? "Sessão expirada. Envie um template…"
                            : "Digite uma mensagem ou use '/' para respostas rápidas"
                    }
                    rows={1}
                    className={cn(
                      "min-h-[24px] max-h-32 w-full resize-none bg-transparent text-[14px] text-slate-800 outline-none placeholder:text-slate-400",
                      // Modo nota: texto cinza-escuro + placeholder
                      // cinza médio. O `italic` permanece como dica
                      // visual de "este texto não vai pro cliente".
                      noteMode && "italic text-slate-700 placeholder:text-slate-500",
                      expiredNoNote && "cursor-not-allowed",
                    )}
                    disabled={composeDisabled}
                  />
                </div>
              );
            })()}

            {/* Resolver + Send/Audio — order-2 em mobile (acompanha o
                textarea na linha 1). sm:order-none = posicao natural
                (final da linha unica) em desktop. */}
            <div className="order-2 flex shrink-0 items-center gap-1 sm:order-0">
              <TooltipHost label={isResolved ? "Reabrir conversa" : "Resolver conversa"} side="top">
                <button type="button"
                  className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40"
                  disabled={statusMutation.isPending}
                  onClick={() => statusMutation.mutate(isResolved ? "reopen" : "resolve")}
                  aria-label={isResolved ? "Reabrir conversa" : "Resolver conversa"}>
                  {statusMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : isResolved ? <RotateCcw size={18} /> : <CheckCircle2 size={18} />}
                </button>
              </TooltipHost>
              {draft.trim() || pendingFile ? (
                <button type="button" onClick={pendingFile ? sendFile : onSend} disabled={isBusy || (!pendingFile && !draft.trim())}
                  className="inline-flex size-10 items-center justify-center rounded-full bg-brand-blue text-white shadow-sm transition-all hover:bg-brand-blue/90 hover:shadow-md active:scale-95 disabled:opacity-50"
                  aria-label="Enviar">
                  {isBusy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" strokeWidth={2.25} />}
                </button>
              ) : (
                <AudioRecorder onSend={sendAudio} disabled={isBusy} />
              )}
            </div>
          </div>
          </div>
        </footer>
      </div>

      <Dialog
        open={!!forwardingMessage}
        onOpenChange={(o) => {
          if (!o) {
            setForwardingMessage(null);
            setForwardSearch("");
          }
        }}
      >
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Encaminhar mensagem</DialogTitle>
            <DialogDescription>
              O texto será enviado por WhatsApp para o contato da conversa escolhida. Mídias aparecem apenas como aviso no texto.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={forwardSearch}
            onChange={(e) => setForwardSearch(e.target.value)}
            placeholder="Buscar por nome ou telefone…"
            className="rounded-xl"
            autoFocus
          />
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-border p-1">
            {forwardPickLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
            ) : forwardPickFiltered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma conversa encontrada.</p>
            ) : (
              forwardPickFiltered.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  disabled={forwardMutation.isPending}
                  onClick={() => {
                    if (!forwardingMessage) return;
                    forwardMutation.mutate({ targetId: row.id, messageRef: String(forwardingMessage.id) });
                  }}
                  className="flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2.5 text-left text-sm eduit-transition hover:bg-chat-bg disabled:opacity-50"
                >
                  <span className="font-medium text-foreground">{row.contact.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {row.contact.phone ?? "—"} · {row.inboxName || row.channel}
                  </span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Edição de assinatura */}
      <Dialog open={signatureModalOpen} onOpenChange={setSignatureModalOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-black text-slate-800">Edição de assinatura</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              autoFocus
              value={signatureDraft}
              onChange={(e) => setSignatureDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  persistSignatureValue(signatureDraft.trim());
                  setSignatureModalOpen(false);
                }
              }}
              placeholder={agentName}
              className="h-11 rounded-full border-slate-200 px-4 text-[14px]"
            />
            <DialogDescription className="text-[12px] text-slate-500">
              Mantenha vazio se quiser utilizar o nome salvo no seu perfil como assinatura.
            </DialogDescription>
          </div>
          <div className="mt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSignatureModalOpen(false)}
              className="gap-1.5 rounded-full px-4"
            >
              <X className="size-4" />
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                persistSignatureValue(signatureDraft.trim());
                setSignatureModalOpen(false);
              }}
              className="gap-1.5 rounded-full bg-brand-blue px-4 text-white shadow-lg shadow-blue-200/50 hover:bg-brand-blue/90"
            >
              <Save className="size-4" />
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateBadge({ content }: { content: string }) {
  const meta = parseTemplateMeta(content);
  const cat = meta?.category?.toLowerCase() ?? null;
  const isMkt = cat === "marketing";
  const isUtility = cat === "utility";
  const isAuth = cat?.includes("autenticação") || cat === "authentication";
  const Icon = isMkt ? Megaphone : isUtility ? Wrench : LayoutTemplate;
  const label = isMkt ? "Marketing" : isUtility ? "Utility" : isAuth ? "Autenticação" : "Template";
  const colors = isMkt
    ? "border-amber-300/60 bg-amber-50 text-amber-700"
    : isUtility
      ? "border-sky-300/60 bg-sky-50 text-sky-700"
      : "border-violet-300/60 bg-violet-50 text-violet-700";

  return (
    <div className="group/tpl relative mb-1.5">
      <span className={cn("inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", colors)}>
        <Icon className="size-3" />
        {label}
      </span>
      <div className="pointer-events-none absolute bottom-full left-0 z-30 mb-1 hidden w-max max-w-[260px] rounded-lg border border-border bg-card px-3 py-2 text-[11px] leading-snug text-surface-foreground shadow-lg group-hover/tpl:block">
        <p className="font-semibold text-foreground">{label}</p>
        {meta?.name && <p className="mt-0.5 text-muted-foreground">Nome: <span className="font-mono">{meta.name}</span></p>}
        <p className="mt-1 text-[10px] text-muted-foreground">
          {isMkt ? "Custo mais alto — mensagem promocional" : isUtility ? "Custo moderado — mensagem transacional" : isAuth ? "Custo baixo — autenticação" : "Modelo de mensagem WABA"}
        </p>
      </div>
    </div>
  );
}

function chatTime(date: Date | string): string { return new Date(date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }

/** Formato detalhado para tooltip: "sex. 17/04/2026 13:00:09". */
function chatFullTimestamp(date: Date | string): string {
  const d = new Date(date);
  const weekday = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(/\.$/, ".");
  const dateStr = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  return `${weekday} ${dateStr} ${timeStr}`;
}

/** Offset UTC do browser no formato "UTC-03:00". */
function chatTimezoneOffset(date: Date | string): string {
  const d = new Date(date);
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `UTC${sign}${hh}:${mm}`;
}

/** Nome IANA do fuso (America/Sao_Paulo). */
function chatTimezoneName(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch { return ""; }
}

/** Tempo relativo em pt-BR: "32 minutos, 12 segundos atrás" / "agora mesmo". */
function chatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const diffSec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (diffSec < 5) return "agora mesmo";
  if (diffSec < 60) return `${diffSec} segundo${diffSec === 1 ? "" : "s"} atrás`;
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  if (mins < 60) {
    const mStr = `${mins} minuto${mins === 1 ? "" : "s"}`;
    const sStr = secs > 0 ? `, ${secs} segundo${secs === 1 ? "" : "s"}` : "";
    return `${mStr}${sStr} atrás`;
  }
  const hrs = Math.floor(mins / 60);
  const rMins = mins % 60;
  if (hrs < 24) {
    const hStr = `${hrs} hora${hrs === 1 ? "" : "s"}`;
    const mStr = rMins > 0 ? `, ${rMins} minuto${rMins === 1 ? "" : "s"}` : "";
    return `${hStr}${mStr} atrás`;
  }
  const days = Math.floor(hrs / 24);
  return `${days} dia${days === 1 ? "" : "s"} atrás`;
}
function chatDateLabel(date: Date | string | null): string {
  if (!date) return ""; const d = new Date(date); const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Hoje";
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function shouldShowDateSeparator(prev: InboxMessageDto | null, curr: InboxMessageDto): boolean {
  if (!prev) return true; if (!prev.createdAt || !curr.createdAt) return false;
  return new Date(prev.createdAt).toDateString() !== new Date(curr.createdAt).toDateString();
}

function DateSep({ date }: { date: string | null }) {
  return (
    <div className="flex justify-center py-3">
      <span className="rounded-full bg-[#c2f0d2] px-4 py-1 text-[11px] font-semibold text-[#1a6b3e] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        {chatDateLabel(date)}
      </span>
    </div>
  );
}

/**
 * Linha de evento de sistema da Meta WhatsApp (ex.: cliente trocou de
 * número via `user_changed_number`). Substitui o chip amarelo cru por
 * um banner premium centralizado, com hierarquia clara (label
 * estrutural + numbers em destaque) e CTA implícito (visualmente
 * sinaliza que a ação JÁ foi tomada — telefone do contato atualizado
 * pelo webhook).
 *
 * Detecta o padrão "USER A CHANGED FROM <old> TO <new>" pra renderizar
 * a versão "rich" com os dois números formatados; outros eventos de
 * sistema (raros) caem no fallback compacto.
 */
function SystemEventRow({ body, createdAt }: { body: string; createdAt: string | null }) {
  const time = createdAt ? chatTime(createdAt) : "";
  const match = body.match(/from\s+(\+?\d[\d\s-]{6,})\s+to\s+(\+?\d[\d\s-]{6,})/i);

  if (match) {
    const oldPhone = formatPhoneBR(match[1]);
    const newPhone = formatPhoneBR(match[2]);
    return (
      <MotionDiv
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex w-full justify-center py-2"
      >
        <div className="flex max-w-[520px] flex-col items-stretch gap-2 rounded-[20px] border border-amber-200/80 bg-amber-50/80 px-4 py-3 shadow-float">
          <div className="flex items-center gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <Smartphone className="size-3.5 text-amber-700" strokeWidth={2.4} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">
              Cliente trocou de número
            </p>
            {time && (
              <span className="ml-auto text-[10px] font-semibold tabular-nums text-amber-600/80">
                {time}
              </span>
            )}
          </div>
          <div className="flex items-center justify-center gap-2 px-1">
            <span className="rounded-md bg-white/80 px-2 py-1 text-[12px] font-bold tabular-nums text-slate-500 line-through decoration-slate-400/60">
              {oldPhone}
            </span>
            <ArrowRight className="size-3.5 shrink-0 text-amber-600" strokeWidth={2.5} />
            <span className="rounded-md bg-white px-2 py-1 text-[12px] font-black tabular-nums text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
              {newPhone}
            </span>
          </div>
          <p className="text-center text-[10px] font-semibold text-amber-700/80">
            Histórico preservado · Cadastro atualizado automaticamente
          </p>
        </div>
      </MotionDiv>
    );
  }

  // Fallback: chip discreto centralizado para outros eventos de sistema.
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex w-full justify-center py-2"
    >
      <div className="flex max-w-[420px] items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50/80 px-3 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <AlertCircle className="size-3.5 shrink-0 text-amber-600" strokeWidth={2.4} />
        <p className="text-[11px] font-semibold text-amber-800">{body}</p>
        {time && <span className="text-[10px] tabular-nums text-amber-600/80">{time}</span>}
      </div>
    </MotionDiv>
  );
}

/**
 * Formata um WAID (ex.: "5511982063029") em "+55 11 98206-3029" pra
 * leitura humana. Aceita números com ou sem `+`, com máscara/sem.
 * Fallback: retorna o input com `+` na frente se o tamanho for fora
 * do padrão BR (10 ou 11 dígitos pós-DDI).
 */
function formatPhoneBR(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) {
    const ddd = digits.slice(2, 4);
    const a = digits.slice(4, 9);
    const b = digits.slice(9, 13);
    return `+55 ${ddd} ${a}-${b}`;
  }
  if (digits.length === 12 && digits.startsWith("55")) {
    const ddd = digits.slice(2, 4);
    const a = digits.slice(4, 8);
    const b = digits.slice(8, 12);
    return `+55 ${ddd} ${a}-${b}`;
  }
  return digits ? `+${digits}` : raw;
}

/**
 * Activity Item minimalista para eventos de chamada (WhatsApp Calling).
 * Substitui a bolha âmbar verbosa por uma linha compacta estilo Linear/Stripe:
 * ícone + direção + duração + horário. Se houver gravação, mostra player embutido.
 */
function CallActivityItem({ message }: { message: InboxMessageDto }) {
  const [expanded, setExpanded] = React.useState(false);
  const content = String(message.content ?? "").trim();
  const mt = String(message.messageType ?? "").toLowerCase();
  const isRecording = mt === "whatsapp_call_recording";
  const hasRecording = isRecording && !!message.mediaUrl;

  const lower = content.toLowerCase();
  const senderName = String(message.senderName ?? "").trim();
  // `senderName` é a fonte de verdade pra direção quando `message.direction`
  // vem `"system"` (mensagens antigas pré-fix do webhook). O serviço grava:
  //   • outbound (agente)  → "WhatsApp · <nome do agente>"
  //   • inbound (cliente)  → "WhatsApp"
  // Esse padrão é determinístico (criado em `meta-whatsapp-calls-webhook.ts`)
  // e sobrevive mesmo quando a string `content` foi simplificada.
  const senderSuggestsOutgoing = /^WhatsApp\s+·\s+\S/i.test(senderName);
  const senderSuggestsIncoming = senderName === "WhatsApp";
  // Heurística adicional pelo conteúdo (fallback p/ histórico legado:
  // strings antigas tinham `· agente: X` antes de 2026-04-18).
  const contentSuggestsIncoming = lower.includes("entrada");
  const contentSuggestsOutgoing =
    lower.includes("saída") || lower.includes("saida") || lower.includes("agente:");
  const isOutgoing =
    message.direction === "out" ||
    (message.direction !== "in" && (senderSuggestsOutgoing || contentSuggestsOutgoing));
  const isIncoming =
    message.direction === "in" ||
    (message.direction !== "out" &&
      !isOutgoing &&
      (senderSuggestsIncoming || contentSuggestsIncoming));
  const isTerminate = lower.includes("fim");
  const isFailed = lower.includes("falhou");

  // Nome do agente exibido como linha discreta abaixo do título quando
  // outbound. Extrai do `senderName` ("WhatsApp · Marcelo Pinheiro" →
  // "Marcelo Pinheiro"). Cobre tanto `whatsapp_call` quanto a versão
  // longa do `whatsapp_call_recording` (sender = "WhatsApp · chamada · Nome").
  const agentLabel = isOutgoing
    ? senderName
        .replace(/^WhatsApp\s+·\s+(?:chamada\s+·\s+)?/i, "")
        .trim()
    : "";

  const Icon = hasRecording ? Volume2 : isIncoming ? PhoneIncoming : isOutgoing ? PhoneOutgoing : Phone;

  const durationMatch = content.match(/(\d+m\d{2}s|\d+s)\b/);
  const timeMatch = content.match(/(\d{1,2}:\d{2}(?:[–-]\d{1,2}:\d{2})?)/);
  const duration = durationMatch?.[1] ?? null;
  const timeLabel = timeMatch?.[1] ?? (message.createdAt ? chatTime(message.createdAt) : null);

  const label = hasRecording
    ? "Gravação de chamada"
    : isTerminate
      ? isFailed
        ? "Chamada não completada"
        : "Chamada finalizada"
      : isIncoming
        ? "Chamada recebida"
        : isOutgoing
          ? "Chamada realizada"
          : "Evento de chamada";

  const accent = isFailed
    ? "text-rose-500"
    : isIncoming
      ? "text-emerald-600"
      : isOutgoing
        ? "text-brand-blue"
        : "text-slate-600";

  // Lateralização: outbound (agente) → direita; inbound (cliente) →
  // esquerda; sem direção detectável (eventos de sistema antigos) →
  // centro como fallback. Mantém a aparência de "activity item"
  // compacto (não vira bolha cyan/branca de mensagem comum) — só muda
  // o alinhamento + cor sutil da borda pra reforçar o lado.
  const sideJustify = isOutgoing
    ? "justify-end"
    : isIncoming
      ? "justify-start"
      : "justify-center";
  const sideTint = isOutgoing
    ? "border-[#cffafe] bg-[#f0f9fa]/80"
    : isIncoming
      ? "border-slate-100 bg-white"
      : "border-slate-100 bg-slate-50/70";

  return (
    <div className={cn("flex w-full", sideJustify)}>
      <div className="w-full max-w-[360px]">
        <div className={cn("flex items-center gap-3 rounded-2xl border px-4 py-2.5", sideTint)}>

          <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm", accent)}>
            <Icon className="size-4" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-bold text-slate-900">{label}</p>
            <div className="mt-0.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {duration && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-2.5" />
                  {duration}
                </span>
              )}
              {timeLabel && <span>{timeLabel}</span>}
              {agentLabel && (
                <span className="truncate normal-case tracking-normal text-slate-500">
                  por <span className="font-bold text-slate-700">{agentLabel}</span>
                </span>
              )}
            </div>
          </div>
          {hasRecording && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="shrink-0 rounded-full bg-slate-900 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white transition-all hover:bg-slate-800 hover:shadow-sm"
            >
              {expanded ? "Fechar" : "Ouvir"}
            </button>
          )}
        </div>
        {hasRecording && expanded && message.mediaUrl && (
          <div className="mt-2">
            <AudioMessage
              url={message.mediaUrl}
              time={timeLabel ?? undefined}
              out={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Activity Item minimalista para resposta de consentimento de voz
 * (Meta Calling API — call_permission_reply). Clean, sem emoji cru.
 */
type ConsentVerdict = "granted_temp" | "granted_perm" | "denied" | "unknown";

/** Reconhece mensagens de consentimento geradas pelo webhook da Meta. */
function detectConsentVerdict(content: string): ConsentVerdict | null {
  if (!content) return null;
  const t = content.toLowerCase().trim();
  // Limite de tamanho — consentimento é sempre curto; evita falso-positivo em
  // mensagem longa do cliente que por acaso contenha "recusou"/"aceitou".
  if (t.length > 120) return null;

  const isAccept = t.includes("cliente aceitou") || t.includes("permissão para ligações concedida") || t.includes("permissao para ligacoes concedida");
  const isDeny = t.includes("cliente recusou") || /\breject(ed)?\b/.test(t) || /\bdecline(d)?\b/.test(t);
  const isPermanent = t.includes("permanente") || t.includes("permanent");

  if (isDeny && !isAccept) return "denied";
  if (isAccept) return isPermanent ? "granted_perm" : "granted_temp";

  // Headers genéricos que o webhook gera quando não consegue classificar.
  if (t.startsWith("📞 resposta ao pedido de ligações")) return "unknown";
  if (t.startsWith("📞 resposta ao pedido de permissão")) return "unknown";
  if (t.startsWith("📞 permissão de ligação")) return "unknown";
  return null;
}

function ConsentActivityItem({
  message,
  verdict,
}: {
  message: InboxMessageDto;
  verdict: ConsentVerdict;
}) {
  const timeLabel = message.createdAt ? chatTime(message.createdAt) : null;

  const { Icon, label, sub, accent, pillBg } = (() => {
    switch (verdict) {
      case "granted_perm":
        return {
          Icon: ShieldCheck,
          label: "Permissão concedida",
          sub: "Sem expiração · ligações permanentes",
          accent: "text-emerald-600",
          pillBg: "bg-emerald-50/80 border-emerald-100",
        };
      case "granted_temp":
        return {
          Icon: ShieldCheck,
          label: "Permissão concedida",
          sub: "Válida por 7 dias",
          accent: "text-emerald-600",
          pillBg: "bg-emerald-50/80 border-emerald-100",
        };
      case "denied":
        return {
          Icon: PhoneOff,
          label: "Permissão recusada",
          sub: "Meta bloqueia novo pedido por 24h",
          accent: "text-rose-500",
          pillBg: "bg-rose-50/70 border-rose-100",
        };
      default:
        return {
          Icon: Phone,
          label: "Resposta de permissão",
          sub: "Cliente respondeu ao pedido",
          accent: "text-slate-500",
          pillBg: "bg-slate-50 border-slate-100",
        };
    }
  })();

  return (
    <div className="flex w-full justify-center">
      <div className="w-full max-w-[520px]">
        <div className={cn("flex items-center gap-3 rounded-2xl border px-4 py-2.5", pillBg)}>
          <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm", accent)}>
            <Icon className="size-4" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-bold text-slate-900">{label}</p>
            <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">{sub}</p>
          </div>
          {timeLabel && (
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {timeLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function groupReactions(reactions: ReactionDto[]): { emoji: string; count: number; senders: string[] }[] {
  const map = new Map<string, string[]>();
  for (const r of reactions) { const a = map.get(r.emoji) ?? []; a.push(r.senderName); map.set(r.emoji, a); }
  return Array.from(map.entries()).map(([emoji, senders]) => ({ emoji, count: senders.length, senders }));
}

function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface AudioMessageProps {
  url: string;
  fileSizeBytes?: number | null;
  time?: string;
  /** Mostra double-check ciano ao lado do horário (mensagens enviadas já entregues/lidas). */
  showDeliveryCheck?: boolean;
  /** "sent" | "delivered" | "read" — controla intensidade do check. */
  deliveryStatus?: "sent" | "delivered" | "read";
  /** Quando true, aplica a paleta unificada do agente (#f0f9fa / #cffafe). */
  out?: boolean;
  /** Label opcional exibido no topo do balão (ex.: "Admin EduIT"). */
  senderLabel?: string;
  /** Mensagem otimista — anexo ainda subindo. Substitui meta por
   *  "Enviando…" e desabilita ações que dependem do servidor (download
   *  MP3 + transcrição), evitando 404 enquanto o blob local não foi
   *  persistido. O player local (`<audio>` apontando p/ blob:) continua
   *  funcionando — operador pode revisar o áudio antes do servidor
   *  confirmar. */
  isUploading?: boolean;
}

/** Overlay translúcido com spinner — usado em previews de imagem/vídeo
 *  enquanto o anexo sobe. Centralizado, com fundo navy desfocado pra
 *  não disputar atenção com o conteúdo abaixo. */
function UploadingOverlay({ label, rounded = "rounded-lg" }: { label: string; rounded?: string }) {
  return (
    <div className={cn("absolute inset-0 flex items-center justify-center bg-brand-navy/30 backdrop-blur-[2px]", rounded)}>
      <div className="flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 shadow-premium">
        <Loader2 className="size-3.5 animate-spin text-[#507df1]" />
        <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">{label}</span>
      </div>
    </div>
  );
}

function formatAudioSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Ciclo de velocidades de reprodução. 1x → 1.25x → 1.5x → 2x → 0.75x → 1x.
// Inclui 0.75x para o operador conseguir "desacelerar" áudios que vieram
// rápido demais (cliente acelerado, áudio cortado, etc) — útil pra
// transcrever no ouvido.
const PLAYBACK_RATES = [1, 1.25, 1.5, 2, 0.75] as const;

/** Formata a velocidade pro botão: 1x, 1.25x, 1.5x, 2x, 0.75x. */
function formatRate(rate: number): string {
  return `${rate}x`;
}

function AudioMessage({
  url,
  fileSizeBytes,
  time,
  showDeliveryCheck = false,
  deliveryStatus = "delivered",
  out = false,
  senderLabel,
  isUploading = false,
}: AudioMessageProps) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [duration, setDuration] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [ready, setReady] = React.useState(false);

  // Velocidade — ciclo via botão. Aplicado no `audio.playbackRate`
  // sempre que muda. `preservesPitch = true` mantém o tom da voz
  // mesmo em 2x (sem efeito "Mickey Mouse").
  const [rateIndex, setRateIndex] = React.useState(0);
  const rate = PLAYBACK_RATES[rateIndex];

  // Download MP3 — fetch da rota `/api/media/audio-mp3` que converte
  // qualquer áudio (ogg/webm/opus) pro formato universal. `pending`
  // mostra spinner no botão enquanto o servidor processa.
  const [downloading, setDownloading] = React.useState(false);

  // Transcrição (Whisper free). `null` = ainda não pediu, `"loading"`
  // = chamando API, `string` = transcrição pronta, `Error` = falhou.
  type TranscriptionState = null | "loading" | { text: string } | { error: string };
  const [transcription, setTranscription] = React.useState<TranscriptionState>(null);
  const [transcriptionOpen, setTranscriptionOpen] = React.useState(false);

  React.useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    // Áudio gravado em streaming (WhatsApp Voice / MediaRecorder)
    // SEMPRE vem em OGG/WebM com header sem o campo `Duration`
    // preenchido — o browser então retorna `a.duration === Infinity`
    // no `loadedmetadata`, o que zera o cálculo de progresso
    // (`currentTime / Infinity = 0`) e a barra nunca anda.
    //
    // Truque conhecido (registrado em bug trackers do Chromium e
    // Firefox há ~10 anos): setar `currentTime = MAX_SAFE_INTEGER`
    // força o browser a fazer o seek pro fim do arquivo, baixando
    // todo o conteúdo e calculando a duração real. O evento
    // `durationchange` então dispara com o valor correto e
    // resetamos o `currentTime` pra 0. O usuário não vê o jitter
    // porque tudo acontece antes do play começar.
    let durationFixed = false;
    const tryFixDuration = () => {
      if (durationFixed) return;
      if (!Number.isFinite(a.duration) || a.duration === 0) {
        durationFixed = true;
        const onTimeUpdate = () => {
          a.removeEventListener("timeupdate", onTimeUpdate);
          a.currentTime = 0;
          setCurrentTime(0);
        };
        a.addEventListener("timeupdate", onTimeUpdate);
        a.currentTime = Number.MAX_SAFE_INTEGER;
      }
    };

    const onLoaded = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) {
        setDuration(a.duration);
      } else {
        tryFixDuration();
      }
      setReady(true);
    };
    const onDurationChange = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) {
        setDuration(a.duration);
      }
    };
    const onTime = () => setCurrentTime(a.currentTime);
    const onEnd = () => { setIsPlaying(false); setCurrentTime(0); };

    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("durationchange", onDurationChange);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);

    // Se o áudio já estava com metadata carregada antes do effect
    // (componente remountou em URL idêntica), dispara o handler
    // manualmente — `loadedmetadata` não vai disparar de novo.
    if (a.readyState >= 1) onLoaded();

    return () => {
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("durationchange", onDurationChange);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
    };
  }, [url]);

  // Aplica a velocidade selecionada ao elemento <audio>.
  // `preservesPitch` é o property name moderno (Chrome/Edge/Firefox);
  // browsers antigos podem ignorar e tocar com pitch alterado.
  React.useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.playbackRate = rate;
    type PitchPreserving = HTMLAudioElement & {
      preservesPitch?: boolean;
      mozPreservesPitch?: boolean;
      webkitPreservesPitch?: boolean;
    };
    const p = a as PitchPreserving;
    p.preservesPitch = true;
    p.mozPreservesPitch = true;
    p.webkitPreservesPitch = true;
  }, [rate]);

  const togglePlay = React.useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) { a.pause(); setIsPlaying(false); }
    else { a.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false)); }
  }, [isPlaying]);

  const cycleRate = React.useCallback(() => {
    setRateIndex((i) => (i + 1) % PLAYBACK_RATES.length);
  }, []);

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const currentLabel = formatAudioTime(currentTime);
  // `--:--` enquanto a duração está sendo medida (truque do
  // MAX_SAFE_INTEGER pode demorar 1-2s em arquivos OGG sem header).
  // Mostrar `0:00` aqui dava a impressão errada de "áudio vazio".
  const durationLabel = duration > 0 ? formatAudioTime(duration) : "--:--";

  const onSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * duration;
    setCurrentTime(a.currentTime);
  };

  // Nome do arquivo — antes mostrávamos o nome cru do servidor
  // (`1776450600867-ecf3aj.webm`) que é totalmente irrelevante pro
  // operador. Padronizado pra "Áudio" + meta com formato/tamanho.
  // Para download, usamos um nome amigável com timestamp do horário
  // da mensagem (quando disponível), evitando colisões na pasta de
  // downloads do operador.
  const sizeLabel = formatAudioSize(fileSizeBytes);
  const metaLabel = isUploading
    ? "Enviando…"
    : sizeLabel
      ? `Áudio · ${sizeLabel}`
      : "Áudio";
  const downloadName = (() => {
    const safeTime = (time ?? "").replace(/[^\d]/g, "");
    return safeTime ? `audio-${safeTime}` : `audio-${Date.now()}`;
  })();

  const isRead = deliveryStatus === "read";

  const downloadMp3 = React.useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const apiUrl = `/api/media/audio-mp3?url=${encodeURIComponent(url)}&name=${encodeURIComponent(downloadName)}`;
      const res = await fetch(apiUrl);
      if (!res.ok) {
        const ctype = res.headers.get("content-type") || "";
        if (!ctype.includes("application/json")) {
          throw new Error(
            res.status === 502 || res.status === 504
              ? "Servidor demorou demais (gateway timeout). Tente novamente em alguns segundos."
              : res.status === 401 || res.status === 403
                ? "Sessão expirada — recarregue a página (F5)."
                : `Erro HTTP ${res.status}.`,
          );
        }
        const body = await res.json().catch(() => null) as { message?: string } | null;
        throw new Error(body?.message ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${downloadName}.mp3`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Libera a URL depois de um tick — alguns browsers cancelam o
      // download se a URL for revogada antes do click ser processado.
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao baixar.";
      toast.error(`Não foi possível baixar como MP3. ${msg}`);
    } finally {
      setDownloading(false);
    }
  }, [downloading, url, downloadName]);

  const transcribe = React.useCallback(async () => {
    setTranscriptionOpen(true);
    if (transcription && typeof transcription === "object" && "text" in transcription) return;
    setTranscription("loading");
    try {
      const res = await fetch(apiUrl("/api/media/transcribe"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      // O endpoint sempre responde JSON em sucesso. Se vier HTML, é
      // sintoma de problema fora do nosso handler: gateway estourando
      // timeout (502/504 do nginx do Easypanel), sessão expirada
      // redirecionando pra /login, build antigo sem a rota, etc.
      // Detectamos pelo Content-Type pra mostrar mensagem útil em vez
      // do erro genérico "Unexpected token '<'".
      const ctype = res.headers.get("content-type") || "";
      if (!ctype.includes("application/json")) {
        const hint =
          res.status === 401 || res.status === 403
            ? "Sessão expirada — recarregue a página (F5)."
            : res.status === 502 || res.status === 504
              ? "Servidor demorou demais para responder. Configure GROQ_API_KEY no painel para acelerar (chave grátis em console.groq.com)."
              : `Resposta inesperada do servidor (HTTP ${res.status}).`;
        setTranscription({ error: hint });
        return;
      }
      const json = (await res.json()) as { text?: string; message?: string };
      if (!res.ok || !json.text) {
        const msg = json.message ?? `Erro HTTP ${res.status}`;
        setTranscription({ error: msg });
        return;
      }
      setTranscription({ text: json.text });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro de rede.";
      setTranscription({ error: msg });
    }
  }, [transcription, url]);

  // Paleta de áudio segue a bolha de texto correspondente:
  //  · out (agente): mantém cyan premium da bolha enviada (#f0f9fa / #cffafe)
  //  · in  (cliente): branco + border-slate-100, idêntico à bolha de texto
  //    recebida — nada de verde-lima. `playerBg` / `divider` usam slate-50/100
  //    para o player aparecer sutilmente sobre o fundo branco do card.
  const palette = out
    ? {
        bubbleBg: "bg-[#f0f9fa]",
        bubbleBorder: "border-[#cffafe]",
        playerBg: "bg-[#cffafe]",
        divider: "bg-[#cffafe]",
      }
    : {
        bubbleBg: "bg-white",
        bubbleBorder: "border-slate-100",
        playerBg: "bg-slate-50",
        divider: "bg-slate-100",
      };

  return (
    <div
      className={cn(
        "font-outfit rounded-[20px] border p-5 shadow-float",
        out && "rounded-br-none",
        palette.bubbleBg,
        palette.bubbleBorder,
      )}
    >
      {senderLabel && (
        // Preserva o case cadastrado no CRM (sem `uppercase` forçado) — mesmo
        // padrão do label de mensagens de texto, ver comentário em `chat-window`
        // próximo ao render de `m.senderName`. Evita o ar "MARCELO PINHEIRO"
        // que soa agressivo quando o nome é longo.
        <p className="font-outfit mb-2 text-[11px] font-semibold tracking-tight text-brand-navy/90">
          {senderLabel}:
        </p>
      )}
      {/* Player bar interna */}
      <div className={cn("flex items-center gap-3 rounded-2xl px-3 py-2.5", palette.playerBg)}>
        {/* Play outline azul */}
        <button
          type="button"
          onClick={togglePlay}
          disabled={!ready}
          aria-label={isPlaying ? "Pausar áudio" : "Reproduzir áudio"}
          className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-[#6366f1] bg-white text-[#6366f1] shadow-sm transition-all duration-300 ease-in-out hover:bg-[#6366f1] hover:text-white active:scale-95 disabled:opacity-60"
        >
          {isPlaying
            ? <Pause className="size-4" fill="currentColor" />
            : <Play className="size-4 translate-x-px" fill="currentColor" />}
        </button>

        {/* Tempo + Seekbar */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-[11px] font-bold tabular-nums text-slate-500">
            {currentLabel}<span className="text-slate-400">/</span>{durationLabel}
          </span>
          <div
            onClick={onSeek}
            role="slider"
            aria-label="Posição do áudio"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            className="relative h-[4px] w-full cursor-pointer rounded-full bg-slate-200"
          >
            <div
              className="h-full rounded-full bg-[#6366f1] transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
            <div
              className="pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#6366f1] shadow-[0_1px_4px_rgba(99,102,241,0.35)]"
              style={{ left: `${progress}%` }}
            />
          </div>
        </div>

        {/* Ícones direita — Volume (decorativo) + Velocidade (cíclico).
            O botão de velocidade substituiu o ícone "SlidersHorizontal"
            decorativo: clicar cicla 1x → 1.25x → 1.5x → 2x → 0.75x.
            Mantém o tom da voz via `preservesPitch` (ver effect que
            atualiza o `<audio>` quando `rate` muda). */}
        <div className="flex shrink-0 items-center gap-1.5 text-slate-400">
          <button type="button" aria-label="Volume" className="rounded p-1 transition-colors hover:bg-white/60 hover:text-slate-600">
            <Volume2 className="size-4" />
          </button>
          <TooltipHost label="Velocidade de reprodução" side="top">
            <button
              type="button"
              onClick={cycleRate}
              aria-label={`Velocidade ${formatRate(rate)} (clique pra trocar)`}
              className={cn(
                "min-w-[36px] rounded-full px-2 py-0.5 text-[11px] font-black tabular-nums tracking-tight transition-colors",
                rate === 1
                  ? "text-slate-500 hover:bg-white/60 hover:text-slate-700"
                  : "bg-[#6366f1] text-white shadow-sm hover:bg-[#4f51d8]",
              )}
            >
              {formatRate(rate)}
            </button>
          </TooltipHost>
        </div>
      </div>

      {/* Divisor sutil */}
      <div className={cn("my-3 h-px w-full", palette.divider)} />

      {/* Footer: ícone + label "Áudio" + ações (transcrever + download).
          O nome do arquivo cru (`1776xxx-yyy.webm`) sumiu — não traz
          informação útil pro operador. Em troca temos um label limpo
          "Áudio" + meta com tamanho, e a extensão original fica só na
          conversão de download (que sempre vira `.mp3`). */}
      <div className="flex items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#f97316] text-white shadow-sm">
          <Megaphone className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-black text-slate-800">Áudio</p>
          <p className={cn("flex items-center gap-1.5 truncate text-[11px] font-bold", isUploading ? "text-[#507df1]" : "text-slate-500")}>
            {isUploading && <Loader2 className="size-3 shrink-0 animate-spin" />}
            <span className="truncate">{metaLabel}</span>
          </p>
        </div>
        {/* Ações dependentes do servidor (transcrever/baixar) — escondidas
            durante upload pra não tentar bater em URL de blob: local nem
            chamar `/api/media/...` antes do servidor ter o arquivo. */}
        {!isUploading && (
          <>
            <TooltipHost label={transcriptionOpen ? "Transcrição" : "Transcrever áudio"} side="top">
              <button
                type="button"
                onClick={transcribe}
                aria-label="Transcrever áudio com IA"
                aria-pressed={transcriptionOpen}
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full transition-colors active:scale-95",
                  transcriptionOpen
                    ? "bg-[#6366f1] text-white shadow-sm hover:bg-[#4f51d8]"
                    : "text-slate-400 hover:bg-white hover:text-slate-700",
                )}
              >
                {transcription === "loading" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FileText className="size-4" />
                )}
              </button>
            </TooltipHost>
            <TooltipHost label="Baixar como MP3" side="top">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadMp3();
                }}
                disabled={downloading}
                aria-label="Baixar áudio em MP3"
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white hover:text-slate-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {downloading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
              </button>
            </TooltipHost>
          </>
        )}
      </div>

      {/* Painel de transcrição — expande abaixo do footer. Estados:
          loading (skeleton), error (mensagem amigável + botão tentar
          de novo), success (texto + botão copiar). Fechável via X. */}
      {transcriptionOpen && (
        <div className={cn("mt-3 rounded-2xl border border-dashed p-3", out ? "border-[#cffafe] bg-white/70" : "border-slate-200 bg-slate-50/70")}>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <FileText className="size-3.5 text-[#6366f1]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#6366f1]">
                Transcrição
              </span>
            </div>
            <button
              type="button"
              onClick={() => setTranscriptionOpen(false)}
              aria-label="Fechar transcrição"
              className="rounded p-0.5 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {transcription === "loading" && (
            <div className="flex items-center gap-2 text-[12px] text-slate-500">
              <Loader2 className="size-3.5 animate-spin" />
              Transcrevendo… pode levar alguns segundos.
            </div>
          )}

          {transcription && typeof transcription === "object" && "text" in transcription && (
            <div className="space-y-2">
              <p className="whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-slate-700">
                {transcription.text}
              </p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(transcription.text);
                  toast.success("Transcrição copiada.");
                }}
                className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:bg-white hover:text-slate-700"
              >
                Copiar
              </button>
            </div>
          )}

          {transcription && typeof transcription === "object" && "error" in transcription && (
            <div className="space-y-2">
              <p className="text-[12px] font-medium text-red-600">{transcription.error}</p>
              <button
                type="button"
                onClick={() => { setTranscription(null); transcribe(); }}
                className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Tentar de novo
              </button>
            </div>
          )}
        </div>
      )}

      {/* Delivery info: hora + double check ciano */}
      {(time || showDeliveryCheck) && (
        <div className="mt-2 flex items-center justify-end gap-1 text-[11px] font-bold tabular-nums text-slate-500">
          {time && <span>{time}</span>}
          {showDeliveryCheck && (
            <CheckCheck className={cn("size-3.5", isRead ? "text-[#06b6d4]" : "text-slate-400")} />
          )}
        </div>
      )}

      <audio ref={audioRef} preload="metadata" className="hidden">
        <source src={url} />
        <source src={url} type="audio/ogg" />
        <source src={url} type="audio/webm" />
        <source src={url} type="audio/mp4" />
      </audio>
    </div>
  );
}

function SessionBar({ active, expiresAt }: { active: boolean; expiresAt: Date | null }) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    if (!active || !expiresAt) return;
    const i = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(i);
  }, [active, expiresAt]);

  if (!expiresAt) return null;
  const remaining = expiresAt.getTime() - now;
  const TOTAL_MS = 24 * 3_600_000;

  let timeLabel = "";
  if (active && remaining > 0) {
    const h = Math.floor(remaining / 3_600_000);
    const m = Math.floor((remaining % 3_600_000) / 60_000);
    timeLabel = h > 0 ? `${h}h ${String(m).padStart(2, "0")}min` : `${m}min`;
  }

  const percent = active && remaining > 0
    ? Math.min(100, Math.max(0, (remaining / TOTAL_MS) * 100))
    : 0;

  // ── Sessão EXPIRADA ─────────────────────────────────────────────────
  // Topo "alerta fino" (h-10) em vermelho pastel com Clock stroke-3.
  // Usado como cartão executivo acima do chat: comunica urgência sem
  // roubar atenção do conteúdo abaixo (a faixa vermelha de 40px já
  // carrega o peso). Tracking-tighter pra cair no mesmo ritmo tipográfico
  // dos outros labels do sistema (SESSAO, NOTA FIXADA, etc).
  if (!active) {
    return (
      <div className="flex h-10 shrink-0 items-center justify-center gap-2 border-b border-red-100 bg-red-50/80">
        <Clock className="size-[14px] text-red-500" strokeWidth={3} />
        <span className="text-[11px] font-black uppercase tracking-tighter text-red-500">
          Sessão Expirada
        </span>
      </div>
    );
  }

  // ── Sessão ATIVA ───────────────────────────────────────────────────
  // Mantém o desenho cyan com barra de progresso sutil e borda lateral,
  // coerente com o restante das "system messages" do chat.
  return (
    <div className="relative flex shrink-0 items-center gap-3 border-b border-l-4 border-brand-cyan/10 border-l-brand-cyan bg-chat-sent px-6 py-2.5 text-[12px] font-bold">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-brand-cyan/10">
        <div
          className="h-full bg-brand-cyan transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <Timer className="size-4 shrink-0 text-brand-cyan" />
      <span className="text-brand-cyan">Sessão ativa — {timeLabel}</span>
    </div>
  );
}
