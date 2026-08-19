"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import {
  FileText,
  Mic,
  Paperclip,
  Plus,
  Send,
  Smile,
  Sticker,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { EmojiPicker } from "@/components/inbox/emoji-picker";
import { cn } from "@/lib/utils";

import { uploadTeamChatAttachment } from "./api";
import { isMockId } from "./mock-data";
import type { TeamChatAttachment } from "./types";

const MAX_FILES = 8;
const MAX_BYTES = 16 * 1024 * 1024;

const STICKERS = [
  "👍", "👎", "❤️", "🔥", "😂", "😍", "😮", "😢",
  "🙏", "👏", "🎉", "💯", "😎", "🤔", "😅", "🤝",
  "✅", "❌", "⭐", "🚀", "💪", "👀", "🤗", "🥳",
] as const;

type Staged = {
  id: string;
  file: File;
  previewUrl: string | null;
  asSticker?: boolean;
};

type RecState = "idle" | "recording" | "preview";

function extFromMime(mime: string, fallback: string) {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "video/mp4": "mp4",
    "application/pdf": "pdf",
  };
  return map[mime] ?? fallback;
}

function collectClipboardFiles(e: ClipboardEvent): File[] {
  const out: File[] = [];
  const seen = new Set<string>();
  const add = (f: File) => {
    const key = `${f.name}:${f.size}:${f.lastModified}:${f.type}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(f);
  };
  if (e.clipboardData?.files?.length) {
    for (const f of Array.from(e.clipboardData.files)) add(f);
  }
  if (e.clipboardData?.items) {
    for (const item of Array.from(e.clipboardData.items)) {
      if (item.kind === "file") {
        const f = item.getAsFile();
        if (f) add(f);
      }
    }
  }
  return out;
}

function bestAudioMime() {
  for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) return m;
  }
  return "audio/webm";
}

function formatClock(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function localAttachment(file: File | Blob, options?: { fileName?: string; asSticker?: boolean }): TeamChatAttachment {
  const name = options?.fileName ?? (file instanceof File ? file.name : "arquivo.bin");
  const mime = file.type || "application/octet-stream";
  const kind = options?.asSticker
    ? "sticker"
    : mime.startsWith("image/")
      ? "image"
      : mime.startsWith("audio/")
        ? "audio"
        : mime.startsWith("video/")
          ? "video"
          : "file";
  return {
    url: URL.createObjectURL(file),
    name,
    mimeType: mime,
    size: file.size,
    kind,
  };
}

export function Composer({
  roomId,
  placeholder,
  onSend,
}: {
  roomId: string;
  placeholder: string;
  onSend: (input: { content: string; attachments: TeamChatAttachment[] }) => Promise<void> | void;
}) {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState<Staged[]>([]);
  const [busy, setBusy] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [picker, setPicker] = useState<"emoji" | "sticker" | null>(null);
  const [rec, setRec] = useState<RecState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const stickerFileRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mimeRef = useRef("audio/webm");

  useEffect(() => {
    return () => {
      pending.forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!plusOpen && !picker) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setPlusOpen(false);
        setPicker(null);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [plusOpen, picker]);

  function resize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 36), 160)}px`;
  }

  function stageFiles(files: File[], asSticker = false) {
    const room = MAX_FILES - pending.length;
    if (room <= 0) {
      toast.error(`Máximo de ${MAX_FILES} anexos por mensagem.`);
      return;
    }
    const now = Date.now();
    const next: Staged[] = [];
    for (const [i, file] of files.slice(0, room).entries()) {
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name || "Arquivo"} passa de 16 MB.`);
        continue;
      }
      const isImage = file.type.startsWith("image/");
      next.push({
        id: `${now}-${i}-${file.name}`,
        file,
        previewUrl: isImage ? URL.createObjectURL(file) : null,
        asSticker: asSticker && isImage,
      });
    }
    if (next.length) setPending((prev) => [...prev, ...next]);
  }

  function removeStaged(id: string) {
    setPending((prev) => {
      const hit = prev.find((p) => p.id === id);
      if (hit?.previewUrl) URL.revokeObjectURL(hit.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function handlePaste(e: ClipboardEvent<HTMLElement>) {
    const files = collectClipboardFiles(e);
    if (files.length === 0) return;
    e.preventDefault();
    stageFiles(files);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) stageFiles(files);
  }

  function insertEmoji(emoji: string) {
    const el = textareaRef.current;
    if (!el) {
      setValue((v) => v + emoji);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + emoji + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
      resize();
    });
  }

  async function submitText() {
    const text = value.trim();
    if (!text && pending.length === 0) return;
    setBusy(true);
    try {
      const attachments: TeamChatAttachment[] = [];
      for (const item of pending) {
        const opts = {
          fileName: item.file.name || `arquivo.${extFromMime(item.file.type, "bin")}`,
          asSticker: item.asSticker,
        };
        attachments.push(
          isMockId(roomId)
            ? localAttachment(item.file, opts)
            : await uploadTeamChatAttachment(roomId, item.file, opts),
        );
      }
      await onSend({ content: text, attachments });
      pending.forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
      setPending([]);
      setValue("");
      setPicker(null);
      requestAnimationFrame(() => {
        if (textareaRef.current) textareaRef.current.style.height = "auto";
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar.");
    } finally {
      setBusy(false);
    }
  }

  async function sendSticker(emoji: string) {
    setBusy(true);
    setPicker(null);
    try {
      await onSend({
        content: "",
        attachments: [{ url: "", name: emoji, mimeType: "text/plain", size: 0, kind: "sticker", emoji }],
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar a figurinha.");
    } finally {
      setBusy(false);
    }
  }

  function stopTracks() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function discardAudio() {
    try {
      recorderRef.current?.stop();
    } catch {
      /* already stopped */
    }
    recorderRef.current = null;
    stopTracks();
    chunksRef.current = [];
    blobRef.current = null;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setSeconds(0);
    setRec("idle");
  }

  async function startRecording() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Gravação não suportada neste navegador.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mime = bestAudioMime();
      mimeRef.current = mime;
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stopTracks();
        const blob = new Blob(chunksRef.current, { type: mimeRef.current });
        if (blob.size === 0) {
          setRec("idle");
          return;
        }
        blobRef.current = blob;
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setRec("preview");
      };
      recorderRef.current = recorder;
      recorder.start(100);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      setRec("recording");
      setPlusOpen(false);
      setPicker(null);
    } catch {
      toast.error("Não foi possível acessar o microfone.");
    }
  }

  function stopRecording() {
    const recoder = recorderRef.current;
    if (!recoder) return;
    recorderRef.current = null;
    try {
      recoder.requestData?.();
    } catch {
      /* noop */
    }
    try {
      recoder.stop();
    } catch {
      /* already stopped */
    }
  }

  async function sendAudio() {
    const blob = blobRef.current;
    if (!blob || blob.size === 0) return;
    setBusy(true);
    try {
      const ext = extFromMime(blob.type.split(";")[0], "webm");
      const fileName = `audio-${Date.now()}.${ext}`;
      const attachment = isMockId(roomId)
        ? localAttachment(blob, { fileName })
        : await uploadTeamChatAttachment(roomId, blob, { fileName });
      await onSend({ content: "", attachments: [attachment] });
      discardAudio();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar o áudio.");
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
      e.preventDefault();
      void submitText();
    }
  }

  const canSend = value.trim().length > 0 || pending.length > 0;
  const recording = rec !== "idle";

  function wrapSelection(before: string, after = before) {
    const el = textareaRef.current;
    if (!el) {
      setValue((v) => before + v + after);
      return;
    }
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const selected = value.slice(start, end) || "texto";
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      el.focus();
      const from = start + before.length;
      el.setSelectionRange(from, from + selected.length);
      resize();
    });
  }

  const iconBtn =
    "grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

  return (
    <div className="border-t border-border bg-card px-2 pb-2 pt-1.5" ref={rootRef}>
      <div className="w-full">
        {pending.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1.5 px-1">
            {pending.map((item) => (
              <div
                key={item.id}
                className="relative flex items-center gap-2 rounded-lg bg-muted px-2 py-1"
              >
                {item.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.previewUrl} alt="" className="h-8 w-8 rounded object-cover" />
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="max-w-[140px] truncate text-[12px] text-foreground">{item.file.name || "Arquivo"}</span>
                <button
                  type="button"
                  onClick={() => removeStaged(item.id)}
                  aria-label="Remover anexo"
                  className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {picker && (
          <div className="mb-1.5 overflow-hidden rounded-xl bg-muted shadow-lg">
            <div className="flex border-b border-border">
              <button
                type="button"
                onClick={() => setPicker("emoji")}
                className={cn(
                  "flex-1 px-3 py-1.5 text-[12px] font-semibold",
                  picker === "emoji" ? "bg-muted text-foreground" : "text-muted-foreground",
                )}
              >
                Emojis
              </button>
              <button
                type="button"
                onClick={() => setPicker("sticker")}
                className={cn(
                  "flex-1 px-3 py-1.5 text-[12px] font-semibold",
                  picker === "sticker" ? "bg-muted text-foreground" : "text-muted-foreground",
                )}
              >
                Figurinhas
              </button>
            </div>
            {picker === "emoji" ? (
              <EmojiPicker open onPick={(emoji) => insertEmoji(emoji)} className="border-0 shadow-none" />
            ) : (
              <div className="grid grid-cols-8 gap-1 p-2">
                {STICKERS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => void sendSticker(emoji)}
                    disabled={busy}
                    className="grid h-12 place-items-center rounded-md text-[28px] hover:bg-muted"
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => stickerFileRef.current?.click()}
                  className="grid h-12 place-items-center rounded-md border border-dashed border-border text-muted-foreground hover:bg-muted"
                  aria-label="Enviar figurinha própria"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        )}

        <div
          onPaste={handlePaste}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          {rec === "recording" && (
            <div className="flex min-w-0 items-center gap-2 rounded-lg bg-muted px-2 py-1">
              <button type="button" onClick={discardAudio} aria-label="Descartar" className="grid h-10 w-10 place-items-center rounded-full text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </button>
              <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
              <span className="font-mono text-[13px] tabular-nums text-foreground">{formatClock(seconds)}</span>
              <span className="flex-1 text-[13px] text-muted-foreground">Gravando…</span>
              <button type="button" onClick={stopRecording} aria-label="Parar" className="grid h-10 w-10 place-items-center rounded-full text-primary">
                <span className="h-2.5 w-2.5 rounded-sm bg-current" />
              </button>
            </div>
          )}

          {rec === "preview" && (
            <div className="flex min-w-0 items-center gap-2 rounded-lg bg-muted px-2 py-1">
              <button type="button" onClick={discardAudio} aria-label="Descartar áudio" className="grid h-10 w-10 place-items-center rounded-full text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </button>
              {audioUrl ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <audio src={audioUrl} controls className="h-8 min-w-0 flex-1" />
              ) : null}
              <button
                type="button"
                onClick={() => void sendAudio()}
                disabled={busy}
                aria-label="Enviar áudio"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-primary disabled:opacity-60"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          )}

          {!recording && (
            <div className="flex items-end gap-0.5">
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setPlusOpen((v) => !v);
                    setPicker(null);
                  }}
                  aria-label="Mais opções"
                  className={cn(iconBtn, plusOpen && "bg-muted text-foreground")}
                >
                  <Plus className="h-5 w-5" />
                </button>
                {plusOpen && (
                  <div className="absolute bottom-full left-0 z-20 mb-1 w-48 overflow-hidden rounded-md border border-border bg-card py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setPlusOpen(false);
                        fileRef.current?.click();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-foreground hover:bg-muted"
                    >
                      <Paperclip className="h-4 w-4 text-muted-foreground" /> Anexar arquivo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPlusOpen(false);
                        setPicker("sticker");
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-foreground hover:bg-muted"
                    >
                      <Sticker className="h-4 w-4 text-muted-foreground" /> Figurinha
                    </button>
                    <button
                      type="button"
                      onClick={() => void startRecording()}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-foreground hover:bg-muted"
                    >
                      <Mic className="h-4 w-4 text-muted-foreground" /> Gravar áudio
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPlusOpen(false);
                        wrapSelection("*");
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-foreground hover:bg-muted"
                    >
                      <Type className="h-4 w-4 text-muted-foreground" /> Negrito
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPicker((v) => (v ? null : "emoji"))}
                aria-label="Emojis e figurinhas"
                className={cn(iconBtn, picker && "bg-muted text-foreground")}
              >
                <Smile className="h-5 w-5" />
              </button>
              <div
                className={cn(
                  "flex min-h-10 min-w-0 flex-1 items-end rounded-lg border border-border bg-background px-3",
                  dragging && "ring-2 ring-primary/40",
                )}
              >
                <textarea
                  ref={textareaRef}
                  value={value}
                  rows={1}
                  onChange={(e) => {
                    setValue(e.target.value);
                    resize();
                  }}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder={placeholder}
                  disabled={busy}
                  className="max-h-40 min-h-10 min-w-0 flex-1 resize-none bg-transparent py-2 text-[15px] leading-snug text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
              {canSend ? (
                <button
                  type="button"
                  onClick={() => void submitText()}
                  disabled={busy}
                  aria-label="Enviar mensagem"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-primary disabled:opacity-60"
                >
                  <Send className="h-5 w-5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void startRecording()}
                  aria-label="Gravar áudio"
                  className={iconBtn}
                >
                  <Mic className="h-5 w-5" />
                </button>
              )}
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            stageFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
        <input
          ref={stickerFileRef}
          type="file"
          accept="image/png,image/webp,image/gif,image/jpeg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            setPicker(null);
            if (!file) return;
            void (async () => {
              setBusy(true);
              try {
                const attachment = isMockId(roomId)
                  ? localAttachment(file, { fileName: file.name, asSticker: true })
                  : await uploadTeamChatAttachment(roomId, file, {
                      fileName: file.name,
                      asSticker: true,
                    });
                await onSend({ content: "", attachments: [attachment] });
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Não foi possível enviar a figurinha.");
              } finally {
                setBusy(false);
              }
            })();
          }}
        />
      </div>
    </div>
  );
}
